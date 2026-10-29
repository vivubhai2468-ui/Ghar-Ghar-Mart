import { describe, expect, it } from "vitest";

import { getSignedInEntryRoute } from "../lib/entry-routing";

describe("signed-in entry routing", () => {
  it("opens the Seller Panel for sellers", () => {
    expect(getSignedInEntryRoute("seller")).toBe("/seller-dashboard");
  });

  it("opens the delivery partner workspace for delivery accounts", () => {
    expect(getSignedInEntryRoute("delivery_partner")).toBe("/delivery-partner");
  });

  it("preserves customer, guest, and administrator entry behavior", () => {
    expect(getSignedInEntryRoute("customer")).toBe("/(tabs)");
    expect(getSignedInEntryRoute("guest")).toBe("/(tabs)");
    expect(getSignedInEntryRoute("admin")).toBe("/(tabs)");
  });
});
