import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

export default function SellerDashboardScreen() {
  const profileQuery = trpc.user.getProfile.useQuery();
  const profile = profileQuery.data;
  const approved = profile?.shopStatus === "approved" && profile?.isActive !== false;
  const dashboardQuery = trpc.seller.dashboard.useQuery(undefined, { enabled: approved });
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { enabled: approved, refetchInterval: 30_000 });
  const stats = dashboardQuery.data as { totalEarnings?: number; totalOrders?: number; totalProducts?: number; rating?: number } | undefined;
  const unreadAlerts = ((notificationsQuery.data ?? []) as Array<{ type: string; isRead: boolean }>).filter((notification) => (notification.type === "seller_new_order" || notification.type === "seller_low_stock") && !notification.isRead).length;

  if (profileQuery.isLoading) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#2E7D32" /></ScreenContainer>;
  }

  const status = profile?.shopStatus || "pending";
  const isRejected = status === "rejected";

  return (
    <ScreenContainer className="bg-[#F6FAF4]" containerClassName="bg-[#F6FAF4]">
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <View className="rounded-[28px] bg-[#14532D] p-6">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Seller workspace</Text>
          <Text className="mt-2 text-3xl font-extrabold text-white">{profile?.shopName || profile?.name || "Your Store"}</Text>
          <Text className="mt-2 text-sm leading-5 text-[#DCFCE7]">Manage products, stock and orders from one secure business panel.</Text>
          <View className="mt-5 self-start rounded-full bg-white/15 px-3 py-2">
            <Text className="text-xs font-extrabold uppercase tracking-wide text-white">{approved ? "Approved seller" : isRejected ? "Review needs attention" : "Verification in progress"}</Text>
          </View>
        </View>

        {!approved ? (
          <View className={`mt-5 rounded-3xl border p-5 ${isRejected ? "border-[#F3B6B6] bg-[#FFF7F7]" : "border-[#F8D988] bg-[#FFFBEA]"}`}>
            <View className="flex-row items-center">
              <View className={`h-11 w-11 items-center justify-center rounded-2xl ${isRejected ? "bg-[#FEE2E2]" : "bg-[#FEF3C7]"}`}>
                <Ionicons name={isRejected ? "alert-circle" : "time"} size={24} color={isRejected ? "#B91C1C" : "#A16207"} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-lg font-extrabold text-[#173C25]">{isRejected ? "Application needs review" : "Your application is being reviewed"}</Text>
                <Text className="mt-1 text-sm leading-5 text-[#68776D]">{isRejected ? "Contact support to update your seller details and submit again." : "An administrator is verifying your OTP-validated mobile number, address and Aadhaar reference."}</Text>
              </View>
            </View>
            <View className="mt-4 rounded-2xl bg-white/70 px-4 py-3">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Identity reference</Text>
              <Text className="mt-1 text-sm font-extrabold text-[#173C25]">Aadhaar ending •••• {profile?.aadhaarLast4 || "—"}</Text>
            </View>
            <Text className="mt-4 text-sm font-semibold text-[#58705E]">Product creation will unlock automatically as soon as the account is approved.</Text>
            <Pressable onPress={() => router.push("/seller-verification" as never)} style={({ pressed }) => ({ marginTop: 16, alignItems: "center", borderRadius: 15, backgroundColor: "#2E7D32", paddingVertical: 13, opacity: pressed ? 0.7 : 1 })}><Text className="font-extrabold text-white">Upload verification documents</Text></Pressable>
          </View>
        ) : (
          <>
            <View className="mt-5 flex-row flex-wrap justify-between gap-y-3">
              {[
                { label: "Earnings", value: `₹${Number(stats?.totalEarnings ?? 0).toLocaleString("en-IN")}`, icon: "cash-outline" as const },
                { label: "Orders", value: String(stats?.totalOrders ?? 0), icon: "receipt-outline" as const },
                { label: "Products", value: String(stats?.totalProducts ?? 0), icon: "cube-outline" as const },
                { label: "Rating", value: `${Number(stats?.rating ?? 0).toFixed(1)} ★`, icon: "star-outline" as const },
              ].map((item) => (
                <View key={item.label} className="w-[48%] rounded-3xl border border-[#DCE9D9] bg-white p-4">
                  <Ionicons name={item.icon} size={20} color="#2E7D32" />
                  <Text className="mt-4 text-xl font-extrabold text-[#173C25]">{item.value}</Text>
                  <Text className="mt-1 text-xs font-bold uppercase tracking-wide text-[#68776D]">{item.label}</Text>
                </View>
              ))}
            </View>

            <View className="mt-6 rounded-3xl bg-[#E8F5E9] p-5">
              <Text className="text-lg font-extrabold text-[#173C25]">Your store is live</Text>
              <Text className="mt-1 text-sm leading-5 text-[#58705E]">Add products, set prices and maintain stock levels. New items remain tied to your verified seller record.</Text>
              <Pressable onPress={() => router.push("/seller-products")} style={({ pressed }) => ({ marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="add-circle-outline" size={20} color="white" />
                <Text className="ml-2 text-base font-extrabold text-white">Manage products</Text>
              </Pressable>
            </View>
            <View className="mt-4 flex-row gap-3">
              <Pressable onPress={() => router.push("/seller-orders" as never)} style={({ pressed }) => ({ flex: 1, borderRadius: 22, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "white", padding: 16, opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="receipt-outline" size={22} color="#2E7D32" />
                <Text className="mt-4 text-base font-extrabold text-[#173C25]">Orders</Text>
                <Text className="mt-1 text-xs leading-4 text-[#68776D]">Confirm, pack and hand off fulfilment.</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/seller-earnings" as never)} style={({ pressed }) => ({ flex: 1, borderRadius: 22, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "white", padding: 16, opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="wallet-outline" size={22} color="#2E7D32" />
                <Text className="mt-4 text-base font-extrabold text-[#173C25]">Earnings</Text>
                <Text className="mt-1 text-xs leading-4 text-[#68776D]">Review net sales and payout activity.</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => router.push("/seller-notifications" as never)} style={({ pressed }) => ({ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 22, borderWidth: 1, borderColor: unreadAlerts ? "#F8D988" : "#DCE9D9", backgroundColor: unreadAlerts ? "#FFFBEA" : "white", padding: 17, opacity: pressed ? 0.7 : 1 })}><View className="flex-row items-center"><View className={`h-11 w-11 items-center justify-center rounded-2xl ${unreadAlerts ? "bg-[#FEF3C7]" : "bg-[#E8F5E9]"}`}><Ionicons name="notifications-outline" size={22} color={unreadAlerts ? "#A16207" : "#2E7D32"} /></View><View className="ml-3"><Text className="text-base font-extrabold text-[#173C25]">Shop alerts</Text><Text className="mt-1 text-sm text-[#68776D]">{unreadAlerts ? `${unreadAlerts} new order or low-stock alert${unreadAlerts === 1 ? "" : "s"}` : "New orders and low-stock updates"}</Text></View></View><Ionicons name="chevron-forward" size={22} color="#2E7D32" /></Pressable>
            <Pressable onPress={() => router.push("/seller-profile" as never)} style={({ pressed }) => ({ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 22, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "white", padding: 17, opacity: pressed ? 0.7 : 1 })}><View className="flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F5E9]"><Ionicons name="storefront-outline" size={22} color="#2E7D32" /></View><View className="ml-3"><Text className="text-base font-extrabold text-[#173C25]">Shop profile and hours</Text><Text className="mt-1 text-sm text-[#68776D]">Details customers see and your weekly opening hours.</Text></View></View><Ionicons name="chevron-forward" size={22} color="#2E7D32" /></Pressable>
            <Pressable onPress={() => router.push("/seller-verification" as never)} style={({ pressed }) => ({ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 22, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "white", padding: 17, opacity: pressed ? 0.7 : 1 })}><View><Text className="text-base font-extrabold text-[#173C25]">Verification and payouts</Text><Text className="mt-1 text-sm text-[#68776D]">Documents, review notes and your payout profile.</Text></View><Ionicons name="chevron-forward" size={22} color="#2E7D32" /></Pressable>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
