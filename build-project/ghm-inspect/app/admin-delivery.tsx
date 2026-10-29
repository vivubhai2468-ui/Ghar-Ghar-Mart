import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenContainer } from "@/components/screen-container";
import { ActiveRidersMap, type ActiveRider } from "@/components/active-riders-map";
import { useAdminAuth } from "@/lib/admin-auth-context";
import { trpc } from "@/lib/trpc";

type DeliveryOrder = {
  id: number;
  status: string;
  totalAmount?: number | string | null;
  deliveryPartnerId?: number | null;
  deliveryPartnerName?: string | null;
  currentLatitude?: number | string | null;
  currentLongitude?: number | string | null;
  lastLocationAt?: string | Date | null;
  deliveryEtaMinutes?: number | null;
};

type DeliveryPartner = { id: number; name?: string | null; phone?: string | null };
type DeliveryPartnerReview = DeliveryPartner & { aadhaarLast4?: string | null; deliveryPartnerStatus: "pending" | "approved" | "rejected" | null; createdAt?: Date | string | null };

export default function AdminDeliveryScreen() {
  const { adminUser } = useAdminAuth();
  const utils = trpc.useUtils();
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const liveQueryOptions = { enabled: Boolean(adminUser), refetchOnWindowFocus: true };
  const ordersQuery = trpc.admin.deliveryOrders.useQuery(undefined, { ...liveQueryOptions, refetchInterval: 2000, staleTime: 0 });
  const partnersQuery = trpc.admin.deliveryPartners.useQuery(undefined, { ...liveQueryOptions, refetchInterval: 10_000 });
  const partnerReviewQuery = trpc.admin.deliveryPartnerReviews.list.useQuery({ status: "pending" }, { ...liveQueryOptions, refetchInterval: 5_000 });
  const assignMutation = trpc.admin.assignDeliveryPartner.useMutation({
    onSuccess: async () => {
      await utils.admin.deliveryOrders.invalidate();
      setSelectedOrder(null);
    },
  });
  const reviewPartnerMutation = trpc.admin.deliveryPartnerReviews.review.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.admin.deliveryPartnerReviews.list.invalidate(), utils.admin.deliveryPartners.invalidate()]);
    },
  });

  const deliveryOrders = useMemo(() => ((ordersQuery.data ?? []) as DeliveryOrder[]).filter((order) => ["packed", "shipped", "out_for_delivery"].includes(order.status)), [ordersQuery.data]);
  const pendingPartnerReviews = (partnerReviewQuery.data ?? []) as DeliveryPartnerReview[];
  const activeRiders = deliveryOrders.filter((order) => order.deliveryPartnerId && order.currentLatitude && order.currentLongitude);
  const riderMarkers = useMemo<ActiveRider[]>(
    () => activeRiders
      .map((order) => ({
        id: order.id,
        name: order.deliveryPartnerName || `Rider for order #${order.id}`,
        latitude: Number(order.currentLatitude),
        longitude: Number(order.currentLongitude),
        etaMinutes: order.deliveryEtaMinutes,
      }))
      .filter((rider) => Number.isFinite(rider.latitude) && Number.isFinite(rider.longitude)),
    [activeRiders],
  );

  if (!adminUser) {
    router.replace("/admin-login");
    return null;
  }

  const assign = (partner: DeliveryPartner) => {
    if (!selectedOrder) return;
    assignMutation.mutate({ orderId: selectedOrder.id, partnerId: partner.id, partnerName: partner.name || "Delivery partner" });
  };

  const reviewPartner = (partner: DeliveryPartnerReview, status: "approved" | "rejected") => {
    Alert.alert(
      status === "approved" ? "Approve delivery partner" : "Reject delivery partner",
      status === "approved" ? `Allow ${partner.name || "this partner"} to accept and complete delivery assignments?` : `Reject ${partner.name || "this partner"}'s delivery application?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: status === "approved" ? "Approve" : "Reject", style: status === "approved" ? "default" : "destructive", onPress: () => reviewPartnerMutation.mutate({ partnerId: partner.id, status }, { onError: (error) => Alert.alert("Review failed", error.message) }) },
      ],
    );
  };

  return (
    <ScreenContainer className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]">
      <View className="bg-[#14532D] px-5 py-5">
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text className="text-sm font-bold text-[#FDE68A]">‹ Admin panel</Text>
        </Pressable>
        <View className="mt-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#BBF7D0]">Dispatch control</Text>
            <Text className="mt-1 text-[28px] font-extrabold text-white">Delivery operations</Text>
            <Text className="mt-1 text-sm leading-5 text-[#DCFCE7]">Assign riders, monitor active location signals, and keep deliveries moving.</Text>
          </View>
          <View className="ml-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE68A]">
            <Ionicons name="bicycle" size={25} color="#14532D" />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 42 }}
        refreshControl={<RefreshControl refreshing={ordersQuery.isRefetching || partnersQuery.isRefetching || partnerReviewQuery.isRefetching} onRefresh={() => { void ordersQuery.refetch(); void partnersQuery.refetch(); void partnerReviewQuery.refetch(); }} tintColor="#2E7D32" />}
      >
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-[#DCE9D9] bg-white p-4">
            <Text className="text-xs font-bold uppercase tracking-wide text-[#78917D]">Ready to assign</Text>
            <Text className="mt-1 text-3xl font-extrabold text-[#173C25]">{deliveryOrders.filter((order) => !order.deliveryPartnerId).length}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-[#DCE9D9] bg-white p-4">
            <Text className="text-xs font-bold uppercase tracking-wide text-[#78917D]">Live riders</Text>
            <Text className="mt-1 text-3xl font-extrabold text-[#2E7D32]">{activeRiders.length}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-[#DCE9D9] bg-white p-4">
            <Text className="text-xs font-bold uppercase tracking-wide text-[#78917D]">Partner pool</Text>
            <Text className="mt-1 text-3xl font-extrabold text-[#173C25]">{(partnersQuery.data ?? []).length}</Text>
          </View>
        </View>

        <View className="mt-6 rounded-3xl border border-[#F1D899] bg-[#FFFDF4] p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3"><Text className="text-xl font-extrabold text-[#173C25]">Partner applications</Text><Text className="mt-1 text-sm leading-5 text-[#68776D]">Review the masked Aadhaar identity and approve access to delivery operations.</Text></View>
            <View className="rounded-full bg-[#FFF1B8] px-3 py-1"><Text className="text-xs font-extrabold text-[#8A5A00]">{pendingPartnerReviews.length} PENDING</Text></View>
          </View>
          {pendingPartnerReviews.length === 0 && !partnerReviewQuery.isLoading ? <Text className="mt-4 text-sm text-[#68776D]">No delivery-partner applications are waiting for review.</Text> : null}
          {pendingPartnerReviews.map((partner: DeliveryPartnerReview) => <View key={partner.id} className="mt-4 rounded-2xl border border-[#E7DCB0] bg-white p-4"><View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><Text className="text-base font-extrabold text-[#173C25]">{partner.name || "Unnamed delivery partner"}</Text><Text className="mt-1 text-sm text-[#68776D]">{partner.phone || "No mobile number"}</Text><Text className="mt-1 text-xs font-semibold text-[#8A5A00]">Aadhaar verified · •••• {partner.aadhaarLast4 || "—"}</Text></View><Ionicons name="shield-checkmark-outline" size={25} color="#B77900" /></View><View className="mt-4 flex-row gap-3"><Pressable onPress={() => reviewPartner(partner, "approved")} disabled={reviewPartnerMutation.isPending} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 14, backgroundColor: "#2E7D32", paddingVertical: 11, opacity: pressed || reviewPartnerMutation.isPending ? 0.7 : 1 })}><Text className="font-extrabold text-white">Approve</Text></Pressable><Pressable onPress={() => reviewPartner(partner, "rejected")} disabled={reviewPartnerMutation.isPending} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: "#EF4444", paddingVertical: 11, opacity: pressed || reviewPartnerMutation.isPending ? 0.7 : 1 })}><Text className="font-extrabold text-[#B42318]">Reject</Text></Pressable></View></View>)}
        </View>

        <View className="mt-6">
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-extrabold text-[#173C25]">Live rider map</Text>
              <Text className="mt-1 text-sm text-[#68776D]">All current GPS signals in one dispatch view.</Text>
            </View>
            <View className="rounded-full bg-[#DCFCE7] px-3 py-1"><Text className="text-xs font-extrabold text-[#166534]">{riderMarkers.length} LIVE</Text></View>
          </View>
          {riderMarkers.length ? <ActiveRidersMap riders={riderMarkers} /> : <View className="items-center rounded-3xl border border-dashed border-[#B9D9B8] bg-white px-6 py-7"><Ionicons name="location-outline" size={32} color="#2E7D32" /><Text className="mt-3 text-sm font-extrabold text-[#173C25]">Waiting for rider GPS</Text><Text className="mt-1 text-center text-xs leading-5 text-[#68776D]">The fleet map will populate after an assigned partner starts sharing location.</Text></View>}
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-extrabold text-[#173C25]">Active deliveries</Text>
            <Text className="mt-1 text-sm text-[#68776D]">Updates refresh every 20 seconds.</Text>
          </View>
          {ordersQuery.isLoading ? <ActivityIndicator color="#2E7D32" /> : null}
        </View>

        {deliveryOrders.length === 0 && !ordersQuery.isLoading ? (
          <View className="mt-4 items-center rounded-3xl border border-dashed border-[#B9D9B8] bg-white px-6 py-9">
            <Ionicons name="checkmark-done-circle-outline" size={36} color="#2E7D32" />
            <Text className="mt-3 text-base font-extrabold text-[#173C25]">No active dispatches</Text>
            <Text className="mt-1 text-center text-sm leading-5 text-[#68776D]">Packed and out-for-delivery orders will appear here for rider assignment and oversight.</Text>
          </View>
        ) : null}

        {deliveryOrders.map((order) => {
          const hasLocation = order.currentLatitude !== null && order.currentLatitude !== undefined && order.currentLongitude !== null && order.currentLongitude !== undefined;
          return (
            <View key={order.id} className="mt-4 rounded-3xl border border-[#DCE9D9] bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-wide text-[#78917D]">Order #{order.id}</Text>
                  <Text className="mt-1 text-lg font-extrabold text-[#173C25]">₹{Number(order.totalAmount ?? 0).toFixed(0)}</Text>
                </View>
                <View className={`rounded-full px-3 py-1 ${hasLocation ? "bg-[#DCFCE7]" : "bg-[#FEF3C7]"}`}>
                  <Text className={`text-xs font-bold ${hasLocation ? "text-[#166534]" : "text-[#92400E]"}`}>{hasLocation ? "LIVE GPS" : "AWAITING GPS"}</Text>
                </View>
              </View>

              <View className="mt-4 rounded-2xl bg-[#F6FAF4] p-3">
                <Text className="text-xs font-semibold text-[#68776D]">Delivery partner</Text>
                <Text className="mt-1 text-sm font-extrabold text-[#173C25]">{order.deliveryPartnerName || "Not assigned yet"}</Text>
                {hasLocation ? <Text className="mt-1 text-xs text-[#2E7D32]">Last signal: {Number(order.currentLatitude).toFixed(5)}, {Number(order.currentLongitude).toFixed(5)}{order.deliveryEtaMinutes ? ` · ETA ${order.deliveryEtaMinutes} min` : ""}</Text> : null}
              </View>

              <Pressable onPress={() => setSelectedOrder(order)} style={({ pressed }) => ({ marginTop: 12, alignItems: "center", borderRadius: 14, paddingVertical: 12, backgroundColor: "#2E7D32", opacity: pressed ? 0.82 : 1 })}>
                <Text className="text-sm font-extrabold text-white">{order.deliveryPartnerId ? "Reassign delivery partner" : "Assign delivery partner"}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={Boolean(selectedOrder)} transparent animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
        <View className="flex-1 justify-end bg-black/45">
          <View className="rounded-t-[32px] bg-white p-5">
            <View className="h-1.5 w-12 self-center rounded-full bg-[#DCE9D9]" />
            <Text className="mt-5 text-xl font-extrabold text-[#173C25]">Assign partner</Text>
            <Text className="mt-1 text-sm text-[#68776D]">Choose a rider for order #{selectedOrder?.id}.</Text>
            <ScrollView className="mt-4" style={{ maxHeight: 330 }}>
              {((partnersQuery.data ?? []) as DeliveryPartner[]).map((partner) => (
                <Pressable key={partner.id} onPress={() => assign(partner)} disabled={assignMutation.isPending} style={({ pressed }) => ({ marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, borderWidth: 1, borderColor: "#DCE9D9", padding: 14, opacity: pressed || assignMutation.isPending ? 0.65 : 1 })}>
                  <View>
                    <Text className="text-sm font-extrabold text-[#173C25]">{partner.name || "Unnamed partner"}</Text>
                    <Text className="mt-1 text-xs text-[#68776D]">{partner.phone || "No contact number"}</Text>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={24} color="#2E7D32" />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setSelectedOrder(null)} style={({ pressed }) => ({ marginTop: 10, alignItems: "center", paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
              <Text className="text-sm font-bold text-[#2E7D32]">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
