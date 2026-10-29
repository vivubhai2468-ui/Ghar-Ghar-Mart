import { eq, and, or, desc, like, gte, lte, asc, sql, isNull } from "drizzle-orm";

import { createHash, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

let dbInstance: any = null;
const scrypt = promisify(scryptCallback);

export async function getDb(): Promise<any> {
  if (dbInstance) return dbInstance;
  if (!ENV.databaseUrl) return null;

  const databaseUrl = new URL(ENV.databaseUrl);

  const pool = mysql.createPool({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, "")),
    ssl: {
      rejectUnauthorized: true,
    },
    waitForConnections: true,
    connectionLimit: 10,
  });

  dbInstance = drizzle(pool);
  return dbInstance;
}
import {
  users,
  products,
  categories,
  cartItems,
  orders,
  auditLogs,
  orderItems,
  wishlistItems,
  reviews,
  coupons,
  notifications,
  sellerEarnings,
  deliveryEarnings,
  analyticsLogs,
  deliveryLocations,
  deliveryEvents,
  devicePushTokens,
  phoneOtpChallenges,
  sellerDocuments,
  sellerPayoutProfiles,
  regionalInventories,
  customerAddresses,
  homeOfferBanners,
  customerPasswordResetTokens,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type InsertOrderItem,
  type InsertCartItem,
  type InsertWishlistItem,
  type InsertReview,
  type InsertNotification,
  type InsertSellerEarning,
  type InsertDeliveryEarning,
  type InsertAnalyticsLog,
  type InsertDeliveryLocation,
  type InsertDeliveryEvent,
  type InsertDevicePushToken,
  type InsertPhoneOtpChallenge,
  type InsertSellerDocument,
  type InsertCustomerAddress,
  type InsertHomeOfferBanner,
} from "../drizzle/schema";

export type HomeOfferBannerInput = Pick<
  InsertHomeOfferBanner,
  "title" | "description" | "badgeText" | "couponCode" | "imageUrl" | "backgroundColor" | "actionType" | "actionValue" | "priority" | "isActive" | "startsAt" | "endsAt"
>;

export async function listAdminHomeOfferBanners() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(homeOfferBanners).orderBy(asc(homeOfferBanners.priority), desc(homeOfferBanners.updatedAt));
}

export async function listActiveHomeOfferBanners() {
  const now = new Date();
  const banners = await listAdminHomeOfferBanners();
  return banners.filter((banner: any) =>
    banner.isActive &&
    (!banner.startsAt || new Date(banner.startsAt) <= now) &&
    (!banner.endsAt || new Date(banner.endsAt) >= now),
  );
}

export async function getHomeOfferBanner(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(homeOfferBanners).where(eq(homeOfferBanners.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createHomeOfferBanner(input: HomeOfferBannerInput, createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(homeOfferBanners).values({ ...input, createdBy });
  const insertId = Number((result as any).insertId ?? (result as any)[0]?.insertId);
  if (!Number.isFinite(insertId)) throw new Error("Offer banner could not be reloaded after creation");
  return getHomeOfferBanner(insertId);
}

export async function updateHomeOfferBanner(id: number, input: Partial<HomeOfferBannerInput>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const before = await getHomeOfferBanner(id);
  if (!before) throw new Error("Offer banner not found");
  await db.update(homeOfferBanners).set(input).where(eq(homeOfferBanners.id, id));
  return { before, after: await getHomeOfferBanner(id) };
}

export async function deleteHomeOfferBanner(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const before = await getHomeOfferBanner(id);
  if (!before) throw new Error("Offer banner not found");
  await db.delete(homeOfferBanners).where(eq(homeOfferBanners.id, id));
  return before;
}

export type CustomerAddressInput = {
  label: string;
  recipientName?: string;
  phone?: string;
  addressLine: string;
  apartment?: string;
  floor?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  deliveryInstructions?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
};

export async function listCustomerAddresses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customerAddresses).where(eq(customerAddresses.userId, userId)).orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.updatedAt));
}

export async function getCustomerAddress(addressId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(customerAddresses).where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function createCustomerAddress(userId: number, input: CustomerAddressInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await listCustomerAddresses(userId);
  const shouldDefault = Boolean(input.isDefault) || current.length === 0;
  if (shouldDefault) await db.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.userId, userId));
  const result = await db.insert(customerAddresses).values({ ...input, userId, isDefault: shouldDefault });
  return getCustomerAddress(Number(result.insertId), userId);
}

export async function updateCustomerAddress(addressId: number, userId: number, input: Partial<CustomerAddressInput>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getCustomerAddress(addressId, userId);
  if (!existing) throw new Error("Address not found");
  if (input.isDefault) await db.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.userId, userId));
  await db.update(customerAddresses).set(input).where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId)));
  return getCustomerAddress(addressId, userId);
}

export async function deleteCustomerAddress(addressId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getCustomerAddress(addressId, userId);
  if (!existing) throw new Error("Address not found");
  await db.delete(customerAddresses).where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId)));
  if (existing.isDefault) {
    const remaining = await listCustomerAddresses(userId);
    if (remaining[0]) await db.update(customerAddresses).set({ isDefault: true }).where(eq(customerAddresses.id, remaining[0].id));
  }
  return { deleted: true };
}

export async function setCustomerDefaultAddress(addressId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getCustomerAddress(addressId, userId);
  if (!existing) throw new Error("Address not found");
  await db.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.userId, userId));
  await db.update(customerAddresses).set({ isDefault: true }).where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, userId)));
  return getCustomerAddress(addressId, userId);
}


// ============= PRODUCTS =============

async function applyRegionalAvailability<T extends { id: number; stock: unknown }>(items: T[], pincode?: string) {
  if (!pincode || items.length === 0) return items;
  const db = await getDb();
  if (!db) return items;
  const overrides = await db.select().from(regionalInventories).where(eq(regionalInventories.pincode, pincode));
  const byProduct = new Map<number, { stock: number; isAvailable: boolean }>(overrides.map((override: any) => [override.productId, { stock: Number(override.stock), isAvailable: Boolean(override.isAvailable) }]));
  return items
    .map((item: any) => {
      const override = byProduct.get(item.id);
      return override ? { ...item, stock: override.stock, regionalAvailable: override.isAvailable && override.stock > 0 } : { ...item, regionalAvailable: Number(item.stock) > 0 };
    })
    .filter((item: any) => item.regionalAvailable);
}

