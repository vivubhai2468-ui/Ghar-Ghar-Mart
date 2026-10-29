import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import * as db from "./db";
import { createAuditLog, getAdminOrders, getAdminProducts, getAdminSellers, getAdminUsers, getPendingSellers, updateAdminSellerRecord, updateAdminUserRecord, updateOrderStatus, updateProductStatus, updateProductStock, updateSellerStatus } from "./admin-helpers";
import { sdk } from "./_core/sdk";
import { sendAuthenticationOtp } from "./auth-sms";
import { sendDeliveryPush } from "./delivery-push";
import { sendDeliveryConfirmationSms } from "./delivery-sms";
import { storagePut } from "./storage";
import { getRoadRoute } from "./routing";
import { reverseGeocodeIndianAddress, searchIndianAddresses } from "./geocoding";
import { quoteDeliveryCharge } from "./delivery-pricing";
import { calculateOrderTotal, POOR_PEOPLE_DONATION } from "../shared/delivery-pricing";
import { assertPasswordResetEmailConfigured, sendPasswordResetEmail } from "./email";

const LOW_STOCK_THRESHOLD = 5;

function validateBannerAction(actionType: "none" | "coupon" | "category" | "url", actionValue?: string | null) {
  if (actionType === "category" && !actionValue?.trim()) {
    throw new Error("A category name or ID is required for category banner actions");
  }
  if (actionType === "url") {
    if (!actionValue?.trim()) throw new Error("A URL is required for URL banner actions");
    try {
      const url = new URL(actionValue);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported URL scheme");
    } catch {
      throw new Error("Banner actions must use a valid HTTP or HTTPS URL");
    }
  }
}

async function notifySeller(input: { sellerId: number; title: string; message: string; type: "seller_new_order" | "seller_low_stock"; orderId?: number; productId?: number }) {
  await db.createNotification({
    userId: input.sellerId,
    type: input.type,
    title: input.title,
    message: input.message,
    relatedOrderId: input.orderId,
    relatedProductId: input.productId,
  } as any);
  try {
    const tokens = await db.getActiveDevicePushTokens(input.sellerId);
    const delivery = await sendDeliveryPush(tokens.map((token: { token: string }) => token.token), {
      title: input.title,
      body: input.message,
      orderId: input.orderId,
      productId: input.productId,
      url: "/seller-notifications",
      channelId: "seller-alerts",
    });
    await Promise.all(delivery.invalidTokens.map((token) => db.deactivateDevicePushToken(token)));
  } catch (error) {
    console.warn("Seller push alert failed", error);
  }
}

async function requireApprovedDeliveryPartner(userId: number, role?: string) {
  if (role !== "delivery_partner") throw new Error("Only delivery partners can access this workspace");
  const partner = await db.getUserById(userId);
  if (!partner?.isActive || partner.deliveryPartnerStatus !== "approved") {
    throw new Error("Your delivery-partner account is awaiting administrator approval");
  }
  return partner;
}

async function notifyDeliveryPartnerReview(partnerId: number, status: "approved" | "rejected", partnerName?: string | null) {
  const approved = status === "approved";
  const title = approved ? "Delivery profile approved" : "Delivery profile needs attention";
  const message = approved
    ? "Your delivery-partner profile is approved. You can now sign in and accept delivery assignments."
    : "Your delivery-partner application was not approved. Contact Ghar Ghar Mart operations for the next steps.";
  await db.createNotification({ userId: partnerId, type: "delivery_partner_review", title, message } as any);
  try {
    const tokens = await db.getActiveDevicePushTokens(partnerId);
    const delivery = await sendDeliveryPush(tokens.map((token: { token: string }) => token.token), {
      title,
      body: message,
      url: "/delivery-partner",
      channelId: "delivery-updates",
    });
    await Promise.all(delivery.invalidTokens.map((token) => db.deactivateDevicePushToken(token)));
  } catch (error) {
    console.warn(`Delivery-partner review push alert failed for ${partnerName || partnerId}`, error);
  }
}

async function notifyDeliveryPartnerAssignment(partnerId: number, orderId: number) {
  const title = "New delivery assigned";
  const message = `Order #${orderId} is packed and ready for you to accept.`;
  await db.createNotification({ userId: partnerId, type: "delivery_assignment", title, message, relatedOrderId: orderId } as any);
  try {
    const tokens = await db.getActiveDevicePushTokens(partnerId);
    const delivery = await sendDeliveryPush(tokens.map((token: { token: string }) => token.token), {
      title,
      body: message,
      orderId,
      url: "/delivery-partner",
      channelId: "delivery-updates",
    });
    await Promise.all(delivery.invalidTokens.map((token) => db.deactivateDevicePushToken(token)));
  } catch (error) {
    console.warn("Delivery-partner assignment push alert failed", error);
  }
}

