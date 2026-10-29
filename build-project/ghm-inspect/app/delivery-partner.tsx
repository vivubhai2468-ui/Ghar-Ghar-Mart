import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { getBackgroundDeliveryTrackingState, stopBackgroundDeliveryTracking } from "@/lib/delivery-background-location";
import { getDeliveryGpsUnavailableMessage } from "@/lib/delivery-location-permission";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

type DeliveryAssignment = {
  id: number;
  orderNumber: string;
  status: string;
  deliveryAcceptedAt?: string | Date | null;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryEtaMinutes?: number | null;
  proofOfDeliveryUrl?: string | null;
  distanceFromPartnerKm?: number;
};

type DeliveryActionSheetProps = {
  order: DeliveryAssignment | null;
  activeGps: boolean;
  proofUri?: string;
  confirmationCode: string;
  isCompleting: boolean;
  onDismiss: () => void;
  onPauseGps: () => void;
  onBackgroundSettings: (orderId: number) => void;
  onCaptureProof: (orderId: number) => void;
  onChangeCode: (orderId: number, code: string) => void;
  onComplete: (orderId: number) => void;
};

function DeliveryActionSheet({ order, activeGps, proofUri, confirmationCode, isCompleting, onDismiss, onPauseGps, onBackgroundSettings, onCaptureProof, onChangeCode, onComplete }: DeliveryActionSheetProps) {
  const proofReady = Boolean(proofUri || order?.proofOfDeliveryUrl);
  return (
    <Modal visible={Boolean(order)} transparent animationType="slide" onRequestClose={onDismiss}>
      <View className="flex-1 justify-end bg-black/45">
        <View className="rounded-t-[32px] bg-white px-5 pb-8 pt-3">
          <View className="h-1.5 w-12 self-center rounded-full bg-[#DCE9D9]" />
          <View className="mt-5 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#78917D]">Delivery actions</Text>
              <Text className="mt-1 text-xl font-extrabold text-[#173C25]">Complete handoff</Text>
              <Text className="mt-1 text-sm leading-5 text-[#68776D]">Finish these steps in order for {order?.deliveryAddress}.</Text>
            </View>
            <Pressable onPress={onDismiss} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, padding: 4 })}><Text className="text-xl font-bold text-[#68776D]">×</Text></Pressable>
          </View>

          {order ? <View className="mt-5 gap-3">
            <View className={`rounded-2xl border p-4 ${proofReady ? "border-[#B9D9B8] bg-[#F4FBF2]" : "border-[#F1D899] bg-[#FFFDF4]"}`}>
              <Text className="text-xs font-bold uppercase tracking-wide text-[#78917D]">Step 1</Text>
              <View className="mt-1 flex-row items-center justify-between">
                <View className="flex-1 pr-3"><Text className="text-base font-extrabold text-[#173C25]">Proof of delivery</Text><Text className="mt-1 text-xs leading-4 text-[#68776D]">{proofReady ? "Proof captured and ready for handoff." : "Capture the delivered order at the customer location."}</Text></View>
                {!proofReady ? <Pressable onPress={() => onCaptureProof(order.id)} style={({ pressed }) => ({ borderRadius: 12, backgroundColor: "#FDE68A", paddingHorizontal: 12, paddingVertical: 10, opacity: pressed ? 0.75 : 1 })}><Text className="text-xs font-extrabold text-[#533300]">Capture</Text></Pressable> : <Text className="text-sm font-extrabold text-[#24713B]">Ready</Text>}
              </View>
            </View>

            <View className="rounded-2xl border border-[#DCE9D9] bg-[#FAFCFA] p-4">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#78917D]">Step 2</Text>
              <Text className="mt-1 text-xs leading-4 text-[#68776D]">Ask the customer for the 4-digit OTP shown when the order was placed.</Text>
            </View>

            <View className="rounded-2xl border border-[#DCE9D9] bg-white p-4">
              <Text className="text-xs font-bold uppercase tracking-wide text-[#78917D]">Step 3</Text>
              <Text className="mt-1 text-base font-extrabold text-[#173C25]">Confirm and complete</Text>
              <View className="mt-3 flex-row gap-2">
                <TextInput value={confirmationCode} onChangeText={(value) => onChangeCode(order.id, value.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="4-digit OTP" placeholderTextColor="#98A79C" maxLength={4} className="flex-1 rounded-xl border border-[#DCE9D9] bg-[#F9FCF8] px-3 py-3 text-center text-sm font-bold text-[#173C25]" />
                <Pressable onPress={() => onComplete(order.id)} disabled={isCompleting} style={({ pressed }) => ({ justifyContent: "center", borderRadius: 12, backgroundColor: "#14532D", paddingHorizontal: 15, opacity: pressed || isCompleting ? 0.7 : 1 })}>{isCompleting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[12px] font-extrabold text-white">Complete</Text>}</Pressable>
              </View>
            </View>

            <View className="mt-1 flex-row gap-3">
              <Pressable onPress={() => onBackgroundSettings(order.id)} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 14, backgroundColor: "#E8F5E9", paddingVertical: 12, opacity: pressed ? 0.75 : 1 })}><Text className="text-xs font-extrabold text-[#24713B]">Background GPS</Text></Pressable>
              {activeGps ? <Pressable onPress={onPauseGps} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 14, backgroundColor: "#FEF3C7", paddingVertical: 12, opacity: pressed ? 0.75 : 1 })}><Text className="text-xs font-extrabold text-[#92400E]">Pause GPS</Text></Pressable> : null}
            </View>
          </View> : null}
        </View>
      </View>
    </Modal>
  );
}

