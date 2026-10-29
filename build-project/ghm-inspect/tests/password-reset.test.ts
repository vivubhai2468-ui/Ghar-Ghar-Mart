import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";

const mocks = vi.hoisted(() => ({
  createPasswordResetToken: vi.fn(),
  invalidatePasswordResetToken: vi.fn(),
  resetAccountPassword: vi.fn(),
  adminResetCustomerPassword: vi.fn(),
  assertPasswordResetEmailConfigured: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("../server/db", () => ({
  createPasswordResetToken: mocks.createPasswordResetToken,
  invalidatePasswordResetToken: mocks.invalidatePasswordResetToken,
  resetAccountPassword: mocks.resetAccountPassword,
  adminResetCustomerPassword: mocks.adminResetCustomerPassword,
}));

vi.mock("../server/email", () => ({
  assertPasswordResetEmailConfigured: mocks.assertPasswordResetEmailConfigured,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));

function publicCaller() {
  return appRouter.createCaller({
    user: null,
    req: { protocol: "https", hostname: "localhost", headers: { host: "localhost" } } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  });
}

function adminCaller(role = "admin") {
  return appRouter.createCaller({
    user: { id: 9, name: "Recovery Admin", role } as any,
    req: { protocol: "https", hostname: "localhost", headers: { host: "localhost" }, ip: "127.0.0.1", get: vi.fn(() => "test-agent") } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  });
}

describe("email password reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertPasswordResetEmailConfigured.mockReturnValue(undefined);
    mocks.createPasswordResetToken.mockResolvedValue({ email: "account@example.com", token: "a".repeat(64) });
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
  });

  it.each([
    { role: "customer" as const, phone: "9876543210" },
    { role: "seller" as const, phone: "9876543211" },
    { role: "delivery_partner" as const, phone: "9876543212" },
  ])("sends a $role reset link and does not reveal unknown accounts", async ({ role, phone }) => {
    const caller = publicCaller();
    if (role === "customer") {
      await expect(caller.auth.directCustomer.requestPasswordReset({ phone })).resolves.toEqual({ success: true });
    } else {
      await expect(caller.auth.partnerPassword.requestPasswordReset({ phone, role })).resolves.toEqual({ success: true });
    }
    expect(mocks.createPasswordResetToken).toHaveBeenCalledWith(phone, role === "customer" ? "user" : role);
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith({
      to: "account@example.com",
      token: "a".repeat(64),
      role,
    });

    mocks.createPasswordResetToken.mockResolvedValueOnce(null);
    if (role === "customer") {
      await expect(caller.auth.directCustomer.requestPasswordReset({ phone })).resolves.toEqual({ success: true });
    } else {
      await expect(caller.auth.partnerPassword.requestPasswordReset({ phone, role })).resolves.toEqual({ success: true });
    }
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it("checks email delivery configuration before creating a reset token", async () => {
    mocks.assertPasswordResetEmailConfigured.mockImplementationOnce(() => {
      throw new Error("Password reset email is not configured");
    });

    await expect(publicCaller().auth.partnerPassword.requestPasswordReset({
      phone: "9876543210",
      role: "seller",
    })).rejects.toThrow("Password reset email is not configured");
    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
  });

  it("invalidates a partner reset token when email delivery fails", async () => {
    mocks.sendPasswordResetEmail.mockRejectedValueOnce(new Error("Email delivery failed"));

    await expect(publicCaller().auth.partnerPassword.requestPasswordReset({
      phone: "9876543210",
      role: "delivery_partner",
    })).rejects.toThrow("Email delivery failed");
    expect(mocks.invalidatePasswordResetToken).toHaveBeenCalledWith(
      "9876543210",
      "delivery_partner",
      "a".repeat(64),
    );
  });

  it.each(["seller", "delivery_partner"] as const)("resets passwords for the matching %s role", async (role) => {
    const input = {
      phone: "9876543210",
      role,
      token: "b".repeat(64),
      password: "NewPartnerPass2026",
    };
    await expect(publicCaller().auth.partnerPassword.resetPassword(input)).resolves.toEqual({ success: true });
    expect(mocks.resetAccountPassword).toHaveBeenCalledWith(input);
    await expect(publicCaller().auth.partnerPassword.resetPassword({ ...input, token: "not-a-token" })).rejects.toThrow();
    expect(mocks.resetAccountPassword).toHaveBeenCalledTimes(1);
  });

  it("allows an admin to reset a customer password only after identity verification", async () => {
    mocks.adminResetCustomerPassword.mockResolvedValue(undefined);
    await expect(adminCaller().admin.users.resetPassword({
      customerId: 17,
      password: "NewCustomerPass2026",
      identityVerified: true,
    })).resolves.toEqual({ success: true });
    expect(mocks.adminResetCustomerPassword).toHaveBeenCalledWith({
      customerId: 17,
      password: "NewCustomerPass2026",
      adminId: 9,
      adminName: "Recovery Admin",
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
    });
  });

  it("rejects admin password resets from non-admins or without identity verification", async () => {
    await expect(adminCaller("user").admin.users.resetPassword({
      customerId: 17,
      password: "NewCustomerPass2026",
      identityVerified: true,
    })).rejects.toThrow();
    await expect(adminCaller().admin.users.resetPassword({
      customerId: 17,
      password: "NewCustomerPass2026",
      identityVerified: false,
    } as any)).rejects.toThrow();
    expect(mocks.adminResetCustomerPassword).not.toHaveBeenCalled();
  });
});
