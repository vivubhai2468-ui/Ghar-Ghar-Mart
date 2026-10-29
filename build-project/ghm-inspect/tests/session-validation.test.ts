import { describe, expect, it } from "vitest";

import { shouldInvalidateCachedSession } from "../lib/session-validation";

describe("cached session validation", () => {
  it("invalidates a cached account when the server no longer resolves it", () => {
    expect(shouldInvalidateCachedSession("360001", null)).toBe(true);
  });

  it("invalidates a cached account when its identity differs from the server", () => {
    expect(shouldInvalidateCachedSession("360001", { id: 180001 })).toBe(true);
  });

  it("keeps a cached account only when the server confirms the same identity", () => {
    expect(shouldInvalidateCachedSession("180001", { id: 180001 })).toBe(false);
  });
});
