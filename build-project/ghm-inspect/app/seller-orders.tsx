import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

type SellerOrder = {
  id: number;
  orderNumber: string;
  status: "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
  paymentMethod: "online" | "cod";
  paymentStatus: "pending" | "completed" | "failed";
  deliveryAddress: string;
  total: string | number;
  shippingCost?: string | number | null;
  deliveryDistanceKm?: string | number | null;
  createdAt: Date | string;
  deliveryEtaMinutes?: number | null;
};

type OrderFilter = "all" | "active" | "delivered" | "cancelled";

const FILTERS: Array<{ id: OrderFilter; label: string }> = [
  { id: "all", label: "All orders" },
  { id: "active", label: "To fulfil" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_META: Record<SellerOrder["status"], { label: string; tone: string; fill: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: "New order", tone: "#9A5A00", fill: "#FFF3CC", icon: "time-outline" },
  confirmed: { label: "Confirmed", tone: "#166534", fill: "#DCFCE7", icon: "checkmark-circle-outline" },
  packed: { label: "Packed", tone: "#155E75", fill: "#DFF5FB", icon: "cube-outline" },
  shipped: { label: "With delivery", tone: "#4338CA", fill: "#E8E8FF", icon: "bicycle-outline" },
  delivered: { label: "Delivered", tone: "#166534", fill: "#DCFCE7", icon: "checkmark-done-outline" },
  cancelled: { label: "Cancelled", tone: "#B91C1C", fill: "#FEE2E2", icon: "close-circle-outline" },
};

function money(value: string | number) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }
function dateLabel(value: Date | string) { return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }

