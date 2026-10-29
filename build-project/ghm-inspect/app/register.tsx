import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { getRegistrationFieldErrors, type RegistrationField } from "@/lib/registration-validation";
import { trpc } from "@/lib/trpc";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [shopName, setShopName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [password, setPassword] = useState("");
  const [shopImage, setShopImage] = useState<{ uri: string; base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp" } | null>(null);
  const [role, setRole] = useState<Extract<UserRole, "customer" | "seller">>("customer");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "verify">("details");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegistrationField, string>>>({});
  const { completeVerifiedPhoneAuth } = useAuth();
  const requestOtp = trpc.auth.phoneOtp.request.useMutation();
  const signUp = trpc.auth.phoneOtp.signUp.useMutation();
  const uploadShopImage = trpc.seller.profile.uploadLogo.useMutation();
  const directCustomerSignUp = trpc.auth.directCustomer.signUp.useMutation();
  const isLoading = requestOtp.isPending || signUp.isPending || directCustomerSignUp.isPending;

  const chooseShopImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) throw new Error("The selected image could not be prepared.");
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
      const mimeType = asset.mimeType === "image/png" ? "image/png" : asset.mimeType === "image/webp" ? "image/webp" : "image/jpeg";
      setShopImage({ uri: asset.uri, base64: asset.base64, mimeType });
    } catch (error) {
      Alert.alert("Could not choose shop image", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const clearFieldError = (field: RegistrationField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const requestVerification = async () => {
    const errors = getRegistrationFieldErrors({ name, phone, email, address, password, role, aadhaarNumber });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    try {
      if (role === "customer") {
        const result = await directCustomerSignUp.mutateAsync({ name: name.trim(), phone, address: address.trim(), password });
        await completeVerifiedPhoneAuth(result);
        router.replace("/(tabs)");
        return;
      }
      const result = await requestOtp.mutateAsync({ phone, purpose: "signup" });
      setStep("verify");
      if (result.previewCode) Alert.alert("Preview OTP", `Use ${result.previewCode} while SMS delivery is not configured.`);
    } catch (error) {
      Alert.alert(role === "customer" ? "Could not create account" : "Could not send OTP", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const completeRegistration = async () => {
    if (!/^\d{6}$/.test(otp)) {
      Alert.alert("Enter OTP", "Please enter the 6-digit code sent to your mobile number.");
      return;
    }
    try {
      const result = await signUp.mutateAsync({ name: name.trim(), phone, email: email.trim(), address: address.trim(), role, shopName: role === "seller" ? shopName.trim() || undefined : undefined, aadhaarNumber: role === "seller" ? aadhaarNumber : undefined, password, code: otp });
      await completeVerifiedPhoneAuth(result);
      if (role === "seller" && shopImage) {
        try {
          await uploadShopImage.mutateAsync({ mimeType: shopImage.mimeType, contentBase64: shopImage.base64 });
        } catch {
          Alert.alert("Account created", "Your seller account was created, but the shop image could not be uploaded. You can add it later from Shop profile.");
        }
      }
      router.replace(result.user.role === "seller" ? "/seller-dashboard" : "/(tabs)");
    } catch (error) {
      Alert.alert("Verification failed", error instanceof Error ? error.message : "Please request a new OTP and try again.");
    }
  };

  return (
    <ScreenContainer className="bg-[#F7FBF5]" containerClassName="bg-[#F7FBF5]">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View className="rounded-[28px] bg-[#14532D] p-6">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Ghar Ghar Mart</Text>
          <Text className="mt-3 text-3xl font-extrabold text-white">{step === "details" ? "Create your account" : "Verify your number"}</Text>
          <Text className="mt-2 text-sm leading-5 text-[#DCFCE7]">{step === "details" ? role === "customer" ? "Choose a password to start shopping—no SMS verification needed." : "A quick mobile verification keeps every seller account secure." : `We sent a 6-digit code to +91 ${phone}.`}</Text>
        </View>

        {step === "details" ? (
          <View className="mt-6 rounded-3xl border border-[#DCE9D9] bg-white p-5">
            <Text className="text-base font-extrabold text-[#173C25]">I want to join as</Text>
            <View className="mt-3 flex-row gap-3">
              {(["customer", "seller"] as const).map((option) => (
                <Pressable key={option} onPress={() => { setRole(option); setFieldErrors({}); }} style={({ pressed }) => ({ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: role === option ? "#2E7D32" : "#DCE9D9", backgroundColor: role === option ? "#E8F5E9" : "#FFFFFF", paddingVertical: 13, opacity: pressed ? 0.7 : 1 })}>
                  <Text className="text-center text-sm font-extrabold text-[#173C25]">{option === "customer" ? "Customer" : "Seller"}</Text>
                </Pressable>
              ))}
            </View>

            {Object.keys(fieldErrors).length > 0 ? <View className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FFF7F7] px-4 py-3"><Text className="text-sm font-extrabold text-[#B91C1C]">Please check the highlighted fields</Text><Text className="mt-1 text-xs leading-4 text-[#B45309]">{Object.values(fieldErrors)[0]}</Text></View> : null}

            <Text className="mt-6 text-xs font-bold uppercase tracking-wide text-[#68776D]">Full name</Text>
            <TextInput value={name} onChangeText={(value) => { setName(value); clearFieldError("name"); }} editable={!isLoading} placeholder="Your full name" placeholderTextColor="#9AA79E" className={`mt-2 rounded-2xl border px-4 py-4 text-base text-[#173C25] ${fieldErrors.name ? "border-[#DC2626] bg-[#FFF7F7]" : "border-[#DCE9D9] bg-[#F9FCF8]"}`} />
            {fieldErrors.name ? <Text className="mt-1 text-xs font-semibold text-[#B91C1C]">{fieldErrors.name}</Text> : null}

            <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Mobile number</Text>
            <View className={`mt-2 flex-row items-center rounded-2xl border px-4 ${fieldErrors.phone ? "border-[#DC2626] bg-[#FFF7F7]" : "border-[#DCE9D9] bg-[#F9FCF8]"}`}>
              <Text className="mr-2 text-base font-bold text-[#173C25]">+91</Text>
              <TextInput value={phone} onChangeText={(value) => { setPhone(value.replace(/\D/g, "").slice(0, 10)); clearFieldError("phone"); }} editable={!isLoading} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="10-digit mobile number" placeholderTextColor="#9AA79E" className="flex-1 py-4 text-base text-[#173C25]" />
            </View>
            {fieldErrors.phone ? <Text className="mt-1 text-xs font-semibold text-[#B91C1C]">{fieldErrors.phone}</Text> : null}

            {role === "seller" ? (
              <>
                <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Shop image (optional)</Text>
                <Pressable onPress={() => void chooseShopImage()} disabled={isLoading} className="mt-2 flex-row items-center rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] p-3">
                  {shopImage ? <Image source={{ uri: shopImage.uri }} className="h-16 w-16 rounded-xl" /> : <View className="h-16 w-16 items-center justify-center rounded-xl bg-[#E8F5E9]"><Text className="text-2xl">🏪</Text></View>}
                  <View className="ml-3 flex-1"><Text className="text-sm font-extrabold text-[#173C25]">{shopImage ? "Change shop image" : "Add shop image"}</Text><Text className="mt-1 text-xs leading-4 text-[#68776D]">JPG, PNG or WebP under 5 MB</Text></View>
                </Pressable>
                <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Email for account recovery</Text>
                <TextInput value={email} onChangeText={(value) => { setEmail(value); clearFieldError("email"); }} editable={!isLoading} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" placeholderTextColor="#9AA79E" className={`mt-2 rounded-2xl border px-4 py-4 text-base text-[#173C25] ${fieldErrors.email ? "border-[#DC2626] bg-[#FFF7F7]" : "border-[#DCE9D9] bg-[#F9FCF8]"}`} />
                {fieldErrors.email ? <Text className="mt-1 text-xs font-semibold text-[#B91C1C]">{fieldErrors.email}</Text> : null}
              </>
            ) : null}

            <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Delivery address</Text>
            <TextInput value={address} onChangeText={(value) => { setAddress(value); clearFieldError("address"); }} editable={!isLoading} multiline textAlignVertical="top" placeholder="House, street, locality and city" placeholderTextColor="#9AA79E" className={`mt-2 min-h-[104px] rounded-2xl border px-4 py-4 text-base text-[#173C25] ${fieldErrors.address ? "border-[#DC2626] bg-[#FFF7F7]" : "border-[#DCE9D9] bg-[#F9FCF8]"}`} />
            {fieldErrors.address ? <Text className="mt-1 text-xs font-semibold text-[#B91C1C]">{fieldErrors.address}</Text> : null}

            <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Create password</Text>
            <TextInput value={password} onChangeText={(value) => { setPassword(value); clearFieldError("password"); }} editable={!isLoading} secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" placeholderTextColor="#9AA79E" className={`mt-2 rounded-2xl border px-4 py-4 text-base text-[#173C25] ${fieldErrors.password ? "border-[#DC2626] bg-[#FFF7F7]" : "border-[#DCE9D9] bg-[#F9FCF8]"}`} />
            {fieldErrors.password ? <Text className="mt-1 text-xs font-semibold text-[#B91C1C]">{fieldErrors.password}</Text> : null}
            <Text className="mt-2 text-xs leading-4 text-[#68776D]">{role === "customer" ? "Use this password to sign in directly next time. No SMS code is required." : "Use this password with your mobile number to sign in after phone verification."}</Text>

            {role === "seller" ? (
              <>
                <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Shop name</Text>
                <TextInput value={shopName} onChangeText={setShopName} editable={!isLoading} placeholder="Your shop or store name" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-base text-[#173C25]" />
                <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Aadhaar number</Text>
                <TextInput value={aadhaarNumber} onChangeText={(value) => { setAadhaarNumber(value.replace(/\D/g, "").slice(0, 12)); clearFieldError("aadhaarNumber"); }} editable={!isLoading} keyboardType="number-pad" textContentType="none" autoComplete="off" placeholder="12-digit Aadhaar number" placeholderTextColor="#9AA79E" className={`mt-2 rounded-2xl border px-4 py-4 text-base text-[#173C25] ${fieldErrors.aadhaarNumber ? "border-[#DC2626] bg-[#FFF7F7]" : "border-[#DCE9D9] bg-[#F9FCF8]"}`} />
                {fieldErrors.aadhaarNumber ? <Text className="mt-1 text-xs font-semibold text-[#B91C1C]">{fieldErrors.aadhaarNumber}</Text> : null}
                <Text className="mt-2 text-xs leading-4 text-[#68776D]">For privacy, the full Aadhaar number is never stored. Only a secure hash and the final four digits are retained for the administrator&apos;s review.</Text>
              </>
            ) : null}

            <Pressable onPress={requestVerification} disabled={isLoading} style={({ pressed }) => ({ marginTop: 24, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 16, opacity: pressed || isLoading ? 0.7 : 1 })}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">{role === "customer" ? "Create account" : "Send verification code"}</Text>}
            </Pressable>
          </View>
        ) : (
          <View className="mt-6 rounded-3xl border border-[#DCE9D9] bg-white p-5">
            <Text className="text-base font-extrabold text-[#173C25]">Enter your verification code</Text>
            <Text className="mt-1 text-sm leading-5 text-[#68776D]">The code is valid for 10 minutes and can only be used once.</Text>
            <TextInput value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} editable={!isLoading} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} placeholder="• • • • • •" placeholderTextColor="#A4AEA7" className="mt-6 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-4 text-center text-2xl font-extrabold tracking-[10px] text-[#173C25]" />
            <Pressable onPress={completeRegistration} disabled={isLoading} style={({ pressed }) => ({ marginTop: 20, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 16, opacity: pressed || isLoading ? 0.7 : 1 })}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">Verify and create account</Text>}
            </Pressable>
            <Pressable onPress={requestVerification} disabled={isLoading} style={({ pressed }) => ({ marginTop: 16, alignItems: "center", opacity: pressed || isLoading ? 0.6 : 1 })}>
              <Text className="text-sm font-bold text-[#2E7D32]">Resend verification code</Text>
            </Pressable>
            <Pressable onPress={() => { setOtp(""); setStep("details"); }} disabled={isLoading} style={({ pressed }) => ({ marginTop: 12, alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
              <Text className="text-sm font-semibold text-[#68776D]">Change details</Text>
            </Pressable>
          </View>
        )}

        <Pressable onPress={() => router.replace("/login")} style={({ pressed }) => ({ marginTop: 22, alignSelf: "center", opacity: pressed ? 0.6 : 1 })}>
          <Text className="text-sm font-bold text-[#2E7D32]">Already have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
