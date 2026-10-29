import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

import { LiveDeliveryMap, type DeliveryCoordinate } from "@/components/live-delivery-map";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { getDeliveryGpsUnavailableMessage } from "@/lib/delivery-location-permission";
import { hasNavigableDestination, toDeliveryNavigationCoordinate } from "@/lib/delivery-navigation";
import { formatRouteDistance, getNextRouteManeuver, type RouteManeuver } from "@/lib/route-maneuvers";
import { trpc } from "@/lib/trpc";

export default function DeliveryTurnNavigationScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const parsedOrderId = Number(orderId);
  const { userRole } = useAuth();
  const [rider, setRider] = useState<DeliveryCoordinate | null>(null);
  const [locationMessage, setLocationMessage] = useState("Preparing live street guidance.");
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const assignmentsQuery = trpc.deliveryPartner.assignments.useQuery(undefined, { enabled: userRole === "delivery_partner", refetchInterval: 10_000 });
  const updateLocationMutation = trpc.deliveryPartner.updateLocation.useMutation();
  const activeOrder = useMemo(() => (assignmentsQuery.data ?? []).find((assignment: any) => assignment.id === parsedOrderId && assignment.status === "shipped"), [assignmentsQuery.data, parsedOrderId]);
  const persistedRider = toDeliveryNavigationCoordinate(activeOrder?.currentLatitude, activeOrder?.currentLongitude);
  const activeRider = rider ?? persistedRider;
  const destination = toDeliveryNavigationCoordinate(activeOrder?.deliveryLatitude, activeOrder?.deliveryLongitude);
  const routeQuery = trpc.deliveryPartner.route.useQuery({ orderId: parsedOrderId }, { enabled: Boolean(activeOrder && activeRider && destination) && Number.isFinite(parsedOrderId), refetchInterval: 20_000 });
  const routeQueryRef = useRef(routeQuery);
  const updateLocationMutationRef = useRef(updateLocationMutation);
  const activeOrderId = activeOrder?.id;
  const routeCoordinates = (routeQuery.data?.coordinates ?? []).map((point: { latitude: number; longitude: number }) => ({ latitude: Number(point.latitude), longitude: Number(point.longitude) }));
  const nextManeuver = getNextRouteManeuver(routeQuery.data?.maneuvers as RouteManeuver[] | undefined);
  const routeDurationMinutes = routeQuery.data?.durationSeconds ? Math.max(1, Math.round(routeQuery.data.durationSeconds / 60)) : activeOrder?.deliveryEtaMinutes;

  useEffect(() => {
    routeQueryRef.current = routeQuery;
    updateLocationMutationRef.current = updateLocationMutation;
  }, [routeQuery, updateLocationMutation]);

  useEffect(() => {
    if (!activeOrderId || Platform.OS === "web") {
      if (Platform.OS === "web") setLocationMessage("Live turn guidance is available in the Android and iOS delivery build.");
      return;
    }
    let mounted = true;
    const beginTracking = async () => {
      if ((await Location.getForegroundPermissionsAsync()).status !== "granted") {
        if (mounted) setLocationMessage(getDeliveryGpsUnavailableMessage());
        return;
      }
      try {
        watcherRef.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 8_000, distanceInterval: 15 }, async (location) => {
          if (!mounted) return;
          const coordinate = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          setRider(coordinate);
          setLocationMessage("Location updated. Recalculating your next turn.");
          try {
            await updateLocationMutationRef.current.mutateAsync({ orderId: activeOrderId, latitude: coordinate.latitude, longitude: coordinate.longitude, accuracy: location.coords.accuracy ?? undefined, source: "foreground" });
            await routeQueryRef.current.refetch();
            if (mounted) setLocationMessage("Live GPS is tracking your route.");
          } catch {
            if (mounted) setLocationMessage("GPS captured. Route will refresh on the next update.");
          }
        });
      } catch {
        if (mounted) setLocationMessage("Your route remains visible. Enable GPS to refresh street guidance.");
      }
    };
    void beginTracking();
    return () => { mounted = false; watcherRef.current?.remove(); watcherRef.current = null; };
  }, [activeOrderId]);

  if (userRole !== "delivery_partner") { router.replace("/login"); return null; }
  if (assignmentsQuery.isLoading) return <ScreenContainer className="items-center justify-center bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]"><ActivityIndicator color="#2E7D32" /><Text className="mt-4 text-sm text-[#68776D]">Loading live guidance…</Text></ScreenContainer>;
  if (!activeOrder) return <ScreenContainer className="items-center justify-center bg-[#F5FAF4] px-6" containerClassName="bg-[#F5FAF4]"><View className="items-center rounded-3xl border border-[#DCE9D9] bg-white p-6"><Text className="text-lg font-extrabold text-[#173C25]">No active delivery route</Text><Text className="mt-2 text-center text-sm leading-5 text-[#68776D]">Start a delivery route before opening turn-by-turn guidance.</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ marginTop: 18, borderRadius: 14, backgroundColor: "#2E7D32", paddingHorizontal: 18, paddingVertical: 12, opacity: pressed ? 0.75 : 1 })}><Text className="font-extrabold text-white">Back to route</Text></Pressable></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]"><View className="bg-[#14532D] px-5 pb-5 pt-4"><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-sm font-bold text-[#FDE68A]">‹ Route overview</Text></Pressable><Text className="mt-4 text-[28px] font-extrabold text-white">Live turn guidance</Text><Text className="mt-1 text-sm text-[#DCFCE7]">Order #{activeOrder.orderNumber} · {routeDurationMinutes ?? "—"} min ETA</Text></View><View className="flex-1 p-4"><LiveDeliveryMap rider={activeRider} destination={destination} routeCoordinates={routeCoordinates} destinationLabel={activeOrder.deliveryAddress || "Customer destination"} etaLabel={locationMessage} progress={activeRider && destination ? 42 : 4} height={440} /><View className="-mt-28 rounded-3xl bg-[#FFFFFF] p-5 shadow-lg"><Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#78917D]">Next turn</Text><Text className="mt-2 text-xl font-extrabold text-[#173C25]">{nextManeuver?.instruction ?? (routeQuery.data?.provider === "direct" ? "Follow the direct route to the customer" : "Preparing the next street turn")}</Text><Text className="mt-2 text-sm font-bold text-[#24713B]">{nextManeuver ? formatRouteDistance(nextManeuver.distanceMeters) : routeQuery.data?.provider === "direct" ? "Road service fallback active" : "GPS guidance updates every 8 seconds"}</Text><Text className="mt-3 text-xs leading-5 text-[#68776D]">{hasNavigableDestination(destination) ? "Your position and road route update automatically as you move." : "The customer needs an exact map pin for complete turn-by-turn guidance."}</Text></View></View></ScreenContainer>;
}