export default function SellerOrdersScreen() {
  const utils = trpc.useUtils();
  const profileQuery = trpc.user.getProfile.useQuery();
  const approved = profileQuery.data?.shopStatus === "approved" && profileQuery.data?.isActive !== false;
  const ordersQuery = trpc.orders.getSellerOrders.useQuery(undefined, { enabled: approved });
  const updateStatus = trpc.orders.updateStatus.useMutation({ onSuccess: () => void utils.orders.getSellerOrders.invalidate() });
  const [filter, setFilter] = useState<OrderFilter>("all");

  const orders = useMemo(() => (ordersQuery.data ?? []) as SellerOrder[], [ordersQuery.data]);
  const filteredOrders = useMemo(() => orders.filter((order) => filter === "all" || (filter === "active" ? !["delivered", "cancelled"].includes(order.status) : order.status === filter)), [filter, orders]);
  const activeCount = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  const orderValue = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.total || 0), 0);

  const nextAction = (order: SellerOrder) => {
    if (order.status === "pending") return { label: "Confirm order", status: "confirmed" as const, icon: "checkmark" as const };
    if (order.status === "confirmed") return { label: "Mark packed", status: "packed" as const, icon: "cube" as const };
    if (order.status === "packed") return { label: "Hand to delivery", status: "shipped" as const, icon: "bicycle" as const };
    return null;
  };

  const requestStatusUpdate = (order: SellerOrder, status: SellerOrder["status"], label: string) => {
    Alert.alert(label, `Update ${order.orderNumber} to ${STATUS_META[status].label.toLowerCase()}?`, [
      { text: "Not now", style: "cancel" },
      { text: "Update", onPress: () => updateStatus.mutate({ id: order.id, status }) },
    ]);
  };

  if (profileQuery.isLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#2E7D32" /></ScreenContainer>;
  if (!approved) return <ScreenContainer className="bg-[#F6FAF4]" containerClassName="bg-[#F6FAF4]"><View className="flex-1 items-center justify-center px-6"><View className="w-full rounded-3xl border border-[#F8D988] bg-[#FFFBEA] p-6"><Ionicons name="lock-closed-outline" size={34} color="#A16207" /><Text className="mt-4 text-2xl font-extrabold text-[#173C25]">Orders unlock after approval</Text><Text className="mt-2 text-sm leading-5 text-[#68776D]">Your seller application must be approved before you can manage fulfilment.</Text><Pressable onPress={() => router.replace("/seller-dashboard")} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text className="font-extrabold text-white">View application status</Text></Pressable></View></View></ScreenContainer>;

  const renderOrder = ({ item: order }: { item: SellerOrder }) => {
    const meta = STATUS_META[order.status];
    const action = nextAction(order);
    return <View style={styles.orderCard}>
      <View style={styles.orderTop}><View><Text style={styles.orderNumber}>{order.orderNumber}</Text><Text style={styles.orderDate}>Placed {dateLabel(order.createdAt)}</Text></View><View style={[styles.statusPill, { backgroundColor: meta.fill }]}><Ionicons name={meta.icon} size={13} color={meta.tone} /><Text style={[styles.statusText, { color: meta.tone }]}>{meta.label}</Text></View></View>
      <View style={styles.divider} />
      <View style={styles.detailRow}><View style={styles.detailIcon}><Ionicons name="location-outline" size={17} color="#2E7D32" /></View><View style={styles.detailCopy}><Text style={styles.detailLabel}>Delivery address</Text><Text style={styles.detailValue} numberOfLines={2}>{order.deliveryAddress}</Text></View></View>
      <View style={styles.orderMeta}><View><Text style={styles.metaLabel}>Payment</Text><Text style={styles.metaValue}>{order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}</Text></View><View><Text style={styles.metaLabel}>Delivery route</Text><Text style={styles.metaValue}>{order.deliveryDistanceKm ? `${Number(order.deliveryDistanceKm).toFixed(1)} km · ${money(order.shippingCost ?? 0)}` : "Saved with order"}</Text></View><View style={styles.amountBlock}><Text style={styles.metaLabel}>Order value</Text><Text style={styles.amountValue}>{money(order.total)}</Text></View></View>
      {order.status === "shipped" && order.deliveryEtaMinutes ? <View style={styles.routeNote}><Ionicons name="navigate-outline" size={15} color="#4338CA" /><Text style={styles.routeNoteText}>Delivery partner ETA: about {order.deliveryEtaMinutes} min</Text></View> : null}
      {action ? <Pressable onPress={() => requestStatusUpdate(order, action.status, action.label)} disabled={updateStatus.isPending} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed, updateStatus.isPending && styles.disabled]}><Ionicons name={action.icon} size={17} color="#14532D" /><Text style={styles.actionButtonText}>{action.label}</Text></Pressable> : null}
      {["pending", "confirmed"].includes(order.status) ? <Pressable onPress={() => requestStatusUpdate(order, "cancelled", "Cancel order")} disabled={updateStatus.isPending} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}><Text style={styles.cancelButtonText}>Cancel fulfilment</Text></Pressable> : null}
    </View>;
  };

  return <ScreenContainer className="bg-[#F6FAF4] p-0" containerClassName="bg-[#F6FAF4]"><FlatList data={filteredOrders} keyExtractor={(order) => String(order.id)} renderItem={renderOrder} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent} ListHeaderComponent={<><View style={styles.hero}><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Ionicons name="arrow-back" size={20} color="#FDE68A" /><Text style={styles.backText}>Seller workspace</Text></Pressable><Text style={styles.eyebrow}>FULFILMENT DESK</Text><Text style={styles.heroTitle}>Orders that need your attention</Text><Text style={styles.heroText}>Confirm, pack and hand orders to delivery with a clear live status trail.</Text><View style={styles.metricRow}><View><Text style={styles.metricValue}>{activeCount}</Text><Text style={styles.metricLabel}>to fulfil</Text></View><View style={styles.metricDivider} /><View><Text style={styles.metricValue}>{money(orderValue)}</Text><Text style={styles.metricLabel}>order value</Text></View></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{FILTERS.map((item) => <Pressable key={item.id} onPress={() => setFilter(item.id)} style={({ pressed }) => [styles.filterChip, filter === item.id && styles.filterSelected, pressed && styles.pressed]}><Text style={[styles.filterText, filter === item.id && styles.filterTextSelected]}>{item.label}</Text></Pressable>)}</ScrollView><View style={styles.sectionRow}><Text style={styles.sectionTitle}>{filter === "all" ? "All seller orders" : FILTERS.find((item) => item.id === filter)?.label}</Text><Text style={styles.sectionCount}>{filteredOrders.length} shown</Text></View></>} ListEmptyComponent={ordersQuery.isLoading ? <ActivityIndicator style={styles.loader} color="#2E7D32" /> : <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={30} color="#2E7D32" /></View><Text style={styles.emptyTitle}>No orders in this view</Text><Text style={styles.emptyText}>When customers place orders from your approved catalogue, they will appear here.</Text></View>} /></ScreenContainer>;
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 34 }, hero: { backgroundColor: "#14532D", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 22 }, backButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6 }, backText: { color: "#FDE68A", fontSize: 12, fontWeight: "800" }, eyebrow: { color: "#BBF7D0", fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginTop: 18 }, heroTitle: { color: "#FFFFFF", fontSize: 27, lineHeight: 33, fontWeight: "800", marginTop: 5, maxWidth: 340 }, heroText: { color: "#DCFCE7", fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 400 }, metricRow: { flexDirection: "row", gap: 16, alignItems: "center", marginTop: 18 }, metricValue: { color: "#FFFFFF", fontSize: 19, fontWeight: "800" }, metricLabel: { color: "#BBF7D0", fontSize: 10, fontWeight: "700", marginTop: 2 }, metricDivider: { width: 1, height: 28, backgroundColor: "#4B9360" }, filters: { gap: 8, paddingHorizontal: 16, paddingVertical: 14 }, filterChip: { borderRadius: 12, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 9 }, filterSelected: { borderColor: "#B7DDBA", backgroundColor: "#E8F5E9" }, filterText: { color: "#68776D", fontSize: 11, fontWeight: "800" }, filterTextSelected: { color: "#14532D" }, sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 }, sectionTitle: { color: "#173C25", fontSize: 18, fontWeight: "800" }, sectionCount: { color: "#68776D", fontSize: 11, fontWeight: "700" }, orderCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 22, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "#FFFFFF", padding: 15 }, orderTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, orderNumber: { color: "#173C25", fontSize: 15, fontWeight: "800" }, orderDate: { color: "#7B8B80", fontSize: 11, marginTop: 4 }, statusPill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 }, statusText: { fontSize: 10, fontWeight: "800" }, divider: { height: 1, backgroundColor: "#EEF3ED", marginVertical: 14 }, detailRow: { flexDirection: "row", gap: 9 }, detailIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#E8F5E9" }, detailCopy: { flex: 1 }, detailLabel: { color: "#7B8B80", fontSize: 10, fontWeight: "700" }, detailValue: { color: "#365242", fontSize: 12, lineHeight: 17, fontWeight: "600", marginTop: 2 }, orderMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 }, metaLabel: { color: "#7B8B80", fontSize: 10, fontWeight: "700" }, metaValue: { color: "#365242", fontSize: 12, fontWeight: "700", marginTop: 3 }, amountBlock: { alignItems: "flex-end" }, amountValue: { color: "#28723B", fontSize: 15, fontWeight: "800", marginTop: 2 }, routeNote: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 11, padding: 9, marginTop: 13, backgroundColor: "#F0F0FF" }, routeNoteText: { color: "#4338CA", fontSize: 11, fontWeight: "700" }, actionButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 13, paddingVertical: 12, marginTop: 15, backgroundColor: "#FDE68A" }, actionButtonText: { color: "#14532D", fontSize: 12, fontWeight: "800" }, cancelButton: { alignItems: "center", paddingVertical: 10, marginTop: 3 }, cancelButtonText: { color: "#B91C1C", fontSize: 11, fontWeight: "800" }, loader: { marginTop: 50 }, empty: { alignItems: "center", marginHorizontal: 16, marginTop: 20, borderRadius: 24, padding: 28, backgroundColor: "#FFFFFF" }, emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#E8F5E9" }, emptyTitle: { color: "#173C25", fontSize: 16, fontWeight: "800", marginTop: 12 }, emptyText: { color: "#68776D", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6, maxWidth: 290 }, primary: { alignItems: "center", borderRadius: 15, backgroundColor: "#2E7D32", paddingVertical: 13, marginTop: 18 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, disabled: { opacity: 0.55 },
});
