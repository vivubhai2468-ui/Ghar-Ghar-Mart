const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type DeliveryPushPayload = {
  title: string;
  body: string;
  orderId?: number;
  productId?: number;
  url?: string;
  channelId?: string;
};

export async function sendDeliveryPush(tokens: string[], payload: DeliveryPushPayload) {
  const validTokens = tokens.filter((token) => token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));
  if (validTokens.length === 0) return { tickets: [], invalidTokens: [] as string[] };

  const messages = validTokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: { orderId: payload.orderId, productId: payload.productId, url: payload.url ?? (payload.orderId ? `/order-tracking?orderId=${payload.orderId}` : "/seller-notifications") },
    priority: "high",
    channelId: payload.channelId ?? "delivery-updates",
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push request failed (${response.status})`);
  }

  const body = (await response.json()) as {
    data?: Array<{ status?: string; details?: { error?: string } }>;
  };
  const tickets = body.data ?? [];
  const invalidTokens = tickets.flatMap((ticket, index) =>
    ticket.details?.error === "DeviceNotRegistered" ? [validTokens[index]] : []
  );
  return { tickets, invalidTokens };
}
