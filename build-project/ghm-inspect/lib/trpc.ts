import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, splitLink } from "@trpc/client";
import superjson from "superjson";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  const url = `${getApiBaseUrl()}/api/trpc`;

  return trpc.createClient({
    links: [
      splitLink({
        // All admin-router operations use the administrator token.
        condition: (op) => op.path.startsWith("admin."),

        true: httpBatchLink({
          url,
          transformer: superjson,
          async headers() {
            let adminToken = await AsyncStorage.getItem("admin_token");

            // Web fallback: read the same admin session from browser storage.
            if (!adminToken && typeof window !== "undefined") {
              adminToken = window.localStorage.getItem("admin_token");
            }

            return adminToken
              ? { Authorization: `Bearer ${adminToken}` }
              : {};
          },
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),

        // Customer and public operations retain normal authentication.
        false: httpBatchLink({
          url,
          transformer: superjson,
          async headers() {
            const token = await Auth.getSessionToken();

            return token
              ? { Authorization: `Bearer ${token}` }
              : {};
          },
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      }),
    ],
  });
}
