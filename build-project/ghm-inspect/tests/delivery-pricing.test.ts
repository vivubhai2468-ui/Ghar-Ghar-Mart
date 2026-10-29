import { describe, expect, it } from "vitest";
import { calculateDeliveryCharge, calculateOrderTotal, DEFAULT_DELIVERY_PRICING, POOR_PEOPLE_DONATION } from "../shared/delivery-pricing";

describe("delivery pricing", () => {
  it("uses ₹10 for the first 2 km and ₹5 for each additional started kilometre", () => {
    expect(DEFAULT_DELIVERY_PRICING).toEqual({ baseDistanceKm: 2, baseCharge: 10, additionalChargePerKm: 5 });
    expect(calculateDeliveryCharge(2).deliveryCharge).toBe(10);
    expect(calculateDeliveryCharge(2.01).deliveryCharge).toBe(15);
    expect(calculateDeliveryCharge(4).deliveryCharge).toBe(20);
  });
  it.each([[0.5, 10], [2, 10], [2.1, 15], [2.9, 15], [3, 15], [3.1, 20], [4.2, 25], [5, 25], [6, 30], [10, 50]])("charges %s km at ₹%s", (distance, charge) => {
    expect(calculateDeliveryCharge(distance).deliveryCharge).toBe(charge);
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
