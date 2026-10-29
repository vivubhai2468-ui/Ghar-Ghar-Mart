import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

type OrderFilter = "all" | "active" | "delivered";
type OrderStatus = "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";

type OrderRecord = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: "online" | "cod";
  paymentStatus: "pending" | "completed" | "failed";
  total: string | number;
  subtotal?: string | number | null;
  shippingCost?: string | number | null;
  deliveryDistanceKm?: string | number | null;
  donationAmount?: string | number | null;
  deliveryEtaMinutes?: number | null;
  deliveryAddress?: string | null;
  createdAt: Date | string;
  deliveredAt?: Date | string | null;
};

const FILTERS: Array<{ id: OrderFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "all", label: "All orders", icon: "receipt-outline" },
  { id: "active", label: "In progress", icon: "bicycle-outline" },
  { id: "delivered", label: "Delivered", icon: "checkmark-circle-outline" },
];

const STATUS_META: Record<OrderStatus, { label: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: string; background: string; progress: number; active: boolean }> = {
  pending: { label: "Order received", description: "We’re confirming your grocery basket.", icon: "receipt-outline", color: "#9A6700", background: "#FFF4C6", progress: 18, active: true },
  confirmed: { label: "Store confirmed", description: "Your store is preparing the order.", icon: "checkmark-done-outline", color: "#1D78C8", background: "#E6F3FF", progress: 38, active: true },
  packed: { label: "Packed with care", description: "Your basket is ready for dispatch.", icon: "basket-outline", color: "#6D4BC4", background: "#F0E8FF", progress: 60, active: true },
  shipped: { label: "Out for delivery", description: "Your rider is making their way to you.", icon: "bicycle-outline", color: "#28723B", background: "#E7F5E8", progress: 82, active: true },
  delivered: { label: "Delivered", description: "Your grocery delivery is complete.", icon: "checkmark-circle", color: "#28723B", background: "#DDF6E8", progress: 100, active: false },
  cancelled: { label: "Cancelled", description: "This order was cancelled before delivery.", icon: "close-circle-outline", color: "#B42318", background: "#FDE7E7", progress: 0, active: false },
};