export async function getProducts(limit = 20, offset = 0, pincode?: string) {
  const db = await getDb();
  if (!db) return [];
  const items = await db
    .select()
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.approvalStatus, "approved")))
    .orderBy(desc(products.isFeatured), desc(products.rating), desc(products.createdAt))
    .limit(limit)
    .offset(offset);
  return applyRegionalAvailability(items, pincode);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(and(eq(products.id, id), eq(products.isActive, true), eq(products.approvalStatus, "approved")));
  return result[0] || null;
}

export async function getProductsByCategory(categoryId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(
      and(eq(products.categoryId, categoryId), eq(products.isActive, true), eq(products.approvalStatus, "approved"))
    )
    .limit(limit);
}

export async function getSellerProducts(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.sellerId, sellerId));
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(data);
  const insertId = Number((result as any).insertId ?? (result as any)[0]?.insertId);
  if (!Number.isFinite(insertId)) throw new Error("Product was created but its ID could not be determined");
  return insertId;
}

export async function updateProduct(
  id: number,
  data: Partial<InsertProduct>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(products).where(eq(products.id, id));
}

export async function searchProducts(query: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(
      and(
        like(products.name, `%${query}%`),
        eq(products.isActive, true),
        eq(products.approvalStatus, "approved")
      )
    )
    .limit(20);
}

// ============= CATEGORIES =============

export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isActive, true));
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id));
  return result[0] || null;
}

/**
 * Get all categories with product count for each category
 */
export async function getCategoriesWithCounts(pincode?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true));
  
  // Fetch product counts for each category
  const categoriesWithCounts = await Promise.all(
    allCategories.map(async (cat: any) => {
      const categoryProducts = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.categoryId, cat.id),
            eq(products.isActive, true),
            eq(products.approvalStatus, "approved")
          )
        );
      const visibleProducts = await applyRegionalAvailability(categoryProducts, pincode);
      return {
        ...cat,
        productCount: visibleProducts.length,
      };
    })
  );
  
  return categoriesWithCounts;
}

/**
 * Get products by category with optional filtering and sorting
 */
export async function getProductsByCategoryWithFilters(
  categoryId: number,
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'price' | 'rating' | 'newest';
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    pincode?: string;
  }
) {
  const db = await getDb();
  if (!db) return [];
  
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  const sortBy = options?.sortBy || 'name';
  const minPrice = options?.minPrice;
  const maxPrice = options?.maxPrice;
  const minRating = options?.minRating;
  
  let query = db
    .select()
    .from(products)
    .where(
      and(
        eq(products.categoryId, categoryId),
        eq(products.isActive, true),
        eq(products.approvalStatus, "approved"),
        minPrice !== undefined ? gte(products.price, minPrice.toString()) : undefined,
        maxPrice !== undefined ? lte(products.price, maxPrice.toString()) : undefined,
        minRating !== undefined ? gte(products.rating, minRating.toString()) : undefined
      )
    );
  
  // Apply sorting
  switch (sortBy) {
    case 'price':
      query = query.orderBy(asc(products.price));
      break;
    case 'rating':
      query = query.orderBy(desc(products.rating));
      break;
    case 'newest':
      query = query.orderBy(desc(products.createdAt));
      break;
    case 'name':
    default:
      query = query.orderBy(asc(products.name));
  }
  
  const items = await query.limit(limit).offset(offset);
  return applyRegionalAvailability(items, options?.pincode);
}

/**
 * Search products across all categories
 */
export async function searchProductsAdvanced(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    categoryId?: number;
    sortBy?: 'name' | 'price' | 'rating' | 'relevance';
    pincode?: string;
  }
) {
  const db = await getDb();
  if (!db) return [];
  
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  const sortBy = options?.sortBy || 'relevance';
  const categoryId = options?.categoryId;
  
  const searchTerm = `%${query}%`;
  
  let whereConditions: any[] = [
    eq(products.isActive, true),
    eq(products.approvalStatus, "approved"),
    or(
      like(products.name, searchTerm),
      like(products.description, searchTerm)
    ),
  ];
  
  if (categoryId) {
    whereConditions.push(eq(products.categoryId, categoryId));
  }
  
  let dbQuery = db
    .select()
    .from(products)
    .where(and(...whereConditions));
  
  // Apply sorting
  switch (sortBy) {
    case 'price':
      dbQuery = dbQuery.orderBy(asc(products.price));
      break;
    case 'rating':
      dbQuery = dbQuery.orderBy(desc(products.rating));
      break;
    case 'relevance':
    default:
      dbQuery = dbQuery.orderBy(desc(products.rating), desc(products.reviewCount));
  }
  
  const items = await dbQuery.limit(limit).offset(offset);
  return applyRegionalAvailability(items, options?.pincode);
}

/**
 * Rank products from a customer's delivered orders by purchase frequency and
 * recent activity. Only active, approved products remain eligible.
 */
export async function getBuyAgainProducts(userId: number, limit = 8, pincode?: string) {
  const db = await getDb();
  if (!db) return [];
  const deliveredOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "delivered")))
    .orderBy(desc(orders.deliveredAt), desc(orders.createdAt))
    .limit(30);
  if (deliveredOrders.length === 0) return [];

  const orderIds = deliveredOrders.map((order: any) => order.id);
  const itemGroups = await Promise.all(orderIds.map((orderId: number) => db.select().from(orderItems).where(eq(orderItems.orderId, orderId))));
  const scores = new Map<number, number>();
  itemGroups.flat().forEach((item: any, index: number) => {
    const recencyWeight = Math.max(1, 30 - index);
    scores.set(item.productId, (scores.get(item.productId) ?? 0) + Number(item.quantity) * recencyWeight);
  });

  const rankedIds = [...scores.entries()]
    .sort(([, left], [, right]) => right - left)
    .slice(0, limit * 2)
    .map(([productId]) => productId);
  const candidateRows = await Promise.all(rankedIds.map(async (productId) => {
    const rows = await db.select().from(products).where(and(eq(products.id, productId), eq(products.isActive, true), eq(products.approvalStatus, "approved"))).limit(1);
    return rows[0];
  }));
  const visible = await applyRegionalAvailability(candidateRows.filter(Boolean) as any[], pincode);
  return visible.sort((left: any, right: any) => (scores.get(right.id) ?? 0) - (scores.get(left.id) ?? 0)).slice(0, limit);
}

