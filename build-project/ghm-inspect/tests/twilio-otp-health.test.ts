import { describe, expect, it } from "vitest";

describe("Twilio SMS OTP provider", () => {
  it("authenticates against the Twilio account endpoint", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    expect(accountSid).toBeTruthy();
    expect(authToken).toBeTruthy();
    expect(fromNumber).toMatch(/^\+\d{8,15}$/);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}` },
    });
    expect(response.ok).toBe(true);
  }, 15_000);
});
