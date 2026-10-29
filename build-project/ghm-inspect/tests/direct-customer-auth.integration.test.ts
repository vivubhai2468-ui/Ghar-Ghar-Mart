import { describe, expect, it } from "vitest";

import { getAdminUsers } from "../server/admin-helpers";
import { appRouter } from "../server/routers";

function publicCaller() {
  return appRouter.createCaller({
    user: null,
    req: { protocol: "https", hostname: "localhost", headers: { host: "localhost" } } as any,
    res: { cookie: () => undefined, clearCookie: () => undefined } as any,
  });
}

describe("direct customer authentication", () => {
  it("creates and signs in a customer without requesting or verifying an SMS OTP", async () => {
    const caller = publicCaller();
    const phone = `7${String(Date.now()).slice(-9)}`;
    const password = "freshBasket2026";

    const created = await caller.auth.directCustomer.signUp({
      name: "Direct Customer",
      phone,
      address: "12 Market Lane, Mumbai 400001",
      password,
    });

    expect(created.user).toMatchObject({ name: "Direct Customer", role: "customer" });
    expect(created.sessionToken).toEqual(expect.any(String));

    await expect(caller.auth.directCustomer.signIn({ phone, password: "incorrect-password" })).rejects.toThrow("Mobile number or password is incorrect");

    const signedIn = await caller.auth.directCustomer.signIn({ phone, password });
    expect(signedIn.user).toMatchObject({ id: created.user.id, role: "customer" });
    expect(signedIn.sessionToken).toEqual(expect.any(String));

    const administratorRecords = await getAdminUsers(10, 0, phone);
    expect(administratorRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.user.id, name: "Direct Customer", phone: `+91${phone}`, role: "user" }),
      ]),
    );
  });
});
