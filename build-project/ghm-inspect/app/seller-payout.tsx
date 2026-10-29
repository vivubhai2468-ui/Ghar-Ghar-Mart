import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

export default function SellerPayoutScreen() {
  const utils = trpc.useUtils();
  const profileQuery = trpc.user.getProfile.useQuery();
  const payoutQuery = trpc.seller.payout.get.useQuery();
  const savePayout = trpc.seller.payout.save.useMutation({ onSuccess: () => void utils.seller.payout.get.invalidate() });
  const existing = payoutQuery.data;
  const approved = profileQuery.data?.shopStatus === "approved" && profileQuery.data?.isActive !== false;
  const [holder, setHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");

  const submit = async () => {
    if (!holder.trim() || !accountNumber || !ifsc) { Alert.alert("Complete payout details", "Enter the account holder name, bank account number and IFSC code."); return; }
    try {
      await savePayout.mutateAsync({ accountHolderName: holder, accountNumber, ifscCode: ifsc, bankName: bankName || undefined });
      Alert.alert("Payout profile submitted", "Your masked bank details are pending administrator verification.");
      setAccountNumber("");
    } catch (error) { Alert.alert("Could not save payout profile", error instanceof Error ? error.message : "Please try again."); }
  };

  return <ScreenContainer className="bg-[#F6FAF4]" containerClassName="bg-[#F6FAF4]"><ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36 }}>
    <Pressable onPress={() => router.back()} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}><Text className="text-sm font-bold text-[#2E7D32]">‹ Seller workspace</Text></Pressable>
    <View className="mt-5 rounded-[28px] bg-[#14532D] p-6"><Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Payout profile</Text><Text className="mt-2 text-3xl font-extrabold text-white">Get ready for payouts</Text><Text className="mt-2 text-sm leading-5 text-[#DCFCE7]">Bank details are masked and hashed before they are saved for review.</Text></View>
    {!approved ? <View className="mt-5 rounded-3xl border border-[#F8D988] bg-[#FFFBEA] p-5"><Ionicons name="time-outline" size={28} color="#A16207" /><Text className="mt-3 text-lg font-extrabold text-[#173C25]">Available after approval</Text><Text className="mt-1 text-sm leading-5 text-[#68776D]">An administrator must approve your seller account before payout setup can be submitted.</Text></View> : <>
      {existing ? <View className="mt-5 rounded-3xl border border-[#DCE9D9] bg-white p-4"><Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Current payout reference</Text><Text className="mt-2 text-lg font-extrabold text-[#173C25]">{existing.accountHolderName}</Text><Text className="mt-1 text-sm text-[#68776D]">Account •••• {existing.accountNumberLast4} · {existing.ifscCode}</Text><Text className="mt-3 text-xs font-extrabold uppercase tracking-wide text-[#A16207]">{existing.status}</Text>{existing.reviewerNote ? <Text className="mt-2 text-xs text-[#68776D]">Admin note: {existing.reviewerNote}</Text> : null}</View> : null}
      <View className="mt-5 rounded-3xl border border-[#DCE9D9] bg-white p-5"><Text className="text-lg font-extrabold text-[#173C25]">{existing ? "Update payout profile" : "Add payout profile"}</Text><Text className="mt-1 text-sm leading-5 text-[#68776D]">Payout verification is a setup record only. Transfers require a separately configured payment provider.</Text>
        <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Account holder name</Text><TextInput value={holder} onChangeText={setHolder} placeholder="As shown on bank account" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" />
        <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-[#68776D]">Bank account number</Text><TextInput value={accountNumber} onChangeText={(value) => setAccountNumber(value.replace(/\D/g, "").slice(0, 18))} keyboardType="number-pad" textContentType="none" autoComplete="off" placeholder="Enter account number" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" />
        <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-[#68776D]">IFSC code</Text><TextInput value={ifsc} onChangeText={(value) => setIfsc(value.toUpperCase().slice(0, 11))} autoCapitalize="characters" placeholder="ABCD0123456" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" />
        <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-[#68776D]">Bank name (optional)</Text><TextInput value={bankName} onChangeText={setBankName} placeholder="Your bank name" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" />
        <Pressable onPress={submit} disabled={savePayout.isPending} style={({ pressed }) => ({ marginTop: 22, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 15, opacity: pressed || savePayout.isPending ? 0.65 : 1 })}>{savePayout.isPending ? <ActivityIndicator color="white" /> : <Text className="text-base font-extrabold text-white">Submit for verification</Text>}</Pressable>
      </View>
    </>}
  </ScrollView></ScreenContainer>;
}
