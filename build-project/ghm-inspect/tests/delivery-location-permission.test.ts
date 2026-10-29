import { describe, expect, it } from "vitest";

import { getDeliveryGpsUnavailableMessage, shouldRequestForegroundLocationAfterLogin } from "../lib/delivery-location-permission";

describe("delivery location permission policy", () => {
  it("requests foreground location only for delivery-partner sign-in", () => {
    expect(shouldRequestForegroundLocationAfterLogin("delivery_partner", "approved")).toBe(true);
    expect(shouldRequestForegroundLocationAfterLogin("delivery_partner", "pending")).toBe(false);
    expect(shouldRequestForegroundLocationAfterLogin("customer", "approved")).toBe(false);
    expect(shouldRequestForegroundLocationAfterLogin("seller", "approved")).toBe(false);
  });

  it("provides a settings-based fallback when login permission was not granted", () => {
    expect(getDeliveryGpsUnavailableMessage()).toContain("device settings");
  });
});
