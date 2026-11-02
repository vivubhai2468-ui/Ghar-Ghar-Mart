export type DeliveryPricingConfig = { baseDistanceKm: number; baseCharge: number; additionalChargePerKm: number };
export type DeliveryChargeQuote = DeliveryPricingConfig & { distanceKm: number; additionalDistanceKm: number; deliveryCharge: number };
export const DEFAULT_DELIVERY_PRICING: DeliveryPricingConfig = { baseDistanceKm: 0, baseCharge: 10, additionalChargePerKm: 0 };
export const POOR_PEOPLE_DONATION = 2;

export function calculateOrderTotal(input: { subtotal: number; deliveryCharge: number; tax?: number; discount?: number }): number {
  const { subtotal, deliveryCharge, tax = 0, discount = 0 } = input;
  if (![subtotal, deliveryCharge, tax, discount].every(Number.isFinite)) throw new Error("Order amounts must be finite numbers");
  return Math.max(0, subtotal + tax + deliveryCharge + POOR_PEOPLE_DONATION - discount);
}

export function calculateDeliveryCharge(distanceKm: number, config: DeliveryPricingConfig = DEFAULT_DELIVERY_PRICING): DeliveryChargeQuote {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error("Delivery distance must be a finite non-negative number");
  if (!Number.isFinite(config.baseDistanceKm) || config.baseDistanceKm < 0 || !Number.isFinite(config.baseCharge) || config.baseCharge < 0 || !Number.isFinite(config.additionalChargePerKm) || config.additionalChargePerKm < 0) throw new Error("Delivery pricing configuration is invalid");
  return { ...config, distanceKm, additionalDistanceKm: 0, deliveryCharge: config.baseCharge };
}
