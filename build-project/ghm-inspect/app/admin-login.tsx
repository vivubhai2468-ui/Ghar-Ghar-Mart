import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useAdminAuth } from "@/lib/admin-auth-context";

export default function AdminLoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { adminLogin } = useAdminAuth();

  const handleAdminLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert("Complete the form", "Enter both your username and password.");
      return;
    }
    setIsLoading(true);
    try {
      await adminLogin(username, password);
      setTimeout(() => router.replace("/admin-dashboard"), 450);
    } catch {
      setIsLoading(false);
      Alert.alert("Sign-in failed", "The username or password is not recognised.");
    }
  };

  return (
    <ScreenContainer className="bg-[#F4F8F0] p-0" containerClassName="bg-[#F4F8F0]">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.shell}>
          <View style={styles.brandBar}>
            <View style={styles.brandLockup}>
              <View style={styles.brandMark}>
                <Ionicons name="leaf" size={21} color="#14532D" />
              </View>
              <View>
                <Text style={styles.brandName}>Ghar Ghar Mart</Text>
                <Text style={styles.brandTag}>ADMIN CONTROL CENTER</Text>
              </View>
            </View>
            <View style={styles.secureBadge}>
              <Ionicons name="shield-checkmark" size={15} color="#28723B" />
              <Text style={styles.secureBadgeText}>Secure</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroOrbLarge} />
            <View style={styles.heroOrbSmall} />
            <View style={styles.heroEyebrow}>
              <View style={styles.heroDot} />
              <Text style={styles.heroEyebrowText}>OPERATIONS ACCESS</Text>
            </View>
            <Text style={styles.heroTitle}>Your store, in one calm place.</Text>
            <Text style={styles.heroSubtitle}>Sign in to manage orders, sellers, delivery activity, and the grocery catalogue.</Text>
            <View style={styles.heroSignals}>
              <View style={styles.heroSignal}><Ionicons name="receipt-outline" size={15} color="#FDE68A" /><Text style={styles.heroSignalText}>Orders</Text></View>
              <View style={styles.heroSignalDivider} />
              <View style={styles.heroSignal}><Ionicons name="storefront-outline" size={15} color="#FDE68A" /><Text style={styles.heroSignalText}>Sellers</Text></View>
              <View style={styles.heroSignalDivider} />
              <View style={styles.heroSignal}><Ionicons name="bicycle-outline" size={15} color="#FDE68A" /><Text style={styles.heroSignalText}>Delivery</Text></View>
            </View>
          </View>

          <View style={styles.signInCard}>
            <View style={styles.formHeadingRow}>
              <View>
                <Text style={styles.formKicker}>ADMINISTRATOR ACCESS</Text>
                <Text style={styles.formTitle}>Welcome back</Text>
              </View>
            </View>
            <Text style={styles.formSubtitle}>Use your administrator username and password to continue.</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <View style={styles.inputShell}>
                <TextInput placeholder="Enter admin username" value={username} onChangeText={setUsername} autoCapitalize="none" returnKeyType="next" style={[styles.textInput, { paddingLeft: 14 }]} placeholderTextColor="#97A89A" accessibilityLabel="Administrator username" />
                <Ionicons name="person-outline" size={20} color="#5A7461" />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputShell}>
                <TextInput placeholder="Enter admin password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" returnKeyType="done" onSubmitEditing={handleAdminLogin} style={[styles.textInput, { paddingLeft: 14 }]} placeholderTextColor="#97A89A" accessibilityLabel="Administrator password" />
                <Ionicons name="lock-closed-outline" size={20} color="#5A7461" />
              </View>
            </View>

            <Pressable
              onPress={handleAdminLogin}
              disabled={isLoading}
              style={({ pressed }) => [styles.primaryButton, (pressed || isLoading) && styles.pressed]}
            >
              {isLoading ? <ActivityIndicator color="#14532D" /> : <><Text style={styles.primaryButtonText}>Open control center</Text><Ionicons name="arrow-forward" size={18} color="#14532D" /></>}
            </Pressable>

            <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerText}>Preview access</Text><View style={styles.divider} /></View>
            <View style={styles.previewCard}>
              <View style={styles.previewIcon}><Ionicons name="flask-outline" size={18} color="#8A5A00" /></View>
              <View style={styles.previewCopy}><Text style={styles.previewTitle}>Administrator credentials</Text><Text style={styles.previewDetail}>Username <Text style={styles.previewStrong}>GGMAdminAman</Text> · Password <Text style={styles.previewStrong}>GGM2026</Text></Text></View>
            </View>
          </View>

          <View style={styles.footerTrust}>
            <Ionicons name="lock-closed-outline" size={15} color="#5B7461" />
            <Text style={styles.footerTrustText}>Access is limited to approved Ghar Ghar Mart administrators.</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, padding: 16, paddingBottom: 30 },
  shell: { width: "100%", maxWidth: 680, alignSelf: "center", gap: 14 },
  brandBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingTop: 4 },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 39, height: 39, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FDE68A" },
  brandName: { color: "#173C25", fontSize: 16, fontWeight: "800" },
  brandTag: { color: "#718278", fontSize: 9, fontWeight: "800", letterSpacing: 1.15, marginTop: 2 },
  secureBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#D9E9D8", borderRadius: 99, backgroundColor: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 7 },
  secureBadgeText: { color: "#28723B", fontSize: 11, fontWeight: "800" },
  heroCard: { overflow: "hidden", borderRadius: 27, backgroundColor: "#14532D", padding: 22 },
  heroOrbLarge: { position: "absolute", width: 235, height: 235, borderRadius: 118, backgroundColor: "#28723B", right: -80, top: -124 },
  heroOrbSmall: { position: "absolute", width: 124, height: 124, borderRadius: 62, backgroundColor: "#FDE68A", right: 33, bottom: -79, opacity: 0.16 },
  heroEyebrow: { flexDirection: "row", alignItems: "center", gap: 7 },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FDE68A" },
  heroEyebrowText: { color: "#DDF6E8", fontSize: 10, fontWeight: "800", letterSpacing: 1.45 },
  heroTitle: { color: "#FFFFFF", fontSize: 28, lineHeight: 34, fontWeight: "800", marginTop: 18, maxWidth: 370 },
  heroSubtitle: { color: "#DDF6E8", fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 470 },
  heroSignals: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 20 },
  heroSignal: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroSignalText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  heroSignalDivider: { width: 1, height: 13, backgroundColor: "#4B9360" },
  signInCard: { backgroundColor: "#FFFFFF", borderRadius: 25, padding: 20, borderWidth: 1, borderColor: "#E4EDE2" },
  formHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  formKicker: { color: "#28723B", fontSize: 10, fontWeight: "800", letterSpacing: 1.35 },
  formTitle: { color: "#173C25", fontSize: 23, fontWeight: "800", marginTop: 4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 5 },
  stepActive: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#28723B" },
  stepInactive: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#DBE7D9" },
  stepLine: { width: 21, height: 2, borderRadius: 1, backgroundColor: "#DBE7D9" },
  stepLineActive: { backgroundColor: "#28723B" },
  formSubtitle: { color: "#718278", fontSize: 13, lineHeight: 19, marginTop: 8 },
  fieldGroup: { marginTop: 20 },
  fieldLabel: { color: "#284231", fontSize: 12, fontWeight: "800", marginBottom: 8 },
  inputShell: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#D8E6D7", borderRadius: 15, backgroundColor: "#F8FBF7", paddingHorizontal: 12, height: 56 },
  countryCode: { paddingRight: 10, borderRightWidth: 1, borderRightColor: "#D8E6D7" },
  countryCodeText: { color: "#173C25", fontSize: 14, fontWeight: "800" },
  textInput: { flex: 1, color: "#173C25", fontSize: 14, fontWeight: "600", minWidth: 0 },
  otpShell: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#D8E6D7", borderRadius: 15, backgroundColor: "#F8FBF7", paddingHorizontal: 12, height: 58 },
  otpIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  otpInput: { flex: 1, color: "#173C25", fontSize: 22, fontWeight: "800", letterSpacing: 8, minWidth: 0 },
  codeLength: { borderRadius: 9, backgroundColor: "#E7F5E8", paddingHorizontal: 8, paddingVertical: 5 },
  codeLengthText: { color: "#28723B", fontSize: 10, fontWeight: "800" },
  codeHint: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  codeHintText: { color: "#6F816F", fontSize: 11 },
  primaryButton: { marginTop: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 15, backgroundColor: "#FDE68A", paddingVertical: 15, minHeight: 52 },
  primaryButtonText: { color: "#14532D", fontSize: 14, fontWeight: "800" },
  secondaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, paddingVertical: 11 },
  secondaryButtonText: { color: "#28723B", fontSize: 13, fontWeight: "800" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 20 },
  divider: { flex: 1, height: 1, backgroundColor: "#E8EFE7" },
  dividerText: { color: "#8A9A8D", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  previewCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 15, backgroundColor: "#FFF9E4", padding: 12, marginTop: 13 },
  previewIcon: { width: 33, height: 33, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0B3" },
  previewCopy: { flex: 1 },
  previewTitle: { color: "#5F4A10", fontSize: 12, fontWeight: "800" },
  previewDetail: { color: "#7A651E", fontSize: 10, marginTop: 3 },
  previewStrong: { color: "#5F4A10", fontWeight: "800" },
  footerTrust: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingBottom: 5 },
  footerTrustText: { color: "#718278", fontSize: 11, textAlign: "center" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});
