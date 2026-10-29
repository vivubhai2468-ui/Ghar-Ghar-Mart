import { eq, and, or, desc, gte, lte, asc, like } from "drizzle-orm";
import {
  orders,
  products,
  users,
  auditLogs,
  adminNotifications,
  type InsertAuditLog,
  type InsertAdminNotification,
} from "../drizzle/schema";
import { getDb } from "./db";

// ============= ADMIN ORDERS HELPERS =============

export async function getAdminOrders(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, id));
  return result[0] || null;
}

export async function updateOrderStatus(orderId: number, newStatus: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const oldOrder = await getOrderById(orderId);
  await db.update(orders).set({ status: newStatus as any }).where(eq(orders.id, orderId));
  
  return {
    success: true,
    oldStatus: oldOrder?.status,
    newStatus,
  };
}

export async function getOrdersByStatus(status: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(eq(orders.status, status as any))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

// ============= ADMIN PRODUCTS HELPERS =============

export async function getAdminProducts(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .orderBy(desc(products.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function getLowStockProducts(threshold = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(and(lte(products.stock, threshold), eq(products.isActive, true)))
    .orderBy(asc(products.stock));
}

export async function updateProductStatus(productId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const oldProduct = await db.select().from(products).where(eq(products.id, productId));
  await db.update(products).set({ isActive }).where(eq(products.id, productId));
  
  return {
    success: true,
    oldStatus: oldProduct[0]?.isActive,
    newStatus: isActive,
  };
}

export async function updateProductStock(productId: number, newStock: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const oldProduct = await db.select().from(products).where(eq(products.id, productId));
  await db.update(products).set({ stock: newStock }).where(eq(products.id, productId));
  
  return {
    success: true,
    oldStock: oldProduct[0]?.stock,
    newStock,
  };
}

// ============= ADMIN USERS HELPERS =============

export async function getAdminUsers(limit = 50, offset = 0, search = "") {
  const db = await getDb();
  if (!db) return [];
  const query = search.trim();
  const conditions = [eq(users.role, "user")];
  if (query) {
    const term = `%${query}%`;
    conditions.push(or(like(users.name, term), like(users.phone, term), like(users.email, term))!);
  }
  return db
    .select()
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] || null;
}

export async function updateAdminUserRecord(id: number, data: { name?: string; email?: string | null; phone?: string; address?: string | null; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const user = await getUserById(id);
  if (!user || user.role !== "user") throw new Error("Customer record not found");
  await db.update(users).set(data).where(eq(users.id, id));
  return { before: user, after: await getUserById(id) };
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;
  
  const totalUsers = await db.select().from(users).where(eq(users.role, "user"));
  const totalSellers = await db.select().from(users).where(eq(users.role, "seller"));
  const totalOrders = await db.select().from(orders);
  const totalProducts = await db.select().from(products);
  
  return {
    totalUsers: totalUsers.length,
    totalSellers: totalSellers.length,
    totalOrders: totalOrders.length,
    totalProducts: totalProducts.length,
  };
}

// ============= ADMIN SELLERS HELPERS =============

export async function getAdminSellers(limit = 50, offset = 0, search = "") {
  const db = await getDb();
  if (!db) return [];
  const query = search.trim();
  const conditions = [eq(users.role, "seller")];
  if (query) {
    const term = `%${query}%`;
    conditions.push(or(like(users.name, term), like(users.shopName, term), like(users.phone, term), like(users.email, term))!);
  }
  return db
    .select()
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getPendingSellers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(and(eq(users.role, "seller"), eq(users.shopStatus, "pending")))
    .orderBy(asc(users.createdAt));
}

export async function updateSellerStatus(sellerId: number, newStatus: "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const oldSeller = await getUserById(sellerId);
  await db.update(users).set({ shopStatus: newStatus }).where(eq(users.id, sellerId));
  
  return {
    success: true,
    oldStatus: oldSeller?.shopStatus,
    newStatus,
  };
}

export async function updateAdminSellerRecord(id: number, data: { name?: string; email?: string | null; phone?: string; address?: string | null; shopName?: string | null; shopDescription?: string | null; shopStatus?: "pending" | "approved" | "rejected"; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const seller = await getUserById(id);
  if (!seller || seller.role !== "seller") throw new Error("Seller record not found");
  await db.update(users).set(data).where(eq(users.id, id));
  return { before: seller, after: await getUserById(id) };
}

// ============= AUDIT LOGS HELPERS =============

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(auditLogs).values(data);
  return result.insertId;
}

export async function getAuditLogs(adminId?: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(auditLogs);
  
  if (adminId) {
    query = query.where(eq(auditLogs.adminId, adminId));
  }
  
  return query.orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
}

export async function getAuditLogsByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
    .orderBy(desc(auditLogs.createdAt));
}

export async function logAdminAction(
  adminId: number,
  adminName: string,
  action: string,
  entityType: string,
  entityId: number,
  oldValue?: any,
  newValue?: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    adminId,
    adminName,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    changes: newValue ? Object.keys(newValue).reduce((acc: any, key) => {
      if (oldValue && oldValue[key] !== newValue[key]) {
        acc[key] = { old: oldValue[key], new: newValue[key] };
      }
      return acc;
    }, {}) : undefined,
    ipAddress,
    userAgent,
    status: "success",
  } as any);
}

// ============= ADMIN NOTIFICATIONS HELPERS =============

export async function createAdminNotification(data: InsertAdminNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(adminNotifications).values(data);
  return result.insertId;
}

export async function getAdminNotifications(adminId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(adminNotifications)
    .where(eq(adminNotifications.adminId, adminId))
    .orderBy(desc(adminNotifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUnreadAdminNotifications(adminId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(adminNotifications)
    .where(and(eq(adminNotifications.adminId, adminId), eq(adminNotifications.isRead, false)))
    .orderBy(desc(adminNotifications.createdAt));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(adminNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(adminNotifications.id, notificationId));
}

export async function notifyAdminNewOrder(adminId: number, orderId: number, orderNumber: string) {
  return createAdminNotification({
    adminId,
    type: "new_order",
    title: "New Order Received",
    message: `Order ${orderNumber} has been placed`,
    relatedOrderId: orderId,
    priority: "high",
  } as any);
}

export async function notifyAdminLowStock(adminId: number, productId: number, productName: string, stock: number) {
  return createAdminNotification({
    adminId,
    type: "low_stock",
    title: "Low Stock Alert",
    message: `${productName} is running low (${stock} units remaining)`,
    relatedProductId: productId,
    priority: "medium",
  } as any);
}

export async function notifyAdminPendingApproval(adminId: number, sellerId: number, sellerName: string) {
  return createAdminNotification({
    adminId,
    type: "pending_approval",
    title: "Seller Approval Pending",
    message: `${sellerName} is waiting for approval`,
    relatedSellerId: sellerId,
    priority: "high",
  } as any);
}
