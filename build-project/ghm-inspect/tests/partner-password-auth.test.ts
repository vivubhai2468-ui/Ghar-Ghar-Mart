import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";

const mocks = vi.hoisted(() => ({
  getUserByPhone: vi.fn(),
  verifyPhoneOtpChallenge: vi.fn(),
  signInPartnerWithPassword: vi.fn(),
  setPartnerPassword: vi.fn(),
  findOrCreatePhoneUser: vi.fn(),
  createSessionToken: vi.fn(async () => "test-session-token"),
}));

vi.mock("../server/db", () => ({
  getUserByPhone: mocks.getUserByPhone,
  verifyPhoneOtpChallenge: mocks.verifyPhoneOtpChallenge,
  signInPartnerWithPassword: mocks.signInPartnerWithPassword,
  setPartnerPassword: mocks.setPartnerPassword,
  findOrCreatePhoneUser: mocks.findOrCreatePhoneUser,
}));

vi.mock("../server/_core/sdk", () => ({
  sdk: { createSessionToken: mocks.createSessionToken },
}));

const partner = {
  id: 42,
  openId: "phone:+919876543210",
  name: "Password Partner",
  phone: "+919876543210",
  address: "Partner profile",
  role: "seller",
  shopStatus: "pending",
  deliveryPartnerStatus: null,
};

function publicCaller() {
  return appRouter.createCaller({
    user: null,
    req: { protocol: "https", hostname: "localhost", headers: { host: "localhost" } } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  });
}

describe("partner password authentication routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInPartnerWithPassword.mockResolvedValue(partner);
    mocks.setPartnerPassword.mockResolvedValue(partner);
    mocks.getUserByPhone.mockResolvedValue(partner);
  });

  it("returns a partner session after phone-and-password sign-in", async () => {
    const result = await publicCaller().auth.partnerPassword.signIn({
      phone: "9876543210",
      password: "PartnerPass2026",
      role: "seller",
    });

    expect(mocks.signInPartnerWithPassword).toHaveBeenCalledWith({
      phone: "9876543210",
      password: "PartnerPass2026",
      role: "seller",
    });
    expect(result).toMatchObject({
      sessionToken: "test-session-token",
      user: { id: partner.id, role: "seller", sellerStatus: "pending" },
    });
  });

  it("verifies OTP before setting a partner password and issuing a session", async () => {
    const result = await publicCaller().auth.partnerPassword.setWithOtp({
      phone: "9876543210",
      code: "123456",
      password: "NewPartnerPass2026",
      role: "seller",
    });

    expect(mocks.verifyPhoneOtpChallenge).toHaveBeenCalledWith("9876543210", "login", "123456");
    expect(mocks.setPartnerPassword).toHaveBeenCalledWith({
      phone: "9876543210",
      code: "123456",
      password: "NewPartnerPass2026",
      role: "seller",
    });
    expect(result.user).toMatchObject({ id: partner.id, role: "seller" });
  });

  it("rejects OTP sign-in for existing partners", async () => {
    await expect(publicCaller().auth.phoneOtp.signIn({ phone: "9876543210", code: "123456" }))
      .rejects.toThrow("must sign in with a password");
  });

  it("requires a password when signing up as a partner", async () => {
    await expect(publicCaller().auth.phoneOtp.signUp({
      name: "New Seller",
      phone: "9876543210",
      email: "seller@example.com",
      address: "15 Market Road, Mumbai",
      role: "seller",
      aadhaarNumber: "123456789012",
      code: "123456",
    })).rejects.toThrow();

    expect(mocks.verifyPhoneOtpChallenge).not.toHaveBeenCalled();
  });

  it("requires a recovery email when signing up as a partner", async () => {
    await expect(publicCaller().auth.phoneOtp.signUp({
      name: "New Delivery Partner",
      phone: "9876543210",
      address: "15 Market Road, Mumbai",
      role: "delivery_partner",
      aadhaarNumber: "123456789012",
      password: "NewPartnerPass2026",
      code: "123456",
    })).rejects.toThrow();

    expect(mocks.verifyPhoneOtpChallenge).not.toHaveBeenCalled();
  });
});