// ============= CART =============

export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cartItems).where(eq(cartItems.userId, userId));
}

export async function addToCart(data: InsertCartItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if item already exists
  const existing = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.userId, data.userId),
        eq(cartItems.productId, data.productId)
      )
    );

  if (existing.length > 0) {
    // Update quantity
    await db
      .update(cartItems)
      .set({ quantity: existing[0].quantity + (data.quantity || 1) })
      .where(eq(cartItems.id, existing[0].id));
    return existing[0].id;
  }

  const result = await db.insert(cartItems).values(data);
  return result.insertId;
}

export async function updateCartItem(id: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id));
}

export async function removeFromCart(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cartItems).where(eq(cartItems.id, id));
}

export async function clearCart(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}

// ============= ORDERS =============

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(orders).values(data);
  const created = await db.select().from(orders).where(eq(orders.orderNumber, data.orderNumber)).limit(1);
  if (!created[0]) throw new Error("Order was created but could not be reloaded");
  return created[0].id;
}

export async function createCustomerDeliveryOtp(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const code = randomInt(1000, 10000).toString();
  await db.update(orders).set({
    deliveryOtpHash: hashDeliveryOtp(code),
    deliveryOtpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    deliveryOtpVerified: false,
  }).where(eq(orders.id, orderId));
  return code;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, id));
  return result[0] || null;
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function getSellerOrders(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.sellerId, sellerId))
    .orderBy(desc(orders.createdAt));
}

export async function savePaymentProof(orderId: number, userId: number, base64Data: string, contentType: "image/jpeg" | "image/png") {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const order = await getOrderById(orderId);
  if (!order || order.userId !== userId) throw new Error("You can only upload proof for your own order");
  if (order.paymentMethod !== "online") throw new Error("Payment proof is only required for online payments");
  if (!base64Data || base64Data.length > 15_000_000) throw new Error("Payment proof image is missing or too large");
  const extension = contentType === "image/png" ? "png" : "jpg";
  const bytes = Buffer.from(base64Data, "base64");
  if (!bytes.length) throw new Error("Payment proof image could not be read");
  const stored = await storagePut(`payment-proofs/${userId}/${orderId}.${extension}`, bytes, contentType);
  await database.update(orders).set({ paymentProofUrl: stored.url, paymentProofUploadedAt: new Date(), paymentStatus: "pending" }).where(eq(orders.id, orderId));
  return { success: true, url: stored.url };
}

export async function updatePaymentStatus(orderId: number, paymentStatus: "pending" | "completed" | "failed") {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.update(orders).set({ paymentStatus }).where(eq(orders.id, orderId));
  return getOrderById(orderId);
}

export async function updateOrderStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(orders)
    .set({ status: status as any })
    .where(eq(orders.id, id));
}

export async function addOrderItems(items: InsertOrderItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(orderItems).values(items);
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

// ============= WISHLIST =============

export async function getWishlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId));
}

export async function addToWishlist(data: InsertWishlistItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(wishlistItems).values(data);
  return result.insertId;
}

export async function removeFromWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.productId, productId)
      )
    );
}

// ============= REVIEWS =============

export async function getProductReviews(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt));
}

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reviews).values(data);
  return result.insertId;
}

// ============= COUPONS =============

export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(coupons)
    .where(
      and(eq(coupons.code, code), eq(coupons.isActive, true))
    );
  return result[0] || null;
}

export async function validateCoupon(code: string, orderValue: number) {
  const coupon = await getCouponByCode(code);
  if (!coupon) return null;
  if (coupon.expiryDate && coupon.expiryDate < new Date()) return null;
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) return null;
  if (orderValue < Number(coupon.minOrderValue)) return null;
  return coupon;
}

// ============= NOTIFICATIONS =============

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result.insertId;
}

export async function markNotificationAsRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

// ============= SELLER EARNINGS =============

export async function getSellerEarnings(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sellerEarnings)
    .where(eq(sellerEarnings.sellerId, sellerId))
    .orderBy(desc(sellerEarnings.createdAt));
}

export async function getTotalSellerEarnings(sellerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select()
    .from(sellerEarnings)
    .where(eq(sellerEarnings.sellerId, sellerId));
  return result.reduce((sum: number, item: any) => sum + Number(item.netAmount), 0);
}

export async function createSellerEarning(data: InsertSellerEarning) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sellerEarnings).values(data);
  return result.insertId;
}

// ============= DELIVERY PARTNER EARNINGS =============

export async function getDeliveryPartnerEarnings(partnerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(deliveryEarnings)
    .where(eq(deliveryEarnings.partnerId, partnerId))
    .orderBy(desc(deliveryEarnings.createdAt));
}

export async function createDeliveryPartnerEarning(data: InsertDeliveryEarning) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(deliveryEarnings)
    .where(eq(deliveryEarnings.orderId, data.orderId))
    .limit(1);
  if (existing[0]) return existing[0];
  await db.insert(deliveryEarnings).values(data);
  return (await db.select().from(deliveryEarnings).where(eq(deliveryEarnings.orderId, data.orderId)).limit(1))[0];
}

export async function getDeliveryPartnerRouteSummary(partnerId: number) {
  const db = await getDb();
  if (!db) return { deliveredToday: 0, activeDeliveries: 0, todayEarnings: 0, totalEarnings: 0, recentDeliveries: [] as any[] };
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [earnings, completed, active] = await Promise.all([
    getDeliveryPartnerEarnings(partnerId),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.deliveryPartnerId, partnerId), eq(orders.status, "delivered"), gte(orders.deliveredAt, startOfDay)))
      .orderBy(desc(orders.deliveredAt)),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.deliveryPartnerId, partnerId), eq(orders.status, "shipped"))),
  ]);
  const todayEarnings = earnings
    .filter((earning: any) => new Date(earning.createdAt).getTime() >= startOfDay.getTime())
    .reduce((sum: number, earning: any) => sum + Number(earning.netAmount), 0);
  const totalEarnings = earnings.reduce((sum: number, earning: any) => sum + Number(earning.netAmount), 0);
  return { deliveredToday: completed.length, activeDeliveries: active.length, todayEarnings, totalEarnings, recentDeliveries: completed.slice(0, 8) };
}

