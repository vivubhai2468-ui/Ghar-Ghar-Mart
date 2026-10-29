import type { UserRole } from "@/lib/auth-context";

/** Returns the appropriate signed-in destination without changing administrator auth flow. */
export function getSignedInEntryRoute(role: UserRole) {
  if (role === "seller") return "/seller-dashboard";
  if (role === "delivery_partner") return "/delivery-partner";
  return "/(tabs)";
}
