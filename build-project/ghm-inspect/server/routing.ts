export type RouteCoordinate = { latitude: number; longitude: number };

export type RoadRoute = {
  coordinates: RouteCoordinate[];
  distanceMeters: number | null;
  durationSeconds: number | null;
  provider: "osrm" | "direct";
  maneuvers: RoadManeuver[];
};

export type RoadManeuver = {
  instruction: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  type: string;
  modifier: string | null;
};

function isCoordinate(value: RouteCoordinate | null | undefined): value is RouteCoordinate {
  return Boolean(value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude));
}

/**
 * Retrieves a road-aware route from the public OSRM demonstration service.
 * The direct line return is deliberate: delivery tracking remains usable when
 * the public routing service is unavailable or rate-limited.
 */
export async function getRoadRoute(origin: RouteCoordinate, destination: RouteCoordinate): Promise<RoadRoute> {
  if (!isCoordinate(origin) || !isCoordinate(destination)) {
    return { coordinates: [], distanceMeters: null, durationSeconds: null, provider: "direct", maneuvers: [] };
  }

  const fallback: RoadRoute = {
    coordinates: [origin, destination],
    distanceMeters: null,
    durationSeconds: null,
    provider: "direct",
    maneuvers: [],
  };

  try {
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6_000) },
    );
    if (!response.ok) return fallback;
    const payload = await response.json() as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
        legs?: Array<{ steps?: Array<{ distance?: number; duration?: number; name?: string; ref?: string; destinations?: string; maneuver?: { type?: string; modifier?: string } }> }>;
      }>;
    };
    const route = payload.routes?.[0];
    const routeCoordinates = route?.geometry?.coordinates
      ?.map(([longitude, latitude]) => ({ latitude, longitude }))
      .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) ?? [];
    if (payload.code !== "Ok" || routeCoordinates.length < 2) return fallback;
    const maneuvers = (route?.legs ?? []).flatMap((leg) => leg.steps ?? []).map((step): RoadManeuver => {
      const type = step.maneuver?.type ?? "continue";
      const modifier = step.maneuver?.modifier ?? null;
      const roadName = step.name || step.ref || step.destinations || "the road";
      let instruction = `Continue on ${roadName}`;
      if (type === "depart") instruction = modifier ? `Head ${modifier} on ${roadName}` : `Start on ${roadName}`;
      if (type === "arrive") instruction = "Arrive at the customer destination";
      if (type === "roundabout") instruction = `At the roundabout, continue toward ${roadName}`;
      if (type === "turn" || type === "fork" || type === "merge" || type === "end of road") instruction = `${type === "merge" ? "Merge" : "Turn"}${modifier ? ` ${modifier}` : ""} onto ${roadName}`;
      return {
        instruction,
        distanceMeters: typeof step.distance === "number" ? Math.round(step.distance) : null,
        durationSeconds: typeof step.duration === "number" ? Math.round(step.duration) : null,
        type,
        modifier,
      };
    });
    return {
      coordinates: routeCoordinates,
      distanceMeters: typeof route?.distance === "number" ? Math.round(route.distance) : null,
      durationSeconds: typeof route?.duration === "number" ? Math.round(route.duration) : null,
      provider: "osrm",
      maneuvers,
    };
  } catch {
    return fallback;
  }
}
