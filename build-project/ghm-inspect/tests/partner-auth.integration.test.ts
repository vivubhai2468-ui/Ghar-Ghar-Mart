import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import { createPhoneOtpChallenge, getUserById, getUserByPhone } from "../server/db";

function uniquePhone(seed: number) {
  return `7${String(seed).slice(-9)}`;
}

function callerFor(user: any) {
  return appRouter.createCaller({
    user,
    req: {} as any,
    res: { cookie: () => undefined, clearCookie: () => undefined } as any,
  });
}

function publicCaller() {
  return appRouter.createCaller({
    user: null,
    req: {} as any,
    res: { cookie: () => undefined, clearCookie: () => undefined } as any,
  });
}

async function signUpAndSignIn(input: {
  phone: string;
  name: string;
  role: "seller" | "delivery_partner";
  password: string;
  address?: string;
  shopName?: string;
  aadhaarNumber: string;
}) {
  const caller = publicCaller();
  const signupChallenge = await createPhoneOtpChallenge(input.phone, "signup");
  const signup = await caller.auth.phoneOtp.signUp({
    ...input,
    address: input.address ?? "15 Market Road, Mumbai",
    code: signupChallenge.code,
  });

  const login = await caller.auth.partnerPassword.signIn({
    phone: input.phone,
    password: input.password,
    role: input.role,
  });
  return { signup, login };
}

describe("partner password authentication", () => {
  it("creates a pending seller account and signs in with phone and password", async () => {
    const phone = uniquePhone(Date.now());
    const password = "SellerPass2026";
    const { signup, login } = await signUpAndSignIn({
      phone,
      name: "Auth Seller",
      role: "seller",
      password,
      shopName: "Auth Fresh Mart",
      aadhaarNumber: "123456789012",
    });

    expect(signup.user).toMatchObject({ role: "seller", sellerStatus: "pending" });
    expect(login.user).toMatchObject({ role: "seller" });
    expect((await getUserByPhone(phone))?.shopStatus).toBe("pending");

    const caller = publicCaller();
    await expect(caller.auth.partnerPassword.signIn({ phone, password: "WrongPass2026", role: "seller" })).rejects.toThrow("Mobile number or password is incorrect");
    await expect(caller.auth.partnerPassword.signIn({ phone, password, role: "delivery_partner" })).rejects.toThrow("Mobile number or password is incorrect");

    const legacyLoginChallenge = await createPhoneOtpChallenge(phone, "login");
    await expect(caller.auth.phoneOtp.signIn({ phone, code: legacyLoginChallenge.code })).rejects.toThrow("must sign in with a password");

    const recoveryChallenge = await createPhoneOtpChallenge(phone, "login");
    const recovered = await caller.auth.partnerPassword.setWithOtp({
      phone,
      code: recoveryChallenge.code,
      password: "ResetSeller2026",
      role: "seller",
    });
    expect(recovered.user).toMatchObject({ id: login.user.id, role: "seller" });
    await expect(caller.auth.partnerPassword.signIn({ phone, password, role: "seller" })).rejects.toThrow("Mobile number or password is incorrect");
    await expect(caller.auth.partnerPassword.signIn({ phone, password: "ResetSeller2026", role: "seller" })).resolves.toMatchObject({ user: { id: login.user.id, role: "seller" } });
  }, 15_000);

  it("creates a pending delivery account, signs in with phone and password, and receives an approval notification", async () => {
    const phone = uniquePhone(Date.now() + 1);
    const { signup, login } = await signUpAndSignIn({
      phone,
      name: "Auth Delivery Partner",
      role: "delivery_partner",
      password: "DeliveryPass2026",
      aadhaarNumber: "987654321098",
    });

    expect(signup.user).toMatchObject({ role: "delivery_partner", deliveryPartnerStatus: "pending" });
    expect(login.user).toMatchObject({ role: "delivery_partner", deliveryPartnerStatus: "pending" });
    const pendingPartner = await getUserByPhone(phone);
    expect(pendingPartner?.deliveryPartnerStatus).toBe("pending");

    const adminCaller = callerFor({ ...pendingPartner, role: "admin", name: "Approval Admin" });
    await adminCaller.admin.deliveryPartnerReviews.review({ partnerId: Number(pendingPartner?.id), status: "approved" });
    const partnerCaller = callerFor(await getUserById(Number(pendingPartner?.id)));
    const approvalNotification = (await partnerCaller.notifications.list()).find((notification: any) => notification.type === "delivery_partner_review");
    expect(approvalNotification).toMatchObject({
      userId: pendingPartner?.id,
      title: "Delivery profile approved",
      isRead: false,
    });
  }, 15_000);
});