// ============= ANALYTICS =============

export async function logAnalyticsEvent(data: InsertAnalyticsLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(analyticsLogs).values(data);
}

export async function getAnalytics(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(analyticsLogs)
    .where(
      and(
        gte(analyticsLogs.createdAt, startDate),
        lte(analyticsLogs.createdAt, endDate)
      )
    );
}

// ============= USERS =============

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] || null;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.openId, openId));
  return result[0] || null;
}

export async function upsertUser(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const isConfiguredOwner =
    typeof ENV.ownerOpenId === "string" &&
    ENV.ownerOpenId.length > 0 &&
    data.openId === ENV.ownerOpenId;

  const existing = await getUserByOpenId(data.openId);

  if (existing) {
    const updateData = { ...data };

    // Only the server-configured owner can receive the admin role here.
    if (isConfiguredOwner) {
      updateData.role = "admin";
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.openId, data.openId));

    return existing.id;
  }

  const insertData = { ...data };

  if (isConfiguredOwner) {
    insertData.role = "admin";
  }

  const result = await db.insert(users).values(insertData);
  return result.insertId;
}

export async function updateUser(id: number, data: Partial<any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function updateSellerShopProfile(
  sellerId: number,
  data: { shopName?: string; shopDescription?: string | null; shopLogo?: string | null; address?: string | null; shopHours?: unknown }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(and(eq(users.id, sellerId), eq(users.role, "seller")));
  return getUserById(sellerId);
}

// ============= CONSUMER PHONE OTP AUTH =============

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_REQUESTS_PER_10_MINUTES = 3;

export function normalizeIndianPhone(phone: string) {
  const compact = phone.replace(/[\s()-]/g, "");
  if (/^\d{10}$/.test(compact)) return `+91${compact}`;
  if (/^\+\d{10,15}$/.test(compact)) return compact;
  throw new Error("Enter a valid mobile number");
}

function hashPhoneOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function normalizeAadhaar(aadhaarNumber: string) {
  const digits = aadhaarNumber.replace(/\D/g, "");
  if (!/^\d{12}$/.test(digits)) throw new Error("Enter a valid 12-digit Aadhaar number");
  return digits;
}

export async function createPhoneOtpChallenge(phone: string, purpose: "login" | "signup" | "phone_change") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedPhone = normalizeIndianPhone(phone);
  const rateLimitSince = new Date(Date.now() - OTP_TTL_MS);
  const recent = await db
    .select({ count: sql<number>`count(*)` })
    .from(phoneOtpChallenges)
    .where(and(eq(phoneOtpChallenges.phone, normalizedPhone), eq(phoneOtpChallenges.purpose, purpose), gte(phoneOtpChallenges.createdAt, rateLimitSince)));

  if (Number(recent[0]?.count ?? 0) >= OTP_MAX_REQUESTS_PER_10_MINUTES) {
    throw new Error("Too many OTP requests. Please try again in a few minutes.");
  }

  const code = randomInt(100000, 1_000_000).toString();
  const data: InsertPhoneOtpChallenge = {
    phone: normalizedPhone,
    purpose,
    codeHash: hashPhoneOtp(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  };
  await db.insert(phoneOtpChallenges).values(data);
  return { phone: normalizedPhone, code, expiresAt: data.expiresAt };
}

export async function verifyPhoneOtpChallenge(phone: string, purpose: "login" | "signup" | "phone_change", code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedPhone = normalizeIndianPhone(phone);
  const challenge = (await db
    .select()
    .from(phoneOtpChallenges)
    .where(and(
      eq(phoneOtpChallenges.phone, normalizedPhone),
      eq(phoneOtpChallenges.purpose, purpose),
      sql`${phoneOtpChallenges.consumedAt} IS NULL`,
    ))
    .orderBy(desc(phoneOtpChallenges.createdAt))
    .limit(1))[0];

  if (!challenge || challenge.expiresAt.getTime() < Date.now()) throw new Error("OTP has expired. Please request a new code.");
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) throw new Error("Too many incorrect OTP attempts. Please request a new code.");

  if (hashPhoneOtp(code) !== challenge.codeHash) {
    await db.update(phoneOtpChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(phoneOtpChallenges.id, challenge.id));
    throw new Error("Incorrect OTP. Please try again.");
  }

  await db.update(phoneOtpChallenges).set({ consumedAt: new Date() }).where(eq(phoneOtpChallenges.id, challenge.id));
  return { phone: normalizedPhone };
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const normalizedPhone = normalizeIndianPhone(phone);
  return (await db.select().from(users).where(eq(users.phone, normalizedPhone)).limit(1))[0] ?? null;
}

