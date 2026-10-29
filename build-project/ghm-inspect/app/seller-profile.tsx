import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];
type ShopHours = { openingTime: string; closingTime: string; openDays: Day[] };

function parseHours(value: unknown): ShopHours {
  const fallback: ShopHours = { openingTime: "09:00", closingTime: "21:00", openDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<ShopHours>;
  return {
    openingTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate.openingTime ?? "") ? candidate.openingTime! : fallback.openingTime,
    closingTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate.closingTime ?? "") ? candidate.closingTime! : fallback.closingTime,
    openDays: Array.isArray(candidate.openDays) && candidate.openDays.length ? candidate.openDays.filter((day): day is Day => DAYS.includes(day as Day)) : fallback.openDays,
  };
}

export default function SellerProfileScreen() {
  const utils = trpc.useUtils();
  const profileQuery = trpc.seller.profile.get.useQuery();
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState<ShopHours>(parseHours(null));
  const update = trpc.seller.profile.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.seller.profile.get.invalidate(), utils.user.getProfile.invalidate()]);
      Alert.alert("Shop profile saved", "Your shop details and operating hours have been updated.");
    },
  });

  useEffect(() => {
    const profile = profileQuery.data as { shopName?: string | null; shopDescription?: string | null; address?: string | null; shopHours?: unknown } | undefined;
    if (!profile) return;
    setShopName(profile.shopName ?? "");
    setDescription(profile.shopDescription ?? "");
    setAddress(profile.address ?? "");
    setHours(parseHours(profile.shopHours));
  }, [profileQuery.data]);

  const toggleDay = (day: Day) => setHours((current) => ({ ...current, openDays: current.openDays.includes(day) ? current.openDays.filter((item) => item !== day) : [...current.openDays, day] }));
  const save = async () => {
    if (shopName.trim().length < 2) return Alert.alert("Add a shop name", "Enter a name with at least two characters.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.openingTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.closingTime)) return Alert.alert("Check operating hours", "Use 24-hour time, for example 09:00 and 21:00.");
    if (hours.openingTime >= hours.closingTime) return Alert.alert("Check operating hours", "Closing time must be after opening time.");
    if (!hours.openDays.length) return Alert.alert("Choose open days", "Select at least one trading day.");
    try {
      await update.mutateAsync({ shopName: shopName.trim(), shopDescription: description.trim() || null, address: address.trim() || null, shopHours: hours });
    } catch (error) {
      Alert.alert("Could not save profile", error instanceof Error ? error.message : "Please try again.");
    }
  };

  if (profileQuery.isLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#2E7D32" /></ScreenContainer>;
  return <ScreenContainer className="bg-[#F6FAF4]" containerClassName="bg-[#F6FAF4]"><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.hero}><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={20} color="#FDE68A" /><Text style={styles.backText}>Seller workspace</Text></Pressable><Text style={styles.eyebrow}>SHOP PROFILE</Text><Text style={styles.title}>Make your storefront clear</Text><Text style={styles.heroCopy}>Keep your shop details and opening hours accurate for smooth operations.</Text></View><View style={styles.note}><Ionicons name="shield-checkmark-outline" size={21} color="#2E7D32" /><Text style={styles.noteText}>These details do not change your Aadhaar verification or seller approval status.</Text></View><View style={styles.card}><Text style={styles.sectionTitle}>Shop details</Text><Text style={styles.label}>Shop name</Text><TextInput value={shopName} onChangeText={setShopName} placeholder="Your shop name" placeholderTextColor="#96A398" style={styles.input} maxLength={255} /><Text style={styles.label}>About your shop</Text><TextInput value={description} onChangeText={setDescription} placeholder="What do you specialise in?" placeholderTextColor="#96A398" style={[styles.input, styles.multiline]} multiline textAlignVertical="top" maxLength={1000} /><Text style={styles.label}>Shop address</Text><TextInput value={address} onChangeText={setAddress} placeholder="Street, area and city" placeholderTextColor="#96A398" style={[styles.input, styles.multiline]} multiline textAlignVertical="top" maxLength={1000} /></View><View style={styles.card}><View style={styles.sectionHead}><View><Text style={styles.sectionTitle}>Operating hours</Text><Text style={styles.helper}>Use 24-hour time</Text></View><Ionicons name="time-outline" size={23} color="#2E7D32" /></View><View style={styles.timeRow}><View style={styles.timeField}><Text style={styles.label}>Opens</Text><TextInput value={hours.openingTime} onChangeText={(value) => setHours((current) => ({ ...current, openingTime: value }))} placeholder="09:00" placeholderTextColor="#96A398" style={styles.input} keyboardType="numbers-and-punctuation" maxLength={5} /></View><View style={styles.timeField}><Text style={styles.label}>Closes</Text><TextInput value={hours.closingTime} onChangeText={(value) => setHours((current) => ({ ...current, closingTime: value }))} placeholder="21:00" placeholderTextColor="#96A398" style={styles.input} keyboardType="numbers-and-punctuation" maxLength={5} /></View></View><Text style={styles.label}>Open days</Text><View style={styles.dayWrap}>{DAYS.map((day) => { const selected = hours.openDays.includes(day); return <Pressable key={day} onPress={() => toggleDay(day)} style={({ pressed }) => [styles.day, selected && styles.daySelected, pressed && styles.pressed]}><Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text></Pressable>; })}</View></View><Pressable onPress={() => void save()} disabled={update.isPending} style={({ pressed }) => [styles.save, (pressed || update.isPending) && styles.pressed]}>{update.isPending ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="checkmark-circle-outline" size={21} color="#FFFFFF" /><Text style={styles.saveText}>Save shop profile</Text></>}</Pressable></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { paddingBottom: 38 }, hero: { backgroundColor: "#14532D", padding: 18, paddingBottom: 24 }, back: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6 }, backText: { color: "#FDE68A", fontSize: 12, fontWeight: "800" }, eyebrow: { color: "#BBF7D0", fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginTop: 20 }, title: { color: "#FFFFFF", fontSize: 26, lineHeight: 32, fontWeight: "800", marginTop: 5 }, heroCopy: { color: "#DCFCE7", fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 340 }, note: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 16, borderRadius: 18, backgroundColor: "#E8F5E9", padding: 13 }, noteText: { color: "#34553B", fontSize: 11, lineHeight: 16, flex: 1, fontWeight: "600" }, card: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "#FFFFFF", padding: 17 }, sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, sectionTitle: { color: "#173C25", fontSize: 17, fontWeight: "800" }, helper: { color: "#7B8B80", fontSize: 11, marginTop: 3, fontWeight: "600" }, label: { color: "#4F6254", fontSize: 11, fontWeight: "800", marginTop: 16, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.55 }, input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "#FBFDF9", color: "#173C25", fontSize: 14, fontWeight: "600", paddingHorizontal: 13, paddingVertical: 11 }, multiline: { minHeight: 82 }, timeRow: { flexDirection: "row", gap: 10 }, timeField: { flex: 1 }, dayWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, day: { minWidth: 48, alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#DCE9D9", backgroundColor: "#FBFDF9", paddingVertical: 10, paddingHorizontal: 8 }, daySelected: { borderColor: "#2E7D32", backgroundColor: "#E8F5E9" }, dayText: { color: "#68776D", fontSize: 11, fontWeight: "800" }, dayTextSelected: { color: "#1F6B37" }, save: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 18, borderRadius: 17, minHeight: 54, backgroundColor: "#2E7D32" }, saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
