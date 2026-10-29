import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { LiveDeliveryMap, type DeliveryCoordinate } from "@/components/live-delivery-map";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

type TrackingStatus = "pending" | "confirmed" | "packed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
type StatusView = { title: string; subtitle: string; step: number; tone: string; softTone: string; icon: keyof typeof Ionicons.glyphMap };

const STATUS: Record<TrackingStatus, StatusView> = {
  pending: { title: "We received your order", subtitle: "Your store is checking the items now.", step: 0, tone: "#9A5A00", softTone: "#FFF2D6", icon: "receipt-outline" },
  confirmed: { title: "Preparing your order", subtitle: "Your store has started gathering your groceries.", step: 1, tone: "#1E6A3A", softTone: "#E8F6EA", icon: "checkmark-circle-outline" },
  packed: { title: "Packing your groceries", subtitle: "Your order is being packed with care.", step: 2, tone: "#1E6A3A", softTone: "#E8F6EA", icon: "cube-outline" },
  shipped: { title: "Your rider is on the way", subtitle: "Follow your order as it comes to your doorstep.", step: 3, tone: "#315D97", softTone: "#E9F0FF", icon: "bicycle-outline" },
  out_for_delivery: { title: "Your rider is on the way", subtitle: "Follow your order as it comes to your doorstep.", step: 3, tone: "#315D97", softTone: "#E9F0FF", icon: "bicycle-outline" },
  delivered: { title: "Delivered to your doorstep", subtitle: "We hope your groceries make your day easier.", step: 4, tone: "#1E6A3A", softTone: "#E8F6EA", icon: "checkmark-done-outline" },
  cancelled: { title: "This order was cancelled", subtitle: "Contact support if you need help with this order.", step: -1, tone: "#B42318", softTone: "#FDE8E7", icon: "close-circle-outline" },
};

const STEPS = ["Placed", "Confirmed", "Packed", "On the way", "Delivered"];

function toCoordinate(latitude: unknown, longitude: unknown): DeliveryCoordinate | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
}

