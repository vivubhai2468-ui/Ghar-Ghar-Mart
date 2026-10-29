import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

type SellerNotification = { id: number; type: "seller_new_order" | "seller_low_stock"; title: string; message: string; relatedOrderId?: number | null; relatedProductId?: number | null; isRead: boolean; createdAt: Date | string };
const TYPE_META = {
  seller_new_order: { label: "New order", icon: "receipt-outline" as const, color: "#166534", fill: "#DCFCE7" },
  seller_low_stock: { label: "Low stock", icon: "alert-circle-outline" as const, color: "#9A5A00", fill: "#FFF3CC" },
};

function timeLabel(value: Date | string) {
  const date = new Date(value);
  const difference = Date.now() - date.getTime();
  if (difference < 60_000) return "Just now";
  if (difference < 3_600_000) return `${Math.max(1, Math.floor(difference / 60_000))}m ago`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function SellerNotificationsScreen() {
  const utils = trpc.useUtils();
  const profileQuery = trpc.user.getProfile.useQuery();
  const approved = profileQuery.data?.shopStatus === "approved" && profileQuery.data?.isActive !== false;
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { enabled: approved, refetchInterval: 30_000 });
  const markRead = trpc.notifications.markAsRead.useMutation({ onSuccess: () => void utils.notifications.list.invalidate() });
  const alerts = useMemo(() => ((notificationsQuery.data ?? []) as SellerNotification[]).filter((notification) => notification.type === "seller_new_order" || notification.type === "seller_low_stock"), [notificationsQuery.data]);
  const unread = alerts.filter((notification) => !notification.isRead).length;

  const openAlert = async (notification: SellerNotification) => {
    if (!notification.isRead) await markRead.mutateAsync(notification.id);
    router.push(notification.type === "seller_new_order" ? "/seller-orders" as never : "/seller-products" as never);
  };

  if (profileQuery.isLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#2E7D32" /></ScreenContainer>;
  if (!approved) return <ScreenContainer className="bg-[#F6FAF4]" containerClassName="bg-[#F6FAF4]"><View className="flex-1 items-center justify-center px-6"><View className="w-full rounded-3xl border border-[#F8D988] bg-[#FFFBEA] p-6"><Ionicons name="lock-closed-outline" size={34} color="#A16207" /><Text className="mt-4 text-2xl font-extrabold text-[#173C25]">Alerts unlock after approval</Text><Text className="mt-2 text-sm leading-5 text-[#68776D]">Your order and inventory alerts will appear after your seller account is approved.</Text><Pressable onPress={() => router.replace("/seller-dashboard")} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text className="font-extrabold text-white">View application status</Text></Pressable></View></View></ScreenContainer>;

  const renderAlert = ({ item }: { item: SellerNotification }) => {
    const meta = TYPE_META[item.type];
    return <Pressable onPress={() => void openAlert(item)} disabled={markRead.isPending} style={({ pressed }) => [styles.alertCard, !item.isRead && styles.unreadCard, pressed && styles.pressed]}><View style={[styles.alertIcon, { backgroundColor: meta.fill }]}><Ionicons name={meta.icon} size={22} color={meta.color} /></View><View style={styles.alertCopy}><View style={styles.alertTop}><Text style={styles.alertTitle}>{item.title}</Text>{!item.isRead ? <View style={styles.unreadDot} /> : null}</View><Text style={styles.alertMessage}>{item.message}</Text><View style={styles.alertFooter}><Text style={[styles.kindText, { color: meta.color }]}>{meta.label}</Text><Text style={styles.timeText}>{timeLabel(item.createdAt)}</Text></View></View><Ionicons name="chevron-forward" size={18} color="#7B8B80" /></Pressable>;
  };

  return <ScreenContainer className="bg-[#F6FAF4] p-0" containerClassName="bg-[#F6FAF4]"><FlatList data={alerts} renderItem={renderAlert} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} ListHeaderComponent={<View style={styles.hero}><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Ionicons name="arrow-back" size={20} color="#FDE68A" /><Text style={styles.backText}>Seller workspace</Text></Pressable><Text style={styles.eyebrow}>SELLER ALERTS</Text><Text style={styles.heroTitle}>Stay ahead of the shop</Text><Text style={styles.heroText}>New orders and low-stock updates are collected here so the next business action is always clear.</Text><View style={styles.summary}><View style={styles.summaryIcon}><Ionicons name="notifications-outline" size={23} color="#14532D" /></View><View><Text style={styles.summaryValue}>{unread}</Text><Text style={styles.summaryLabel}>unread alert{unread === 1 ? "" : "s"}</Text></View></View><View style={styles.sectionRow}><Text style={styles.sectionTitle}>Recent activity</Text><Text style={styles.sectionCount}>{alerts.length} total</Text></View></View>} ListEmptyComponent={notificationsQuery.isLoading ? <ActivityIndicator style={styles.loader} color="#2E7D32" /> : <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="notifications-off-outline" size={31} color="#2E7D32" /></View><Text style={styles.emptyTitle}>Your shop is all caught up</Text><Text style={styles.emptyText}>New customer orders and low-stock alerts will arrive here as your store activity changes.</Text></View>} /></ScreenContainer>;
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 34 }, hero: { backgroundColor: "#14532D", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20 }, backButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6 }, backText: { color: "#FDE68A", fontSize: 12, fontWeight: "800" }, eyebrow: { color: "#BBF7D0", fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginTop: 18 }, heroTitle: { color: "#FFFFFF", fontSize: 27, lineHeight: 33, fontWeight: "800", marginTop: 5 }, heroText: { color: "#DCFCE7", fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 400 }, summary: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, padding: 13, marginTop: 18, backgroundColor: "#FDE68A", alignSelf: "flex-start" }, summaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.55)" }, summaryValue: { color: "#14532D", fontSize: 19, fontWeight: "800" }, summaryLabel: { color: "#416040", fontSize: 10, fontWeight: "800", marginTop: 1 }, sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24 }, sectionTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" }, sectionCount: { color: "#BBF7D0", fontSize: 11, fontWeight: "700" }, alertCard: { flexDirection: "row", alignItems: "center", gap: 11, marginHorizontal: 16, marginTop: 12, borderRadius: 20, borderWidth: 1, borderColor: "#E0EAE0", backgroundColor: "#FFFFFF", padding: 14 }, unreadCard: { borderColor: "#B8DCBA", backgroundColor: "#FBFEFA" }, alertIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" }, alertCopy: { flex: 1 }, alertTop: { flexDirection: "row", alignItems: "center", gap: 6 }, alertTitle: { color: "#173C25", fontSize: 13, fontWeight: "800", flex: 1 }, unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D7485D" }, alertMessage: { color: "#68776D", fontSize: 11, lineHeight: 16, marginTop: 3 }, alertFooter: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 7 }, kindText: { fontSize: 10, fontWeight: "800" }, timeText: { color: "#8A988C", fontSize: 10, fontWeight: "700" }, loader: { marginTop: 55 }, empty: { alignItems: "center", marginHorizontal: 16, marginTop: 22, borderRadius: 24, padding: 28, backgroundColor: "#FFFFFF" }, emptyIcon: { width: 60, height: 60, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#E8F5E9" }, emptyTitle: { color: "#173C25", fontSize: 16, fontWeight: "800", marginTop: 13 }, emptyText: { color: "#68776D", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6, maxWidth: 290 }, primary: { alignItems: "center", borderRadius: 15, backgroundColor: "#2E7D32", paddingVertical: 13, marginTop: 18 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
