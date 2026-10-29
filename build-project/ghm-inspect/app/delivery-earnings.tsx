import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

const formatCurrency = (amount: unknown) => `₹${Number(amount ?? 0).toFixed(0)}`;

export default function DeliveryEarningsScreen() {
  const { userRole } = useAuth();
  const earningsQuery = trpc.deliveryPartner.earnings.useQuery(undefined, { enabled: userRole === "delivery_partner" });
  const summaryQuery = trpc.deliveryPartner.routeSummary.useQuery(undefined, { enabled: userRole === "delivery_partner" });
  const summary = summaryQuery.data;

  if (userRole !== "delivery_partner") return <ScreenContainer className="items-center justify-center bg-[#F5FAF4] px-7"><Text className="text-center text-sm text-[#68776D]">Sign in as a delivery partner to view earnings.</Text></ScreenContainer>;

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="bg-[#F5FAF4]"><FlatList data={earningsQuery.data ?? []} keyExtractor={(item) => String(item.id)} contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }} ListHeaderComponent={<View><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-[15px] font-bold text-[#2E7D32]">‹ Back to delivery</Text></Pressable><View className="mt-5 rounded-[28px] bg-[#14532D] p-5"><Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#FDE68A]">Route earnings</Text><Text className="mt-2 text-[29px] font-extrabold text-white">{formatCurrency(summary?.todayEarnings)} today</Text><Text className="mt-2 text-sm leading-5 text-[#DCFCE7]">{summary?.deliveredToday ?? 0} deliveries completed · {summary?.activeDeliveries ?? 0} currently on route</Text><View className="mt-4 rounded-2xl bg-white/10 p-3"><Text className="text-[11px] font-bold uppercase tracking-wide text-[#BBF7D0]">All-time earnings</Text><Text className="mt-1 text-xl font-extrabold text-white">{formatCurrency(summary?.totalEarnings)}</Text></View></View><Text className="mt-6 text-base font-extrabold text-[#173C25]">Delivery history</Text></View>} ListEmptyComponent={!earningsQuery.isLoading ? <View className="rounded-2xl border border-[#DCE9D9] bg-white p-5"><Text className="text-base font-bold text-[#173C25]">No earnings yet</Text><Text className="mt-1 text-sm leading-5 text-[#68776D]">An earning appears after an OTP-confirmed delivery is completed.</Text></View> : null} renderItem={({ item }) => <View className="rounded-2xl border border-[#DCE9D9] bg-white p-4"><View className="flex-row items-center justify-between"><View><Text className="text-sm font-extrabold text-[#173C25]">Order #{item.orderId}</Text><Text className="mt-1 text-xs text-[#718177]">{new Date(item.createdAt).toLocaleDateString()} · {item.status}</Text></View><Text className="text-base font-extrabold text-[#24713B]">{formatCurrency(item.netAmount)}</Text></View><View className="mt-3 flex-row justify-between"><Text className="text-xs text-[#718177]">Delivery fee {formatCurrency(item.deliveryFee)}</Text><Text className="text-xs text-[#718177]">Incentive {formatCurrency(item.incentive)}</Text></View></View>} /></ScreenContainer>;
}
