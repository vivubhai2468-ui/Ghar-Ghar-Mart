import { describe, expect, it } from "vitest";

import { formatRouteDistance, getNextRouteManeuver } from "../lib/route-maneuvers";

describe("delivery route maneuvers", () => {
  it("selects the next actionable maneuver after departure", () => {
    expect(getNextRouteManeuver([
      { instruction: "Start", distanceMeters: 0, durationSeconds: 0, type: "depart", modifier: null },
      { instruction: "Turn left", distanceMeters: 180, durationSeconds: 30, type: "turn", modifier: "left" },
    ])?.instruction).toBe("Turn left");
  });

  it("formats nearby and longer turn distances clearly", () => {
    expect(formatRouteDistance(180)).toBe("180 m ahead");
    expect(formatRouteDistance(1240)).toBe("1.2 km ahead");
  });
});