export default function DeliveryPartnerScreen() {
  const colors = useColors();
  const { userRole } = useAuth();
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [lastLocation, setLastLocation] = useState<Location.LocationObject | null>(null);
  const [proofUris, setProofUris] = useState<Record<number, string>>({});
  const [confirmationCodes, setConfirmationCodes] = useState<Record<number, string>>({});
  const [partnerLocation, setPartnerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [backgroundTrackingOrderId, setBackgroundTrackingOrderId] = useState<number | null>(null);
  const [selectedActionOrder, setSelectedActionOrder] = useState<DeliveryAssignment | null>(null);
  const [statusMessage, setStatusMessage] = useState("Accept an assigned delivery to begin the secure handoff flow.");
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  const approvalQuery = trpc.deliveryPartner.approval.useQuery(undefined, { enabled: userRole === "delivery_partner", retry: false });
  const canOperate = userRole === "delivery_partner" && approvalQuery.data?.status === "approved" && approvalQuery.data?.isActive;
  const assignmentsQuery = trpc.deliveryPartner.assignments.useQuery(undefined, { enabled: canOperate, refetchInterval: 10_000, refetchOnWindowFocus: true });
  const assignmentAlertsQuery = trpc.notifications.list.useQuery(undefined, { enabled: userRole === "delivery_partner", refetchInterval: 10_000, refetchOnWindowFocus: true });
  const routeSummaryQuery = trpc.deliveryPartner.routeSummary.useQuery(undefined, { enabled: canOperate, refetchInterval: 30_000, refetchOnWindowFocus: true });
  const updateLocationMutation = trpc.deliveryPartner.updateLocation.useMutation();
  const acceptDeliveryMutation = trpc.deliveryPartner.accept.useMutation();
  const startDeliveryMutation = trpc.deliveryPartner.start.useMutation();
  const claimNearbyMutation = trpc.deliveryPartner.claim.useMutation();
  const uploadProofMutation = trpc.deliveryPartner.uploadProof.useMutation();
  const completeDeliveryMutation = trpc.deliveryPartner.complete.useMutation();
  const markAssignmentAlertRead = trpc.notifications.markAsRead.useMutation({ onSuccess: () => { void assignmentAlertsQuery.refetch(); } });

  const assignments = (assignmentsQuery.data ?? []) as DeliveryAssignment[];
  const nearbyQuery = trpc.deliveryPartner.nearby.useQuery(
    partnerLocation ?? { latitude: 0, longitude: 0 },
    { enabled: canOperate && Boolean(partnerLocation), refetchInterval: 10_000, refetchOnWindowFocus: true },
  );
  const nearbyOrders = (nearbyQuery.data ?? []) as DeliveryAssignment[];
  const assignmentAlerts = (assignmentAlertsQuery.data ?? []).filter((notification: any) => notification.type === "delivery_assignment" && !notification.isRead);
  const reviewAlerts = (assignmentAlertsQuery.data ?? []).filter((notification: any) => notification.type === "delivery_partner_review" && !notification.isRead);
  const activeCount = assignments.filter((item) => item.status === "shipped").length;

  useEffect(() => () => {
    watcherRef.current?.remove();
    watcherRef.current = null;
  }, []);

  useEffect(() => { void getBackgroundDeliveryTrackingState().then((state) => setBackgroundTrackingOrderId(state.active ? state.orderId : null)); }, []);

  useEffect(() => {
    if (!canOperate) return;
    void (async () => {
      if (!await Location.hasServicesEnabledAsync()) return;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPartnerLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    })().catch(() => setStatusMessage("Allow location access to see nearby delivery orders."));
  }, [canOperate]);

  const stopSharing = () => {
    watcherRef.current?.remove();
    watcherRef.current = null;
    setActiveOrderId(null);
    setStatusMessage("GPS sharing paused. Resume when you are back on the route.");
  };

  const startSharing = async (orderId: number) => {
    if (Platform.OS === "web") {
      setStatusMessage("Live GPS sharing is available in the Android and iOS delivery build.");
      return;
    }
    if (!await Location.hasServicesEnabledAsync()) {
      Alert.alert("Location is off", "Turn on location services to share delivery progress.");
      return;
    }
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      setStatusMessage(getDeliveryGpsUnavailableMessage());
      return;
    }
    watcherRef.current?.remove();
    setActiveOrderId(orderId);
    setStatusMessage("Sharing your live location with the customer.");
    watcherRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 10_000, distanceInterval: 25 },
      async (location) => {
        setLastLocation(location);
        try {
          await updateLocationMutation.mutateAsync({ orderId, latitude: location.coords.latitude, longitude: location.coords.longitude, accuracy: location.coords.accuracy ?? undefined, source: "foreground" });
          setStatusMessage(`GPS updated at ${new Date(location.timestamp).toLocaleTimeString()}.`);
        } catch {
          setStatusMessage("Location captured; the app will retry on the next GPS update.");
        }
      },
    );
  };

  const acceptDelivery = async (orderId: number) => {
    try {
      await acceptDeliveryMutation.mutateAsync({ orderId });
      setStatusMessage("Delivery accepted. Confirm pickup, then start the route.");
      await assignmentsQuery.refetch();
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Could not accept this delivery."); }
  };

  const startRoute = async (orderId: number) => {
    try {
      await startDeliveryMutation.mutateAsync({ orderId });
      setStatusMessage("Route started. GPS sharing starts automatically.");
      await assignmentsQuery.refetch();
      await startSharing(orderId);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Could not start this delivery route."); }
  };

  const captureProof = async (orderId: number) => {
    if (Platform.OS === "web") { setStatusMessage("Proof-of-delivery capture is available in the Android and iOS delivery build."); return; }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") { Alert.alert("Camera permission needed", "Allow camera access to capture proof of delivery."); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.65 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setProofUris((current) => ({ ...current, [orderId]: asset.uri }));
    setStatusMessage("Uploading proof of delivery.");
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const contentType = asset.mimeType === "image/png" ? "image/png" : "image/jpeg";
      await uploadProofMutation.mutateAsync({ orderId, dataUri: `data:${contentType};base64,${base64}`, contentType });
      setStatusMessage("Proof saved. Ask the customer for the 4-digit OTP to complete this handoff.");
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Could not upload proof of delivery."); }
  };

  const completeHandoff = async (orderId: number) => {
    const code = (confirmationCodes[orderId] ?? "").replace(/\D/g, "");
    if (!/^\d{4}$/.test(code)) { Alert.alert("Customer OTP needed", "Enter the 4-digit code supplied by the customer before completing this delivery."); return; }
    try {
      await completeDeliveryMutation.mutateAsync({ orderId, code });
      if (activeOrderId === orderId) stopSharing();
      if (backgroundTrackingOrderId === orderId) { await stopBackgroundDeliveryTracking(); setBackgroundTrackingOrderId(null); }
      setSelectedActionOrder(null);
      setStatusMessage("Delivery completed. Great work!");
      await Promise.all([assignmentsQuery.refetch(), routeSummaryQuery.refetch()]);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Could not complete this delivery."); }
  };

  const claimNearby = async (orderId: number) => {
    try {
      await claimNearbyMutation.mutateAsync({ orderId });
      setStatusMessage("Nearby delivery accepted. Confirm pickup, then start the route.");
      await Promise.all([assignmentsQuery.refetch(), nearbyQuery.refetch()]);
    } catch (error) { setStatusMessage(error instanceof Error ? error.message : "Could not accept this nearby delivery."); }
  };

  if (userRole !== "delivery_partner") {
    return <ScreenContainer className="items-center justify-center bg-[#F5FAF4] px-7" containerClassName="bg-[#F5FAF4]"><View className="items-center rounded-3xl border border-[#DCE9D9] bg-white p-6"><Text className="text-lg font-extrabold text-[#173C25]">Delivery Partner workspace</Text><Text className="mt-2 text-center text-sm leading-5 text-[#68776D]">Sign in with a delivery-partner account created by operations to see your assigned deliveries.</Text><Pressable onPress={() => router.replace("/login")} style={({ pressed }) => ({ marginTop: 18, borderRadius: 14, backgroundColor: "#2E7D32", paddingHorizontal: 18, paddingVertical: 12, opacity: pressed ? 0.75 : 1 })}><Text className="font-extrabold text-white">Go to sign in</Text></Pressable></View></ScreenContainer>;
  }

  if (approvalQuery.isLoading) return <ScreenContainer className="items-center justify-center bg-[#F5FAF4] px-7" containerClassName="bg-[#F5FAF4]"><ActivityIndicator color="#2E7D32" /><Text className="mt-4 text-center text-sm text-[#68776D]">Checking your delivery-partner approval status…</Text></ScreenContainer>;

  if (!canOperate) {
    const rejected = approvalQuery.data?.status === "rejected";
    return (
      <ScreenContainer className="items-center justify-center bg-[#F5FAF4] px-7" containerClassName="bg-[#F5FAF4]">
        <View className="w-full max-w-md rounded-3xl border border-[#DCE9D9] bg-white p-6">
          <View className={`h-14 w-14 items-center justify-center rounded-2xl ${rejected ? "bg-[#FDECEC]" : "bg-[#FFF7D6]"}`}><Text className="text-2xl">{rejected ? "!" : "⌛"}</Text></View>
          <Text className="mt-5 text-xl font-extrabold text-[#173C25]">{rejected ? "Delivery profile needs review" : "Awaiting administrator approval"}</Text>
          <Text className="mt-2 text-sm leading-6 text-[#68776D]">{rejected ? "Your delivery-partner application was not approved. Contact Ghar Ghar Mart operations for the next steps." : "Your name, mobile number, and masked Aadhaar identity have been recorded. An administrator must approve your profile before delivery assignments and live tracking are unlocked."}</Text>
          {reviewAlerts.length ? <View className="mt-5 gap-3"><Text className="text-sm font-extrabold text-[#173C25]">Application updates</Text>{reviewAlerts.map((alert: any) => <Pressable key={alert.id} onPress={() => markAssignmentAlertRead.mutate(alert.id)} style={({ pressed }) => ({ borderRadius: 16, borderWidth: 1, borderColor: alert.title === "Delivery profile approved" ? "#B9D9B8" : "#F1B8B8", backgroundColor: alert.title === "Delivery profile approved" ? "#F4FBF2" : "#FFF7F7", padding: 13, opacity: pressed ? 0.75 : 1 })}><Text className="text-sm font-extrabold text-[#173C25]">{alert.title}</Text><Text className="mt-1 text-xs leading-5 text-[#68776D]">{alert.message}</Text></Pressable>)}</View> : null}
          <Pressable onPress={() => router.replace("/login")} style={({ pressed }) => ({ marginTop: 22, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 14, opacity: pressed ? 0.75 : 1 })}><Text className="font-extrabold text-white">Back to sign in</Text></Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="bg-[#F5FAF4]" safeAreaClassName="bg-[#F5FAF4]">
      <FlatList
        data={assignments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}
        ListHeaderComponent={<View className="mb-2"><View className="rounded-[28px] bg-[#14532D] p-5"><View className="flex-row items-center justify-between"><View className="flex-1 pr-3"><Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#FDE68A]">Delivery partner</Text><Text className="mt-2 text-[28px] font-extrabold leading-8 text-white">Today&apos;s route, in hand.</Text><Text className="mt-2 text-[13px] leading-5 text-[#DCFCE7]">One focused action at every stage of your delivery.</Text></View><View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#FACC15]"><Text className="text-xl">🚲</Text></View></View><View className="mt-4 flex-row gap-3"><View className="flex-1 rounded-2xl bg-white/10 p-3"><Text className="text-[11px] font-bold uppercase tracking-wide text-[#BBF7D0]">Assigned</Text><Text className="mt-1 text-2xl font-extrabold text-white">{assignments.length}</Text></View><View className="flex-1 rounded-2xl bg-white/10 p-3"><Text className="text-[11px] font-bold uppercase tracking-wide text-[#BBF7D0]">On route</Text><Text className="mt-1 text-2xl font-extrabold text-white">{activeCount}</Text></View></View><Pressable onPress={() => router.push("/delivery-earnings" as never)} style={({ pressed }) => ({ marginTop: 12, borderRadius: 16, backgroundColor: "#FFF3C8", padding: 13, opacity: pressed ? 0.75 : 1 })}><View className="flex-row items-center justify-between"><View><Text className="text-[11px] font-bold uppercase tracking-wide text-[#8A5A00]">Today&apos;s earnings</Text><Text className="mt-1 text-xl font-extrabold text-[#533300]">₹{Number(routeSummaryQuery.data?.todayEarnings ?? 0).toFixed(0)}</Text></View><Text className="text-[12px] font-bold text-[#8A5A00]">{routeSummaryQuery.data?.deliveredToday ?? 0} complete · View summary ›</Text></View></Pressable><View className="mt-4 rounded-2xl bg-white/10 p-3"><Text className="text-[12px] leading-5 text-[#ECFDF5]">{statusMessage}</Text></View></View>{assignmentsQuery.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 22 }} /> : null}{!assignmentsQuery.isLoading && assignments.length === 0 ? <View className="mt-4 rounded-2xl border border-[#DCE9D9] bg-white p-5"><Text className="text-base font-bold text-[#153B22]">No assigned deliveries</Text><Text className="mt-1 text-sm leading-5 text-[#66756A]">New assignments from operations will appear here automatically.</Text></View> : null}</View>}
        renderItem={({ item }) => {
          const isActive = activeOrderId === item.id;
           const isPacked = item.status === "packed";
           const isConfirmed = item.status === "confirmed";
           const isShipped = item.status === "shipped";
          return <View className="rounded-[24px] border border-[#DFEADF] bg-white p-4 shadow-sm"><View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><Text className="text-[12px] font-bold uppercase tracking-[1px] text-[#78917D]">Order #{item.orderNumber}</Text><Text className="mt-1 text-lg font-extrabold text-[#173C25]">{item.deliveryAddress}</Text><Text className="mt-1 text-sm text-[#6B7B70]">{item.deliveryPhone} · {item.deliveryEtaMinutes ?? "—"} min ETA</Text></View><View className="rounded-full bg-[#ECFDF3] px-3 py-1"><Text className="text-[11px] font-bold capitalize text-[#24713B]">{isShipped ? "on route" : isPacked && item.deliveryAcceptedAt ? "accepted" : "assigned"}</Text></View></View>{isPacked && !item.deliveryAcceptedAt ? <Pressable onPress={() => void acceptDelivery(item.id)} disabled={acceptDeliveryMutation.isPending} style={({ pressed }) => ({ marginTop: 14, borderRadius: 14, paddingVertical: 13, alignItems: "center", backgroundColor: "#2E7D32", opacity: pressed || acceptDeliveryMutation.isPending ? 0.7 : 1 })}><Text className="text-[13px] font-extrabold text-white">Accept delivery</Text></Pressable> : null}{(isPacked || isConfirmed) && item.deliveryAcceptedAt ? <Pressable onPress={() => void startRoute(item.id)} disabled={startDeliveryMutation.isPending} style={({ pressed }) => ({ marginTop: 14, borderRadius: 14, paddingVertical: 13, alignItems: "center", backgroundColor: "#2E7D32", opacity: pressed || startDeliveryMutation.isPending ? 0.7 : 1 })}><Text className="text-[13px] font-extrabold text-white">Start delivery route</Text></Pressable> : null}{isShipped ? <View className="mt-4 gap-3"><View className="flex-row gap-2"><Pressable onPress={() => router.push({ pathname: "/delivery-navigation", params: { orderId: String(item.id) } } as never)} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 14, backgroundColor: "#14532D", paddingVertical: 13, opacity: pressed ? 0.8 : 1 })}><Text className="text-[13px] font-extrabold text-white">Start navigation</Text></Pressable><Pressable onPress={() => setSelectedActionOrder(item)} style={({ pressed }) => ({ alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: "#B9D9B8", backgroundColor: "#F5FBF4", paddingHorizontal: 16, opacity: pressed ? 0.75 : 1 })}><Text className="text-[13px] font-extrabold text-[#24713B]">Actions</Text></Pressable></View><Text className="text-center text-xs font-semibold text-[#698070]">{isActive ? "GPS sharing active" : "GPS sharing starts automatically"}</Text>{isActive && lastLocation ? <Text className="text-center text-xs text-[#698070]">GPS: {lastLocation.coords.latitude.toFixed(5)}, {lastLocation.coords.longitude.toFixed(5)}</Text> : null}</View> : null}</View>;
        }}
        ListFooterComponent={<View className="mt-2 gap-4">
          {nearbyOrders.length ? <View className="gap-3"><Text className="text-base font-extrabold text-[#173C25]">Nearby available deliveries</Text>{nearbyOrders.map((order) => <View key={order.id} className="rounded-2xl border border-[#DCE9D9] bg-white p-4"><Text className="text-sm font-extrabold text-[#173C25]">Order #{order.orderNumber}</Text><Text className="mt-1 text-xs leading-5 text-[#68776D]">{order.deliveryAddress}</Text><Text className="mt-1 text-xs font-bold text-[#24713B]">{order.distanceFromPartnerKm?.toFixed(1)} km away</Text><Pressable onPress={() => void claimNearby(order.id)} disabled={claimNearbyMutation.isPending} style={({ pressed }) => ({ marginTop: 12, alignItems: "center", borderRadius: 12, backgroundColor: "#2E7D32", paddingVertical: 11, opacity: pressed || claimNearbyMutation.isPending ? 0.65 : 1 })}><Text className="text-xs font-extrabold text-white">Accept nearby delivery</Text></Pressable></View>)}</View> : null}
          {assignmentAlerts.length ? <View className="gap-3"><Text className="text-base font-extrabold text-[#173C25]">New assignment alerts</Text>{assignmentAlerts.map((alert: any) => <Pressable key={alert.id} onPress={() => { setStatusMessage(alert.message); markAssignmentAlertRead.mutate(alert.id); }} style={({ pressed }) => ({ borderRadius: 18, borderWidth: 1, borderColor: "#F1D899", backgroundColor: "#FFFDF4", padding: 14, opacity: pressed ? 0.75 : 1 })}><View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><Text className="text-sm font-extrabold text-[#533300]">{alert.title}</Text><Text className="mt-1 text-xs leading-5 text-[#805B17]">{alert.message}</Text></View><Text className="text-xs font-extrabold text-[#8A5A00]">NEW</Text></View></Pressable>)}</View> : null}
        </View>}
      />
      <DeliveryActionSheet order={selectedActionOrder} activeGps={activeOrderId === selectedActionOrder?.id} proofUri={selectedActionOrder ? proofUris[selectedActionOrder.id] : undefined} confirmationCode={selectedActionOrder ? confirmationCodes[selectedActionOrder.id] ?? "" : ""} isCompleting={completeDeliveryMutation.isPending} onDismiss={() => setSelectedActionOrder(null)} onPauseGps={stopSharing} onBackgroundSettings={(orderId) => router.push({ pathname: "/delivery-background", params: { orderId: String(orderId) } } as never)} onCaptureProof={(orderId) => void captureProof(orderId)} onChangeCode={(orderId, code) => setConfirmationCodes((current) => ({ ...current, [orderId]: code }))} onComplete={(orderId) => void completeHandoff(orderId)} />
    </ScreenContainer>
  );
}
