import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("delivery background tracking configuration", () => {
  it("enables native background location permissions and defines the global task", () => {
    const config = readFileSync(resolve(projectRoot, "app.config.ts"), "utf8");
    const task = readFileSync(resolve(projectRoot, "lib/delivery-background-location.ts"), "utf8");
    expect(config).toContain("isIosBackgroundLocationEnabled: true");
    expect(config).toContain("isAndroidBackgroundLocationEnabled: true");
    expect(config).toContain("isAndroidForegroundServiceEnabled: true");
    expect(task).toContain("TaskManager.defineTask");
    expect(task).toContain("Location.startLocationUpdatesAsync");
  });
});
