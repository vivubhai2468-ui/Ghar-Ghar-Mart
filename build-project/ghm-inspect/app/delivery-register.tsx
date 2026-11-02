import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

export default function DeliveryRegistrationScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submitApplication = trpc.auth.partnerRegistration.submitDeliveryPartnerApplication.useMutation();
  const isLoading = submitApplication.isPending;

  const submitDetails = async () => {
    if (name.trim().length < 2 || phone.replace(/\D/g, "").length !== 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8) {
      Alert.alert("Check your details", "Enter your full name, 10-digit mobile number, valid email address, and a password with at least 8 characters.");
      return;
    }
    try {
      await submitApplication.mutateAsync({ name: name.trim(), phone, email: email.trim(), password });
      Alert.alert("Application submitted", "Your application is pending administrator review. The admin team must independently verify your mobile number and identity before approving your account.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (error) {
      Alert.alert("Could not submit application", error instanceof Error ? error.message : "Please try again.");
    }
  };

  return (
    <ScreenContainer className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View className="rounded-[28px] bg-[#14532D] p-6">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Ghar Ghar Mart</Text>
          <Text className="mt-3 text-3xl font-extrabold text-white">Join as a delivery partner</Text>
          <Text className="mt-2 text-sm leading-5 text-[#DCFCE7]">Submit your details to apply. Your account will be available after administrator approval.</Text>
        </View>
        <View className="mt-6 rounded-3xl border border-[#DCE9D9] bg-white p-5">
          <Text className="text-base font-extrabold text-[#173C25]">Your delivery profile</Text>
          <Text className="mt-1 text-sm leading-5 text-[#68776D]">Enter your contact details. The admin team will verify your mobile number and identity before approval.</Text>
          <Text className="mt-6 text-xs font-bold uppercase tracking-wide text-[#68776D]">Full name</Text>
          <TextInput value={name} onChangeText={setName} editable={!isLoading} placeholder="Your full name" placeholderTextColor="#9AA79E" autoComplete="name" textContentType="name" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" />
          <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Mobile number</Text>
          <View className="mt-2 flex-row items-center rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4">
            <Text className="mr-2 text-base font-bold text-[#173C25]">+91</Text>
            <TextInput value={phone} onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))} editable={!isLoading} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="10-digit mobile number" placeholderTextColor="#9AA79E" className="flex-1 py-4 text-base text-[#173C25]" />
          </View>
          <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Email for password recovery</Text>
          <TextInput value={email} onChangeText={setEmail} editable={!isLoading} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" />
          <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Create password</Text>
          <TextInput value={password} onChangeText={setPassword} editable={!isLoading} secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" />
          <View className="mt-3 rounded-2xl bg-[#FFF7D6] p-3">
            <Text className="text-xs leading-5 text-[#805B17]">Do not enter Aadhaar or other identity numbers here. The admin team will explain the approved identity-verification process.</Text>
          </View>
          <Pressable onPress={() => void submitDetails()} disabled={isLoading} style={({ pressed }) => ({ marginTop: 24, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 16, opacity: pressed || isLoading ? 0.7 : 1 })}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">Submit Details</Text>}
          </Pressable>
        </View>
        <Pressable onPress={() => router.replace("/login")} style={({ pressed }) => ({ marginTop: 22, alignSelf: "center", opacity: pressed ? 0.6 : 1 })}>
          <Text className="text-sm font-bold text-[#2E7D32]">Already registered? Sign in</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
