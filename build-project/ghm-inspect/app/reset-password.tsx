import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { getUserFacingError } from "@/lib/user-facing-error";
import { trpc } from "@/lib/trpc";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token: tokenParam, role: roleParam } = useLocalSearchParams<{ token?: string | string[]; role?: string | string[] }>();
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? "" : tokenParam ?? "";
  const requestedRole = Array.isArray(roleParam) ? roleParam[0] : roleParam;
  const role = requestedRole === "seller" || requestedRole === "delivery_partner" ? requestedRole : "customer";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const resetPassword = trpc.auth.directCustomer.resetPassword.useMutation();
  const resetPartnerPassword = trpc.auth.partnerPassword.resetPassword.useMutation();

  const submit = async () => {
    if (phone.replace(/\D/g, "").length !== 10) {
      Alert.alert("Check your mobile number", `Enter the 10-digit number linked to your ${role === "delivery_partner" ? "delivery-partner" : role} account.`);
      return;
    }
    if (password.length < 8) {
      Alert.alert("Check your password", "Your password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Enter the same password in both fields.");
      return;
    }
    try {
      if (role === "customer") {
        await resetPassword.mutateAsync({ phone, token, password });
      } else {
        await resetPartnerPassword.mutateAsync({ phone, role, token, password });
      }
      Alert.alert("Password updated", "You can now sign in with your new password.", [
        { text: "Continue", onPress: () => router.replace("/login") },
      ]);
    } catch (error) {
      Alert.alert("Could not reset password", getUserFacingError(error, "The reset link may have expired. Request a new link and try again."));
    }
  };

  return (
    <ScreenContainer className="bg-[#F7FBF5]" containerClassName="bg-[#F7FBF5]">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }} keyboardShouldPersistTaps="handled">
        <View className="rounded-[28px] bg-[#14532D] p-6">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Ghar Ghar Mart</Text>
          <Text className="mt-3 text-3xl font-extrabold text-white">Reset password</Text>
          <Text className="mt-2 text-sm leading-5 text-[#DCFCE7]">Confirm the mobile number on your {role === "delivery_partner" ? "delivery-partner" : role} account and choose a new password.</Text>
        </View>
        <View className="mt-6 rounded-3xl border border-[#DCE9D9] bg-white p-5">
          <Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Mobile number</Text>
          <View className="mt-2 flex-row items-center rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4">
            <Text className="mr-2 text-base font-bold text-[#173C25]">+91</Text>
            <TextInput value={phone} onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))} keyboardType="phone-pad" autoComplete="tel" placeholder="10-digit mobile number" placeholderTextColor="#9AA79E" className="flex-1 py-4 text-base text-[#173C25]" editable={!resetPassword.isPending && !resetPartnerPassword.isPending} />
          </View>
          <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">New password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" editable={!resetPassword.isPending && !resetPartnerPassword.isPending} />
          <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Confirm new password</Text>
          <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" placeholder="Enter the new password again" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" editable={!resetPassword.isPending && !resetPartnerPassword.isPending} />
          <Pressable onPress={() => void submit()} disabled={resetPassword.isPending || resetPartnerPassword.isPending || !token} style={({ pressed }) => ({ marginTop: 24, alignItems: "center", borderRadius: 16, backgroundColor: token ? "#2E7D32" : "#9AA79E", paddingVertical: 16, opacity: pressed || resetPassword.isPending || resetPartnerPassword.isPending ? 0.7 : 1 })}>
            {resetPassword.isPending || resetPartnerPassword.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">{token ? "Save new password" : "Invalid reset link"}</Text>}
          </Pressable>
          <Pressable onPress={() => router.replace("/login")} style={({ pressed }) => ({ marginTop: 18, alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
            <Text className="text-sm font-bold text-[#2E7D32]">Back to sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