function money(value: string | number | null | undefined) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function addressLabel(value: string | null | undefined) {
  if (!value) return "Your saved delivery address";
  return value.length > 76 ? `${value.slice(0, 73)}…` : value;
}

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const parsedOrderId = Number(orderId ?? 0);
  const hasValidOrderId = Number.isFinite(parsedOrderId) && parsedOrderId > 0;
  const safeOrderId = hasValidOrderId ? parsedOrderId : 0;
  const trackingQuery = trpc.delivery.tracking.useQuery({ orderId: safeOrderId }, {
    enabled: hasValidOrderId,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
  const liveOrder = trackingQuery.data?.order;
  const items = useMemo(() => trackingQuery.data?.items ?? [], [trackingQuery.data?.items]);
  const rider = toCoordinate(trackingQuery.data?.location?.latitude ?? liveOrder?.currentLatitude, trackingQuery.data?.location?.longitude ?? liveOrder?.currentLongitude);
  const pickupEvent = (trackingQuery.data?.events ?? []).find((event: { status: string }) => event.status === "picked_up" || event.status === "out_for_delivery");
  const pickup = toCoordinate(pickupEvent?.latitude, pickupEvent?.longitude);
  const destination = toCoordinate(liveOrder?.deliveryLatitude, liveOrder?.deliveryLongitude);
  const routeQuery = trpc.delivery.route.useQuery({ orderId: safeOrderId }, { enabled: hasValidOrderId && Boolean(rider && destination), refetchInterval: 30_000 });
  const route = (routeQuery.data?.coordinates ?? []).map((point: { latitude: number; longitude: number }) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude) }));

  const status = (liveOrder?.status ?? "pending") as TrackingStatus;
  const statusView = STATUS[status] ?? STATUS.pending;
  const eta = Number(liveOrder?.deliveryEtaMinutes);
  const etaLabel = Number.isFinite(eta) && eta > 0 ? `Arriving in ${eta} min · On time` : rider ? "Live location is updating" : "Preparing your delivery route";
  const orderNumber = liveOrder?.orderNumber ?? `Order #${safeOrderId}`;
  const previewItems = useMemo(() => items.slice(0, 2), [items]);
  const paymentPending = liveOrder?.paymentMethod === "online" && liveOrder?.paymentStatus === "pending";
  const isActiveDelivery = status === "shipped" || status === "out_for_delivery";
  const deliveryPartnerName = liveOrder?.deliveryPartnerName;

  const refresh = () => { void Promise.all([trackingQuery.refetch(), routeQuery.refetch()]); };
  const support = () => router.push("/help-support");
  const instructions = () => Alert.alert("Delivery instructions", "Need to add a landmark, floor, or delivery note? Our support team can help with your active order.", [{ text: "Not now", style: "cancel" }, { text: "Get support", onPress: support }]);
  const share = async () => {
    try { await Share.share({ message: `Ghar Ghar Mart ${orderNumber}: ${statusView.title}. ${etaLabel}.` }); }
    catch { Alert.alert("Unable to share", "Please try sharing your order status again."); }
  };
  const callSupport = async () => {
    const url = "tel:+917856091971";
    if (await Linking.canOpenURL(url)) await Linking.openURL(url); else support();
  };

  if (!hasValidOrderId) {
    return <ScreenContainer className="bg-[#F6F8F4]" containerClassName="bg-[#F6F8F4]"><View style={styles.loading}><Ionicons name="receipt-outline" size={34} color="#2E7D32" /><Text style={styles.loadingTitle}>Choose an order to track</Text><Text style={styles.loadingText}>Open an order from your Orders tab to see its delivery status.</Text><Pressable onPress={() => router.replace("/(tabs)/orders")} style={({ pressed }) => [styles.returnButton, pressed && styles.pressed]}><Text style={styles.returnButtonText}>Open my orders</Text></Pressable></View></ScreenContainer>;
  }

  if (trackingQuery.isLoading) {
    return <ScreenContainer className="bg-[#F6F8F4]" containerClassName="bg-[#F6F8F4]"><View style={styles.loading}><ActivityIndicator size="large" color="#2E7D32" /><Text style={styles.loadingTitle}>Loading your live order</Text><Text style={styles.loadingText}>We are fetching the latest delivery details.</Text></View></ScreenContainer>;
  }

  return <ScreenContainer className="bg-[#F6F8F4]" containerClassName="bg-[#F6F8F4]"><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <View style={styles.hero}>
      <View style={styles.heroTop}><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Ionicons name="arrow-back" size={24} color="#FFFFFF" /></Pressable><Text style={styles.orderNumber} numberOfLines={1}>{orderNumber}</Text><Pressable onPress={share} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Ionicons name="share-social-outline" size={23} color="#FFFFFF" /></Pressable></View>
      <View style={[styles.statusIcon, { backgroundColor: statusView.softTone }]}><Ionicons name={statusView.icon} size={24} color={statusView.tone} /></View>
      <Text style={styles.heroTitle}>{statusView.title}</Text><Text style={styles.heroSubtitle}>{statusView.subtitle}</Text>
      <View style={styles.etaRow}><View style={styles.etaPill}><Ionicons name="time-outline" size={18} color="#FDE68A" /><Text style={styles.etaText}>{etaLabel}</Text></View><Pressable onPress={refresh} style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}><Ionicons name="refresh" size={20} color="#FFFFFF" /></Pressable></View>
      <View style={styles.stepRow}>{STEPS.map((label, index) => <View key={label} style={styles.step}><View style={[styles.stepDot, index <= statusView.step && styles.stepDotComplete, index === statusView.step && styles.stepDotActive]}>{index <= statusView.step ? <Ionicons name="checkmark" size={10} color="#14532D" /> : null}</View><Text style={[styles.stepLabel, index <= statusView.step && styles.stepLabelComplete]}>{label}</Text>{index < STEPS.length - 1 ? <View style={[styles.stepLine, index < statusView.step && styles.stepLineComplete]} /> : null}</View>)}</View>
    </View>

    {isActiveDelivery ? <Pressable onPress={instructions} style={({ pressed }) => [styles.notice, pressed && styles.pressed]}><View style={styles.noticeIcon}><Ionicons name="navigate-outline" size={21} color="#2E7D32" /></View><View style={styles.flex}><Text style={styles.noticeTitle}>Your rider is heading to you</Text><Text style={styles.noticeText}>Add a landmark or delivery note if needed.</Text></View><Ionicons name="chevron-forward" size={21} color="#6D7D71" /></Pressable> : null}

    {deliveryPartnerName ? <View style={styles.partnerCard}><View style={styles.partnerIcon}><Ionicons name="bicycle-outline" size={22} color="#14532D" /></View><View style={styles.flex}><Text style={styles.partnerEyebrow}>DELIVERY PARTNER</Text><Text style={styles.partnerName}>{deliveryPartnerName}</Text><Text style={styles.partnerText}>{status === "confirmed" ? "Your rider accepted the delivery assignment." : "Your rider is assigned to this order."}</Text></View><View style={styles.partnerBadge}><Ionicons name="checkmark" size={14} color="#28723B" /><Text style={styles.partnerBadgeText}>Assigned</Text></View></View> : null}

    <View style={styles.mapCard}><View style={styles.mapHeader}><View><Text style={styles.eyebrow}>LIVE DELIVERY</Text><Text style={styles.mapTitle}>Follow your groceries</Text></View><View style={[styles.livePill, { backgroundColor: rider ? "#E7F6E9" : "#FFF2D6" }]}><View style={[styles.liveDot, { backgroundColor: rider ? "#2E7D32" : "#F59E0B" }]} /><Text style={[styles.liveText, { color: rider ? "#1B6B37" : "#9A5A00" }]}>{rider ? "LIVE" : "ROUTE"}</Text></View></View><LiveDeliveryMap rider={rider} pickup={pickup} destination={destination} routeCoordinates={route} destinationLabel={addressLabel(liveOrder?.deliveryAddress)} etaLabel={etaLabel} progress={Math.max(0, (statusView.step + 1) * 20)} height={260} /><View style={styles.addressRow}><Ionicons name="location-outline" size={18} color="#2E7D32" /><Text style={styles.address}>{addressLabel(liveOrder?.deliveryAddress)}</Text></View></View>

    {paymentPending ? <View style={styles.payment}><View style={styles.paymentIcon}><Ionicons name="shield-checkmark-outline" size={22} color="#8A5A00" /></View><View style={styles.flex}><Text style={styles.paymentTitle}>Payment review in progress</Text><Text style={styles.paymentText}>Your QR payment will update here once it is confirmed.</Text></View></View> : null}

    <View style={styles.orderCard}><View style={styles.storeRow}><View style={styles.storeIcon}><Ionicons name="basket-outline" size={23} color="#14532D" /></View><View style={styles.flex}><Text style={styles.storeName}>Ghar Ghar Mart</Text><Text style={styles.storeText}>Groceries packed for your doorstep</Text></View><Pressable onPress={callSupport} style={({ pressed }) => [styles.call, pressed && styles.pressed]}><Ionicons name="call-outline" size={21} color="#D94D5B" /></Pressable></View><View style={styles.divider} />
      <Pressable onPress={() => router.push("/(tabs)/orders")} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}><View style={styles.actionIcon}><Ionicons name="receipt-outline" size={22} color="#53665A" /></View><View style={styles.flex}><Text style={styles.actionTitle}>{orderNumber}</Text><Text style={styles.actionText}>{items.length ? `${items.length} item${items.length === 1 ? "" : "s"} · ${money(liveOrder?.total)}` : "Open order details"}</Text></View><Ionicons name="chevron-forward" size={21} color="#6D7D71" /></Pressable>
      {previewItems.length ? <View style={styles.itemPreview}>{previewItems.map((item: { id: number; quantity: number; productName: string }) => <Text key={item.id} style={styles.itemText}>{item.quantity} × {item.productName}</Text>)}{items.length > previewItems.length ? <Text style={styles.moreItems}>+{items.length - previewItems.length} more</Text> : null}</View> : null}
      <View style={styles.pricingRow}><Text style={styles.pricingText}>{liveOrder?.deliveryDistanceKm ? `${Number(liveOrder.deliveryDistanceKm).toFixed(1)} km actual route` : "Actual route saved with order"}</Text><Text style={styles.pricingText}>Delivery {money(liveOrder?.shippingCost)}</Text></View>
      <View style={styles.divider} /><Pressable onPress={instructions} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}><View style={styles.actionIcon}><Ionicons name="chatbubble-ellipses-outline" size={21} color="#53665A" /></View><View style={styles.flex}><Text style={styles.actionTitle}>Add delivery instructions</Text><Text style={styles.actionText}>Landmark, floor, or a note for the rider</Text></View><Ionicons name="chevron-forward" size={21} color="#6D7D71" /></Pressable>
      <View style={styles.divider} /><Pressable onPress={() => router.push("/")} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}><View style={styles.actionIcon}><Ionicons name="add-circle-outline" size={22} color="#53665A" /></View><View style={styles.flex}><Text style={styles.actionTitle}>Add more groceries</Text><Text style={styles.actionText}>Explore fresh essentials for your next order</Text></View><Ionicons name="chevron-forward" size={21} color="#6D7D71" /></Pressable></View>

    <Pressable onPress={support} style={({ pressed }) => [styles.help, pressed && styles.pressed]}><View style={styles.helpAvatar}><Ionicons name="headset-outline" size={26} color="#2E7D32" /></View><View style={styles.flex}><Text style={styles.helpTitle}>Need help with your order?</Text><Text style={styles.helpText}>Support is here for delivery or payment questions.</Text></View><Ionicons name="chevron-forward" size={22} color="#2E7D32" /></Pressable>
    {isActiveDelivery || status === "delivered" ? <Pressable onPress={() => router.push({ pathname: "/delivery-confirmation", params: { orderId: String(safeOrderId) } })} style={({ pressed }) => [styles.confirmation, pressed && styles.pressed]}><View style={styles.confirmationIcon}><Ionicons name="shield-checkmark-outline" size={22} color="#14532D" /></View><View style={styles.flex}><Text style={styles.confirmationTitle}>Delivery confirmation</Text><Text style={styles.confirmationText}>Confirm only after your grocery order arrives.</Text></View><Ionicons name="chevron-forward" size={21} color="#14532D" /></Pressable> : null}
    <Text style={styles.footer}>Fresh groceries, carefully handled.</Text>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 42 }, flex: { flex: 1 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  partnerCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DCEBDD", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 12, padding: 14 }, partnerIcon: { alignItems: "center", backgroundColor: "#E7F5E8", borderRadius: 14, height: 44, justifyContent: "center", width: 44 }, partnerEyebrow: { color: "#718278", fontSize: 9, fontWeight: "800", letterSpacing: 1 }, partnerName: { color: "#173C25", fontSize: 14, fontWeight: "800", marginTop: 2 }, partnerText: { color: "#718278", fontSize: 10, marginTop: 3 }, partnerBadge: { alignItems: "center", backgroundColor: "#E7F5E8", borderRadius: 9, flexDirection: "row", gap: 3, paddingHorizontal: 7, paddingVertical: 5 }, partnerBadgeText: { color: "#28723B", fontSize: 9, fontWeight: "800" },
  loading: { alignItems: "center", backgroundColor: "#F6F8F4", flex: 1, justifyContent: "center", padding: 28 }, loadingTitle: { color: "#173C25", fontSize: 18, fontWeight: "800", marginTop: 16 }, loadingText: { color: "#6D7D71", fontSize: 13, marginTop: 6, textAlign: "center" },
  hero: { backgroundColor: "#14532D", borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 22, paddingHorizontal: 18, paddingTop: 8 }, heroTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, iconButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 }, orderNumber: { color: "#FFFFFF", flex: 1, fontSize: 15, fontWeight: "800", textAlign: "center" }, statusIcon: { alignItems: "center", borderRadius: 16, height: 48, justifyContent: "center", marginTop: 20, width: 48 }, heroTitle: { color: "#FFFFFF", fontSize: 29, fontWeight: "900", letterSpacing: -0.6, lineHeight: 35, marginTop: 13 }, heroSubtitle: { color: "#D7F1DF", fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 330 }, etaRow: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 18 }, etaPill: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 14, flex: 1, flexDirection: "row", gap: 8, minHeight: 52, paddingHorizontal: 14 }, etaText: { color: "#FFFFFF", flex: 1, fontSize: 14, fontWeight: "800" }, refresh: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.17)", borderRadius: 14, height: 52, justifyContent: "center", width: 52 },
  stepRow: { alignItems: "flex-start", flexDirection: "row", marginTop: 21 }, step: { alignItems: "center", flex: 1, position: "relative" }, stepDot: { alignItems: "center", backgroundColor: "#5E936C", borderRadius: 9, height: 18, justifyContent: "center", width: 18, zIndex: 2 }, stepDotComplete: { backgroundColor: "#FDE68A" }, stepDotActive: { borderColor: "#FFFFFF", borderWidth: 2 }, stepLabel: { color: "#9AC6A6", fontSize: 8, fontWeight: "700", marginTop: 6, textAlign: "center" }, stepLabelComplete: { color: "#FFFFFF" }, stepLine: { backgroundColor: "#5E936C", height: 2, left: "50%", position: "absolute", right: "-50%", top: 8, zIndex: 1 }, stepLineComplete: { backgroundColor: "#FDE68A" },
  notice: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E3EAE2", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 11, marginHorizontal: 14, marginTop: 14, padding: 13 }, noticeIcon: { alignItems: "center", backgroundColor: "#EAF7EC", borderRadius: 14, height: 42, justifyContent: "center", width: 42 }, noticeTitle: { color: "#1B3826", fontSize: 14, fontWeight: "800" }, noticeText: { color: "#6D7D71", fontSize: 12, lineHeight: 17, marginTop: 3 },
  mapCard: { backgroundColor: "#FFFFFF", borderColor: "#E3EAE2", borderRadius: 22, borderWidth: 1, marginHorizontal: 14, marginTop: 14, overflow: "hidden", padding: 14 }, mapHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }, eyebrow: { color: "#6D8A74", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }, mapTitle: { color: "#173C25", fontSize: 19, fontWeight: "900", marginTop: 3 }, livePill: { alignItems: "center", borderRadius: 99, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 7 }, liveDot: { borderRadius: 4, height: 7, width: 7 }, liveText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.7 }, addressRow: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 11 }, address: { color: "#53665A", flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  payment: { alignItems: "center", backgroundColor: "#FFF8E4", borderColor: "#F5DB9D", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 11, marginHorizontal: 14, marginTop: 14, padding: 14 }, paymentIcon: { alignItems: "center", backgroundColor: "#FFF1C8", borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, paymentTitle: { color: "#714800", fontSize: 14, fontWeight: "800" }, paymentText: { color: "#8A6B2A", fontSize: 12, lineHeight: 17, marginTop: 3 },
  orderCard: { backgroundColor: "#FFFFFF", borderColor: "#E3EAE2", borderRadius: 22, borderWidth: 1, marginHorizontal: 14, marginTop: 14, overflow: "hidden" }, storeRow: { alignItems: "center", flexDirection: "row", gap: 11, padding: 15 }, storeIcon: { alignItems: "center", backgroundColor: "#E9F7EB", borderRadius: 16, height: 50, justifyContent: "center", width: 50 }, storeName: { color: "#173C25", fontSize: 18, fontWeight: "900" }, storeText: { color: "#738178", fontSize: 12, marginTop: 4 }, call: { alignItems: "center", borderColor: "#F1DFE1", borderRadius: 20, borderWidth: 1, height: 40, justifyContent: "center", width: 40 }, divider: { backgroundColor: "#EDF1EC", height: 1 }, actionRow: { alignItems: "center", flexDirection: "row", gap: 11, padding: 15 }, actionIcon: { alignItems: "center", backgroundColor: "#F4F7F3", borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, actionTitle: { color: "#263C2E", fontSize: 15, fontWeight: "800" }, actionText: { color: "#748179", fontSize: 12, lineHeight: 17, marginTop: 3 }, itemPreview: { backgroundColor: "#F8FBF7", borderRadius: 12, marginBottom: 14, marginHorizontal: 15, marginTop: -2, padding: 11 }, itemText: { color: "#526358", fontSize: 12, fontWeight: "600", lineHeight: 18 }, moreItems: { color: "#2E7D32", fontSize: 12, fontWeight: "800", marginTop: 3 },
  help: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E3EAE2", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 12, marginHorizontal: 14, marginTop: 14, padding: 15 }, helpAvatar: { alignItems: "center", backgroundColor: "#E9F7EB", borderRadius: 22, height: 48, justifyContent: "center", width: 48 }, helpTitle: { color: "#173C25", fontSize: 16, fontWeight: "900" }, helpText: { color: "#738178", fontSize: 12, lineHeight: 17, marginTop: 4 },
  confirmation: { alignItems: "center", backgroundColor: "#ECF8ED", borderColor: "#B8DDBE", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 11, marginHorizontal: 14, marginTop: 14, padding: 14 }, confirmationIcon: { alignItems: "center", backgroundColor: "#D6F1DA", borderRadius: 13, height: 42, justifyContent: "center", width: 42 }, confirmationTitle: { color: "#14532D", fontSize: 14, fontWeight: "900" }, confirmationText: { color: "#3D6847", fontSize: 12, lineHeight: 17, marginTop: 3 }, footer: { color: "#87948B", fontSize: 12, fontWeight: "700", marginTop: 24, textAlign: "center" }, returnButton: { backgroundColor: "#2E7D32", borderRadius: 14, marginTop: 20, paddingHorizontal: 18, paddingVertical: 13 }, returnButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" }, pricingRow: { backgroundColor: "#F4F8F0", borderRadius: 10, flexDirection: "row", justifyContent: "space-between", marginHorizontal: 15, marginBottom: 14, paddingHorizontal: 10, paddingVertical: 9 }, pricingText: { color: "#58705E", fontSize: 10, fontWeight: "800" },
});
