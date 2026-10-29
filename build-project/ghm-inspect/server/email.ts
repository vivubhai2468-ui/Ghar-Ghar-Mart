import { ENV } from "./_core/env";

export function assertPasswordResetEmailConfigured() {
  if (!ENV.emailApiKey || !ENV.emailFrom || !ENV.publicAppUrl) {
    throw new Error("Password reset email is not configured");
  }
}

export async function sendPasswordResetEmail(input: { to: string; token: string; role: "customer" | "seller" | "delivery_partner" }) {
  assertPasswordResetEmailConfigured();
  const resetUrl = new URL("/reset-password", ENV.publicAppUrl);
  if (ENV.isProduction && resetUrl.protocol !== "https:") {
    throw new Error("Password reset links must use HTTPS in production");
  }
  resetUrl.searchParams.set("token", input.token);
  resetUrl.searchParams.set("role", input.role);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.emailApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ENV.emailFrom,
      to: [input.to],
      subject: "Reset your Ghar Ghar Mart password",
      text: `Use this secure link to reset your ${input.role} account password. It expires in 30 minutes and can only be used once:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Use this secure link to reset your ${input.role} account password. It expires in 30 minutes and can only be used once.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    }),
  });

  if (!response.ok) {
    console.error("Password reset email delivery failed", { status: response.status });
    throw new Error("Password reset email could not be sent. Please try again later.");
  }
}
