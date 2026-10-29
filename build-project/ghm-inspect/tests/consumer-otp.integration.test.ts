import { describe, expect, it } from "vitest";

import { createPhoneOtpChallenge, verifyPhoneOtpChallenge } from "../server/db";

function uniquePhone(seed: number) {
  return `9${String(seed).slice(-9)}`;
}

describe("consumer SMS OTP challenge controls", () => {
  it("rejects incorrect codes, accepts the issued code once, and prevents reuse", async () => {
    const phone = uniquePhone(Date.now());
    const challenge = await createPhoneOtpChallenge(phone, "signup");

    await expect(verifyPhoneOtpChallenge(phone, "signup", "000000")).rejects.toThrow("Incorrect OTP");
    await expect(verifyPhoneOtpChallenge(phone, "signup", challenge.code)).resolves.toMatchObject({ phone: challenge.phone });
    await expect(verifyPhoneOtpChallenge(phone, "signup", challenge.code)).rejects.toThrow("OTP has expired");
  });

  it("enforces the rolling OTP resend limit", async () => {
    const phone = uniquePhone(Date.now() + 1);
    await createPhoneOtpChallenge(phone, "login");
    await createPhoneOtpChallenge(phone, "login");
    await createPhoneOtpChallenge(phone, "login");
    await expect(createPhoneOtpChallenge(phone, "login")).rejects.toThrow("Too many OTP requests");
  });
});
