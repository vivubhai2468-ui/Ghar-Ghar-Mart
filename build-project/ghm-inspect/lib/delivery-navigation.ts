export type DeliveryNavigationCoordinate = {
  latitude: number;
  longitude: number;
};

export function toDeliveryNavigationCoordinate(latitude: unknown, longitude: unknown): DeliveryNavigationCoordinate | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
}

export function hasNavigableDestination(coordinate: DeliveryNavigationCoordinate | null) {
  return coordinate !== null;
}
