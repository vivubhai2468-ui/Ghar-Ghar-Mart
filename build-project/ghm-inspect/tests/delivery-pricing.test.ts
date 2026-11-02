import { describe, expect, it } from "vitest";
import { calculateDeliveryCharge, calculateOrderTotal, DEFAULT_DELIVERY_PRICING, POOR_PEOPLE_DONATION } from "../shared/delivery-pricing";

describe("delivery pricing", () => {
  it("uses a flat ₹10 delivery charge", () => {
    expect(DEFAULT_DELIVERY_PRICING).toEqual({ baseDistanceKm: 0, baseCharge: 10, additionalChargePerKm: 0 });
    expect(calculateDeliveryCharge(2).deliveryCharge).toBe(10);
    expect(calculateDeliveryCharge(2.01).deliveryCharge).toBe(10);
    expect(calculateDeliveryCharge(4).deliveryCharge).toBe(10);
  });
  it.each([0.5, 2, 2.1, 2.9, 3, 3.1, 4.2, 5, 6, 10])("charges ₹10 for %s km", (distance) => {
    expect(calculateDeliveryCharge(distance).deliveryCharge).toBe(10);
  });
  it("adds the ₹2 donation to the checkout amount", () => {
    expect(POOR_PEOPLE_DONATION).toBe(2);
    expect(calculateOrderTotal({ subtotal: 100, deliveryCharge: 15 })).toBe(117);
  });
  it("applies tax and discount before enforcing a non-negative total", () => {
    expect(calculateOrderTotal({ subtotal: 100, tax: 5, deliveryCharge: 15, discount: 10 })).toBe(112);
    expect(calculateOrderTotal({ subtotal: 0, deliveryCharge: 0, discount: 100 })).toBe(0);
  });
  it("rejects invalid distance", () => expect(() => calculateDeliveryCharge(-1)).toThrow());
  it("rejects non-finite order amounts", () => expect(() => calculateOrderTotal({ subtotal: Number.NaN, deliveryCharge: 10 })).toThrow());
});
