import { describe, expect, it } from "vitest";

import {
  ADMIN_PREVIEW_CREDENTIALS,
  isValidAdminPreviewCredential,
} from "../lib/admin-credentials";

describe("administrator credentials", () => {
  it("accepts the configured username and password", () => {
    expect(
      isValidAdminPreviewCredential(
        ADMIN_PREVIEW_CREDENTIALS.username,
        ADMIN_PREVIEW_CREDENTIALS.password,
      ),
    ).toBe(true);
    expect(isValidAdminPreviewCredential("GGMAdminAman", "GGM2026")).toBe(true);
  });

  it("rejects old mobile/OTP values and incorrect passwords", () => {
    expect(isValidAdminPreviewCredential("9876543210", "1234")).toBe(false);
    expect(isValidAdminPreviewCredential("GGMAdminAman", "wrong-password")).toBe(false);
    expect(isValidAdminPreviewCredential("GGMAdmin", "GGM2026")).toBe(false);
  });
});
