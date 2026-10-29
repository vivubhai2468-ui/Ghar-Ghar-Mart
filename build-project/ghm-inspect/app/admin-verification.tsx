import { router } from "expo-router";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenContainer } from "@/components/screen-container";
import { useAdminAuth } from "@/lib/admin-auth-context";
import { trpc } from "@/lib/trpc";

type ReviewDocument = { id: number; sellerId: number; documentType: string; originalName: string; fileUrl: string; status: string; createdAt: Date };
type ReviewPayout = { sellerId: number; accountHolderName: string; accountNumberLast4: string; ifscCode: string; bankName?: string | null; status: string };
type ReviewProduct = { id: number; sellerId: number; name: string; price: string | number; stock: number; images?: string[] | null };
type PendingSeller = { id: number; name?: string | null; phone?: string | null; shopName?: string | null; shopStatus?: string | null; aadhaarLast4?: string | null; createdAt?: Date | string | null };

export default function AdminVerificationScreen() {
  const { adminUser } = useAdminAuth();
  const utils = trpc.useUtils();
  const liveReviewOptions = { enabled: Boolean(adminUser), refetchInterval: 15_000, refetchOnWindowFocus: true };
  const pendingSellersQuery = trpc.admin.sellers.pending.useQuery(undefined, liveReviewOptions);
  const docsQuery = trpc.admin.verification.documents.useQuery(undefined, liveReviewOptions);
  const payoutsQuery = trpc.admin.verification.payouts.useQuery(undefined, liveReviewOptions);
  const productsQuery = trpc.admin.verification.products.useQuery(undefined, liveReviewOptions);
  const reviewDocument = trpc.admin.verification.reviewDocument.useMutation({ onSuccess: () => void utils.admin.verification.documents.invalidate() });
  const reviewPayout = trpc.admin.verification.reviewPayout.useMutation({ onSuccess: () => void utils.admin.verification.payouts.invalidate() });
  const reviewProduct = trpc.admin.verification.reviewProduct.useMutation({ onSuccess: () => void utils.admin.verification.products.invalidate() });
  const approveSeller = trpc.admin.sellers.approve.useMutation({ onSuccess: () => void Promise.all([utils.admin.sellers.pending.invalidate(), utils.admin.sellers.list.invalidate()]) });
  const rejectSeller = trpc.admin.sellers.reject.useMutation({ onSuccess: () => void Promise.all([utils.admin.sellers.pending.invalidate(), utils.admin.sellers.list.invalidate()]) });
  const pendingSellers = (pendingSellersQuery.data ?? []) as PendingSeller[];
  const docs = (docsQuery.data ?? []) as ReviewDocument[];
  const payouts = (payoutsQuery.data ?? []) as ReviewPayout[];
  const products = (productsQuery.data ?? []) as ReviewProduct[];
  const loading = pendingSellersQuery.isLoading || docsQuery.isLoading || payoutsQuery.isLoading || productsQuery.isLoading;

  if (!adminUser) {
    return (
      <ScreenContainer className="items-center justify-center bg-[#F6FAF4] px-6" containerClassName="bg-[#F6FAF4]">
        <View className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F5E9]">
            <Ionicons name="lock-closed" size={26} color="#2E7D32" />
          </View>
          <Text className="mt-5 text-2xl font-extrabold text-[#173C25]">Admin sign-in required</Text>
          <Text className="mt-2 text-sm leading-5 text-[#68776D]">Seller verification is available only to authorized administrators.</Text>
          <Pressable onPress={() => router.replace("/admin-login")} style={({ pressed }) => ({ marginTop: 22, alignItems: "center", borderRadius: 14, backgroundColor: "#2E7D32", paddingVertical: 13, opacity: pressed ? 0.8 : 1 })}>
            <Text className="font-extrabold text-white">Go to admin login</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const ReviewActions = ({ onApprove, onReject, pending }: { onApprove: () => void; onReject: () => void; pending: boolean }) => <View className="mt-4 flex-row gap-2"><Pressable disabled={pending} onPress={onApprove} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 14, backgroundColor: "#2E7D32", paddingVertical: 11, opacity: pressed || pending ? 0.6 : 1 })}><Text className="font-extrabold text-white">Approve</Text></Pressable><Pressable disabled={pending} onPress={onReject} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 14, backgroundColor: "#FEE2E2", paddingVertical: 11, opacity: pressed || pending ? 0.6 : 1 })}><Text className="font-extrabold text-[#B91C1C]">Reject</Text></Pressable></View>;

  return <ScreenContainer className="bg-[#F6FAF4]" containerClassName="bg-[#F6FAF4]"><ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
    <Pressable onPress={() => router.back()} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}><Text className="text-sm font-bold text-[#2E7D32]">‹ Control Center</Text></Pressable>
    <View className="mt-5 rounded-[28px] bg-[#14532D] p-6"><Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Seller review desk</Text><Text className="mt-2 text-3xl font-extrabold text-white">Verification checklist</Text><Text className="mt-2 text-sm leading-5 text-[#DCFCE7]">Review protected documents, masked payout profiles and product submissions before publishing.</Text></View>
    {loading ? <ActivityIndicator className="mt-8" color="#2E7D32" /> : null}
    <Text className="mt-6 text-lg font-extrabold text-[#173C25]">Seller applications · {pendingSellers.length}</Text>
    {pendingSellers.length === 0 ? <Text className="mt-2 text-sm text-[#68776D]">No pending seller applications. New verified seller sign-ups appear here automatically.</Text> : pendingSellers.map((seller) => <View key={seller.id} className="mt-3 rounded-3xl border border-[#F1D899] bg-[#FFFDF4] p-4"><View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><Text className="text-base font-extrabold text-[#173C25]">{seller.shopName || seller.name || `Seller #${seller.id}`}</Text><Text className="mt-1 text-sm text-[#68776D]">{seller.name || "Unnamed applicant"} · {seller.phone || "No mobile number"}</Text><Text className="mt-1 text-xs font-semibold text-[#8A5A00]">Aadhaar ending •••• {seller.aadhaarLast4 || "—"}</Text></View><Text className="rounded-full bg-[#FFF1B8] px-3 py-1 text-xs font-extrabold uppercase text-[#8A5A00]">PENDING</Text></View><ReviewActions pending={approveSeller.isPending || rejectSeller.isPending} onApprove={() => approveSeller.mutate(seller.id)} onReject={() => rejectSeller.mutate(seller.id)} /></View>)}
    <Text className="mt-6 text-lg font-extrabold text-[#173C25]">Documents · {docs.length}</Text>
    {docs.length === 0 ? <Text className="mt-2 text-sm text-[#68776D]">No documents need review.</Text> : docs.map((item) => <View key={item.id} className="mt-3 rounded-3xl border border-[#DCE9D9] bg-white p-4"><Text className="text-base font-extrabold text-[#173C25]">Seller #{item.sellerId} · {item.documentType.replace(/_/g, " ")}</Text><Text className="mt-1 text-sm text-[#68776D]">{item.originalName}</Text><Pressable onPress={() => void Linking.openURL(item.fileUrl)} style={({ pressed }) => ({ marginTop: 12, alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}><Text className="text-sm font-bold text-[#2E7D32]">Open protected document</Text></Pressable><ReviewActions pending={reviewDocument.isPending} onApprove={() => reviewDocument.mutate({ documentId: item.id, status: "approved" })} onReject={() => reviewDocument.mutate({ documentId: item.id, status: "rejected" })} /></View>)}
    <Text className="mt-7 text-lg font-extrabold text-[#173C25]">Payout profiles · {payouts.length}</Text>
    {payouts.length === 0 ? <Text className="mt-2 text-sm text-[#68776D]">No payout profiles need review.</Text> : payouts.map((item) => <View key={item.sellerId} className="mt-3 rounded-3xl border border-[#DCE9D9] bg-white p-4"><Text className="text-base font-extrabold text-[#173C25]">Seller #{item.sellerId} · {item.accountHolderName}</Text><Text className="mt-1 text-sm text-[#68776D]">Account •••• {item.accountNumberLast4} · {item.ifscCode}{item.bankName ? ` · ${item.bankName}` : ""}</Text><Text className="mt-2 text-xs text-[#68776D]">Full account numbers are not retained in this dashboard.</Text><ReviewActions pending={reviewPayout.isPending} onApprove={() => reviewPayout.mutate({ sellerId: item.sellerId, status: "verified" })} onReject={() => reviewPayout.mutate({ sellerId: item.sellerId, status: "rejected" })} /></View>)}
    <Text className="mt-7 text-lg font-extrabold text-[#173C25]">Product submissions · {products.length}</Text>
    {products.length === 0 ? <Text className="mt-2 text-sm text-[#68776D]">No products are waiting for moderation.</Text> : products.map((item) => <View key={item.id} className="mt-3 rounded-3xl border border-[#DCE9D9] bg-white p-4"><View className="flex-row items-start"><View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F5E9]"><Ionicons name="cube-outline" size={22} color="#2E7D32" /></View><View className="ml-3 flex-1"><Text className="text-base font-extrabold text-[#173C25]">{item.name}</Text><Text className="mt-1 text-sm text-[#68776D]">Seller #{item.sellerId} · ₹{item.price} · Stock {item.stock}</Text><Text className="mt-1 text-xs text-[#68776D]">{item.images?.length ? `${item.images.length} submitted image${item.images.length > 1 ? "s" : ""}` : "No image submitted"}</Text></View></View><ReviewActions pending={reviewProduct.isPending} onApprove={() => reviewProduct.mutate({ productId: item.id, status: "approved" })} onReject={() => reviewProduct.mutate({ productId: item.id, status: "rejected" })} /></View>)}
  </ScrollView></ScreenContainer>;
}
