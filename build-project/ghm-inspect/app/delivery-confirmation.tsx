import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

export default function DeliveryConfirmationScreen() {
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderIdValue = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const orderId = Number(orderIdValue ?? 0);
  const [code, setCode] = useState("");
  const confirmMutation = trpc.delivery.confirm.useMutation();
  const trackingQuery = trpc.delivery.tracking.useQuery({ orderId }, { enabled: orderId > 0, refetchOnWindowFocus: false });
  const proofUrl = trackingQuery.data?.order.proofOfDeliveryUrl ?? null;

  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert("Enter the six-digit code", "Use the code sent to the mobile number on this order.");
      return;
    }
    try {
      await confirmMutation.mutateAsync({ orderId, code });
      Alert.alert("Delivery confirmed", "Thank you. Your order is now marked as delivered.", [{ text: "Done", onPress: () => router.replace("/(tabs)") }]);
    } catch (error) {
      Alert.alert("Could not confirm delivery", error instanceof Error ? error.message : "Please check the code and try again.");
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} className="bg-[#F5FAF4]" safeAreaClassName="bg-[#F5FAF4]">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 42 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginBottom: 22 })}>
          <Text className="text-[15px] font-bold text-[#2E7D32]">‹ Back to tracking</Text>
        </Pressable>
        <View className="rounded-[28px] bg-[#14532D] p-5">
          <Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#FDE68A]">Secure handoff</Text>
          <Text className="mt-2 text-[28px] font-extrabold leading-8 text-white">Confirm your delivery</Text>
          <Text className="mt-2 text-[14px] leading-5 text-[#DCFCE7]">Check the package first. Share this one-time code only after everything has arrived safely.</Text>
        </View>

        <View className="mt-4 rounded-[24px] border border-[#DCE9D9] bg-white p-4">
          <Text className="text-[12px] font-bold uppercase tracking-[1px] text-[#78917D]">Order</Text>
          <Text className="mt-1 text-lg font-extrabold text-[#173C25]">#{orderIdValue ?? "—"}</Text>
          {trackingQuery.isLoading ? <ActivityIndicator color="#2E7D32" style={{ marginTop: 20 }} /> : null}
          {!trackingQuery.isLoading && !proofUrl ? <Text className="mt-3 text-sm leading-5 text-[#68776D]">Your delivery partner has not uploaded proof yet. This screen will update when it is ready.</Text> : null}
          {proofUrl ? <Image source={{ uri: proofUrl }} className="mt-4 h-52 w-full rounded-2xl" resizeMode="cover" /> : null}
        </View>

        <View className="mt-4 rounded-[24px] border border-[#DCE9D9] bg-white p-5">
          <Text className="text-lg font-extrabold text-[#173C25]">Enter delivery OTP</Text>
          <Text className="mt-1 text-sm leading-5 text-[#68776D]">A six-digit code was sent to the phone number on your order.</Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            placeholder="000000"
            placeholderTextColor="#A1B0A4"
            className="mt-5 rounded-2xl border border-[#B9D9B8] bg-[#F8FCF6] px-4 py-4 text-center text-[28px] font-extrabold tracking-[8px] text-[#173C25]"
          />
          <Pressable disabled={confirmMutation.isPending || !proofUrl} onPress={confirm} style={({ pressed }) => ({ marginTop: 16, borderRadius: 16, alignItems: "center", paddingVertical: 15, backgroundColor: proofUrl ? "#2E7D32" : "#B9C7BA", opacity: pressed ? 0.8 : 1 })}>
            {confirmMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[15px] font-extrabold text-white">Confirm safe delivery</Text>}
          </Pressable>
          <Text className="mt-3 text-center text-xs leading-4 text-[#849287]">Never share this code before receiving your groceries.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