export const appRouter = router({
  system: systemRouter,

  addresses: router({
    search: publicProcedure
      .input(z.object({ query: z.string().trim().min(3).max(180) }))
      .query(({ input }) => searchIndianAddresses(input.query)),
    reverse: publicProcedure
      .input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }))
      .mutation(({ input }) => reverseGeocodeIndianAddress(input.latitude, input.longitude)),
    list: protectedProcedure.query(({ ctx }) => db.listCustomerAddresses(ctx.user!.id)),
    create: protectedProcedure
      .input(z.object({
        label: z.string().trim().min(1).max(80), recipientName: z.string().trim().max(255).optional(), phone: z.string().trim().max(20).optional(),
        addressLine: z.string().trim().min(4).max(800), apartment: z.string().trim().max(255).optional(), floor: z.string().trim().max(64).optional(),
        landmark: z.string().trim().max(255).optional(), city: z.string().trim().max(120).optional(), state: z.string().trim().max(120).optional(), pincode: z.string().trim().max(12).optional(),
        deliveryInstructions: z.string().trim().max(800).optional(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), isDefault: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => db.createCustomerAddress(ctx.user!.id, input)),
    update: protectedProcedure
      .input(z.object({
        id: z.number(), label: z.string().trim().min(1).max(80).optional(), recipientName: z.string().trim().max(255).optional(), phone: z.string().trim().max(20).optional(),
        addressLine: z.string().trim().min(4).max(800).optional(), apartment: z.string().trim().max(255).optional(), floor: z.string().trim().max(64).optional(),
        landmark: z.string().trim().max(255).optional(), city: z.string().trim().max(120).optional(), state: z.string().trim().max(120).optional(), pincode: z.string().trim().max(12).optional(),
        deliveryInstructions: z.string().trim().max(800).optional(), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), isDefault: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...changes } = input;
        return db.updateCustomerAddress(id, ctx.user!.id, changes);
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteCustomerAddress(input.id, ctx.user!.id)),
    setDefault: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.setCustomerDefaultAddress(input.id, ctx.user!.id)),
  }),
  
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    directCustomer: router({
      signUp: publicProcedure
        .input(z.object({
          name: z.string().trim().min(2).max(100),
          phone: z.string().min(10),
          address: z.string().trim().min(5).max(500),
          password: z.string().min(8).max(128),
        }))
        .mutation(async ({ ctx, input }) => {
          const user = await db.createDirectCustomerAccount(input);
          if (!user) throw new Error("Customer account could not be created");
          const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "Ghar Ghar Mart customer" });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
          return { sessionToken, user: { id: user.id, name: user.name, phone: user.phone, address: user.address, role: "customer" as const } };
        }),

      signIn: publicProcedure
        .input(z.object({ phone: z.string().min(10), password: z.string().min(8).max(128) }))
        .mutation(async ({ ctx, input }) => {
          const user = await db.signInDirectCustomer(input);
          if (!user) throw new Error("Mobile number or password is incorrect");
          const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "Ghar Ghar Mart customer" });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
          return { sessionToken, user: { id: user.id, name: user.name, phone: user.phone, address: user.address, role: "customer" as const } };
        }),

      requestPasswordReset: publicProcedure
        .input(z.object({ phone: z.string().min(10) }))
        .mutation(async ({ input }) => {
          assertPasswordResetEmailConfigured();
          const reset = await db.createPasswordResetToken(input.phone, "user");
          if (reset) {
            try {
              await sendPasswordResetEmail({ to: reset.email, token: reset.token, role: "customer" });
            } catch (error) {
              await db.invalidatePasswordResetToken(input.phone, "user", reset.token);
              throw error;
            }
          }
          return { success: true };
        }),

      resetPassword: publicProcedure
        .input(z.object({
          phone: z.string().min(10),
          token: z.string().regex(/^[a-f0-9]{64}$/),
          password: z.string().min(8).max(128),
        }))
        .mutation(async ({ input }) => {
          await db.resetAccountPassword({ ...input, role: "user" });
          return { success: true };
        }),
    }),

    partnerPassword: router({
      requestPasswordReset: publicProcedure
        .input(z.object({
          phone: z.string().min(10),
          role: z.enum(["seller", "delivery_partner"]),
        }))
        .mutation(async ({ input }) => {
          assertPasswordResetEmailConfigured();
          const reset = await db.createPasswordResetToken(input.phone, input.role);
          if (reset) {
            try {
              await sendPasswordResetEmail({ to: reset.email, token: reset.token, role: input.role });
            } catch (error) {
              await db.invalidatePasswordResetToken(input.phone, input.role, reset.token);
              throw error;
            }
          }
          return { success: true };
        }),

      resetPassword: publicProcedure
        .input(z.object({
          phone: z.string().min(10),
          role: z.enum(["seller", "delivery_partner"]),
          token: z.string().regex(/^[a-f0-9]{64}$/),
          password: z.string().min(8).max(128),
        }))
        .mutation(async ({ input }) => {
          await db.resetAccountPassword(input);
          return { success: true };
        }),

      signIn: publicProcedure
        .input(z.object({
          phone: z.string().min(10),
          password: z.string().min(8).max(128),
          role: z.enum(["seller", "delivery_partner"]),
        }))
        .mutation(async ({ ctx, input }) => {
          const user = await db.signInPartnerWithPassword(input);
          if (!user) throw new Error("Mobile number or password is incorrect");
          const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "Ghar Ghar Mart partner" });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
          return {
            sessionToken,
            user: { id: user.id, name: user.name, phone: user.phone, address: user.address, role: user.role, sellerStatus: user.shopStatus, deliveryPartnerStatus: user.deliveryPartnerStatus },
          };
        }),

      setWithOtp: publicProcedure
        .input(z.object({
          phone: z.string().min(10),
          code: z.string().regex(/^\d{6}$/),
          password: z.string().min(8).max(128),
          role: z.enum(["seller", "delivery_partner"]),
        }))
        .mutation(async ({ ctx, input }) => {
          await db.verifyPhoneOtpChallenge(input.phone, "login", input.code);
          const user = await db.setPartnerPassword(input);
          const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "Ghar Ghar Mart partner" });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
          return {
            sessionToken,
            user: { id: user.id, name: user.name, phone: user.phone, address: user.address, role: user.role, sellerStatus: user.shopStatus, deliveryPartnerStatus: user.deliveryPartnerStatus },
          };
        }),
    }),

    phoneOtp: router({
      request: publicProcedure
        .input(z.object({
          phone: z.string().min(10),
          purpose: z.enum(["login", "signup", "phone_change"]),
        }))
        .mutation(async ({ input }) => {
          const challenge = await db.createPhoneOtpChallenge(input.phone, input.purpose);
          const sms = await sendAuthenticationOtp(challenge.phone, challenge.code, input.purpose);
          if (!sms.delivered && !sms.previewCode) throw new Error(sms.error || "Unable to send OTP");
          return {
            sent: sms.delivered,
            expiresAt: challenge.expiresAt,
            ...(sms.previewCode ? { previewCode: sms.previewCode } : {}),
          };
        }),

      signUp: publicProcedure
        .input(z.object({
          name: z.string().trim().min(2).max(100),
          phone: z.string().min(10),
          address: z.string().trim().min(5).max(500),
          role: z.enum(["customer", "seller", "delivery_partner"]).default("customer"),
          email: z.string().trim().email().max(320).optional(),
          aadhaarNumber: z.string().optional(),
          shopName: z.string().trim().min(2).max(255).optional(),
          password: z.string().min(8).max(128).optional(),
          code: z.string().regex(/^\d{6}$/),
        }).superRefine((value, context) => {
          if ((value.role === "seller" || value.role === "delivery_partner") && !value.email) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "A valid email address is required for partner password recovery." });
          }
          if ((value.role === "seller" || value.role === "delivery_partner") && !/^\d{12}$/.test((value.aadhaarNumber ?? "").replace(/\D/g, ""))) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["aadhaarNumber"], message: "A valid 12-digit Aadhaar number is required for this verified partner account" });
          }
          if ((value.role === "seller" || value.role === "delivery_partner") && !value.password) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "A password with at least 8 characters is required for partner accounts." });
          }
        }))
        .mutation(async ({ input }) => {
          await db.verifyPhoneOtpChallenge(input.phone, "signup", input.code);
          const user = await db.findOrCreatePhoneUser(input);
          const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "Ghar Ghar Mart user" });
          return {
            sessionToken,
            user: { id: user.id, name: user.name, phone: user.phone, address: user.address, role: user.role === "seller" ? "seller" : user.role === "delivery_partner" ? "delivery_partner" : "customer", sellerStatus: user.shopStatus, deliveryPartnerStatus: user.deliveryPartnerStatus },
          };
        }),

      signIn: publicProcedure
        .input(z.object({ phone: z.string().min(10), code: z.string().regex(/^\d{6}$/) }))
        .mutation(async ({ input }) => {
          await db.verifyPhoneOtpChallenge(input.phone, "login", input.code);
          const user = await db.getUserByPhone(input.phone);
          if (!user) throw new Error("No account exists for this mobile number. Please sign up first.");
          if (user.role === "seller" || user.role === "delivery_partner") {
            throw new Error("Seller and delivery-partner accounts must sign in with a password. Use OTP to set or reset your password.");
          }
          const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "Ghar Ghar Mart user" });
          return {
            sessionToken,
            user: { id: user.id, name: user.name, phone: user.phone, address: user.address, role: user.role === "seller" ? "seller" : user.role === "delivery_partner" ? "delivery_partner" : "customer", deliveryPartnerStatus: user.deliveryPartnerStatus },
          };
        }),
    }),
  }),

  // ============= PRODUCTS =============
  products: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        pincode: z.string().regex(/^\d{6}$/).optional(),
      }))
      .query(({ input }) => db.getProducts(input.limit, input.offset, input.pincode)),

    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => db.getProductById(input)),

    getByCategory: publicProcedure
      .input(z.object({
        categoryId: z.number(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(({ input }) => db.getProductsByCategory(input.categoryId, input.limit)),

    search: publicProcedure
      .input(z.string())
      .query(({ input }) => db.searchProducts(input)),

    getSellerProducts: protectedProcedure
      .input(z.number().optional())
      .query(({ ctx, input }) => {
        if (ctx.user?.role === "seller") {
          // A seller may only retrieve the private catalog associated with their own account.
          return db.getSellerProducts(ctx.user.id);
        }
        if (ctx.user?.role === "admin" && input) {
          return db.getSellerProducts(input);
        }
        throw new Error("Only the owning seller or an administrator can view seller catalog records");
      }),

    create: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        price: z.number(),
        originalPrice: z.number().optional(),
        discount: z.number().optional(),
        stock: z.number(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "seller") {
          throw new Error("Only sellers can create products");
        }
        const seller = await db.getUserById(ctx.user.id);
        if (!seller?.isActive || seller.shopStatus !== "approved") {
          throw new Error("Your seller account is awaiting administrator approval before products can be managed");
        }
        return db.createProduct({
          sellerId: ctx.user.id,
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          price: input.price.toString(),
          originalPrice: input.originalPrice?.toString(),
          discount: input.discount,
          stock: input.stock,
          images: input.images,
          approvalStatus: "pending",
          isActive: false,
        } as any);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        stock: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "seller") {
          throw new Error("Only sellers can update products");
        }
        const seller = await db.getUserById(ctx.user.id);
        if (!seller?.isActive || seller.shopStatus !== "approved") throw new Error("Your seller account is not approved for catalog management");
        const product = await db.getProductById(input.id);
        if (!product || product.sellerId !== ctx.user.id) throw new Error("You can only edit products from your own shop");
        const { id, ...data } = input;
        const needsModeration = data.name !== undefined || data.description !== undefined || data.price !== undefined;
        const updated = await db.updateProduct(id, needsModeration
          ? { ...data, approvalStatus: "pending", isActive: false, moderationNote: null, moderatedBy: null, moderatedAt: null } as any
          : data as any);
        if (data.stock !== undefined && Number(product.stock) > LOW_STOCK_THRESHOLD && data.stock <= LOW_STOCK_THRESHOLD) {
          await notifySeller({ sellerId: ctx.user.id, type: "seller_low_stock", productId: id, title: "Low stock needs attention", message: `${product.name} is down to ${data.stock} unit${data.stock === 1 ? "" : "s"}. Update stock to keep it available.` });
        }
        return updated;
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "seller") {
          throw new Error("Only sellers can delete products");
        }
        const seller = await db.getUserById(ctx.user.id);
        if (!seller?.isActive || seller.shopStatus !== "approved") throw new Error("Your seller account is not approved for catalog management");
        const product = await db.getProductById(input);
        if (!product || product.sellerId !== ctx.user.id) throw new Error("You can only delete products from your own shop");
        return db.deleteProduct(input);
      }),
  }),

  // ============= CATEGORIES =============
  categories: router({
    list: publicProcedure
      .query(() => db.getCategories()),

    listWithCounts: publicProcedure
      .input(z.object({ pincode: z.string().regex(/^\d{6}$/).optional() }).optional())
      .query(({ input }) => db.getCategoriesWithCounts(input?.pincode)),

    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => db.getCategoryById(input)),

    getProductsWithFilters: publicProcedure
      .input(z.object({
        categoryId: z.number(),
        limit: z.number().default(20),
        offset: z.number().default(0),
        sortBy: z.enum(['name', 'price', 'rating', 'newest']).default('name'),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        minRating: z.number().optional(),
        pincode: z.string().regex(/^\d{6}$/).optional(),
      }))
      .query(({ input }) => 
        db.getProductsByCategoryWithFilters(input.categoryId, {
          limit: input.limit,
          offset: input.offset,
          sortBy: input.sortBy,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          minRating: input.minRating,
          pincode: input.pincode,
        })
      ),

    searchAdvanced: publicProcedure
      .input(z.object({
        query: z.string(),
        limit: z.number().default(20),
        offset: z.number().default(0),
        categoryId: z.number().optional(),
        sortBy: z.enum(['name', 'price', 'rating', 'relevance']).default('relevance'),
        pincode: z.string().regex(/^\d{6}$/).optional(),
      }))
      .query(({ input }) =>
        db.searchProductsAdvanced(input.query, {
          limit: input.limit,
          offset: input.offset,
          categoryId: input.categoryId,
          sortBy: input.sortBy,
          pincode: input.pincode,
        })
      ),
  }),

  // ============= PERSONALIZED SHOPPING =============
  recommendations: router({
    buyAgain: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(20).default(8),
        pincode: z.string().regex(/^\d{6}$/).optional(),
      }).optional())
      .query(({ ctx, input }) => db.getBuyAgainProducts(ctx.user!.id, input?.limit ?? 8, input?.pincode)),
  }),

  // ============= CART =============
  cart: router({
    list: protectedProcedure
      .query(({ ctx }) => db.getCartItems(ctx.user!.id)),

    add: protectedProcedure
      .input(z.object({
        productId: z.number(),
        quantity: z.number().default(1),
        price: z.number(),
      }))
      .mutation(({ ctx, input }) =>
        db.addToCart({
          userId: ctx.user!.id,
          productId: input.productId,
          quantity: input.quantity,
          price: input.price.toString(),
        } as any)
      ),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantity: z.number(),
      }))
      .mutation(({ input }) => db.updateCartItem(input.id, input.quantity)),

    remove: protectedProcedure
      .input(z.number())
      .mutation(({ input }) => db.removeFromCart(input)),

    clear: protectedProcedure
      .mutation(({ ctx }) => db.clearCart(ctx.user!.id)),
  }),

  // ============= ORDERS =============
  orders: router({
    list: protectedProcedure
      .query(({ ctx }) => db.getUserOrders(ctx.user!.id)),

    getById: protectedProcedure
      .input(z.number())
      .query(({ input }) => db.getOrderById(input)),

    uploadPaymentProof: protectedProcedure
      .input(z.object({ orderId: z.number(), base64Data: z.string().min(1).max(15_000_000), contentType: z.enum(["image/jpeg", "image/png"]) }))
      .mutation(({ ctx, input }) => db.savePaymentProof(input.orderId, ctx.user!.id, input.base64Data, input.contentType)),

    create: protectedProcedure
      .input(z.object({
        sellerId: z.number(),
        orderNumber: z.string(),
        paymentMethod: z.enum(["online", "cod"]),
        deliveryAddress: z.string(),
        deliveryPhone: z.string(),
        deliveryLatitude: z.number().min(-90).max(90),
        deliveryLongitude: z.number().min(-180).max(180),
        subtotal: z.number().nonnegative().optional(),
        tax: z.number().optional(),
        shippingCost: z.number().optional(),
        discount: z.number().optional(),
        total: z.number().optional(),
        items: z.array(z.object({
          productId: z.number(),
          productName: z.string(),
          quantity: z.number(),
          price: z.number(),
          total: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const quote = await quoteDeliveryCharge({ sellerId: input.sellerId, deliveryLatitude: input.deliveryLatitude, deliveryLongitude: input.deliveryLongitude });
        const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = input.tax ?? 0;
        const discount = input.discount ?? 0;
        const total = calculateOrderTotal({ subtotal, tax, deliveryCharge: quote.deliveryCharge, discount });
        const orderId = await db.createOrder({
          userId: ctx.user!.id,
          sellerId: input.sellerId,
          orderNumber: input.orderNumber,
          paymentMethod: input.paymentMethod,
          deliveryAddress: input.deliveryAddress,
          deliveryPhone: input.deliveryPhone,
          deliveryLatitude: input.deliveryLatitude.toString(),
          deliveryLongitude: input.deliveryLongitude.toString(),
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          shippingCost: quote.deliveryCharge.toFixed(2),
          deliveryDistanceKm: quote.distanceKm.toFixed(2),
          discount: discount.toFixed(2),
          donationAmount: POOR_PEOPLE_DONATION.toFixed(2),
          total: total.toFixed(2),
        } as any);
        const deliveryOtp = await db.createCustomerDeliveryOtp(orderId);

        // Add order items
        const orderItems = input.items.map((item) => ({
          orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price.toString(),
          total: item.total.toString(),
        }));
        await db.addOrderItems(orderItems as any);

        // Clear cart after order
        await db.clearCart(ctx.user!.id);

        await notifySeller({
          sellerId: input.sellerId,
          type: "seller_new_order",
          orderId,
          title: "New order received",
          message: `${input.orderNumber} is ready to confirm · ₹${total.toLocaleString("en-IN")}`,
        });
        await db.createNotification({
          userId: ctx.user!.id,
          type: "delivery_confirmation",
          title: "Your delivery OTP",
          message: `Keep this 4-digit OTP safe and share it with the delivery partner only when your order arrives: ${deliveryOtp}`,
          relatedOrderId: orderId,
        } as any);

        return {
          orderId,
          deliveryOtp,
          subtotal,
          deliveryCharge: quote.deliveryCharge,
          deliveryDistanceKm: quote.distanceKm,
          total,
        };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const order = await db.getOrderById(input.id);
        if (!order) throw new Error("Order not found");
        const isAdmin = ctx.user?.role === "admin";
        const isOwningSeller = ctx.user?.role === "seller" && order.sellerId === ctx.user.id;
        if (!isAdmin && !isOwningSeller) throw new Error("Only the owning seller or an administrator can update this order");

        if (isOwningSeller) {
          const permittedTransitions: Record<string, string[]> = {
            pending: ["confirmed", "cancelled"],
            confirmed: ["packed", "cancelled"],
            packed: ["shipped"],
            shipped: [],
            delivered: [],
            cancelled: [],
          };
          if (!permittedTransitions[order.status]?.includes(input.status)) {
            throw new Error("This fulfillment change is not available for the current order status");
          }
        }

        await db.updateOrderStatus(input.id, input.status);
        return db.getOrderById(input.id);
      }),

    getSellerOrders: protectedProcedure
      .query(({ ctx }) => {
        if (ctx.user?.role !== "seller") {
          throw new Error("Only sellers can view seller orders");
        }
        return db.getSellerOrders(ctx.user.id);
      }),
  }),

  // ============= DELIVERY PARTNER =============
  deliveryPartner: router({
    approval: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "delivery_partner") throw new Error("Only delivery partners can view this approval state");
      return db.getDeliveryPartnerApprovalState(ctx.user.id);
    }),
    assignments: protectedProcedure.query(async ({ ctx }) => {
      await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
      return db.getDeliveryOrdersForPartner(ctx.user.id);
    }),

    nearby: protectedProcedure
      .input(z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radiusKm: z.number().min(1).max(50).default(10),
      }))
      .query(async ({ ctx, input }) => {
        await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
        return db.getNearbyAvailableDeliveryOrders(input.latitude, input.longitude, input.radiusKm);
      }),

    claim: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
        const partner = await db.getUserById(ctx.user!.id);
        return db.claimNearbyDeliveryOrder(input.orderId, ctx.user!.id, partner?.name ?? "Delivery partner");
      }),

    earnings: protectedProcedure.query(async ({ ctx }) => {
      await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
      return db.getDeliveryPartnerEarnings(ctx.user.id);
    }),

    routeSummary: protectedProcedure.query(async ({ ctx }) => {
      await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
      return db.getDeliveryPartnerRouteSummary(ctx.user.id);
    }),

    route: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
        const order = await db.getDeliveryOrder(input.orderId);
        if (!order || order.deliveryPartnerId !== ctx.user!.id) {
          throw new Error("Delivery is not assigned to this partner");
        }
        const origin = order.currentLatitude && order.currentLongitude
          ? { latitude: Number(order.currentLatitude), longitude: Number(order.currentLongitude) }
          : null;
        const destination = order.deliveryLatitude && order.deliveryLongitude
          ? { latitude: Number(order.deliveryLatitude), longitude: Number(order.deliveryLongitude) }
          : null;
        if (!origin || !destination || !Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude) || !Number.isFinite(destination.latitude) || !Number.isFinite(destination.longitude)) {
          return { coordinates: [], distanceMeters: null, durationSeconds: null, provider: "direct" as const, maneuvers: [] };
        }
        return getRoadRoute(origin, destination);
      }),

    accept: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
        return db.acceptDeliveryAssignment(input.orderId, ctx.user.id);
      }),

    start: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
        return db.startAssignedDelivery(input.orderId, ctx.user.id);
      }),

    updateLocation: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().nonnegative().optional(),
        etaMinutes: z.number().int().min(0).max(240).optional(),
        source: z.enum(["foreground", "background", "manual"]).default("foreground"),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
        const order = await db.getDeliveryOrder(input.orderId);
        if (!order || order.deliveryPartnerId !== ctx.user.id) {
          throw new Error("Delivery is not assigned to this partner");
        }
        await db.recordDeliveryLocation({
          orderId: input.orderId,
          partnerId: ctx.user.id,
          latitude: input.latitude.toString(),
          longitude: input.longitude.toString(),
          accuracy: input.accuracy?.toString(),
          source: input.source,
        });
        const etaMinutes = input.etaMinutes ?? order.deliveryEtaMinutes ?? 20;
        await db.updateDeliveryEta(input.orderId, etaMinutes);

        const customerTokens = await db.getActiveDevicePushTokens(order.userId);
        const pushStage = etaMinutes <= 5 ? "arriving" : etaMinutes <= 15 ? "nearby" : null;
        if (pushStage) {
          const alreadyNotified = pushStage === "nearby" ? order.riderNearNotifiedAt : order.riderArrivingNotifiedAt;
          if (!alreadyNotified) {
            const title = pushStage === "nearby" ? "Your rider is nearby" : "Your rider is arriving";
            const message = pushStage === "nearby" ? "Your Ghar Ghar Mart order is about 15 minutes away." : "Please keep your delivery confirmation code ready.";
            await db.createNotification({
              userId: order.userId,
              type: pushStage === "nearby" ? "rider_nearby" : "rider_arriving",
              title,
              message,
              relatedOrderId: order.id,
            } as any);
            try {
              const pushResult = await sendDeliveryPush(customerTokens.map((token: { token: string }) => token.token), {
                title,
                body: message,
                orderId: order.id,
              });
              await Promise.all(pushResult.invalidTokens.map((token) => db.deactivateDevicePushToken(token)));
            } catch (error) {
              console.warn("Delivery push alert failed", error);
            }
            await db.markDeliveryNotification(input.orderId, pushStage);
          }
        }
        return { success: true, etaMinutes, latitude: input.latitude, longitude: input.longitude };
      }),

    requestConfirmationCode: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
        const order = await db.getDeliveryOrder(input.orderId);
        if (!order || order.deliveryPartnerId !== ctx.user.id) {
          throw new Error("Delivery is not assigned to this partner");
        }
        if (order.status !== "shipped") throw new Error("Start the delivery route before requesting the customer OTP");
        if (!order.proofOfDeliveryUrl) throw new Error("Capture proof of delivery before requesting the customer OTP");
        const result = await db.createDeliveryOtp(input.orderId, ctx.user.id);
        const sms = await sendDeliveryConfirmationSms(result.phone, result.code);
        await db.createNotification({
          userId: order.userId,
          type: "delivery_confirmation",
          title: "Delivery confirmation code issued",
          message: "Your delivery partner has requested the confirmation code for your order.",
          relatedOrderId: order.id,
        } as any);
        return { delivered: sms.delivered, providerMessageId: sms.providerMessageId, previewCode: sms.previewCode };
      }),

    uploadProof: protectedProcedure
      .input(z.object({ orderId: z.number(), dataUri: z.string().min(20), contentType: z.enum(["image/jpeg", "image/png"]).default("image/jpeg") }))
      .mutation(async ({ ctx, input }) => {
        await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
        const order = await db.getDeliveryOrder(input.orderId);
        if (!order || order.deliveryPartnerId !== ctx.user.id) {
          throw new Error("Delivery is not assigned to this partner");
        }
        if (order.status !== "shipped") throw new Error("Start the delivery route before uploading proof of delivery");
        const match = input.dataUri.match(/^data:[^;]+;base64,(.+)$/);
        const base64 = match?.[1] ?? input.dataUri;
        const stored = await storagePut(`delivery-proof/${input.orderId}/${Date.now()}.jpg`, Buffer.from(base64, "base64"), input.contentType);
        return db.saveProofOfDelivery(input.orderId, ctx.user.id, stored.url);
      }),

    complete: protectedProcedure
      .input(z.object({ orderId: z.number(), code: z.string().regex(/^\d{4}$/) }))
      .mutation(async ({ ctx, input }) => {
        await requireApprovedDeliveryPartner(ctx.user!.id, ctx.user?.role);
        return db.completeDeliveryByPartner(input.orderId, ctx.user.id, input.code);
      }),
  }),

  // ============= CUSTOMER DELIVERY =============
  delivery: router({
    quote: protectedProcedure
      .input(z.object({ sellerId: z.number().int().positive(), deliveryLatitude: z.number().min(-90).max(90), deliveryLongitude: z.number().min(-180).max(180) }))
      .query(({ input }) => quoteDeliveryCharge(input)),

    tracking: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(({ ctx, input }) => db.getDeliveryTrackingForCustomer(input.orderId, ctx.user!.id)),

    route: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const tracking = await db.getDeliveryTrackingForCustomer(input.orderId, ctx.user!.id);
        const origin = tracking?.location ?? (tracking?.order.currentLatitude && tracking?.order.currentLongitude
          ? { latitude: tracking.order.currentLatitude, longitude: tracking.order.currentLongitude }
          : null);
        const destination = tracking?.order.deliveryLatitude && tracking?.order.deliveryLongitude
          ? { latitude: tracking.order.deliveryLatitude, longitude: tracking.order.deliveryLongitude }
          : null;
        if (!origin || !destination) return { coordinates: [], distanceMeters: null, durationSeconds: null, provider: "direct" as const };
        return getRoadRoute(
          { latitude: Number(origin.latitude), longitude: Number(origin.longitude) },
          { latitude: Number(destination.latitude), longitude: Number(destination.longitude) },
        );
      }),

    registerDeviceToken: protectedProcedure
      .input(z.object({ token: z.string().min(10), platform: z.enum(["ios", "android", "web"]) }))
      .mutation(({ ctx, input }) => db.registerDevicePushToken({ userId: ctx.user!.id, token: input.token, platform: input.platform, isActive: true, lastUsedAt: new Date() })),

    confirm: protectedProcedure
      .input(z.object({ orderId: z.number(), code: z.string().regex(/^\\d{6}$/) }))
      .mutation(async ({ ctx, input }) => {
        const order = await db.getDeliveryOrder(input.orderId);
        if (!order?.proofOfDeliveryUrl) throw new Error("Your delivery partner must upload proof before confirmation");
        return db.completeDeliveryWithOtp(input.orderId, ctx.user!.id, input.code);
      }),
  }),

  // ============= WISHLIST =============
  wishlist: router({
    list: protectedProcedure
      .query(({ ctx }) => db.getWishlist(ctx.user!.id)),

    add: protectedProcedure
      .input(z.number())
      .mutation(({ ctx, input }) =>
        db.addToWishlist({
          userId: ctx.user!.id,
          productId: input,
        })
      ),

    remove: protectedProcedure
      .input(z.number())
      .mutation(({ ctx, input }) =>
        db.removeFromWishlist(ctx.user!.id, input)
      ),
  }),

  // ============= REVIEWS =============
  reviews: router({
    getProductReviews: publicProcedure
      .input(z.number())
      .query(({ input }) => db.getProductReviews(input)),

    create: protectedProcedure
      .input(z.object({
        productId: z.number(),
        orderId: z.number(),
        rating: z.number().min(1).max(5),
        title: z.string(),
        comment: z.string().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(({ ctx, input }) =>
        db.createReview({
          productId: input.productId,
          userId: ctx.user!.id,
          orderId: input.orderId,
          rating: input.rating,
          title: input.title,
          comment: input.comment,
          images: input.images,
        } as any)
      ),
  }),

  // ============= COUPONS =============
  coupons: router({
    validate: publicProcedure
      .input(z.object({
        code: z.string(),
        orderValue: z.number(),
      }))
      .query(({ input }) =>
        db.validateCoupon(input.code, input.orderValue)
      ),
  }),

  // ============= NOTIFICATIONS =============
  notifications: router({
    list: protectedProcedure
      .query(({ ctx }) => db.getUserNotifications(ctx.user!.id)),

    markAsRead: protectedProcedure
      .input(z.number())
      .mutation(({ ctx, input }) => db.markNotificationAsRead(input, ctx.user!.id)),
  }),

  // ============= SELLER DASHBOARD =============
  seller: router({
    dashboard: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user?.role !== "seller") {
          throw new Error("Only sellers can access seller dashboard");
        }
        return db.getSellerStats(ctx.user.id);
      }),

    profile: router({
      get: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.user?.role !== "seller") throw new Error("Only sellers can view shop details");
        return db.getUserById(ctx.user.id);
      }),
      update: protectedProcedure
        .input(z.object({
          shopName: z.string().trim().min(2).max(255).optional(),
          shopDescription: z.string().trim().max(1000).nullable().optional(),
          address: z.string().trim().max(1000).nullable().optional(),
          shopHours: z.object({
            openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            openDays: z.array(z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])).min(1),
          }).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "seller") throw new Error("Only sellers can update shop details");
          if (input.shopHours && input.shopHours.openingTime >= input.shopHours.closingTime) {
            throw new Error("Closing time must be after opening time");
          }
          return db.updateSellerShopProfile(ctx.user.id, input);
        }),
      uploadLogo: protectedProcedure
        .input(z.object({
          mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
          contentBase64: z.string().min(20).max(7_000_000),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "seller") throw new Error("Only sellers can upload shop images");
          const bytes = Buffer.from(input.contentBase64, "base64");
          if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("Shop images must be less than 5 MB");
          const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
          const stored = await storagePut(`seller-shops/${ctx.user.id}/logo-${Date.now()}.${extension}`, bytes, input.mimeType);
          return db.updateSellerShopProfile(ctx.user.id, { shopLogo: stored.url });
        }),
    }),

    documents: router({
      list: protectedProcedure.query(({ ctx }) => {
        if (ctx.user?.role !== "seller") throw new Error("Only sellers can view verification documents");
        return db.getSellerDocumentRecords(ctx.user.id);
      }),

      upload: protectedProcedure
        .input(z.object({
          documentType: z.enum(["aadhaar_card", "address_proof", "business_license"]),
          originalName: z.string().min(1).max(255),
          mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
          contentBase64: z.string().min(20).max(7_000_000),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "seller") throw new Error("Only sellers can upload verification documents");
          const bytes = Buffer.from(input.contentBase64, "base64");
          if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("Documents must be less than 5 MB");
          const extension = input.mimeType === "application/pdf" ? "pdf" : input.mimeType === "image/png" ? "png" : "jpg";
          const saved = await storagePut(`seller-documents/${ctx.user.id}/${input.documentType}.${extension}`, bytes, input.mimeType);
          return db.createSellerDocumentRecord({ sellerId: ctx.user.id, documentType: input.documentType, fileUrl: saved.url, fileKey: saved.key, originalName: input.originalName, mimeType: input.mimeType, status: "pending" });
        }),
    }),

    payout: router({
      get: protectedProcedure.query(({ ctx }) => {
        if (ctx.user?.role !== "seller") throw new Error("Only sellers can view payout setup");
        return db.getSellerPayoutProfile(ctx.user.id);
      }),

      save: protectedProcedure
        .input(z.object({ accountHolderName: z.string().trim().min(2).max(255), accountNumber: z.string().min(9).max(24), ifscCode: z.string().min(11).max(16), bankName: z.string().trim().max(255).optional() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "seller") throw new Error("Only sellers can configure payouts");
          const seller = await db.getUserById(ctx.user.id);
          if (!seller?.isActive || seller.shopStatus !== "approved") throw new Error("Payout setup unlocks after seller approval");
          return db.saveSellerPayoutProfile({ sellerId: ctx.user.id, ...input });
        }),
    }),

    catalog: router({
      uploadImage: protectedProcedure
        .input(z.object({ mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), contentBase64: z.string().min(20).max(7_000_000) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "seller") throw new Error("Only sellers can upload product images");
          const seller = await db.getUserById(ctx.user.id);
          if (!seller?.isActive || seller.shopStatus !== "approved") throw new Error("Product images can be uploaded after seller approval");
          const bytes = Buffer.from(input.contentBase64, "base64");
          if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("Images must be less than 5 MB");
          const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
          return storagePut(`seller-products/${ctx.user.id}/product.${extension}`, bytes, input.mimeType);
        }),
    }),

    earnings: protectedProcedure
      .query(({ ctx }) => {
        if (ctx.user?.role !== "seller") {
          throw new Error("Only sellers can view earnings");
        }
        return db.getSellerEarnings(ctx.user.id);
      }),

    totalEarnings: protectedProcedure
      .query(({ ctx }) => {
        if (ctx.user?.role !== "seller") {
          throw new Error("Only sellers can view earnings");
        }
        return db.getTotalSellerEarnings(ctx.user.id);
      }),
  }),

  // ============= ADMIN DASHBOARD =============
  banners: router({
    list: publicProcedure.query(() => db.listActiveHomeOfferBanners()),
  }),

  admin: router({
    deliveryOrders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") throw new Error("Only admins can view delivery orders");
      return getAdminOrders(100, 0);
    }),

    deliveryPartners: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") throw new Error("Only admins can view delivery partners");
      return db.getDeliveryPartners();
    }),

    assignDeliveryPartner: protectedProcedure
      .input(z.object({ orderId: z.number(), partnerId: z.number(), partnerName: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user?.role !== "admin") throw new Error("Only admins can assign delivery partners");
        const partner = await db.getUserById(input.partnerId);
        if (!partner?.isActive || partner.role !== "delivery_partner" || partner.deliveryPartnerStatus !== "approved") {
          throw new Error("Only approved delivery partners can receive assignments");
        }
        await db.assignDeliveryPartner(input.orderId, input.partnerId, input.partnerName);
        await notifyDeliveryPartnerAssignment(input.partnerId, input.orderId);
        return { success: true };
      }),

    dashboard: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Only admins can access admin dashboard");
        }
        return db.getPlatformStats();
      }),

    banners: router({
      list: protectedProcedure.query(({ ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Only administrators can manage Home banners");
        return db.listAdminHomeOfferBanners();
      }),

      create: protectedProcedure
        .input(z.object({
          title: z.string().trim().min(2).max(120),
          description: z.string().trim().min(2).max(280),
          badgeText: z.string().trim().max(48).nullable().optional(),
          couponCode: z.string().trim().max(48).nullable().optional(),
          imageUrl: z.string().url().nullable().optional(),
          backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
          actionType: z.enum(["none", "coupon", "category", "url"]),
          actionValue: z.string().trim().max(500).nullable().optional(),
          priority: z.number().int().min(0).max(999),
          isActive: z.boolean(),
          startsAt: z.coerce.date().nullable().optional(),
          endsAt: z.coerce.date().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only administrators can manage Home banners");
          if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new Error("Banner end time must be later than its start time");
          validateBannerAction(input.actionType, input.actionValue);
          const banner = await db.createHomeOfferBanner(input, ctx.user.id);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "created_home_banner", entityType: "banner", entityId: banner!.id, newValue: banner, status: "success" });
          return banner;
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          title: z.string().trim().min(2).max(120).optional(),
          description: z.string().trim().min(2).max(280).optional(),
          badgeText: z.string().trim().max(48).nullable().optional(),
          couponCode: z.string().trim().max(48).nullable().optional(),
          imageUrl: z.string().url().nullable().optional(),
          backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
          actionType: z.enum(["none", "coupon", "category", "url"]).optional(),
          actionValue: z.string().trim().max(500).nullable().optional(),
          priority: z.number().int().min(0).max(999).optional(),
          isActive: z.boolean().optional(),
          startsAt: z.coerce.date().nullable().optional(),
          endsAt: z.coerce.date().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only administrators can manage Home banners");
          const { id, ...changes } = input;
          const existing = await db.getHomeOfferBanner(id);
          if (!existing) throw new Error("Offer banner not found");
          const startsAt = changes.startsAt !== undefined ? changes.startsAt : existing.startsAt;
          const endsAt = changes.endsAt !== undefined ? changes.endsAt : existing.endsAt;
          if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) throw new Error("Banner end time must be later than its start time");
          validateBannerAction(
            changes.actionType ?? existing.actionType,
            changes.actionValue !== undefined ? changes.actionValue : existing.actionValue,
          );
          const result = await db.updateHomeOfferBanner(id, changes);
          const after = result.after!;
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "updated_home_banner", entityType: "banner", entityId: id, oldValue: result.before, newValue: after, changes, status: "success" });
          return after;
        }),

      remove: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only administrators can manage Home banners");
          const deleted = await db.deleteHomeOfferBanner(input.id);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "removed_home_banner", entityType: "banner", entityId: input.id, oldValue: deleted, status: "success" });
          return { success: true };
        }),
    }),

    sellers: router({
      list: protectedProcedure
        .input(z.object({ search: z.string().optional(), limit: z.number().min(1).max(100).optional() }).optional())
        .query(({ ctx, input }) => {
          if (ctx.user?.role !== "admin") {
            throw new Error("Only admins can view sellers");
          }
          return getAdminSellers(input?.limit ?? 50, 0, input?.search ?? "");
        }),

      pending: protectedProcedure
        .query(({ ctx }) => {
          if (ctx.user?.role !== "admin") {
            throw new Error("Only admins can view pending sellers");
          }
          return getPendingSellers();
        }),

      approve: protectedProcedure
        .input(z.number())
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") {
            throw new Error("Only admins can approve sellers");
          }
          const documents = await db.getSellerDocumentRecords(input);
          const requiredDocuments = ["aadhaar_card", "address_proof"];
          const incomplete = requiredDocuments.filter((type) => !documents.some((document: { documentType: string; status: string }) => document.documentType === type && document.status === "approved"));
          if (incomplete.length) throw new Error("Approve the required Aadhaar and address-proof documents before activating this seller");
          const result = await updateSellerStatus(input, "approved");
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "approved_seller", entityType: "seller", entityId: input, oldValue: { shopStatus: result.oldStatus }, newValue: { shopStatus: "approved" }, status: "success" });
          return result;
        }),

      reject: protectedProcedure
        .input(z.number())
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") {
            throw new Error("Only admins can reject sellers");
          }
          const result = await updateSellerStatus(input, "rejected");
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "rejected_seller", entityType: "seller", entityId: input, oldValue: { shopStatus: result.oldStatus }, newValue: { shopStatus: "rejected" }, status: "success" });
          return result;
        }),

      update: protectedProcedure
        .input(z.object({ id: z.number(), name: z.string().trim().min(2).max(100).optional(), email: z.string().email().nullable().optional(), phone: z.string().min(10).optional(), address: z.string().max(500).nullable().optional(), shopName: z.string().max(255).nullable().optional(), shopDescription: z.string().max(1000).nullable().optional(), shopStatus: z.enum(["pending", "approved", "rejected"]).optional(), isActive: z.boolean().optional() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can revise seller records");
          const { id, ...data } = input;
          if (data.shopStatus === "approved") {
            const documents = await db.getSellerDocumentRecords(id);
            const requiredDocuments = ["aadhaar_card", "address_proof"];
            const incomplete = requiredDocuments.filter((type) => !documents.some((document: { documentType: string; status: string }) => document.documentType === type && document.status === "approved"));
            if (incomplete.length) throw new Error("Approve the required Aadhaar and address-proof documents before activating this seller");
          }
          const result = await updateAdminSellerRecord(id, data);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "updated_seller_record", entityType: "seller", entityId: id, oldValue: result.before, newValue: result.after, changes: data, status: "success" });
          return result.after;
      }),
    }),

    deliveryPartnerReviews: router({
      list: protectedProcedure
        .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).optional())
        .query(({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only administrators can review delivery partners");
          return db.getDeliveryPartnerReviewRecords(input?.status);
        }),

      review: protectedProcedure
        .input(z.object({ partnerId: z.number(), status: z.enum(["approved", "rejected"]) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only administrators can review delivery partners");
          const result = await db.reviewDeliveryPartner(input.partnerId, input.status);
          await createAuditLog({
            adminId: ctx.user.id,
            adminName: ctx.user.name || "Administrator",
            action: input.status === "approved" ? "approved_delivery_partner" : "rejected_delivery_partner",
            entityType: "delivery_partner",
            entityId: input.partnerId,
            oldValue: { deliveryPartnerStatus: result.before.deliveryPartnerStatus },
            newValue: { deliveryPartnerStatus: input.status },
            status: "success",
          });
          await notifyDeliveryPartnerReview(input.partnerId, input.status, result.after.name);
          return result.after;
        }),
    }),

    users: router({
      list: protectedProcedure
        .input(z.object({ search: z.string().optional(), limit: z.number().min(1).max(100).optional() }).optional())
        .query(({ ctx, input }) => {
          if (ctx.user?.role !== "admin") {
            throw new Error("Only admins can view users");
          }
          return getAdminUsers(input?.limit ?? 50, 0, input?.search ?? "");
        }),

      update: protectedProcedure
        .input(z.object({ id: z.number(), name: z.string().trim().min(2).max(100).optional(), email: z.string().email().nullable().optional(), phone: z.string().min(10).optional(), address: z.string().max(500).nullable().optional(), isActive: z.boolean().optional() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can revise customer records");
          const { id, ...data } = input;
          const result = await updateAdminUserRecord(id, data);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "updated_customer_record", entityType: "user", entityId: id, oldValue: result.before, newValue: result.after, changes: data, status: "success" });
          return result.after;
        }),

      resetPassword: adminProcedure
        .input(z.object({
          customerId: z.number().int().positive(),
          password: z.string().min(8).max(128),
          identityVerified: z.literal(true),
        }))
        .mutation(async ({ ctx, input }) => {
          await db.adminResetCustomerPassword({
            customerId: input.customerId,
            password: input.password,
            adminId: ctx.user.id,
            adminName: ctx.user.name || "Administrator",
            ipAddress: ctx.req.ip,
            userAgent: ctx.req.get("user-agent") || undefined,
          });
          return { success: true };
        }),
    }),

    orders: router({
      list: protectedProcedure
        .input(z.object({ limit: z.number().min(1).max(1000).optional() }).optional())
        .query(({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can view orders");
          return getAdminOrders(input?.limit ?? 100, 0);
        }),

      updateStatus: protectedProcedure
        .input(z.object({ id: z.number(), status: z.enum(["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"]) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can update orders");
          const result = await updateOrderStatus(input.id, input.status);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "updated_order_status", entityType: "order", entityId: input.id, oldValue: { status: result.oldStatus }, newValue: { status: input.status }, status: "success" });
          return result;
        }),

      updatePaymentStatus: protectedProcedure
        .input(z.object({ id: z.number(), paymentStatus: z.enum(["pending", "completed", "failed"]) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can verify payments");
          const result = await db.updatePaymentStatus(input.id, input.paymentStatus);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "updated_payment_status", entityType: "order", entityId: input.id, oldValue: {}, newValue: { paymentStatus: input.paymentStatus }, status: "success" });
          return result;
        }),
    }),

    products: router({
      list: protectedProcedure
        .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
        .query(({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can view products");
          return getAdminProducts(input?.limit ?? 100, 0);
        }),

      create: protectedProcedure
        .input(z.object({
          sellerId: z.number().int().positive(),
          categoryId: z.number().int().positive(),
          name: z.string().trim().min(2).max(255),
          description: z.string().trim().max(2000).optional(),
          price: z.number().finite().positive(),
          originalPrice: z.number().finite().positive().optional(),
          discount: z.number().int().min(0).max(100).optional(),
          stock: z.number().int().min(0),
          images: z.array(z.string().url()).max(8).optional(),
          isFeatured: z.boolean().optional(),
          publishImmediately: z.boolean().default(true),
        }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can create products");
          const seller = await db.getUserById(input.sellerId);
          if (!seller || seller.role !== "seller") throw new Error("Choose a valid seller account");
          if (!seller.isActive || seller.shopStatus !== "approved") throw new Error("Products can only be published for an approved active seller");
          const category = await db.getCategoryById(input.categoryId);
          if (!category || !category.isActive) throw new Error("Choose an active category");
          const productId = await db.createProduct({
            sellerId: input.sellerId,
            categoryId: input.categoryId,
            name: input.name,
            description: input.description || null,
            price: input.price.toFixed(2),
            originalPrice: input.originalPrice?.toFixed(2),
            discount: input.discount ?? 0,
            stock: input.stock,
            images: input.images ?? [],
            isFeatured: input.isFeatured ?? false,
            approvalStatus: input.publishImmediately ? "approved" : "pending",
            isActive: input.publishImmediately,
            ...(input.publishImmediately ? { moderatedBy: ctx.user.id, moderatedAt: new Date() } : {}),
          } as any);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: input.publishImmediately ? "created_and_published_product" : "created_product_submission", entityType: "product", entityId: Number(productId), newValue: { ...input, approvalStatus: input.publishImmediately ? "approved" : "pending" }, status: "success" });
          return db.getProductById(Number(productId));
        }),

      updateStatus: protectedProcedure
        .input(z.object({ id: z.number(), isActive: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can update products");
          const result = await updateProductStatus(input.id, input.isActive);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "updated_product_status", entityType: "product", entityId: input.id, newValue: { isActive: input.isActive }, status: "success" });
          return result;
        }),

      updateStock: protectedProcedure
        .input(z.object({ id: z.number(), stock: z.number().int().min(0) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can update product stock");
          const result = await updateProductStock(input.id, input.stock);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "updated_product_stock", entityType: "product", entityId: input.id, newValue: { stock: input.stock }, status: "success" });
          return result;
        }),
    }),

    verification: router({
      documents: protectedProcedure.query(({ ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Only admins can review seller documents");
        return db.getPendingSellerDocumentRecords();
      }),

      reviewDocument: protectedProcedure
        .input(z.object({ documentId: z.number(), status: z.enum(["approved", "rejected"]), note: z.string().max(1000).optional() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can review seller documents");
          const record = await db.reviewSellerDocumentRecord(input.documentId, ctx.user.id, input.status, input.note);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "reviewed_seller_document", entityType: "seller_document", entityId: input.documentId, newValue: { status: input.status, note: input.note }, status: "success" });
          return record;
        }),

      payouts: protectedProcedure.query(({ ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Only admins can review seller payouts");
        return db.getPendingSellerPayoutProfiles();
      }),

      reviewPayout: protectedProcedure
        .input(z.object({ sellerId: z.number(), status: z.enum(["verified", "rejected"]), note: z.string().max(1000).optional() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can review seller payouts");
          const record = await db.reviewSellerPayoutProfile(input.sellerId, ctx.user.id, input.status, input.note);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "reviewed_seller_payout", entityType: "seller_payout", entityId: input.sellerId, newValue: { status: input.status, note: input.note }, status: "success" });
          return record;
        }),

      products: protectedProcedure.query(({ ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Only admins can moderate products");
        return db.getPendingProductModeration();
      }),

      reviewProduct: protectedProcedure
        .input(z.object({ productId: z.number(), status: z.enum(["approved", "rejected"]), note: z.string().max(1000).optional() }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.user?.role !== "admin") throw new Error("Only admins can moderate products");
          const record = await db.reviewProductModeration(input.productId, ctx.user.id, input.status, input.note);
          await createAuditLog({ adminId: ctx.user.id, adminName: ctx.user.name || "Administrator", action: "moderated_seller_product", entityType: "product", entityId: input.productId, newValue: { status: input.status, note: input.note }, status: "success" });
          return record;
        }),
    }),

    analytics: router({
      getByDateRange: protectedProcedure
        .input(z.object({
          startDate: z.date(),
          endDate: z.date(),
        }))
        .query(({ ctx, input }) => {
          if (ctx.user?.role !== "admin") {
            throw new Error("Only admins can view analytics");
          }
          return db.getAnalytics(input.startDate, input.endDate);
        }),
    }),
  }),

  // ============= USER PROFILE =============
  user: router({
    getProfile: protectedProcedure
      .query(({ ctx }) => db.getUserById(ctx.user!.id)),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        profilePhoto: z.string().optional(),
      }))
      .mutation(({ ctx, input }) =>
        db.updateUser(ctx.user!.id, input)
      ),

    updateAddress: protectedProcedure
      .input(z.object({
        address: z.string(),
      }))
      .mutation(({ ctx, input }) =>
        db.updateUser(ctx.user!.id, input)
      ),
  }),
});

export type AppRouter = typeof appRouter;
