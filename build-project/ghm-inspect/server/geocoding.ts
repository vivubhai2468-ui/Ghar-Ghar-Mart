export type GeocodingResult = {
  label: string;
  latitude: number;
  longitude: number;
};

let lastRequestAt = 0;

async function respectPublicServiceLimit() {
  const waitMs = Math.max(0, 1_050 - (Date.now() - lastRequestAt));
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastRequestAt = Date.now();
}

async function nominatim(path: string) {
  await respectPublicServiceLimit();
  const response = await fetch(`https://nominatim.openstreetmap.org${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "GharGharMart/1.0 delivery-address-search",
    },
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) throw new Error("Address search is temporarily unavailable");
  return response.json();
}

export async function searchIndianAddresses(query: string): Promise<GeocodingResult[]> {
  const payload = await nominatim(`/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(query)}`) as Array<{ display_name?: string; lat?: string; lon?: string }>;
  return payload.flatMap((result) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (!result.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [{ label: result.display_name, latitude, longitude }];
  });
}

export async function reverseGeocodeIndianAddress(latitude: number, longitude: number): Promise<GeocodingResult | null> {
  const payload = await nominatim(`/reverse?format=jsonv2&zoom=18&lat=${latitude}&lon=${longitude}`) as { display_name?: string; lat?: string; lon?: string };
  const nextLatitude = Number(payload.lat ?? latitude);
  const nextLongitude = Number(payload.lon ?? longitude);
  if (!payload.display_name || !Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) return null;
  return { label: payload.display_name, latitude: nextLatitude, longitude: nextLongitude };
}