async function hashDirectPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyDirectPassword(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

async function hashPartnerPassword(password?: string) {
  if (!password) throw new Error("A password is required for seller and delivery-partner accounts.");
  return hashDirectPassword(password);
}

/** Creates a customer account without SMS verification. Seller and delivery-partner accounts remain OTP verified. */
export async function createDirectCustomerAccount(input: { name: string; phone: string; address: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const phone = normalizeIndianPhone(input.phone);
  const existing = await getUserByPhone(phone);
  if (existing) {
    if (existing.role !== "user") throw new Error("This mobile number belongs to a verified partner account. Use the partner sign-in path.");
    await db.update(users).set({
      name: input.name.trim(),
      address: input.address.trim(),
      loginMethod: "direct_password",
      passwordHash: await hashDirectPassword(input.password),
      lastSignedIn: new Date(),
    }).where(eq(users.id, existing.id));
    return getUserById(existing.id);
  }
  await db.insert(users).values({
    openId: `direct:${phone}`,
    name: input.name.trim(),
    phone,
    address: input.address.trim(),
    loginMethod: "direct_password",
    passwordHash: await hashDirectPassword(input.password),
    role: "user",
    lastSignedIn: new Date(),
  });
  return getUserByPhone(phone);
}

/** Signs in a direct customer account without OTP. */
export async function signInDirectCustomer(input: { phone: string; password: string }) {
  const user = await getUserByPhone(input.phone);
  if (!user || user.role !== "user" || !user.passwordHash || !(await verifyDirectPassword(input.password, user.passwordHash))) {
    throw new Error("Mobile number or password is incorrect");
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return getUserById(user.id);
}

export async function createPasswordResetToken(phone: string, role: "user" | "seller" | "delivery_partner") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const user = await getUserByPhone(phone);
  if (!user || user.role !== role || !user.email) return null;

  const since = new Date(Date.now() - 15 * 60 * 1000);
  const recentRequests = await db.select({ count: sql<number>`count(*)` })
    .from(customerPasswordResetTokens)
    .where(and(eq(customerPasswordResetTokens.userId, user.id), gte(customerPasswordResetTokens.createdAt, since)));
  if (Number(recentRequests[0]?.count ?? 0) >= 3) {
    throw new Error("Too many password reset requests. Please try again in a few minutes.");
  }

  const token = randomBytes(32).toString("hex");
  await db.update(customerPasswordResetTokens)
    .set({ consumedAt: new Date() })
    .where(and(eq(customerPasswordResetTokens.userId, user.id), sql`${customerPasswordResetTokens.consumedAt} IS NULL`));
  await db.insert(customerPasswordResetTokens).values({
    userId: user.id,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });
  return { email: user.email, token };
}

export async function invalidatePasswordResetToken(phone: string, role: "user" | "seller" | "delivery_partner", token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const user = await getUserByPhone(phone);
  if (!user || user.role !== role) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.update(customerPasswordResetTokens)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(customerPasswordResetTokens.userId, user.id),
      eq(customerPasswordResetTokens.tokenHash, tokenHash),
      sql`${customerPasswordResetTokens.consumedAt} IS NULL`,
    ));
}

export async function resetAccountPassword(input: { phone: string; role: "user" | "seller" | "delivery_partner"; token: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const passwordHash = await hashDirectPassword(input.password);

  await db.transaction(async (tx: any) => {
    const resetToken = (await tx.select()
      .from(customerPasswordResetTokens)
      .where(and(
        eq(customerPasswordResetTokens.tokenHash, tokenHash),
        sql`${customerPasswordResetTokens.consumedAt} IS NULL`,
      ))
      .limit(1)
      .for("update"))[0];
    if (!resetToken || resetToken.expiresAt.getTime() <= Date.now()) {
      throw new Error("This password reset link is invalid or expired. Request a new link.");
    }

    const user = (await tx.select().from(users).where(eq(users.id, resetToken.userId)).limit(1))[0];
    if (!user || user.role !== input.role || normalizeIndianPhone(input.phone) !== user.phone) {
      throw new Error("The mobile number does not match this account.");
    }

    await tx.update(users).set({
      loginMethod: user.role === "user" ? "direct_password" : "phone_password",
      passwordHash,
    }).where(eq(users.id, user.id));
    await tx.update(customerPasswordResetTokens)
      .set({ consumedAt: new Date() })
      .where(eq(customerPasswordResetTokens.id, resetToken.id));
  });
}

export async function adminResetCustomerPassword(input: {
  customerId: number;
  password: string;
  adminId: number;
  adminName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const passwordHash = await hashDirectPassword(input.password);

  await db.transaction(async (tx: any) => {
    const customer = (await tx.select().from(users).where(eq(users.id, input.customerId)).limit(1).for("update"))[0];
    if (!customer || customer.role !== "user") {
      throw new Error("Customer account not found");
    }

    await tx.update(users).set({
      loginMethod: "direct_password",
      passwordHash,
    }).where(eq(users.id, customer.id));
    await tx.insert(auditLogs).values({
      adminId: input.adminId,
      adminName: input.adminName,
      action: "admin_reset_customer_password",
      entityType: "user",
      entityId: customer.id,
      newValue: { recoveryMethod: "admin_verified" },
      changes: { identityVerified: true },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: "success",
    });
  });
}

export async function signInPartnerWithPassword(input: { phone: string; password: string; role: "seller" | "delivery_partner" }) {
  const user = await getUserByPhone(input.phone);
  if (!user || user.role !== input.role || !user.passwordHash || !(await verifyDirectPassword(input.password, user.passwordHash))) {
    throw new Error("Mobile number or password is incorrect");
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return getUserById(user.id);
}

export async function setPartnerPassword(input: { phone: string; password: string; role: "seller" | "delivery_partner" }) {
  const user = await getUserByPhone(input.phone);
  if (!user || user.role !== input.role) {
    throw new Error("No matching partner account exists for this mobile number.");
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    loginMethod: "phone_password",
    passwordHash: await hashDirectPassword(input.password),
    lastSignedIn: new Date(),
  }).where(eq(users.id, user.id));
  return getUserById(user.id);
}

export async function findOrCreatePhoneUser(input: { phone: string; name?: string; email?: string; address?: string; role?: "customer" | "seller" | "delivery_partner"; aadhaarNumber?: string; shopName?: string; password?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const phone = normalizeIndianPhone(input.phone);
  const isPartner = input.role === "seller" || input.role === "delivery_partner";
  if (isPartner && !input.password) throw new Error("A password is required for seller and delivery-partner accounts.");
  const existing = await getUserByPhone(phone);
  if (existing) {
    if ((input.role === "seller" || input.role === "delivery_partner") && existing.role === "user") {
      const aadhaar = normalizeAadhaar(input.aadhaarNumber ?? "");
      await db.update(users).set({
        role: input.role,
        name: input.name?.trim() || existing.name,
        ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
        address: input.address?.trim() || existing.address,
        loginMethod: "phone_password",
        passwordHash: await hashPartnerPassword(input.password),
        aadhaarHash: createHash("sha256").update(aadhaar).digest("hex"),
        aadhaarLast4: aadhaar.slice(-4),
        ...(input.role === "seller" ? {
          shopName: input.shopName?.trim() || `${input.name?.trim() || existing.name || "Ghar Ghar Mart"} Store`,
          shopStatus: "pending" as const,
        } : {}),
        ...(input.role === "delivery_partner" ? { deliveryPartnerStatus: "pending" as const } : {}),
      }).where(eq(users.id, existing.id));
      return (await db.select().from(users).where(eq(users.id, existing.id)).limit(1))[0];
    }
    if (isPartner && existing.role === input.role) {
      await db.update(users).set({
        loginMethod: "phone_password",
        passwordHash: await hashPartnerPassword(input.password),
        ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
      }).where(eq(users.id, existing.id));
      return (await db.select().from(users).where(eq(users.id, existing.id)).limit(1))[0];
    }
    return existing;
  }

  const aadhaar = input.role === "seller" || input.role === "delivery_partner" ? normalizeAadhaar(input.aadhaarNumber ?? "") : null;

  await db.insert(users).values({
    openId: `phone:${phone}`,
    name: input.name?.trim() || "Ghar Ghar Mart customer",
    ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
    phone,
    address: input.address?.trim() || null,
    loginMethod: isPartner ? "phone_password" : "phone_otp",
    ...(isPartner ? { passwordHash: await hashPartnerPassword(input.password) } : {}),
    role: input.role === "seller" ? "seller" : input.role === "delivery_partner" ? "delivery_partner" : "user",
    ...(aadhaar ? {
      aadhaarHash: createHash("sha256").update(aadhaar).digest("hex"),
      aadhaarLast4: aadhaar.slice(-4),
      ...(input.role === "seller" ? {
        shopName: input.shopName?.trim() || `${input.name?.trim() || "Ghar Ghar Mart"} Store`,
        shopStatus: "pending" as const,
      } : {}),
      ...(input.role === "delivery_partner" ? { deliveryPartnerStatus: "pending" as const } : {}),
    } : {}),
  });
  return (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
}

// ============= SELLER VERIFICATION, PAYOUTS, AND PRODUCT MODERATION =============

export async function createSellerDocumentRecord(data: InsertSellerDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sellerDocuments).values(data);
  return Number(result.insertId);
}

export async function getSellerDocumentRecords(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sellerDocuments).where(eq(sellerDocuments.sellerId, sellerId)).orderBy(desc(sellerDocuments.createdAt));
}

export async function getPendingSellerDocumentRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sellerDocuments).where(eq(sellerDocuments.status, "pending")).orderBy(desc(sellerDocuments.createdAt));
}

