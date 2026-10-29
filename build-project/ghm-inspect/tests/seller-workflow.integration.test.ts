import { describe, expect, it, vi } from "vitest";

vi.mock("../server/geocoding", () => ({ searchIndianAddresses: vi.fn(async () => [{ latitude: 19.076, longitude: 72.8777, label: "Test seller location" }]) }));
vi.mock("../server/routing", () => ({ getRoadRoute: vi.fn(async () => ({ provider: "osrm", coordinates: [], distanceMeters: 3000, durationSeconds: 600, maneuvers: [] })) }));

import { appRouter } from "../server/routers";
import {
  createPhoneOtpChallenge,
  createSellerDocumentRecord,
  createDeliveryOtp,
  findOrCreatePhoneUser,
  getCategories,
  getDeliveryOrder,
  getSellerDocumentRecords,
  getSellerProducts,
  getProducts,
  getUserById,
  saveProofOfDelivery,
  verifyPhoneOtpChallenge,
} from "../server/db";

function uniquePhone(seed: number) {
  return `8${String(seed).slice(-9)}`;
}

function callerFor(user: any) {
  return appRouter.createCaller({
    user,
    req: {} as any,
    res: { clearCookie: () => undefined } as any,
  });
}

describe("seller onboarding and operations lifecycle", () => {
  it("verifies signup, seller operations, delivery-partner acceptance, GPS tracking, and completion", async () => {
    const phone = uniquePhone(Date.now());
    const challenge = await createPhoneOtpChallenge(phone, "signup");
    await expect(verifyPhoneOtpChallenge(phone, "signup", challenge.code)).resolves.toMatchObject({ phone: challenge.phone });

    const seller = await findOrCreatePhoneUser({
      phone,
      name: "Lifecycle Seller",
      address: "15 Market Road, Mumbai",
      role: "seller",
      password: "LifecycleSeller2026",
      aadhaarNumber: "123456789012",
      shopName: "Lifecycle Grocers",
    });
    expect(seller.role).toBe("seller");
    expect(seller.shopStatus).toBe("pending");
    expect(seller.aadhaarLast4).toBe("9012");
    expect(seller.aadhaarHash).toHaveLength(64);

    const deliveryPhone = uniquePhone(Date.now() + 1);
    const deliveryChallenge = await createPhoneOtpChallenge(deliveryPhone, "signup");
    await expect(verifyPhoneOtpChallenge(deliveryPhone, "signup", deliveryChallenge.code)).resolves.toMatchObject({ phone: deliveryChallenge.phone });
    const registeredPartner = await findOrCreatePhoneUser({
      phone: deliveryPhone,
      name: "Lifecycle Delivery Partner",
      role: "delivery_partner",
      password: "LifecycleDelivery2026",
      aadhaarNumber: "987654321098",
    });
    expect(registeredPartner).toMatchObject({ role: "delivery_partner", name: "Lifecycle Delivery Partner", aadhaarLast4: "1098" });
    expect(registeredPartner.aadhaarHash).toHaveLength(64);
    expect(registeredPartner.aadhaarHash).not.toContain("987654321098");

    const admin = { ...seller, role: "admin" as const, name: "Seller Review Admin" };
    const adminCaller = callerFor(admin);
    const sellerCaller = callerFor(seller);
    const pendingPartnerCaller = callerFor(registeredPartner);
    const pendingSellers = await adminCaller.admin.sellers.pending();
    expect(pendingSellers).toEqual(expect.arrayContaining([expect.objectContaining({ id: seller.id, phone: seller.phone, shopStatus: "pending" })]));
    const sellerRecords = await adminCaller.admin.sellers.list({ search: seller.phone, limit: 10 });
    expect(sellerRecords).toEqual(expect.arrayContaining([expect.objectContaining({ id: seller.id, shopStatus: "pending" })]));
    const pendingPartnerReviews = await adminCaller.admin.deliveryPartnerReviews.list({ status: "pending" });
    expect(pendingPartnerReviews).toEqual(expect.arrayContaining([expect.objectContaining({ id: registeredPartner.id, phone: registeredPartner.phone, deliveryPartnerStatus: "pending" })]));
    await expect(pendingPartnerCaller.deliveryPartner.assignments()).rejects.toThrow("awaiting administrator approval");
    await adminCaller.admin.deliveryPartnerReviews.review({ partnerId: registeredPartner.id, status: "rejected" });
    expect((await getUserById(registeredPartner.id))?.deliveryPartnerStatus).toBe("rejected");
    await expect(pendingPartnerCaller.deliveryPartner.assignments()).rejects.toThrow("awaiting administrator approval");

    await createSellerDocumentRecord({
      sellerId: seller.id,
      documentType: "aadhaar_card",
      fileUrl: "https://example.test/seller-aadhaar.pdf",
      fileKey: `seller-test/${seller.id}/aadhaar.pdf`,
      originalName: "aadhaar.pdf",
      mimeType: "application/pdf",
      status: "pending",
    } as any);
    await createSellerDocumentRecord({
      sellerId: seller.id,
      documentType: "address_proof",
      fileUrl: "https://example.test/seller-address.pdf",
      fileKey: `seller-test/${seller.id}/address.pdf`,
      originalName: "address.pdf",
      mimeType: "application/pdf",
      status: "pending",
    } as any);

    const documents = await getSellerDocumentRecords(seller.id);
    const aadhaarDocument = documents.find((document: any) => document.documentType === "aadhaar_card");
    const addressDocument = documents.find((document: any) => document.documentType === "address_proof");
    expect(aadhaarDocument?.id).toBeTypeOf("number");
    expect(addressDocument?.id).toBeTypeOf("number");
    await adminCaller.admin.verification.reviewDocument({ documentId: aadhaarDocument!.id, status: "approved", note: "Identity checked" });
    await adminCaller.admin.verification.reviewDocument({ documentId: addressDocument!.id, status: "approved", note: "Address checked" });
    await adminCaller.admin.sellers.approve(seller.id);
    expect((await getUserById(seller.id))?.shopStatus).toBe("approved");
    const liveSellerApplications = await adminCaller.admin.sellers.pending();
    expect(liveSellerApplications.some((record: any) => record.id === seller.id)).toBe(false);

    const adminPublishedProduct = await adminCaller.admin.products.create({ sellerId: seller.id, categoryId: (await getCategories())[0].id, name: "Admin Live Bananas", description: "Published directly by operations", price: 79, stock: 24, publishImmediately: true });
    expect(adminPublishedProduct).toMatchObject({ name: "Admin Live Bananas", sellerId: seller.id, approvalStatus: "approved", isActive: true });
    expect((await getProducts(100, 0)).some((product: any) => product.id === adminPublishedProduct.id && product.name === "Admin Live Bananas")).toBe(true);

    await sellerCaller.seller.profile.update({
      shopName: "Lifecycle Fresh Mart",
      shopDescription: "Fresh produce and pantry essentials.",
      address: "15 Market Road, Mumbai 400001",
      shopHours: { openingTime: "08:30", closingTime: "22:00", openDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] },
    });
    const shopProfile = await sellerCaller.seller.profile.get() as any;
    expect(shopProfile).toMatchObject({ shopName: "Lifecycle Fresh Mart", shopDescription: "Fresh produce and pantry essentials.", address: "15 Market Road, Mumbai 400001" });
    expect(shopProfile.shopHours).toMatchObject({ openingTime: "08:30", closingTime: "22:00", openDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] });

    await sellerCaller.seller.payout.save({
      accountHolderName: "Lifecycle Seller",
      accountNumber: "123456789012",
      ifscCode: "SBIN0001234",
      bankName: "State Bank of India",
    });
    const payout = await adminCaller.admin.verification.payouts();
    expect(payout.some((record: any) => record.sellerId === seller.id)).toBe(true);
    await adminCaller.admin.verification.reviewPayout({ sellerId: seller.id, status: "verified", note: "Bank account verified" });

    const category = (await getCategories())[0];
    expect(category).toBeTruthy();
    await sellerCaller.products.create({
      categoryId: category.id,
      name: "Lifecycle Tomatoes",
      description: "Fresh tomatoes for seller workflow tests",
      price: 49,
      stock: 8,
    });
    const submittedProduct = (await getSellerProducts(seller.id)).find((product: any) => product.name === "Lifecycle Tomatoes") as any;
    const productId = submittedProduct.id as number;
    expect(submittedProduct.approvalStatus).toBe("pending");
    expect((await sellerCaller.products.list({ limit: 100, offset: 0 })).some((product: any) => product.id === productId)).toBe(false);
    await adminCaller.admin.verification.reviewProduct({ productId, status: "approved", note: "Catalogue checks passed" });
    expect((await sellerCaller.products.list({ limit: 100, offset: 0 })).some((product: any) => product.id === productId)).toBe(true);
    expect((await adminCaller.admin.products.list({ limit: 100 })).some((product: any) => product.id === productId && product.approvalStatus === "approved")).toBe(true);

    await sellerCaller.products.update({ id: productId, stock: 11 });
    const stockUpdated = (await getSellerProducts(seller.id)).find((product: any) => product.id === productId) as any;
    expect(stockUpdated.stock).toBe(11);
    expect(stockUpdated.approvalStatus).toBe("approved");
    expect(stockUpdated.isActive).toBe(true);

    await sellerCaller.products.update({ id: productId, stock: 5 });
    const lowStockAlert = (await sellerCaller.notifications.list()).find((notification: any) => notification.type === "seller_low_stock" && notification.relatedProductId === productId) as any;
    expect(lowStockAlert).toMatchObject({ userId: seller.id, isRead: false });
    await sellerCaller.notifications.markAsRead(lowStockAlert.id);
    const readLowStockAlert = (await sellerCaller.notifications.list()).find((notification: any) => notification.id === lowStockAlert.id) as any;
    expect(readLowStockAlert.isRead).toBe(true);

    const customerPhone = uniquePhone(Date.now() + 1);
    const customer = await findOrCreatePhoneUser({ phone: customerPhone, name: "Lifecycle Customer", address: "8 Customer Lane, Mumbai", role: "customer" });
    const customerCaller = callerFor(customer);
    expect(await adminCaller.admin.users.list({ search: customerPhone, limit: 10 })).toEqual(expect.arrayContaining([expect.objectContaining({ id: customer.id, name: "Lifecycle Customer", isActive: true })]));
    expect(await adminCaller.admin.sellers.list({ search: seller.phone, limit: 10 })).toEqual(expect.arrayContaining([expect.objectContaining({ id: seller.id, shopStatus: "approved" })]));
    await expect(customerCaller.seller.profile.update({ shopName: "Unauthorized Shop" })).rejects.toThrow("Only sellers can update shop details");
    await customerCaller.orders.create({
      sellerId: seller.id,
      orderNumber: `GGM-TEST-${Date.now()}`,
      paymentMethod: "online",
      deliveryAddress: "8 Customer Lane, Mumbai 400001",
      deliveryPhone: customerPhone,
      deliveryLatitude: 18.922,
      deliveryLongitude: 72.8347,
      subtotal: 245,
      shippingCost: 10,
      total: 255,
      items: [{ productId, productName: "Lifecycle Tomatoes", quantity: 5, price: 49, total: 245 }],
    });
    const newOrderAlert = (await sellerCaller.notifications.list()).find((notification: any) => notification.type === "seller_new_order") as any;
    expect(newOrderAlert).toMatchObject({ userId: seller.id, isRead: false, relatedProductId: null });
    const adminOrders = await adminCaller.admin.orders.list({ limit: 100 });
    expect(adminOrders).toEqual(expect.arrayContaining([expect.objectContaining({ orderNumber: expect.stringContaining("GGM-TEST-"), userId: customer.id, sellerId: seller.id, deliveryDistanceKm: "3.00", shippingCost: "15.00", donationAmount: "2.00", total: "262.00" })]));
    expect(await adminCaller.admin.dashboard()).toMatchObject({ totalUsers: expect.any(Number), totalOrders: expect.any(Number), totalProducts: expect.any(Number), activeUsers: expect.any(Number) });
    expect(newOrderAlert.relatedOrderId).toBeTypeOf("number");

    const deliveryOrderId = newOrderAlert.relatedOrderId as number;
    expect((await sellerCaller.orders.getSellerOrders()).find((order: any) => order.id === deliveryOrderId)).toMatchObject({ status: "pending" });
    await sellerCaller.orders.updateStatus({ id: deliveryOrderId, status: "confirmed" });
    await sellerCaller.orders.updateStatus({ id: deliveryOrderId, status: "packed" });
    expect((await sellerCaller.orders.getSellerOrders()).find((order: any) => order.id === deliveryOrderId)).toMatchObject({ status: "packed" });

    const partner = await findOrCreatePhoneUser({
      phone: uniquePhone(Date.now() + 2),
      name: "Lifecycle Delivery Partner",
      address: "2 Rider Road, Mumbai",
      role: "delivery_partner",
      password: "LifecycleDelivery2026",
      aadhaarNumber: "456789012345",
    });
    const partnerCaller = callerFor(partner);
    await expect(partnerCaller.deliveryPartner.assignments()).rejects.toThrow("awaiting administrator approval");
    await adminCaller.admin.deliveryPartnerReviews.review({ partnerId: partner.id, status: "approved" });
    expect((await getUserById(partner.id))?.deliveryPartnerStatus).toBe("approved");
    await adminCaller.admin.assignDeliveryPartner({ orderId: deliveryOrderId, partnerId: partner.id, partnerName: partner.name ?? "Lifecycle Delivery Partner" });
    const assignmentAlert = (await partnerCaller.notifications.list()).find((notification: any) => notification.type === "delivery_assignment") as any;
    expect(assignmentAlert).toMatchObject({ userId: partner.id, relatedOrderId: deliveryOrderId, isRead: false, title: "New delivery assigned" });
    await partnerCaller.notifications.markAsRead(assignmentAlert.id);
    expect((await partnerCaller.notifications.list()).find((notification: any) => notification.id === assignmentAlert.id)?.isRead).toBe(true);
    expect((await partnerCaller.deliveryPartner.assignments()).some((order: any) => order.id === deliveryOrderId)).toBe(true);
    await expect(customerCaller.deliveryPartner.accept({ orderId: deliveryOrderId })).rejects.toThrow("Only delivery partners can access this workspace");
    await partnerCaller.deliveryPartner.accept({ orderId: deliveryOrderId });
    expect((await getDeliveryOrder(deliveryOrderId))?.deliveryAcceptedAt).toBeTruthy();
    expect((await customerCaller.delivery.tracking({ orderId: deliveryOrderId }))).toMatchObject({
      order: { status: "confirmed", deliveryPartnerId: partner.id, deliveryPartnerName: partner.name },
    });
    await partnerCaller.deliveryPartner.start({ orderId: deliveryOrderId });
    expect((await getDeliveryOrder(deliveryOrderId))?.status).toBe("shipped");
    await partnerCaller.deliveryPartner.updateLocation({ orderId: deliveryOrderId, latitude: 19.076, longitude: 72.8777, accuracy: 12, source: "manual" });
    expect((await getDeliveryOrder(deliveryOrderId))?.currentLatitude).toBe("19.0760000");
    const customerTracking = await customerCaller.delivery.tracking({ orderId: deliveryOrderId });
    expect(customerTracking).toMatchObject({
      order: { currentLatitude: "19.0760000", currentLongitude: "72.8777000" },
      location: { latitude: "19.0760000", longitude: "72.8777000", partnerId: partner.id },
    });
    const adminDeliveryOrders = await adminCaller.admin.deliveryOrders();
    expect(adminDeliveryOrders).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: deliveryOrderId, deliveryPartnerId: partner.id, currentLatitude: "19.0760000", currentLongitude: "72.8777000" }),
    ]));
    await saveProofOfDelivery(deliveryOrderId, partner.id, "https://example.test/proof.jpg");
    const deliveryOtp = await createDeliveryOtp(deliveryOrderId, partner.id);
    await partnerCaller.deliveryPartner.complete({ orderId: deliveryOrderId, code: deliveryOtp.code });
    expect((await getDeliveryOrder(deliveryOrderId))?.status).toBe("delivered");
    const partnerEarnings = await partnerCaller.deliveryPartner.earnings();
    expect(partnerEarnings.find((earning: any) => earning.orderId === deliveryOrderId)).toMatchObject({ partnerId: partner.id, deliveryFee: "15.00", netAmount: "15.00", status: "earned" });
    const partnerSummary = await partnerCaller.deliveryPartner.routeSummary();
    expect(partnerSummary).toMatchObject({ deliveredToday: 1, activeDeliveries: 0, todayEarnings: 15, totalEarnings: 15 });
    expect(await sellerCaller.seller.dashboard()).toMatchObject({ totalOrders: expect.any(Number), totalProducts: expect.any(Number), totalEarnings: expect.any(Number) });
    expect(Array.isArray(await sellerCaller.seller.earnings())).toBe(true);

    const upgradedSeller = await findOrCreatePhoneUser({
      phone: customerPhone,
      name: "Lifecycle Customer Store",
      address: "8 Customer Lane, Mumbai",
      role: "seller",
      password: "LifecycleUpgrade2026",
      aadhaarNumber: "987654321098",
      shopName: "Lifecycle Customer Store",
    });
    expect(upgradedSeller).toMatchObject({ id: customer.id, role: "seller", shopStatus: "pending", aadhaarLast4: "1098" });

    await sellerCaller.products.update({ id: productId, name: "Lifecycle Premium Tomatoes" });
    const contentUpdated = (await getSellerProducts(seller.id)).find((product: any) => product.id === productId) as any;
    expect(contentUpdated.approvalStatus).toBe("pending");
    expect(contentUpdated.isActive).toBe(false);
  }, 60_000);
});
