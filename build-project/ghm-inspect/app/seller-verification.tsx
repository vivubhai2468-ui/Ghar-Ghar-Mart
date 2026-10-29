import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

type DocumentType = "aadhaar_card" | "address_proof" | "business_license";

type PickedDocument = {
  uri: string;
  base64?: string | null;
};

async function readDocumentBase64(asset: PickedDocument) {
  if (Platform.OS !== "web") {
    return FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  }
  if (asset.base64) return asset.base64;

  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error("The selected document could not be read. Please choose it again.");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected document could not be encoded."));
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("The selected document could not be encoded."));
        return;
      }
      resolve(result.split(",")[1] ?? result);
    };
    reader.readAsDataURL(blob);
  });
}

const DOCUMENTS: { type: DocumentType; title: string; detail: string; icon: "card-outline" | "home-outline" | "document-text-outline" }[] = [
  { type: "aadhaar_card", title: "Aadhaar document", detail: "Upload a clear Aadhaar card image or PDF for admin review.", icon: "card-outline" },
  { type: "address_proof", title: "Address proof", detail: "Utility bill, bank statement or other valid address evidence.", icon: "home-outline" },
  { type: "business_license", title: "Business licence", detail: "Optional business registration or licence document.", icon: "document-text-outline" },
];

export default function SellerVerificationScreen() {
  const utils = trpc.useUtils();
  const documentsQuery = trpc.seller.documents.list.useQuery();
  const uploadDocument = trpc.seller.documents.upload.useMutation({ onSuccess: () => void utils.seller.documents.list.invalidate() });
  const [uploading, setUploading] = useState<DocumentType | null>(null);

  const pickDocument = async (documentType: DocumentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert("Document too large", "Choose a file smaller than 5 MB.");
        return;
      }
      const mimeType = asset.mimeType === "application/pdf" || asset.mimeType === "image/png" ? asset.mimeType : "image/jpeg";
      setUploading(documentType);
      const contentBase64 = await readDocumentBase64(asset);
      await uploadDocument.mutateAsync({ documentType, originalName: asset.name, mimeType, contentBase64 });
      Alert.alert("Document submitted", "Your document is queued for administrator review.");
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setUploading(null);
    }
  };

  const records = (documentsQuery.data ?? []) as Array<{ documentType: DocumentType; status: "pending" | "approved" | "rejected"; reviewerNote?: string | null }>;
  return (
    <ScreenContainer className="bg-[#F6FAF4]" containerClassName="bg-[#F6FAF4]">
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36 }}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}><Text className="text-sm font-bold text-[#2E7D32]">‹ Seller workspace</Text></Pressable>
        <View className="mt-5 rounded-[28px] bg-[#14532D] p-6">
          <Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Verification centre</Text>
          <Text className="mt-2 text-3xl font-extrabold text-white">Complete your review</Text>
          <Text className="mt-2 text-sm leading-5 text-[#DCFCE7]">Upload clear documents. Only authorized administrators can review protected submissions.</Text>
        </View>

        <View className="mt-5 rounded-3xl border border-[#DCE9D9] bg-white p-4">
          <View className="flex-row items-center"><Ionicons name="shield-checkmark-outline" size={23} color="#2E7D32" /><Text className="ml-2 text-base font-extrabold text-[#173C25]">Privacy first</Text></View>
          <Text className="mt-2 text-sm leading-5 text-[#68776D]">Files are kept in protected storage. Aadhaar references in the database are masked and hashed; the full number is never saved there.</Text>
        </View>

        <Text className="mt-6 text-lg font-extrabold text-[#173C25]">Verification checklist</Text>
        {DOCUMENTS.map((item) => {
          const latest = records.find((record) => record.documentType === item.type);
          const pending = uploading === item.type;
          const status = latest?.status ?? "not submitted";
          const color = status === "approved" ? "#166534" : status === "rejected" ? "#B91C1C" : status === "pending" ? "#A16207" : "#68776D";
          return <View key={item.type} className="mt-3 rounded-3xl border border-[#DCE9D9] bg-white p-4"><View className="flex-row"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F5E9]"><Ionicons name={item.icon} size={23} color="#2E7D32" /></View><View className="ml-3 flex-1"><Text className="text-base font-extrabold text-[#173C25]">{item.title}</Text><Text className="mt-1 text-sm leading-5 text-[#68776D]">{item.detail}</Text><Text style={{ color }} className="mt-2 text-xs font-extrabold uppercase tracking-wide">{status}</Text></View></View><Pressable disabled={pending} onPress={() => pickDocument(item.type)} style={({ pressed }) => ({ marginTop: 14, alignItems: "center", borderRadius: 15, backgroundColor: "#2E7D32", paddingVertical: 12, opacity: pressed || pending ? 0.6 : 1 })}>{pending ? <ActivityIndicator color="white" /> : <Text className="font-extrabold text-white">{latest ? "Replace document" : "Upload document"}</Text>}</Pressable>{latest?.reviewerNote ? <Text className="mt-3 text-xs leading-4 text-[#68776D]">Admin note: {latest.reviewerNote}</Text> : null}</View>;
        })}

        <Pressable onPress={() => router.push("/seller-payout" as never)} style={({ pressed }) => ({ marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 22, backgroundColor: "#FFF7D6", padding: 17, opacity: pressed ? 0.7 : 1 })}><View><Text className="text-base font-extrabold text-[#173C25]">Payout setup</Text><Text className="mt-1 text-sm text-[#68776D]">Configure your bank details after approval.</Text></View><Ionicons name="chevron-forward" size={22} color="#A16207" /></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
