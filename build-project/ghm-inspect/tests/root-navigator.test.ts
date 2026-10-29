import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("root navigator", () => {
  it("registers each explicit stack screen only once", () => {
    const layout = readFileSync(resolve(process.cwd(), "app/_layout.tsx"), "utf8");
    const names = [...layout.matchAll(/<Stack\.Screen name="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(names).size).toBe(names.length);
  });
});
