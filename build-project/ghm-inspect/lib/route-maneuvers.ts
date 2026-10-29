export type RouteManeuver = {
  instruction: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  type: string;
  modifier: string | null;
};

export function getNextRouteManeuver(maneuvers: RouteManeuver[] | undefined | null) {
  if (!maneuvers?.length) return null;
  return maneuvers.find((maneuver) => maneuver.type !== "depart" && maneuver.type !== "arrive") ?? maneuvers.find((maneuver) => maneuver.type !== "arrive") ?? maneuvers[0];
}

export function formatRouteDistance(distanceMeters: number | null | undefined) {
  if (!distanceMeters || distanceMeters <= 0) return "ahead";
  if (distanceMeters < 1000) return `${Math.max(10, Math.round(distanceMeters / 10) * 10)} m ahead`;
  return `${(distanceMeters / 1000).toFixed(1)} km ahead`;
}
