import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";

function adminCaller() {
  return appRouter.createCaller({
    user: { id: 999999, name: "Banner Administrator", role: "admin" } as any,
    req: { protocol: "https", hostname: "localhost", headers: { host: "localhost" } } as any,
    res: { cookie: () => undefined, clearCookie: () => undefined } as any,
  });
}

function publicCaller() {
  return appRouter.createCaller({
    user: null,
    req: { protocol: "https", hostname: "localhost", headers: { host: "localhost" } } as any,
    res: { cookie: () => undefined, clearCookie: () => undefined } as any,
  });
}

describe("Home offer banners", () => {
  it("rejects banner actions that cannot open a valid destination", async () => {
    const admin = adminCaller();
    const baseInput = {
      title: "Invalid destination test",
      description: "Banner action validation",
      backgroundColor: "#FFF7D1",
      priority: 1,
      isActive: true,
      startsAt: null,
      endsAt: null,
    };

    await expect(admin.admin.banners.create({
      ...baseInput,
      actionType: "url",
      actionValue: "javascript:alert(1)",
    })).rejects.toThrow("Banner actions must use a valid HTTP or HTTPS URL");
    await expect(admin.admin.banners.create({
      ...baseInput,
      actionType: "category",
      actionValue: null,
    })).rejects.toThrow("A category name or ID is required for category banner actions");
  });

  it("publishes, updates, exposes, and removes an administrator-managed Home banner", async () => {
    const admin = adminCaller();
    const publicApi = publicCaller();
    const marker = `BANNER-${Date.now()}`;

    const created = await admin.admin.banners.create({
      title: marker,
      description: "Live offer banner test record",
      badgeText: "25% OFF",
      couponCode: "BANNER25",
      imageUrl: null,
      backgroundColor: "#FFF7D1",
      actionType: "coupon",
      actionValue: "BANNER25",
      priority: 3,
      isActive: false,
      startsAt: null,
      endsAt: null,
    });

    expect((await publicApi.banners.list()).some((banner: any) => banner.id === created!.id)).toBe(false);

    await admin.admin.banners.update({ id: created!.id, isActive: true, priority: 1 });
    expect(await publicApi.banners.list()).toEqual(expect.arrayContaining([expect.objectContaining({ id: created!.id, title: marker, isActive: true })]));

    await admin.admin.banners.remove({ id: created!.id });
    expect((await publicApi.banners.list()).some((banner: any) => banner.id === created!.id)).toBe(false);
  }, 15000);
});
