import { beforeEach, describe, expect, it, vi } from "vitest";
import { quoteDeliveryCharge } from "../server/delivery-pricing";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  searchIndianAddresses: vi.fn(),
  getRoadRoute: vi.fn(),
  routeDistanceMeters: 2000,
}));

vi.mock("../server/db", () => ({ getUserById: mocks.getUserById }));
vi.mock("../server/geocoding", () => ({ searchIndianAddresses: mocks.searchIndianAddresses }));
vi.mock("../server/routing", () => ({ getRoadRoute: mocks.getRoadRoute }));

describe("server delivery price quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.routeDistanceMeters = 2000;
    mocks.getUserById.mockResolvedValue({ id: 12, role: "seller", address: "12 Market Road" });
    mocks.searchIndianAddresses.mockResolvedValue([{ latitude: 19.076, longitude: 72.8777 }]);
    mocks.getRoadRoute.mockImplementation(async () => ({
      provider: "osrm",
      coordinates: [],
      distanceMeters: mocks.routeDistanceMeters,
      durationSeconds: 600,
      maneuvers: [],
    }));
  });

  it("quotes ₹10 through 2 km and adds ₹5 for each started kilometre beyond it", async () => {
    await expect(quoteDeliveryCharge({ sellerId: 12, deliveryLatitude: 19.08, deliveryLongitude: 72.9 }))
      .resolves.toMatchObject({ distanceKm: 2, baseCharge: 10, additionalDistanceKm: 0, deliveryCharge: 10 });

    mocks.routeDistanceMeters = 2010;
    await expect(quoteDeliveryCharge({ sellerId: 12, deliveryLatitude: 19.081, deliveryLongitude: 72.9 }))
      .resolves.toMatchObject({ distanceKm: 2.01, baseCharge: 10, additionalChargePerKm: 5, additionalDistanceKm: 1, deliveryCharge: 15 });
  });
});
