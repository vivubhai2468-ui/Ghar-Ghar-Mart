import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { getSignedInEntryRoute } from "@/lib/entry-routing";
import { trpc } from "@/lib/trpc";

export default function DeliveryRegistrationScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "verify">("details");
  const { completeVerifiedPhoneAuth } = useAuth();
  const requestOtp = trpc.auth.phoneOtp.request.useMutation();
  const signUp = trpc.auth.phoneOtp.signUp.useMutation();
  const isLoading = requestOtp.isPending || signUp.isPending;

  const sendOtp = async () => {
    if (name.trim().length < 2 || phone.replace(/\D/g, "").length !== 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8 || aadhaarNumber.replace(/\D/g, "").length !== 12) {
      Alert.alert("Check your details", "Enter your full name, 10-digit mobile number, valid email address, a password with at least 8 characters, and 12-digit Aadhaar number.");
      return;
    }
    try {
      const result = await requestOtp.mutateAsync({ phone, purpose: "signup" });
      setStep("verify");
      if (result.previewCode) Alert.alert("Preview OTP", `Use ${result.previewCode} while SMS delivery is not configured.`);
    } catch (error) {
      Alert.alert("Could not send OTP", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const completeRegistration = async () => {
    if (!/^\d{6}$/.test(otp)) {
      Alert.alert("Enter OTP", "Please enter the 6-digit code sent to your mobile number.");
      return;
    }
    try {
      const result = await signUp.mutateAsync({
        name: name.trim(),
        phone,
        email: email.trim(),
        address: "Delivery partner profile",
        role: "delivery_partner",
        aadhaarNumber,
        password,
        code: otp,
      });
      await completeVerifiedPhoneAuth(result);
      router.replace(getSignedInEntryRoute("delivery_partner"));
    } catch (error) {
      Alert.alert("Verification failed", error instanceof Error ? error.message : "Please request a new OTP and try again.");
    }
  };

  return <ScreenContainer className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]"><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"><View className="rounded-[28px] bg-[#14532D] p-6"><Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Ghar Ghar Mart</Text><Text className="mt-3 text-3xl font-extrabold text-white">{step === "details" ? "Join as a delivery partner" : "Verify your mobile"}</Text><Text className="mt-2 text-sm leading-5 text-[#DCFCE7]">{step === "details" ? "Start receiving delivery assignments with a verified mobile and identity profile." : `We sent a 6-digit code to +91 ${phone}.`}</Text></View>{step === "details" ? <View className="mt-6 rounded-3xl border border-[#DCE9D9] bg-white p-5"><Text className="text-base font-extrabold text-[#173C25]">Your delivery profile</Text><Text className="mt-1 text-sm leading-5 text-[#68776D]">We need your name, mobile number, email for password recovery, password, and Aadhaar for delivery-partner verification.</Text><Text className="mt-6 text-xs font-bold uppercase tracking-wide text-[#68776D]">Full name</Text><TextInput value={name} onChangeText={setName} editable={!isLoading} placeholder="Your full name" placeholderTextColor="#9AA79E" autoComplete="name" textContentType="name" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" /><Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Mobile number</Text><View className="mt-2 flex-row items-center rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4"><Text className="mr-2 text-base font-bold text-[#173C25]">+91</Text><TextInput value={phone} onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))} editable={!isLoading} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="10-digit mobile number" placeholderTextColor="#9AA79E" className="flex-1 py-4 text-base text-[#173C25]" /></View><Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Email for password recovery</Text><TextInput value={email} onChangeText={setEmail} editable={!isLoading} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" /><Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Create password</Text><TextInput value={password} onChangeText={setPassword} editable={!isLoading} secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" /><Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Aadhaar number</Text><TextInput value={aadhaarNumber} onChangeText={(value) => setAadhaarNumber(value.replace(/\D/g, "").slice(0, 12))} editable={!isLoading} keyboardType="number-pad" textContentType="none" autoComplete="off" placeholder="12-digit Aadhaar number" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" /><View className="mt-3 rounded-2xl bg-[#FFF7D6] p-3"><Text className="text-xs leading-5 text-[#805B17]">For privacy, the full Aadhaar number is never stored or displayed. The system keeps only a secure hash and the final four digits for identity verification.</Text></View><Pressable onPress={() => void sendOtp()} disabled={isLoading} style={({ pressed }) => ({ marginTop: 24, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 16, opacity: pressed || isLoading ? 0.7 : 1 })}>{isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">Send verification code</Text>}</Pressable></View> : <View className="mt-6 rounded-3xl border border-[#DCE9D9] bg-white p-5"><Text className="text-base font-extrabold text-[#173C25]">Enter your verification code</Text><Text className="mt-1 text-sm leading-5 text-[#68776D]">Confirming this OTP activates your delivery-partner login.</Text><TextInput value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} editable={!isLoading} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} placeholder="• • • • • •" placeholderTextColor="#A4AEA7" className="mt-6 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-center text-2xl font-extrabold tracking-[10px] text-[#173C25]" /><Pressable onPress={() => void completeRegistration()} disabled={isLoading} style={({ pressed }) => ({ marginTop: 20, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 16, opacity: pressed || isLoading ? 0.7 : 1 })}>{isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">Verify and open delivery panel</Text>}</Pressable><Pressable onPress={() => void sendOtp()} disabled={isLoading} style={({ pressed }) => ({ marginTop: 16, alignItems: "center", opacity: pressed || isLoading ? 0.6 : 1 })}><Text className="text-sm font-bold text-[#2E7D32]">Resend verification code</Text></Pressable><Pressable onPress={() => { setOtp(""); setStep("details"); }} disabled={isLoading} style={({ pressed }) => ({ marginTop: 12, alignItems: "center", opacity: pressed ? 0.6 : 1 })}><Text className="text-sm font-semibold text-[#68776D]">Change details</Text></Pressable></View>}<Pressable onPress={() => router.replace("/login")} style={({ pressed }) => ({ marginTop: 22, alignSelf: "center", opacity: pressed ? 0.6 : 1 })}><Text className="text-sm font-bold text-[#2E7D32]">Already registered? Sign in</Text></Pressable></ScrollView></ScreenContainer>;
}
