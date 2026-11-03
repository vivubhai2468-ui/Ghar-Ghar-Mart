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
        condition: (op) =>
          op.path.startsWith("admin.") ||
          op.path === "seller.catalog.uploadImage",

        true: httpBatchLink({
          url,
          transformer: superjson,
          async headers() {
            // On web, prefer the token saved by the admin login.
            let adminToken =
              typeof window !== "undefined"
                ? window.localStorage.getItem("admin_token")
                : null;

            if (!adminToken) {
              adminToken = await AsyncStorage.getItem("admin_token");
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