export async function reviewSellerDocumentRecord(documentId: number, reviewerId: number, status: "approved" | "rejected", reviewerNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sellerDocuments).set({ status, reviewerId, reviewerNote: reviewerNote || null, reviewedAt: new Date() }).where(eq(sellerDocuments.id, documentId));
  return (await db.select().from(sellerDocuments).where(eq(sellerDocuments.id, documentId)).limit(1))[0];
}

export async function saveSellerPayoutProfile(input: { sellerId: number; accountHolderName: string; accountNumber: string; ifscCode: string; bankName?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const accountNumber = input.accountNumber.replace(/\s/g, "");
  if (!/^\d{9,18}$/.test(accountNumber)) throw new Error("Enter a valid bank account number");
  const ifscCode = input.ifscCode.toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) throw new Error("Enter a valid IFSC code");

  const payload = {
    accountHolderName: input.accountHolderName.trim(),
    accountNumberHash: createHash("sha256").update(accountNumber).digest("hex"),
    accountNumberLast4: accountNumber.slice(-4),
    ifscCode,
    bankName: input.bankName?.trim() || null,
    status: "pending" as const,
    reviewerId: null,
    reviewerNote: null,
    reviewedAt: null,
  };
  const existing = (await db.select().from(sellerPayoutProfiles).where(eq(sellerPayoutProfiles.sellerId, input.sellerId)).limit(1))[0];
  if (existing) {
    await db.update(sellerPayoutProfiles).set(payload).where(eq(sellerPayoutProfiles.sellerId, input.sellerId));
  } else {
    await db.insert(sellerPayoutProfiles).values({ sellerId: input.sellerId, ...payload });
  }
  return (await db.select().from(sellerPayoutProfiles).where(eq(sellerPayoutProfiles.sellerId, input.sellerId)).limit(1))[0];
}

export async function getSellerPayoutProfile(sellerId: number) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(sellerPayoutProfiles).where(eq(sellerPayoutProfiles.sellerId, sellerId)).limit(1))[0] ?? null;
}

export async function getPendingSellerPayoutProfiles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sellerPayoutProfiles).where(eq(sellerPayoutProfiles.status, "pending")).orderBy(desc(sellerPayoutProfiles.createdAt));
}

export async function reviewSellerPayoutProfile(sellerId: number, reviewerId: number, status: "verified" | "rejected", reviewerNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sellerPayoutProfiles).set({ status, reviewerId, reviewerNote: reviewerNote || null, reviewedAt: new Date() }).where(eq(sellerPayoutProfiles.sellerId, sellerId));
  return getSellerPayoutProfile(sellerId);
}

export async function getPendingProductModeration(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.approvalStatus, "pending")).orderBy(desc(products.createdAt)).limit(limit);
}

export async function reviewProductModeration(productId: number, moderatorId: number, status: "approved" | "rejected", moderationNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set({ approvalStatus: status, moderationNote: moderationNote || null, moderatedBy: moderatorId, moderatedAt: new Date(), isActive: status === "approved" }).where(eq(products.id, productId));
  return getProductById(productId);
}

export async function getAllSellers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(eq(users.role, "seller"));
}

export async function getPendingSellers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, "seller"),
        eq(users.shopStatus, "pending")
      )
    );
}

export async function approveSeller(sellerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ shopStatus: "approved" })
    .where(eq(users.id, sellerId));
}

export async function rejectSeller(sellerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ shopStatus: "rejected" })
    .where(eq(users.id, sellerId));
}

