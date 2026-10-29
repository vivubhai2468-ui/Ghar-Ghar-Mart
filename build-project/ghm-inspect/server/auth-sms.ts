import { ENV } from "./_core/env";

const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
const fromNumber = process.env.TWILIO_FROM_NUMBER ?? "";

export async function sendAuthenticationOtp(phone: string, code: string, purpose: "login" | "signup" | "phone_change") {
  if (!accountSid || !authToken || !fromNumber) {
    if (ENV.isProduction) return { delivered: false, error: "SMS provider is not configured" };
    return { delivered: false, previewCode: code, error: "Preview SMS fallback" };
  }

  const purposeLabel = purpose === "phone_change" ? "mobile number update" : purpose === "signup" ? "account creation" : "sign in";
  const body = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: `Ghar Ghar Mart ${purposeLabel} code: ${code}. It expires in 10 minutes. Do not share this code with anyone.`,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Twilio request failed");
    return { delivered: false, error: errorText.slice(0, 500) };
  }

  const result = (await response.json()) as { sid?: string; status?: string };
  return { delivered: true, providerMessageId: result.sid, status: result.status };
}
