import { getUserById } from "./db";
import { searchIndianAddresses } from "./geocoding";
import { getRoadRoute, type RouteCoordinate } from "./routing";
import { calculateDeliveryCharge, DEFAULT_DELIVERY_PRICING, type DeliveryChargeQuote } from "../shared/delivery-pricing";

const sellerCache = new Map<number, { address: string; coordinate: RouteCoordinate; expiresAt: number }>();
export async function quoteDeliveryCharge(input: { sellerId: number; deliveryLatitude: number; deliveryLongitude: number }): Promise<DeliveryChargeQuote & { provider: "osrm" }> {
  if (!Number.isFinite(input.deliveryLatitude) || !Number.isFinite(input.deliveryLongitude)) throw new Error("A valid delivery destination pin is required");
  const seller = await getUserById(input.sellerId);
  const address = seller?.address?.trim();
  if (!seller || seller.role !== "seller" || !address) throw new Error("The store location is not configured, so delivery pricing is unavailable");
  const cached = sellerCache.get(input.sellerId);
  let origin = cached && cached.address === address && cached.expiresAt > Date.now() ? cached.coordinate : undefined;
  if (!origin) {
    const result = (await searchIndianAddresses(address))[0];
    if (!result) throw new Error("The store location could not be mapped");
    origin = { latitude: result.latitude, longitude: result.longitude };
    sellerCache.set(input.sellerId, { address, coordinate: origin, expiresAt: Date.now() + 900_000 });
  }
  const route = await getRoadRoute(origin, { latitude: input.deliveryLatitude, longitude: input.deliveryLongitude });
  if (route.provider !== "osrm" || route.distanceMeters === null) throw new Error("The delivery route could not be calculated; no delivery charge was applied");
  return { ...calculateDeliveryCharge(route.distanceMeters / 1000, DEFAULT_DELIVERY_PRICING), provider: "osrm" };
}