export async function getSellerStats(sellerId: number) {
  const db = await getDb();
  if (!db) return null;

  const totalOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.sellerId, sellerId));

  const totalEarnings = await getTotalSellerEarnings(sellerId);
  const totalProducts = await db
    .select()
    .from(products)
    .where(eq(products.sellerId, sellerId));

  return {
    totalOrders: totalOrders.length,
    totalEarnings,
    totalProducts: totalProducts.length,
    rating: 4.5 as number, // TODO: Calculate from reviews
  };
}

export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return null;

  const totalUsers = await db.select().from(users);
  const totalOrders = await db.select().from(orders);
  const totalProducts = await db.select().from(products);
  const totalRevenue = totalOrders.reduce(
    (sum: number, order: any) => sum + Number(order.total),
    0
  );

  return {
    totalUsers: totalUsers.length,
    totalOrders: totalOrders.length,
    totalProducts: totalProducts.length,
    totalRevenue,
    activeUsers: totalUsers.filter((u: any) => u.lastSignedIn > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
  };
}


// ============= DELIVERY PARTNER & PROOF OF DELIVERY =============

function hashDeliveryOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function getDeliveryOrdersForPartner(partnerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.deliveryPartnerId, partnerId), or(eq(orders.status, "packed"), eq(orders.status, "confirmed"), eq(orders.status, "shipped"))))
    .orderBy(desc(orders.updatedAt));
}

function distanceInKm(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = radians(targetLatitude - latitude);
  const deltaLongitude = radians(targetLongitude - longitude);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(latitude)) * Math.cos(radians(targetLatitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getNearbyAvailableDeliveryOrders(latitude: number, longitude: number, radiusKm = 10) {
  const db = await getDb();
  if (!db) return [];
  const available = await db.select().from(orders).where(and(
    eq(orders.status, "packed"),
    isNull(orders.deliveryPartnerId),
  )).orderBy(desc(orders.createdAt));
  return available
    .filter((order: Order) => order.deliveryLatitude != null && order.deliveryLongitude != null)
    .map((order: Order) => ({
      ...order,
      distanceFromPartnerKm: distanceInKm(latitude, longitude, Number(order.deliveryLatitude), Number(order.deliveryLongitude)),
    }))
    .filter((order: Order & { distanceFromPartnerKm: number }) => order.distanceFromPartnerKm <= radiusKm)
    .sort((left: { distanceFromPartnerKm: number }, right: { distanceFromPartnerKm: number }) => left.distanceFromPartnerKm - right.distanceFromPartnerKm);
}

export async function claimNearbyDeliveryOrder(orderId: number, partnerId: number, partnerName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(orders).set({
    deliveryPartnerId: partnerId,
    deliveryPartnerName: partnerName,
    deliveryAcceptedAt: new Date(),
  }).where(and(
    eq(orders.id, orderId),
    eq(orders.status, "packed"),
    isNull(orders.deliveryPartnerId),
  ));
  if (!result.affectedRows) throw new Error("This delivery was already accepted by another partner");
  await createDeliveryEvent({ orderId, actorId: partnerId, status: "assigned", message: `Delivery claimed by ${partnerName}` });
  return getDeliveryOrder(orderId);
}

export async function getDeliveryOrder(orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, orderId));
  return result[0] || null;
}

export async function recordDeliveryLocation(data: InsertDeliveryLocation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deliveryLocations).values(data);
  await db.update(orders).set({
    currentLatitude: data.latitude,
    currentLongitude: data.longitude,
    lastLocationAt: new Date(),
  }).where(eq(orders.id, data.orderId));
  return result.insertId;
}

export async function getLatestDeliveryLocation(orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(deliveryLocations)
    .where(eq(deliveryLocations.orderId, orderId))
    .orderBy(desc(deliveryLocations.recordedAt))
    .limit(1);
  return result[0] || null;
}

export async function getDeliveryEvents(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(deliveryEvents)
    .where(eq(deliveryEvents.orderId, orderId))
    .orderBy(asc(deliveryEvents.occurredAt));
}

export async function createDeliveryEvent(data: InsertDeliveryEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deliveryEvents).values(data);
  return result.insertId;
}

export async function assignDeliveryPartner(orderId: number, partnerId: number, partnerName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({
    deliveryPartnerId: partnerId,
    deliveryPartnerName: partnerName,
    status: "packed",
  }).where(eq(orders.id, orderId));
  await createDeliveryEvent({ orderId, actorId: partnerId, status: "assigned", message: `Assigned to ${partnerName}` });
}

export async function acceptDeliveryAssignment(orderId: number, partnerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const order = await getDeliveryOrder(orderId);
  if (!order || order.deliveryPartnerId !== partnerId) throw new Error("Delivery is not assigned to this partner");
  if (order.status !== "packed") throw new Error("Only packed assigned orders can be accepted");
  if (!order.deliveryAcceptedAt) {
    await db.update(orders).set({ status: "confirmed", deliveryAcceptedAt: new Date() }).where(eq(orders.id, orderId));
    await createDeliveryEvent({ orderId, actorId: partnerId, status: "assigned", message: "Delivery partner accepted the assignment; customer order confirmed" });
  }
  return getDeliveryOrder(orderId);
}

export async function startAssignedDelivery(orderId: number, partnerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const order = await getDeliveryOrder(orderId);
  if (!order || order.deliveryPartnerId !== partnerId) throw new Error("Delivery is not assigned to this partner");
  if (order.status !== "packed" && order.status !== "confirmed") throw new Error("Only accepted packed orders can start delivery");
  if (!order.deliveryAcceptedAt) throw new Error("Accept this delivery before starting the route");
  await db.update(orders).set({ status: "shipped" }).where(eq(orders.id, orderId));
  await createDeliveryEvent({ orderId, actorId: partnerId, status: "out_for_delivery", message: "Delivery partner started the route" });
  return getDeliveryOrder(orderId);
}

export async function updateDeliveryEta(orderId: number, etaMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ deliveryEtaMinutes: etaMinutes }).where(eq(orders.id, orderId));
}

export async function markDeliveryNotification(orderId: number, stage: "nearby" | "arriving") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const field = stage === "nearby" ? { riderNearNotifiedAt: new Date() } : { riderArrivingNotifiedAt: new Date() };
  await db.update(orders).set(field).where(eq(orders.id, orderId));
}

