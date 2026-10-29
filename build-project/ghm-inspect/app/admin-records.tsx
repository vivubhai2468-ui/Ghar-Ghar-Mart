import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAdminAuth } from "@/lib/admin-auth-context";
import { getUserFacingError } from "@/lib/user-facing-error";
import { trpc } from "@/lib/trpc";

type Customer = { id: number; name?: string | null; email?: string | null; phone?: string | null; address?: string | null; isActive?: boolean | null; createdAt?: Date | string | null };
type Seller = Customer & { shopName?: string | null; shopDescription?: string | null; shopStatus?: "pending" | "approved" | "rejected" | null; aadhaarLast4?: string | null };

export default function AdminRecordsScreen() {
  const { adminUser } = useAdminAuth();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"customers" | "sellers">("customers");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ kind: "customer" | "seller"; data: Customer | Seller } | null>(null);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", address: "", shopName: "", shopDescription: "", isActive: true, shopStatus: "pending" as "pending" | "approved" | "rejected" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [identityVerified, setIdentityVerified] = useState(false);

  const liveRecordOptions = { enabled: Boolean(adminUser), refetchInterval: 15_000, refetchOnWindowFocus: true };
  const customersQuery = trpc.admin.users.list.useQuery({ search, limit: 100 }, liveRecordOptions);
  const sellersQuery = trpc.admin.sellers.list.useQuery({ search, limit: 100 }, liveRecordOptions);
  const updateCustomer = trpc.admin.users.update.useMutation({ onSuccess: async () => { await utils.admin.users.list.invalidate(); setSelected(null); } });
  const resetCustomerPassword = trpc.admin.users.resetPassword.useMutation({
    onSuccess: async () => {
      await utils.admin.users.list.invalidate();
      setNewPassword("");
      setConfirmNewPassword("");
      setIdentityVerified(false);
      Alert.alert("Password reset", "The customer password has been changed. Share the new password with the verified customer through a private channel.");
    },
    onError: (error) => Alert.alert("Password reset failed", getUserFacingError(error, "The customer's password could not be changed. Please try again.")),
  });
  const updateSeller = trpc.admin.sellers.update.useMutation({ onSuccess: async () => { await utils.admin.sellers.list.invalidate(); setSelected(null); } });
  const approveSeller = trpc.admin.sellers.approve.useMutation({ onSuccess: () => void utils.admin.sellers.list.invalidate() });
  const rejectSeller = trpc.admin.sellers.reject.useMutation({ onSuccess: () => void utils.admin.sellers.list.invalidate() });

  const records = useMemo(() => (tab === "customers" ? customersQuery.data ?? [] : sellersQuery.data ?? []) as Array<Customer | Seller>, [tab, customersQuery.data, sellersQuery.data]);
  const loading = customersQuery.isLoading || sellersQuery.isLoading;

  useEffect(() => {
    if (!selected) return;
    setNewPassword("");
    setConfirmNewPassword("");
    setIdentityVerified(false);
    const record = selected.data as Seller;
    setDraft({
      name: record.name || "",
      email: record.email || "",
      phone: record.phone || "",
      address: record.address || "",
      shopName: record.shopName || "",
      shopDescription: record.shopDescription || "",
      isActive: record.isActive !== false,
      shopStatus: record.shopStatus || "pending",
    });
  }, [selected]);

  if (!adminUser) {
    router.replace("/admin-login");
    return null;
  }

  const openRecord = (kind: "customer" | "seller", data: Customer | Seller) => setSelected({ kind, data });
  const saveRecord = () => {
    if (!selected || draft.name.trim().length < 2) {
      Alert.alert("Check record", "A name with at least two characters is required.");
      return;
    }
    if (selected.kind === "customer") {
      updateCustomer.mutate({ id: selected.data.id, name: draft.name.trim(), email: draft.email.trim() || null, phone: draft.phone.trim(), address: draft.address.trim() || null, isActive: draft.isActive });
    } else {
      updateSeller.mutate({ id: selected.data.id, name: draft.name.trim(), email: draft.email.trim() || null, phone: draft.phone.trim(), address: draft.address.trim() || null, shopName: draft.shopName.trim() || null, shopDescription: draft.shopDescription.trim() || null, shopStatus: draft.shopStatus, isActive: draft.isActive });
    }
  };

  const confirmCustomerPasswordReset = () => {
    if (!selected || selected.kind !== "customer") return;
    if (!identityVerified) {
      Alert.alert("Verify the customer first", "Confirm that you independently verified this customer's identity before resetting their password.");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      Alert.alert("Check the new password", "Use a password between 8 and 128 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Passwords do not match", "Enter the same password in both password fields.");
      return;
    }
    Alert.alert(
      "Reset this customer's password?",
      `This changes the password for ${selected.data.phone || selected.data.name || "this customer"} without deleting account or order data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset password",
          style: "destructive",
          onPress: () => resetCustomerPassword.mutate({
            customerId: selected.data.id,
            password: newPassword,
            identityVerified: true,
          }),
        },
      ],
    );
  };

  const refresh = () => {
    void customersQuery.refetch();
    void sellersQuery.refetch();
  };

  return (
    <ScreenContainer className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]">
      <View className="bg-[#14532D] px-5 py-5">
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text className="text-sm font-bold text-[#FDE68A]">‹ Admin panel</Text>
        </Pressable>
        <View className="mt-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Live database</Text>
            <Text className="mt-1 text-[28px] font-extrabold text-white">People records</Text>
            <Text className="mt-1 text-sm leading-5 text-[#DCFCE7]">Every verified OTP sign-up is stored here automatically and can be safely revised.</Text>
          </View>
          <View className="ml-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE68A]">
            <Ionicons name="people" size={25} color="#14532D" />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={customersQuery.isRefetching || sellersQuery.isRefetching} onRefresh={refresh} tintColor="#2E7D32" />}>
        <View className="flex-row rounded-2xl bg-[#E6F1E5] p-1">
          {(["customers", "sellers"] as const).map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 13, backgroundColor: tab === item ? "#FFFFFF" : "transparent", paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <Text className={`text-sm font-extrabold ${tab === item ? "text-[#173C25]" : "text-[#68776D]"}`}>{item === "customers" ? "Customers" : "Sellers"}</Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-4 flex-row items-center rounded-2xl border border-[#DCE9D9] bg-white px-4">
          <Ionicons name="search" size={18} color="#68776D" />
          <TextInput value={search} onChangeText={setSearch} placeholder={`Search ${tab} by name, phone or email`} placeholderTextColor="#9AA79E" className="flex-1 py-4 pl-3 text-sm text-[#173C25]" />
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-extrabold text-[#173C25]">{tab === "customers" ? "Customer database" : "Seller database"}</Text>
            <Text className="mt-1 text-sm text-[#68776D]">{records.length} record{records.length === 1 ? "" : "s"} shown · refreshes automatically</Text>
          </View>
          {loading ? <ActivityIndicator color="#2E7D32" /> : null}
        </View>

        {records.length === 0 && !loading ? (
          <View className="mt-5 items-center rounded-3xl border border-dashed border-[#B9D9B8] bg-white px-6 py-10">
            <Ionicons name="people-circle-outline" size={36} color="#2E7D32" />
            <Text className="mt-3 text-base font-extrabold text-[#173C25]">No matching records</Text>
            <Text className="mt-1 text-center text-sm leading-5 text-[#68776D]">New verified registrations appear automatically. Try clearing the search filter.</Text>
          </View>
        ) : null}

        {records.map((record) => {
          const seller = record as Seller;
          const active = record.isActive !== false;
          return (
            <View key={record.id} className="mt-4 rounded-3xl border border-[#DCE9D9] bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-lg font-extrabold text-[#173C25]">{record.name || "Unnamed record"}</Text>
                  <Text className="mt-1 text-sm text-[#68776D]">{record.phone || "No mobile number"}</Text>
                  {tab === "sellers" ? <Text className="mt-1 text-sm font-semibold text-[#2E7D32]">{seller.shopName || "Shop name not added"}</Text> : null}
                </View>
                <View className={`rounded-full px-3 py-1 ${active ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"}`}>
                  <Text className={`text-xs font-bold ${active ? "text-[#166534]" : "text-[#B91C1C]"}`}>{active ? "ACTIVE" : "INACTIVE"}</Text>
                </View>
              </View>

              {tab === "sellers" ? (
                <View className="mt-3 rounded-2xl bg-[#F6FAF4] px-3 py-2">
                  <View className="flex-row items-center justify-between"><Text className="text-xs font-semibold text-[#68776D]">Approval</Text><Text className="text-xs font-extrabold uppercase text-[#173C25]">{seller.shopStatus || "pending"}</Text></View>
                  <Text className="mt-1 text-xs font-semibold text-[#58705E]">Aadhaar reference: •••• {seller.aadhaarLast4 || "not submitted"}</Text>
                </View>
              ) : null}

              <View className="mt-4 flex-row gap-3">
                <Pressable onPress={() => openRecord(tab === "customers" ? "customer" : "seller", record)} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: "#2E7D32", paddingVertical: 11, opacity: pressed ? 0.65 : 1 })}>
                  <Text className="text-sm font-extrabold text-[#2E7D32]">View & edit</Text>
                </Pressable>
                {tab === "sellers" && seller.shopStatus === "pending" ? (
                  <Pressable onPress={() => approveSeller.mutate(seller.id)} style={({ pressed }) => ({ alignItems: "center", borderRadius: 14, backgroundColor: "#2E7D32", paddingHorizontal: 16, paddingVertical: 11, opacity: pressed ? 0.65 : 1 })}>
                    <Text className="text-sm font-extrabold text-white">Approve</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View className="flex-1 justify-end bg-black/45">
          <View className="max-h-[88%] rounded-t-[32px] bg-white p-5">
            <View className="h-1.5 w-12 self-center rounded-full bg-[#DCE9D9]" />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="mt-5 text-xl font-extrabold text-[#173C25]">Revise {selected?.kind === "seller" ? "seller" : "customer"} record</Text>
              <Text className="mt-1 text-sm text-[#68776D]">Changes are saved to the live database and recorded in the audit log.</Text>
              {([ ["Name", "name", false], ["Email", "email", false], ["Mobile", "phone", false], ["Address", "address", true] ] as const).map(([label, key, multiline]) => (
                <View key={key} className="mt-4">
                  <Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">{label}</Text>
                  <TextInput value={draft[key]} onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))} multiline={multiline} placeholderTextColor="#9AA79E" className={`mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25] ${multiline ? "min-h-[86px]" : ""}`} />
                </View>
              ))}
              {selected?.kind === "seller" ? (
                <>
                  <View className="mt-4">
                    <Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Shop name</Text>
                    <TextInput value={draft.shopName} onChangeText={(value) => setDraft((current) => ({ ...current, shopName: value }))} className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" />
                  </View>
                  <View className="mt-4">
                    <Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Approval status</Text>
                    <View className="mt-2 flex-row gap-2">{(["pending", "approved", "rejected"] as const).map((status) => <Pressable key={status} onPress={() => setDraft((current) => ({ ...current, shopStatus: status }))} style={({ pressed }) => ({ flex: 1, alignItems: "center", borderRadius: 12, backgroundColor: draft.shopStatus === status ? "#2E7D32" : "#F1F6EF", paddingVertical: 10, opacity: pressed ? 0.65 : 1 })}><Text className={`text-xs font-extrabold capitalize ${draft.shopStatus === status ? "text-white" : "text-[#58705E]"}`}>{status}</Text></Pressable>)}</View>
                  </View>
                </>
              ) : null}
              <Pressable onPress={() => setDraft((current) => ({ ...current, isActive: !current.isActive }))} style={({ pressed }) => ({ marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, backgroundColor: draft.isActive ? "#DCFCE7" : "#FEE2E2", padding: 14, opacity: pressed ? 0.65 : 1 })}>
                <Text className="text-sm font-extrabold text-[#173C25]">Account is {draft.isActive ? "active" : "inactive"}</Text>
                <Ionicons name={draft.isActive ? "checkmark-circle" : "close-circle"} size={22} color={draft.isActive ? "#166534" : "#B91C1C"} />
              </Pressable>
              {selected?.kind === "customer" ? (
                <View className="mt-6 rounded-2xl border border-[#F2D7A2] bg-[#FFFBEB] p-4">
                  <Text className="text-base font-extrabold text-[#713F12]">Admin-assisted password recovery</Text>
                  <Text className="mt-1 text-sm leading-5 text-[#854D0E]">Verify the customer’s identity using your approved process before continuing. Date of birth or phone-number knowledge alone is not sufficient. The new password will not be included in the audit log.</Text>
                  <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-[#68776D]">New password</Text>
                  <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" editable={!resetCustomerPassword.isPending} placeholder="At least 8 characters" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-white px-4 py-3 text-base text-[#173C25]" />
                  <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-[#68776D]">Confirm new password</Text>
                  <TextInput value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry autoComplete="new-password" editable={!resetCustomerPassword.isPending} placeholder="Enter the password again" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-white px-4 py-3 text-base text-[#173C25]" />
                  <Pressable onPress={() => setIdentityVerified((verified) => !verified)} disabled={resetCustomerPassword.isPending} style={({ pressed }) => ({ marginTop: 16, flexDirection: "row", alignItems: "center", opacity: pressed ? 0.65 : 1 })}>
                    <Ionicons name={identityVerified ? "checkbox" : "square-outline"} size={22} color="#2E7D32" />
                    <Text className="ml-2 flex-1 text-sm font-semibold leading-5 text-[#173C25]">I have independently verified this customer’s identity.</Text>
                  </Pressable>
                  <Pressable onPress={confirmCustomerPasswordReset} disabled={resetCustomerPassword.isPending} style={({ pressed }) => ({ marginTop: 16, alignItems: "center", borderRadius: 14, backgroundColor: "#9A3412", paddingVertical: 13, opacity: pressed || resetCustomerPassword.isPending ? 0.65 : 1 })}>
                    {resetCustomerPassword.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-sm font-extrabold text-white">Reset customer password</Text>}
                  </Pressable>
                </View>
              ) : null}
              <Pressable onPress={saveRecord} disabled={updateCustomer.isPending || updateSeller.isPending} style={({ pressed }) => ({ marginTop: 20, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 16, opacity: pressed || updateCustomer.isPending || updateSeller.isPending ? 0.65 : 1 })}>
                <Text className="text-base font-extrabold text-white">Save live record</Text>
              </Pressable>
              {selected?.kind === "seller" && draft.shopStatus === "pending" ? <Pressable onPress={() => rejectSeller.mutate(selected.data.id)} style={({ pressed }) => ({ marginTop: 12, alignItems: "center", paddingVertical: 12, opacity: pressed ? 0.65 : 1 })}><Text className="text-sm font-bold text-[#B91C1C]">Reject seller application</Text></Pressable> : null}
              <Pressable onPress={() => setSelected(null)} style={({ pressed }) => ({ marginTop: 8, alignItems: "center", paddingVertical: 12, opacity: pressed ? 0.65 : 1 })}><Text className="text-sm font-bold text-[#68776D]">Cancel</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
