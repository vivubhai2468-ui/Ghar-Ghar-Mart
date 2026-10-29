import { describe, expect, it } from "vitest";

import { hasNavigableDestination, toDeliveryNavigationCoordinate } from "../lib/delivery-navigation";

describe("in-app delivery navigation", () => {
  it("accepts valid persisted destination coordinates for the live map", () => {
    expect(toDeliveryNavigationCoordinate("25.6093", "85.1376")).toEqual({ latitude: 25.6093, longitude: 85.1376 });
  });

  it("keeps the delivery-address fallback when no usable destination pin is available", () => {
    expect(hasNavigableDestination(toDeliveryNavigationCoordinate(null, undefined))).toBe(false);
    expect(hasNavigableDestination(toDeliveryNavigationCoordinate("not-a-coordinate", "85.1376"))).toBe(false);
  });
});