export async function getDeliveryTrackingForCustomer(orderId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const orderResult = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
  const order = orderResult[0];
  if (!order) return null;
  const [location, events, items] = await Promise.all([
    getLatestDeliveryLocation(orderId),
    getDeliveryEvents(orderId),
    getOrderItems(orderId),
  ]);
  return { order, location, events, items };
}

export async function createDeliveryOtp(orderId: number, partnerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const order = await getDeliveryOrder(orderId);
  if (!order || order.deliveryPartnerId !== partnerId) throw new Error("Delivery is not assigned to this partner");
  const code = randomInt(1000, 10000).toString();
  await db.update(orders).set({
    deliveryOtpHash: hashDeliveryOtp(code),
    deliveryOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    deliveryOtpVerified: false,
  }).where(eq(orders.id, orderId));
  return { code, phone: order.deliveryPhone };
}

export async function saveProofOfDelivery(orderId: number, partnerId: number, proofUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const order = await getDeliveryOrder(orderId);
  if (!order || order.deliveryPartnerId !== partnerId) throw new Error("Delivery is not assigned to this partner");
  await db.update(orders).set({ proofOfDeliveryUrl: proofUrl, proofOfDeliveryCapturedAt: new Date() }).where(eq(orders.id, orderId));
  return { success: true, proofUrl };
}

export async function completeDeliveryWithOtp(orderId: number, userId: number, code: string, proofUrl?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const orderResult = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
  const order = orderResult[0];
  if (!order) throw new Error("Order not found");
  if (!order.deliveryOtpHash || !order.deliveryOtpExpiresAt || order.deliveryOtpVerified) throw new Error("Delivery confirmation is not available");
  if (new Date(order.deliveryOtpExpiresAt).getTime() < Date.now()) throw new Error("Delivery confirmation code has expired");
  if (hashDeliveryOtp(code) !== order.deliveryOtpHash) throw new Error("Incorrect delivery confirmation code");
  await db.update(orders).set({
    deliveryOtpVerified: true,
    proofOfDeliveryUrl: proofUrl ?? order.proofOfDeliveryUrl,
    proofOfDeliveryCapturedAt: new Date(),
    deliveredAt: new Date(),
    status: "delivered",
  }).where(eq(orders.id, orderId));
  await createDeliveryEvent({ orderId, actorId: userId, status: "delivered", message: "Customer confirmed delivery" });
  return { success: true };
}

export async function completeDeliveryByPartner(orderId: number, partnerId: number, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const order = await getDeliveryOrder(orderId);
  if (!order || order.deliveryPartnerId !== partnerId) throw new Error("Delivery is not assigned to this partner");
  if (order.status !== "shipped") throw new Error("Start the delivery route before completing this handoff");
  if (!order.proofOfDeliveryUrl) throw new Error("Capture proof of delivery before completing this handoff");
  if (!order.deliveryOtpHash || !order.deliveryOtpExpiresAt || order.deliveryOtpVerified) throw new Error("Request a fresh customer OTP before completing delivery");
  if (new Date(order.deliveryOtpExpiresAt).getTime() < Date.now()) throw new Error("The customer OTP has expired. Request a new one.");
  if (hashDeliveryOtp(code) !== order.deliveryOtpHash) throw new Error("The customer OTP is incorrect");
  await db.update(orders).set({
    deliveryOtpVerified: true,
    deliveredAt: new Date(),
    status: "delivered",
  }).where(eq(orders.id, orderId));
  await createDeliveryEvent({ orderId, actorId: partnerId, status: "delivered", message: "Delivery completed and customer OTP confirmed" });
  const deliveryFee = Number(order.shippingCost ?? 0);
  await createDeliveryPartnerEarning({ partnerId, orderId, deliveryFee: deliveryFee.toFixed(2), incentive: "0.00", netAmount: deliveryFee.toFixed(2), status: "earned" });
  return { success: true };
}

export async function registerDevicePushToken(data: InsertDevicePushToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(devicePushTokens).where(eq(devicePushTokens.token, data.token));
  if (existing[0]) {
    await db.update(devicePushTokens).set({ userId: data.userId, platform: data.platform, isActive: true, lastUsedAt: new Date() }).where(eq(devicePushTokens.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(devicePushTokens).values(data);
  return result.insertId;
}

export async function getActiveDevicePushTokens(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devicePushTokens).where(and(eq(devicePushTokens.userId, userId), eq(devicePushTokens.isActive, true)));
}

export async function deactivateDevicePushToken(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(devicePushTokens).set({ isActive: false }).where(eq(devicePushTokens.token, token));
}


export async function getDeliveryPartners() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: users.id, name: users.name, phone: users.phone })
    .from(users)
    .where(and(eq(users.role, "delivery_partner"), eq(users.deliveryPartnerStatus, "approved"), eq(users.isActive, true)))
    .orderBy(asc(users.name));
}

export async function getDeliveryPartnerReviewRecords(status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(users.role, "delivery_partner")];
  if (status) conditions.push(eq(users.deliveryPartnerStatus, status));
  return db
    .select({ id: users.id, name: users.name, phone: users.phone, aadhaarLast4: users.aadhaarLast4, deliveryPartnerStatus: users.deliveryPartnerStatus, isActive: users.isActive, createdAt: users.createdAt })
    .from(users)
    .where(and(...conditions))
    .orderBy(asc(users.createdAt));
}

export async function reviewDeliveryPartner(partnerId: number, status: "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const partner = await getUserById(partnerId);
  if (!partner || partner.role !== "delivery_partner") throw new Error("Delivery partner record not found");
  await db.update(users).set({ deliveryPartnerStatus: status, isActive: status === "approved" }).where(eq(users.id, partnerId));
  return { before: partner, after: await getUserById(partnerId) };
}

export async function getDeliveryPartnerApprovalState(partnerId: number) {
  const partner = await getUserById(partnerId);
  if (!partner || partner.role !== "delivery_partner") throw new Error("Delivery partner account not found");
  return { status: partner.deliveryPartnerStatus ?? "pending", isActive: partner.isActive, name: partner.name, aadhaarLast4: partner.aadhaarLast4 };
}
