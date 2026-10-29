import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean,
  json
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-specific fields for consumer, seller, and admin users.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin", "seller", "delivery_partner"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  
  // Consumer fields
  profilePhoto: text("profilePhoto"),
  address: text("address"),
  savedAddresses: json("savedAddresses"),
  
  // Seller fields
  shopName: varchar("shopName", { length: 255 }),
  shopDescription: text("shopDescription"),
  shopLogo: text("shopLogo"),
  shopHours: json("shopHours"),
  shopRating: decimal("shopRating", { precision: 3, scale: 2 }).default("0"),
  shopStatus: mysqlEnum("shopStatus", ["pending", "approved", "rejected"]).default("pending"),
  deliveryPartnerStatus: mysqlEnum("deliveryPartnerStatus", ["pending", "approved", "rejected"]).default("pending"),
  aadhaarHash: varchar("aadhaarHash", { length: 128 }),
  aadhaarLast4: varchar("aadhaarLast4", { length: 4 }),
  
  // Admin fields
  permissions: json("permissions"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const customerPasswordResetTokens = mysqlTable("customerPasswordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const deliveryPricingSettings = mysqlTable("deliveryPricingSettings", {
  id: int("id").autoincrement().primaryKey(),
  baseDistanceKm: decimal("baseDistanceKm", { precision: 10, scale: 2 }).notNull().default("2.00"),
  baseCharge: decimal("baseCharge", { precision: 10, scale: 2 }).notNull().default("10.00"),
  additionalChargePerKm: decimal("additionalChargePerKm", { precision: 10, scale: 2 }).notNull().default("5.00"),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DeliveryPricingSettings = typeof deliveryPricingSettings.$inferSelect;

/** Reusable customer delivery destinations with map coordinates and handoff details. */
export const customerAddresses = mysqlTable("customerAddresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  addressLine: text("addressLine").notNull(),
  apartment: varchar("apartment", { length: 255 }),
  floor: varchar("floor", { length: 64 }),
  landmark: varchar("landmark", { length: 255 }),
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 120 }),
  pincode: varchar("pincode", { length: 12 }),
  deliveryInstructions: text("deliveryInstructions"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type InsertCustomerAddress = typeof customerAddresses.$inferInsert;

/**
 * One-time mobile verification challenges used for consumer sign-in, sign-up,
 * and mobile-number recovery. Codes are stored only as hashes.
 */
export const phoneOtpChallenges = mysqlTable("phoneOtpChallenges", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  purpose: mysqlEnum("purpose", ["login", "signup", "phone_change"]).notNull(),
  codeHash: varchar("codeHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").default(0).notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PhoneOtpChallenge = typeof phoneOtpChallenges.$inferSelect;
export type InsertPhoneOtpChallenge = typeof phoneOtpChallenges.$inferInsert;

/**
 * Categories table for product classification
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: text("icon"),
  image: text("image"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/** Administrator-managed promotional cards shown on the customer Home page. */
export const homeOfferBanners = mysqlTable("homeOfferBanners", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 120 }).notNull(),
  description: varchar("description", { length: 280 }).notNull(),
  badgeText: varchar("badgeText", { length: 48 }),
  couponCode: varchar("couponCode", { length: 48 }),
  imageUrl: text("imageUrl"),
  backgroundColor: varchar("backgroundColor", { length: 16 }).default("#FFF7D1").notNull(),
  actionType: mysqlEnum("actionType", ["none", "coupon", "category", "url"]).default("coupon").notNull(),
  actionValue: varchar("actionValue", { length: 500 }),
  priority: int("priority").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HomeOfferBanner = typeof homeOfferBanners.$inferSelect;
export type InsertHomeOfferBanner = typeof homeOfferBanners.$inferInsert;

/**
 * Products table
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("originalPrice", { precision: 10, scale: 2 }),
  discount: int("discount").default(0),
  stock: int("stock").notNull().default(0),
  images: json("images"), // Array of image URLs
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: int("reviewCount").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("approved").notNull(),
  moderationNote: text("moderationNote"),
  moderatedBy: int("moderatedBy"),
  moderatedAt: timestamp("moderatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Per-service-region stock overrides for approved shopper products. The base
 * product stock remains a fallback when no row exists for a selected pincode.
 */
export const regionalInventories = mysqlTable("regionalInventories", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  stock: int("stock").notNull().default(0),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RegionalInventory = typeof regionalInventories.$inferSelect;
export type InsertRegionalInventory = typeof regionalInventories.$inferInsert;

/**
 * Seller verification documents. Original identity documents stay in protected storage;
 * the database keeps only metadata and the protected storage reference.
 */
export const sellerDocuments = mysqlTable("sellerDocuments", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  documentType: mysqlEnum("documentType", ["aadhaar_card", "address_proof", "business_license"]).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewerId: int("reviewerId"),
  reviewerNote: text("reviewerNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Payout setup reference. Full bank-account numbers are never persisted in the app database.
 */
export const sellerPayoutProfiles = mysqlTable("sellerPayoutProfiles", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull().unique(),
  accountHolderName: varchar("accountHolderName", { length: 255 }).notNull(),
  accountNumberHash: varchar("accountNumberHash", { length: 128 }).notNull(),
  accountNumberLast4: varchar("accountNumberLast4", { length: 4 }).notNull(),
  ifscCode: varchar("ifscCode", { length: 11 }).notNull(),
  bankName: varchar("bankName", { length: 255 }),
  status: mysqlEnum("status", ["pending", "verified", "rejected"]).default("pending").notNull(),
  reviewerId: int("reviewerId"),
  reviewerNote: text("reviewerNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SellerDocument = typeof sellerDocuments.$inferSelect;
export type InsertSellerDocument = typeof sellerDocuments.$inferInsert;
export type SellerPayoutProfile = typeof sellerPayoutProfiles.$inferSelect;
export type InsertSellerPayoutProfile = typeof sellerPayoutProfiles.$inferInsert;

/**
 * Cart items table
 */
export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

/**
 * Orders table
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sellerId: int("sellerId").notNull(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  status: mysqlEnum("status", [
    "pending",
    "confirmed",
    "packed",
    "shipped",
    "delivered",
    "cancelled"
  ]).default("pending").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["online", "cod"]).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed"]).default("pending").notNull(),
  paymentProofUrl: text("paymentProofUrl"),
  paymentProofUploadedAt: timestamp("paymentProofUploadedAt"),
  
  // Delivery details
  deliveryAddress: text("deliveryAddress").notNull(),
  deliveryPhone: varchar("deliveryPhone", { length: 20 }).notNull(),
  deliveryLatitude: decimal("deliveryLatitude", { precision: 10, scale: 7 }),
  deliveryLongitude: decimal("deliveryLongitude", { precision: 10, scale: 7 }),
  deliveryDate: timestamp("deliveryDate"),
  
  // Pricing
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  shippingCost: decimal("shippingCost", { precision: 10, scale: 2 }).default("0"),
  deliveryDistanceKm: decimal("deliveryDistanceKm", { precision: 10, scale: 2 }),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  donationAmount: decimal("donationAmount", { precision: 10, scale: 2 }).default("2"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  
  // Tracking
  trackingNumber: varchar("trackingNumber", { length: 100 }),
  deliveryPartnerId: int("deliveryPartnerId"),
  deliveryPartnerName: varchar("deliveryPartnerName", { length: 255 }),
  deliveryAcceptedAt: timestamp("deliveryAcceptedAt"),
  currentLatitude: decimal("currentLatitude", { precision: 10, scale: 7 }),
  currentLongitude: decimal("currentLongitude", { precision: 10, scale: 7 }),
  lastLocationAt: timestamp("lastLocationAt"),
  deliveryEtaMinutes: int("deliveryEtaMinutes"),
  riderNearNotifiedAt: timestamp("riderNearNotifiedAt"),
  riderArrivingNotifiedAt: timestamp("riderArrivingNotifiedAt"),
  deliveryOtpHash: varchar("deliveryOtpHash", { length: 128 }),
  deliveryOtpExpiresAt: timestamp("deliveryOtpExpiresAt"),
  deliveryOtpVerified: boolean("deliveryOtpVerified").default(false).notNull(),
  proofOfDeliveryUrl: text("proofOfDeliveryUrl"),
  proofOfDeliveryCapturedAt: timestamp("proofOfDeliveryCapturedAt"),
  deliveredAt: timestamp("deliveredAt"),
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order items table (line items in an order)
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Wishlist table
 */
export const wishlistItems = mysqlTable("wishlistItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = typeof wishlistItems.$inferInsert;

/**
 * Reviews table
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  userId: int("userId").notNull(),
  orderId: int("orderId").notNull(),
  rating: int("rating").notNull(), // 1-5
  title: varchar("title", { length: 255 }).notNull(),
  comment: text("comment"),
  images: json("images"), // Array of review image URLs
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Coupons table
 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  minOrderValue: decimal("minOrderValue", { precision: 10, scale: 2 }).default("0"),
  maxUses: int("maxUses"),
  currentUses: int("currentUses").default(0),
  expiryDate: timestamp("expiryDate"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * Notifications table
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "order_confirmed",
    "order_shipped",
    "order_delivered",
    "rider_nearby",
    "rider_arriving",
    "delivery_confirmation",
    "payment_received",
    "product_available",
    "promotion",
    "seller_new_order",
    "seller_low_stock",
    "delivery_assignment",
    "delivery_partner_review"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedOrderId: int("relatedOrderId"),
  relatedProductId: int("relatedProductId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Seller earnings/wallet table
 */
export const sellerEarnings = mysqlTable("sellerEarnings", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("sellerId").notNull(),
  orderId: int("orderId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).default("0"),
  netAmount: decimal("netAmount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "processed", "paid"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
});

export type SellerEarning = typeof sellerEarnings.$inferSelect;
export type InsertSellerEarning = typeof sellerEarnings.$inferInsert;

/** Delivery partner earnings created only after an OTP-confirmed completed handoff. */
export const deliveryEarnings = mysqlTable("deliveryEarnings", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  orderId: int("orderId").notNull().unique(),
  deliveryFee: decimal("deliveryFee", { precision: 10, scale: 2 }).notNull(),
  incentive: decimal("incentive", { precision: 10, scale: 2 }).default("0").notNull(),
  netAmount: decimal("netAmount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["earned", "paid"]).default("earned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
});

export type DeliveryEarning = typeof deliveryEarnings.$inferSelect;
export type InsertDeliveryEarning = typeof deliveryEarnings.$inferInsert;

/**
 * Admin analytics/logs table
 */
export const analyticsLogs = mysqlTable("analyticsLogs", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  userId: int("userId"),
  sellerId: int("sellerId"),
  orderId: int("orderId"),
  data: json("data"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsLog = typeof analyticsLogs.$inferSelect;
export type InsertAnalyticsLog = typeof analyticsLogs.$inferInsert;

/**
 * Admin audit logs table for tracking all admin actions
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  adminName: varchar("adminName", { length: 255 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  oldValue: json("oldValue"),
  newValue: json("newValue"),
  changes: json("changes"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  status: mysqlEnum("status", ["success", "failed", "pending"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Admin notifications table for real-time alerts
 */
export const adminNotifications = mysqlTable("adminNotifications", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  type: mysqlEnum("type", [
    "new_order",
    "pending_approval",
    "low_stock",
    "seller_registration",
    "payment_received",
    "system_alert"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedOrderId: int("relatedOrderId"),
  relatedProductId: int("relatedProductId"),
  relatedSellerId: int("relatedSellerId"),
  isRead: boolean("isRead").default(false).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  actionUrl: text("actionUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export type AdminNotification = typeof adminNotifications.$inferSelect;
export type InsertAdminNotification = typeof adminNotifications.$inferInsert;

/**
 * Delivery partner GPS history. Rows are append-only so the tracking screen can show the latest position safely.
 */
export const deliveryLocations = mysqlTable("deliveryLocations", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  partnerId: int("partnerId").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  source: mysqlEnum("source", ["foreground", "background", "manual"]).default("foreground").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type DeliveryLocation = typeof deliveryLocations.$inferSelect;
export type InsertDeliveryLocation = typeof deliveryLocations.$inferInsert;

/**
 * Delivery timeline events used by the customer and operations screens.
 */
export const deliveryEvents = mysqlTable("deliveryEvents", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  actorId: int("actorId"),
  status: mysqlEnum("status", ["assigned", "picked_up", "out_for_delivery", "nearby", "delivered", "cancelled"]).notNull(),
  message: text("message"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
});

export type DeliveryEvent = typeof deliveryEvents.$inferSelect;
export type InsertDeliveryEvent = typeof deliveryEvents.$inferInsert;

/**
 * Device tokens for customer delivery alerts. Tokens are deactivated when Expo rejects them.
 */
export const devicePushTokens = mysqlTable("devicePushTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  platform: mysqlEnum("platform", ["ios", "android", "web"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DevicePushToken = typeof devicePushTokens.$inferSelect;
export type InsertDevicePushToken = typeof devicePushTokens.$inferInsert;
