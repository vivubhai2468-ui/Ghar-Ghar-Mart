import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

import { LiveDeliveryMap, type DeliveryCoordinate } from "@/components/live-delivery-map";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { getDeliveryGpsUnavailableMessage } from "@/lib/delivery-location-permission";
import { hasNavigableDestination, toDeliveryNavigationCoordinate } from "@/lib/delivery-navigation";
import { trpc } from "@/lib/trpc";

export default function DeliveryNavigationScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const { userRole } = useAuth();
  const parsedOrderId = Number(orderId);
  const [deviceLocation, setDeviceLocation] = useState<DeliveryCoordinate | null>(null);
  const [locationMessage, setLocationMessage] = useState("Preparing your live route.");
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const assignmentsQuery = trpc.deliveryPartner.assignments.useQuery(undefined, {
    enabled: userRole === "delivery_partner",
    refetchInterval: 10_000,
  });

  const activeOrder = useMemo(
    () => (assignmentsQuery.data ?? []).find((assignment: any) => assignment.id === parsedOrderId && assignment.status === "shipped"),
    [assignmentsQuery.data, parsedOrderId],
  );
  const persistedRider = toDeliveryNavigationCoordinate(activeOrder?.currentLatitude, activeOrder?.currentLongitude);
  const destination = toDeliveryNavigationCoordinate(activeOrder?.deliveryLatitude, activeOrder?.deliveryLongitude);
  const rider = deviceLocation ?? persistedRider;
  const routeQuery = trpc.deliveryPartner.route.useQuery(
    { orderId: parsedOrderId },
    { enabled: Boolean(activeOrder && rider && destination) && Number.isFinite(parsedOrderId), refetchInterval: 30_000 },
  );
  const routeData = routeQuery.data;
  const routeCoordinates = (routeData?.coordinates ?? []).map(
    (point: { latitude: number; longitude: number }) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude) }),
  );
  const routeDurationMinutes = routeData?.durationSeconds ? Math.max(1, Math.round(routeData.durationSeconds / 60)) : null;
  const routeDistanceKm = routeData?.distanceMeters ? (routeData.distanceMeters / 1000).toFixed(1) : null;
  const routeLabel = routeData?.provider === "osrm"
    ? `Street route active · ${routeDistanceKm ?? "—"} km · ${routeDurationMinutes ?? activeOrder?.deliveryEtaMinutes ?? "—"} min`
    : locationMessage;

  useEffect(() => {
    if (Platform.OS === "web") {
      setLocationMessage("Live route preview is available on Android and iOS delivery devices.");
      return;
    }

    let active = true;
    const beginTracking = async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        if (active) setLocationMessage(getDeliveryGpsUnavailableMessage());
        return;
      }
      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) {
          setDeviceLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
          setLocationMessage("Live GPS is active. Follow the route to the customer.");
        }
        watcherRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 10_000, distanceInterval: 25 },
          (location) => {
            if (!active) return;
            setDeviceLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
            setLocationMessage("Live GPS is active. Following your current location.");
          },
        );
      } catch {
        if (active) setLocationMessage("Your route is ready. Live location will resume when GPS becomes available.");
      }
    };
    void beginTracking();
    return () => {
      active = false;
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, []);

  if (userRole !== "delivery_partner") {
    router.replace("/login");
    return null;
  }

  if (assignmentsQuery.isLoading) {
    return <ScreenContainer className="items-center justify-center bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]"><ActivityIndicator color="#2E7D32" /><Text className="mt-4 text-sm text-[#68776D]">Loading your active route…</Text></ScreenContainer>;
  }

  if (!activeOrder) {
    return <ScreenContainer className="items-center justify-center bg-[#F5FAF4] px-6" containerClassName="bg-[#F5FAF4]"><View className="items-center rounded-3xl border border-[#DCE9D9] bg-white p-6"><Text className="text-lg font-extrabold text-[#173C25]">No active delivery route</Text><Text className="mt-2 text-center text-sm leading-5 text-[#68776D]">Start a delivery route from your assigned order before opening in-app navigation.</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ marginTop: 18, borderRadius: 14, backgroundColor: "#2E7D32", paddingHorizontal: 18, paddingVertical: 12, opacity: pressed ? 0.75 : 1 })}><Text className="font-extrabold text-white">Back to deliveries</Text></Pressable></View></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]">
      <View className="bg-[#14532D] px-5 pb-5 pt-4">
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-sm font-bold text-[#FDE68A]">‹ Active delivery</Text></Pressable>
        <Text className="mt-4 text-[28px] font-extrabold text-white">Live navigation</Text>
        <Text className="mt-1 text-sm leading-5 text-[#DCFCE7]">Order #{activeOrder.orderNumber} · {activeOrder.deliveryEtaMinutes ?? "—"} min ETA</Text>
      </View>

      <View className="flex-1 p-4">
        <LiveDeliveryMap
          rider={rider}
          destination={destination}
          routeCoordinates={routeCoordinates}
          destinationLabel={activeOrder.deliveryAddress || "Customer destination"}
          etaLabel={routeLabel}
          progress={rider && destination ? 35 : 4}
          onMapPress={() => router.push({ pathname: "/delivery-turn-navigation", params: { orderId: String(activeOrder.id) } } as never)}
        />
        <View className="mt-4 rounded-3xl border border-[#DCE9D9] bg-white p-5">
          <Text className="text-xs font-bold uppercase tracking-wide text-[#78917D]">Deliver to</Text>
          <Text className="mt-2 text-lg font-extrabold text-[#173C25]">{activeOrder.deliveryAddress}</Text>
          <Text className="mt-1 text-sm text-[#68776D]">{activeOrder.deliveryPhone} · {activeOrder.deliveryEtaMinutes ?? "—"} min ETA</Text>
          {routeData?.provider === "osrm" ? <Text className="mt-3 text-xs font-bold text-[#24713B]">Street route loaded · {routeDistanceKm ?? "—"} km · {routeDurationMinutes ?? "—"} min · Tap map for turns</Text> : null}
          {routeData && routeData.provider === "direct" && rider && destination ? <Text className="mt-3 text-xs leading-5 text-[#68776D]">Road service is temporarily unavailable; showing a direct route while GPS tracking continues.</Text> : null}
          {!hasNavigableDestination(destination) ? <Text className="mt-3 text-xs leading-5 text-[#B45309]">The customer has not yet provided an exact destination pin. Use the saved delivery address for the final approach.</Text> : null}
          {!rider ? <Text className="mt-3 text-xs leading-5 text-[#B45309]">Waiting for a GPS signal. Ensure location access is enabled in device settings.</Text> : null}
        </View>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ marginTop: 4, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 15, opacity: pressed ? 0.75 : 1 })}><Text className="text-base font-extrabold text-white">Back to delivery controls</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}
