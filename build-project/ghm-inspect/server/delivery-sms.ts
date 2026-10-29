import { ENV } from "./_core/env";

const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
const fromNumber = process.env.TWILIO_FROM_NUMBER ?? "";

export async function sendDeliveryConfirmationSms(phone: string, code: string) {
  if (!accountSid || !authToken || !fromNumber) {
    if (ENV.isProduction) {
      return { delivered: false, error: "SMS provider is not configured" };
    }
    return { delivered: false, previewCode: code, error: "Preview SMS fallback" };
  }

  const body = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: `Ghar Ghar Mart delivery confirmation code: ${code}. Share it with your delivery partner only after receiving your order.`,
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