function formatDate(input: Date | string | null | undefined) {
  if (!input) return "Recent order";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Recent order";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatAmount(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<OrderFilter>("all");
  const ordersQuery = trpc.orders.list.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const orders = useMemo(() => (ordersQuery.data ?? []) as OrderRecord[], [ordersQuery.data]);

  const filteredOrders = useMemo(() => {
    if (filter === "active") return orders.filter((order) => STATUS_META[order.status]?.active);
    if (filter === "delivered") return orders.filter((order) => order.status === "delivered");
    return orders;
  }, [filter, orders]);

  const activeOrders = useMemo(() => orders.filter((order) => STATUS_META[order.status]?.active).length, [orders]);
  const completedOrders = useMemo(() => orders.filter((order) => order.status === "delivered").length, [orders]);
  const totalSaved = useMemo(() => orders.reduce((sum, order) => sum + formatAmount(order.total), 0), [orders]);

  const trackOrder = (order: OrderRecord) => {
    router.push({ pathname: "/order-tracking", params: { orderId: String(order.id) } } as never);
  };

  const showSummary = (order: OrderRecord) => {
    const meta = STATUS_META[order.status];
    Alert.alert(
      `Order ${order.orderNumber}`,
      `${meta.label}\n\nSubtotal: ₹${formatAmount(order.subtotal)}\nDelivery (${order.deliveryDistanceKm ? `${Number(order.deliveryDistanceKm).toFixed(1)} km` : "saved route"}): ₹${formatAmount(order.shippingCost)}\nDonation for people in need: ₹${formatAmount(order.donationAmount ?? 2)}\nTotal: ₹${formatAmount(order.total)}\nPayment: ${order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}\nDelivery address: ${order.deliveryAddress || "Saved delivery address"}`,
    );
  };

  const renderOrderCard = ({ item }: { item: OrderRecord }) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.pending;
    const isTrackable = item.status === "shipped" || item.status === "packed" || item.status === "confirmed" || item.status === "pending";
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderTopRow}>
          <View style={[styles.orderStatusIcon, { backgroundColor: meta.background }]}>
            <Ionicons name={meta.icon} size={21} color={meta.color} />
          </View>
          <View style={styles.orderTitleCopy}>
            <Text style={styles.orderId}>#{item.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)} · {item.paymentMethod === "cod" ? "Cash on delivery" : item.paymentStatus === "completed" ? "Online payment confirmed" : item.paymentStatus === "failed" ? "Payment proof rejected" : "Payment awaiting confirmation"}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: meta.background }]}>
            <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
            <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.orderStateRow}>
          <View style={styles.orderStateCopy}>
            <Text style={styles.orderStateTitle}>{meta.description}</Text>
            {item.status === "shipped" && item.deliveryEtaMinutes ? <Text style={styles.etaText}>Arriving in about {item.deliveryEtaMinutes} min</Text> : item.status === "delivered" ? <Text style={styles.etaText}>Delivered {formatDate(item.deliveredAt ?? item.createdAt)}</Text> : <Text style={styles.etaText}>We’ll keep you posted at every step.</Text>}
          </View>
          <Text style={styles.orderTotal}>₹{formatAmount(item.total)}</Text>
        </View>

        <View style={styles.deliveryPriceRow}><Text style={styles.deliveryPriceText}>{item.deliveryDistanceKm ? `${Number(item.deliveryDistanceKm).toFixed(1)} km route` : "Route saved with order"}</Text><Text style={styles.deliveryPriceText}>Delivery ₹{formatAmount(item.shippingCost)} · Donation ₹{formatAmount(item.donationAmount ?? 2)}</Text></View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${meta.progress}%`, backgroundColor: meta.color }]} /></View>
        <View style={styles.progressLabels}><Text style={styles.progressStart}>Placed</Text><Text style={[styles.progressEnd, { color: meta.color }]}>{meta.progress === 100 ? "Complete" : `${meta.progress}% ready`}</Text></View>

        <View style={styles.orderActions}>
          <Pressable onPress={() => showSummary(item)} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>Order summary</Text></Pressable>
          {isTrackable ? <Pressable onPress={() => trackOrder(item)} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><Ionicons name="navigate-outline" size={16} color="#14532D" /><Text style={styles.primaryActionText}>Track order</Text></Pressable> : <Pressable onPress={() => router.push("/categories" as never)} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><Ionicons name="basket-outline" size={16} color="#14532D" /><Text style={styles.primaryActionText}>Shop again</Text></Pressable>}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.hero}>
        <View style={styles.heroCircleLarge} />
        <View style={styles.heroCircleSmall} />
        <Text style={styles.heroEyebrow}>YOUR GROCERY JOURNEY</Text>
        <Text style={styles.heroTitle}>Every basket, right where you need it.</Text>
        <Text style={styles.heroSubtitle}>Follow active deliveries, revisit completed orders, and keep your kitchen stocked.</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}><Text style={styles.heroStatValue}>{activeOrders}</Text><Text style={styles.heroStatLabel}>in progress</Text></View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}><Text style={styles.heroStatValue}>{completedOrders}</Text><Text style={styles.heroStatLabel}>delivered</Text></View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}><Text style={styles.heroStatValue}>₹{totalSaved}</Text><Text style={styles.heroStatLabel}>ordered</Text></View>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View><Text style={styles.sectionTitle}>Your orders</Text><Text style={styles.sectionSubtitle}>{ordersQuery.isLoading ? "Loading your order history…" : `${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"} in this view`}</Text></View>
        <View style={styles.orderHistoryIcon}><Ionicons name="receipt-outline" size={19} color="#28723B" /></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return <Pressable key={item.id} onPress={() => setFilter(item.id)} style={({ pressed }) => [styles.filterChip, selected && styles.filterChipSelected, pressed && styles.pressed]}><Ionicons name={item.icon} size={15} color={selected ? "#14532D" : "#657666"} /><Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{item.label}</Text></Pressable>;
        })}
      </ScrollView>
    </>
  );

  const renderEmpty = () => {
    if (ordersQuery.isLoading) {
      return <View style={styles.loadingPanel}><ActivityIndicator size="large" color="#28723B" /><Text style={styles.loadingText}>Bringing your order history together…</Text></View>;
    }
    if (!user) {
      return <View style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="lock-closed-outline" size={30} color="#28723B" /></View><Text style={styles.emptyTitle}>Sign in to see your orders</Text><Text style={styles.emptyText}>Your active deliveries and completed grocery baskets will be waiting here.</Text><Pressable onPress={() => router.push("/login" as never)} style={({ pressed }) => [styles.emptyPrimaryAction, pressed && styles.pressed]}><Text style={styles.emptyPrimaryActionText}>Sign in</Text><Ionicons name="arrow-forward" size={16} color="#14532D" /></Pressable></View>;
    }
    if (filter !== "all") {
      return <View style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="funnel-outline" size={30} color="#28723B" /></View><Text style={styles.emptyTitle}>Nothing in this view yet</Text><Text style={styles.emptyText}>Try showing all orders to see the full grocery history.</Text><Pressable onPress={() => setFilter("all")} style={({ pressed }) => [styles.emptyPrimaryAction, pressed && styles.pressed]}><Text style={styles.emptyPrimaryActionText}>Show all orders</Text><Ionicons name="arrow-forward" size={16} color="#14532D" /></Pressable></View>;
    }
    return <View style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="basket-outline" size={30} color="#28723B" /></View><Text style={styles.emptyTitle}>Your first basket is waiting</Text><Text style={styles.emptyText}>Explore fresh groceries and pantry picks to start building your order history.</Text><Pressable onPress={() => router.push("/categories" as never)} style={({ pressed }) => [styles.emptyPrimaryAction, pressed && styles.pressed]}><Text style={styles.emptyPrimaryActionText}>Browse categories</Text><Ionicons name="arrow-forward" size={16} color="#14532D" /></Pressable></View>;
  };

  return (
    <ScreenContainer className="bg-[#F4F8F0] p-0" containerClassName="bg-[#F4F8F0]">
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 28 },
  hero: { overflow: "hidden", backgroundColor: "#14532D", paddingHorizontal: 17, paddingTop: 19, paddingBottom: 21 },
  heroCircleLarge: { position: "absolute", width: 208, height: 208, borderRadius: 104, backgroundColor: "#28723B", right: -68, top: -121 },
  heroCircleSmall: { position: "absolute", width: 105, height: 105, borderRadius: 53, backgroundColor: "#FDE68A", right: 37, bottom: -73, opacity: 0.16 },
  heroEyebrow: { color: "#FDE68A", fontSize: 10, fontWeight: "800", letterSpacing: 1.35 },
  heroTitle: { color: "#FFFFFF", fontSize: 26, lineHeight: 32, fontWeight: "800", maxWidth: 355, marginTop: 6 },
  heroSubtitle: { color: "#DDF6E8", fontSize: 13, lineHeight: 19, maxWidth: 410, marginTop: 8 },
  heroStats: { flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 19 },
  heroStat: { gap: 2 },
  heroStatValue: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  heroStatLabel: { color: "#DDF6E8", fontSize: 10, fontWeight: "700" },
  heroStatDivider: { width: 1, height: 26, backgroundColor: "#4B9360" },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 22 },
  sectionTitle: { color: "#173C25", fontSize: 20, fontWeight: "800" },
  sectionSubtitle: { color: "#718278", fontSize: 12, marginTop: 4 },
  orderHistoryIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  filterRail: { gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, borderWidth: 1, borderColor: "#E1EBE0", backgroundColor: "#FFFFFF", paddingHorizontal: 11, paddingVertical: 8 },
  filterChipSelected: { backgroundColor: "#E7F5E8", borderColor: "#B6DABB" },
  filterChipText: { color: "#657666", fontSize: 11, fontWeight: "800" },
  filterChipTextSelected: { color: "#14532D" },
  orderCard: { marginHorizontal: 16, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3ECE1", padding: 14 },
  orderTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  orderStatusIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  orderTitleCopy: { flex: 1, minWidth: 0 },
  orderId: { color: "#173C25", fontSize: 13, fontWeight: "800" },
  orderDate: { color: "#718278", fontSize: 10, lineHeight: 15, marginTop: 3 },
  statusChip: { maxWidth: 116, flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusChipText: { flexShrink: 1, fontSize: 9, lineHeight: 12, fontWeight: "800" },
  orderStateRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 15 },
  orderStateCopy: { flex: 1 },
  orderStateTitle: { color: "#284231", fontSize: 12, lineHeight: 17, fontWeight: "800" },
  etaText: { color: "#718278", fontSize: 10, lineHeight: 15, marginTop: 3 },
  orderTotal: { color: "#173C25", fontSize: 18, fontWeight: "800" },
  deliveryPriceRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#F4F8F0" },
  deliveryPriceText: { color: "#58705E", fontSize: 10, fontWeight: "800" },
  progressTrack: { overflow: "hidden", height: 6, borderRadius: 3, backgroundColor: "#EDF2EC", marginTop: 14 },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  progressStart: { color: "#8A9A8D", fontSize: 9, fontWeight: "700" },
  progressEnd: { fontSize: 9, fontWeight: "800" },
  orderActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  secondaryAction: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#CEE1CF", borderRadius: 11, paddingVertical: 10 },
  secondaryActionText: { color: "#28723B", fontSize: 11, fontWeight: "800" },
  primaryAction: { flex: 1.15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, borderRadius: 11, backgroundColor: "#FDE68A", paddingVertical: 10 },
  primaryActionText: { color: "#14532D", fontSize: 11, fontWeight: "800" },
  separator: { height: 12 },
  loadingPanel: { alignItems: "center", justifyContent: "center", minHeight: 240, marginHorizontal: 16, borderRadius: 22, backgroundColor: "#FFFFFF" },
  loadingText: { color: "#58705E", fontSize: 12, fontWeight: "700", marginTop: 12 },
  emptyCard: { alignItems: "center", marginHorizontal: 16, borderRadius: 22, backgroundColor: "#FFFFFF", paddingHorizontal: 25, paddingVertical: 30 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  emptyTitle: { color: "#173C25", fontSize: 16, fontWeight: "800", textAlign: "center", marginTop: 13 },
  emptyText: { color: "#718278", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6, maxWidth: 275 },
  emptyPrimaryAction: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18, borderRadius: 12, backgroundColor: "#FDE68A", paddingHorizontal: 13, paddingVertical: 10 },
  emptyPrimaryActionText: { color: "#14532D", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});
