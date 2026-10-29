import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { getBackgroundDeliveryTrackingState, startBackgroundDeliveryTracking, stopBackgroundDeliveryTracking } from "@/lib/delivery-background-location";

export default function DeliveryBackgroundScreen() {
  const { orderId: orderIdParam } = useLocalSearchParams<{ orderId?: string }>();
  const orderId = Number(orderIdParam);
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const [message, setMessage] = useState("Checking tracking availability.");

  const refresh = useCallback(async () => {
    const state = await getBackgroundDeliveryTrackingState();
    setSupported(state.supported);
    setActive(state.active && state.orderId === orderId);
    setMessage(state.supported ? state.active ? "Background GPS is currently sharing this active route." : "Enable tracking before sending the app to the background." : "Background GPS requires an installed development build, not Expo Go.");
    setLoading(false);
  }, [orderId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const toggle = async () => {
    try {
      setLoading(true);
      if (active) {
        await stopBackgroundDeliveryTracking();
        setActive(false);
        setMessage("Background GPS has been paused for this route.");
      } else {
        await startBackgroundDeliveryTracking(orderId);
        setActive(true);
        setSupported(true);
        setMessage("Background GPS is active. Keep the system location indicator enabled until delivery is complete.");
      }
    } catch (error) {
      Alert.alert("Background GPS", error instanceof Error ? error.message : "Could not change background tracking.");
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== "delivery_partner") return <ScreenContainer className="items-center justify-center bg-[#F5FAF4] px-7"><Text className="text-center text-sm text-[#68776D]">Sign in as a delivery partner to manage route tracking.</Text></ScreenContainer>;

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="bg-[#F5FAF4] px-5" safeAreaClassName="bg-[#F5FAF4]"><Pressable onPress={() => router.back()} style={({ pressed }) => ({ marginTop: 8, opacity: pressed ? 0.65 : 1 })}><Text className="text-[15px] font-bold text-[#2E7D32]">‹ Back to delivery</Text></Pressable><View className="mt-7 rounded-[28px] bg-[#14532D] p-6"><Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#FDE68A]">Development build</Text><Text className="mt-2 text-[29px] font-extrabold leading-8 text-white">Background GPS</Text><Text className="mt-3 text-sm leading-6 text-[#DCFCE7]">Your route continues to share location every 30 seconds or 50 metres while the app is in the background.</Text></View><View className="mt-5 rounded-3xl border border-[#DCE9D9] bg-white p-5"><Text className="text-base font-extrabold text-[#173C25]">Order #{Number.isFinite(orderId) ? orderId : "—"}</Text><Text className="mt-3 text-sm leading-6 text-[#68776D]">{message}</Text>{loading ? <ActivityIndicator color="#2E7D32" style={{ marginTop: 22 }} /> : <Pressable onPress={() => void toggle()} disabled={!supported && active === false} style={({ pressed }) => ({ marginTop: 22, borderRadius: 16, paddingVertical: 14, alignItems: "center", backgroundColor: active ? "#FFF3C8" : "#2E7D32", opacity: pressed ? 0.75 : !supported && !active ? 0.45 : 1 })}><Text style={{ color: active ? "#8A5A00" : "#FFFFFF", fontWeight: "800" }}>{active ? "Stop background GPS" : supported ? "Enable background GPS" : "Use a development build"}</Text></Pressable>}</View><View className="mt-5 rounded-2xl bg-[#FFF7D6] p-4"><Text className="text-[13px] font-extrabold text-[#7C5200]">Important</Text><Text className="mt-1 text-[13px] leading-5 text-[#805B17]">This is intentionally unavailable in Expo Go. Install a development build, then choose “Allow all the time” when Android or iOS asks for location permission.</Text></View></ScreenContainer>;
}
