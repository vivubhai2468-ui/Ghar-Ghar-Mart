import { describe, expect, it } from "vitest";

describe("Expo EAS project configuration", () => {
  it("uses a valid project UUID and authenticated Expo access token", async () => {
    const projectId = process.env.EXPO_PROJECT_ID;
    const expoToken = process.env.EXPO_TOKEN;

    expect(projectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(expoToken).toBeTruthy();

    const response = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${expoToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "query AppById($appId: String!) { app { byId(appId: $appId) { id slug } } }",
        variables: { appId: projectId },
      }),
    });
    const payload = await response.json() as { data?: { app?: { byId?: { id?: string; slug?: string } } }; errors?: unknown[] };

    expect(response.ok).toBe(true);
    expect(payload.errors ?? []).toHaveLength(0);
    expect(payload.data?.app?.byId?.id).toBe(projectId);
    expect(payload.data?.app?.byId?.slug).toBe("ghar-ghar-mart");
  }, 15_000);
});
