import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { ScreenContainer } from '@/components/screen-container';
import { getUserFacingError } from '@/lib/user-facing-error';
import { useAdminAuth } from "@/lib/admin-auth-context";
import { trpc } from "@/lib/trpc";

type ActionType = "none" | "coupon" | "category" | "url";

type Draft = {
  title: string;
  description: string;
  badgeText: string;
  couponCode: string;
  imageUrl: string;
  backgroundColor: string;
  actionType: ActionType;
  actionValue: string;
  priority: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

const emptyDraft = (): Draft => ({
  title: "",
  description: "",
  badgeText: "",
  couponCode: "",
  imageUrl: "",
  backgroundColor: "#FFF7D1",
  actionType: "coupon",
  actionValue: "",
  priority: "0",
  isActive: true,
  startsAt: "",
  endsAt: "",
});

const toDateText = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const nullable = (value: string) => value.trim() || null;

export default function AdminBannersScreen() {
  const router = useRouter();
  const { adminUser } = useAdminAuth();
  const utils = trpc.useUtils();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const listQuery = trpc.admin.banners.list.useQuery(undefined, { enabled: Boolean(adminUser), refetchInterval: 20_000 });
  const reset = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };
  const invalidate = () => Promise.all([utils.admin.banners.list.invalidate(), utils.banners.list.invalidate()]);
  const createBanner = trpc.admin.banners.create.useMutation({ onSuccess: async () => { await invalidate(); reset(); Alert.alert("Banner added", "The Home offer banner is now saved."); } });
  const updateBanner = trpc.admin.banners.update.useMutation({ onSuccess: async () => { await invalidate(); reset(); Alert.alert("Banner updated", "The Home offer banner has been updated."); } });
  const removeBanner = trpc.admin.banners.remove.useMutation({ onSuccess: () => void invalidate() });

  const busy = createBanner.isPending || updateBanner.isPending;
  const formTitle = editingId ? "Edit Home offer" : "Create Home offer";
  const hasItems = useMemo(() => (listQuery.data ?? []).length > 0, [listQuery.data]);

  const edit = (banner: any) => {
    setEditingId(banner.id);
    setDraft({
      title: banner.title,
      description: banner.description,
      badgeText: banner.badgeText || "",
      couponCode: banner.couponCode || "",
      imageUrl: banner.imageUrl || "",
      backgroundColor: banner.backgroundColor || "#FFF7D1",
      actionType: banner.actionType,
      actionValue: banner.actionValue || "",
      priority: String(banner.priority ?? 0),
      isActive: Boolean(banner.isActive),
      startsAt: toDateText(banner.startsAt),
      endsAt: toDateText(banner.endsAt),
    });
  };

  const submit = async () => {
    if (draft.title.trim().length < 2 || draft.description.trim().length < 2) {
      Alert.alert("Add offer copy", "A title and short description are required.");
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(draft.backgroundColor)) {
      Alert.alert("Check the colour", "Use a six-digit hex colour, for example #FFF7D1.");
      return;
    }
    const startsAt = draft.startsAt ? new Date(draft.startsAt) : null;
    const endsAt = draft.endsAt ? new Date(draft.endsAt) : null;
    if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime())) || (startsAt && endsAt && endsAt <= startsAt)) {
      Alert.alert("Check the schedule", "Use YYYY-MM-DD dates, with an end date after the start date.");
      return;
    }
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      badgeText: nullable(draft.badgeText),
      couponCode: nullable(draft.couponCode),
      imageUrl: nullable(draft.imageUrl),
      backgroundColor: draft.backgroundColor,
      actionType: draft.actionType,
      actionValue: nullable(draft.actionValue) || nullable(draft.couponCode),
      priority: Math.max(0, Number.parseInt(draft.priority, 10) || 0),
      isActive: draft.isActive,
      startsAt,
      endsAt,
    };
    if (draft.actionType === "url") {
      try {
        const actionUrl = new URL(draft.actionValue.trim());
        if (actionUrl.protocol !== "https:" && actionUrl.protocol !== "http:") throw new Error("Unsupported URL scheme");
      } catch {
        Alert.alert("Check the offer link", "Enter a complete HTTP or HTTPS URL for this banner action.");
        return;
      }
    }
    if (draft.actionType === "category" && !draft.actionValue.trim()) {
      Alert.alert("Choose a category", "Enter the category name or ID this banner should open.");
      return;
    }
    try {
      if (editingId) await updateBanner.mutateAsync({ id: editingId, ...payload });
      else await createBanner.mutateAsync(payload);
    } catch (error) {
      Alert.alert("Banner was not saved", getUserFacingError(error, "Please check the banner details and try again."));
    }
  };

  if (!adminUser) {
    return <ScreenContainer className="items-center justify-center bg-[#F4F8F0] px-6" containerClassName="bg-[#F4F8F0]"><Text style={styles.gateTitle}>Administrator sign-in required</Text><Pressable onPress={() => router.replace("/admin-login")} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Go to admin login</Text></Pressable></ScreenContainer>;
  }

  return (
    <ScreenContainer className="bg-[#F4F8F0]" containerClassName="bg-[#F4F8F0]">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={20} color="#14532D" /></Pressable>
          <View style={styles.headerCopy}><Text style={styles.kicker}>HOME MERCHANDISING</Text><Text style={styles.title}>Offer banners</Text><Text style={styles.subtitle}>Create, schedule, publish, and update the promotions customers see on Home.</Text></View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeading}><View><Text style={styles.formTitle}>{formTitle}</Text><Text style={styles.formHint}>Image URLs are optional. A branded colour card is used when no image is supplied.</Text></View>{editingId ? <Pressable onPress={reset}><Text style={styles.cancelLabel}>Cancel edit</Text></Pressable> : null}</View>
          <Field label="Offer title" value={draft.title} onChangeText={(title) => setDraft((value) => ({ ...value, title }))} placeholder="Fresh groceries delivered" />
          <Field label="Description" value={draft.description} onChangeText={(description) => setDraft((value) => ({ ...value, description }))} placeholder="Save on everyday essentials" multiline />
          <View style={styles.twoColumn}><View style={styles.grow}><Field label="Badge" value={draft.badgeText} onChangeText={(badgeText) => setDraft((value) => ({ ...value, badgeText }))} placeholder="30% OFF" /></View><View style={styles.grow}><Field label="Coupon code" value={draft.couponCode} onChangeText={(couponCode) => setDraft((value) => ({ ...value, couponCode }))} placeholder="FRESH30" autoCapitalize="characters" /></View></View>
          <Field label="Banner image URL (optional)" value={draft.imageUrl} onChangeText={(imageUrl) => setDraft((value) => ({ ...value, imageUrl }))} placeholder="https://…" autoCapitalize="none" keyboardType="url" />
          <View style={styles.twoColumn}><View style={styles.grow}><Field label="Fallback colour" value={draft.backgroundColor} onChangeText={(backgroundColor) => setDraft((value) => ({ ...value, backgroundColor }))} placeholder="#FFF7D1" autoCapitalize="characters" /></View><View style={styles.grow}><Field label="Display priority" value={draft.priority} onChangeText={(priority) => setDraft((value) => ({ ...value, priority }))} placeholder="0" keyboardType="number-pad" /></View></View>
          <Text style={styles.fieldLabel}>When tapped, open</Text>
          <View style={styles.actionRow}>{(["coupon", "category", "url", "none"] as ActionType[]).map((type) => <Pressable key={type} onPress={() => setDraft((value) => ({ ...value, actionType: type }))} style={[styles.actionChip, draft.actionType === type && styles.actionChipSelected]}><Text style={[styles.actionChipText, draft.actionType === type && styles.actionChipTextSelected]}>{type}</Text></Pressable>)}</View>
          {draft.actionType !== "none" ? <Field label="Action value" value={draft.actionValue} onChangeText={(actionValue) => setDraft((value) => ({ ...value, actionValue }))} placeholder={draft.actionType === "url" ? "https://…" : draft.actionType === "category" ? "Vegetables" : "Coupon code"} /> : null}
          <View style={styles.twoColumn}><View style={styles.grow}><Field label="Starts (YYYY-MM-DD)" value={draft.startsAt} onChangeText={(startsAt) => setDraft((value) => ({ ...value, startsAt }))} placeholder="2026-08-20" /></View><View style={styles.grow}><Field label="Ends (YYYY-MM-DD)" value={draft.endsAt} onChangeText={(endsAt) => setDraft((value) => ({ ...value, endsAt }))} placeholder="2026-08-31" /></View></View>
          <View style={styles.activeRow}><View><Text style={styles.activeTitle}>Banner is live</Text><Text style={styles.activeHint}>Turn off to save it as a draft.</Text></View><Switch value={draft.isActive} onValueChange={(isActive) => setDraft((value) => ({ ...value, isActive }))} trackColor={{ false: "#D9E4D8", true: "#7CC489" }} thumbColor={draft.isActive ? "#28723B" : "#FFFFFF"} /></View>
          <Pressable onPress={() => void submit()} disabled={busy} style={[styles.primaryButton, busy && styles.disabled]}><Text style={styles.primaryButtonText}>{busy ? "Saving…" : editingId ? "Save banner changes" : "Publish Home banner"}</Text><Ionicons name="arrow-forward" size={18} color="#14532D" /></Pressable>
        </View>

        <View style={styles.listHeading}><View><Text style={styles.listTitle}>Saved banners</Text><Text style={styles.listHint}>{hasItems ? "Edit content, visibility, timing, and priority." : "Your saved Home offers will appear here."}</Text></View><Text style={styles.count}>{listQuery.data?.length ?? 0}</Text></View>
        {listQuery.isLoading ? <Text style={styles.emptyText}>Loading banners…</Text> : null}
        {(listQuery.data ?? []).map((banner: any) => <View key={banner.id} style={styles.bannerCard}>
          <View style={[styles.bannerPreview, { backgroundColor: banner.backgroundColor || "#FFF7D1" }]}>{banner.imageUrl ? <Text style={styles.imageMarker}>IMAGE</Text> : <Ionicons name="sparkles" size={24} color="#8A5A00" />}</View>
          <View style={styles.bannerCopy}><View style={styles.bannerTitleRow}><Text style={styles.bannerTitle} numberOfLines={1}>{banner.title}</Text><View style={[styles.statusPill, banner.isActive ? styles.livePill : styles.draftPill]}><Text style={[styles.statusText, banner.isActive ? styles.liveText : styles.draftText]}>{banner.isActive ? "Live" : "Draft"}</Text></View></View><Text style={styles.bannerDescription} numberOfLines={2}>{banner.description}</Text><Text style={styles.bannerMeta}>Priority {banner.priority} · {banner.endsAt ? `Ends ${toDateText(banner.endsAt)}` : "No end date"}</Text><View style={styles.bannerActions}><Pressable onPress={() => edit(banner)} style={styles.editButton}><Ionicons name="pencil-outline" size={16} color="#14532D" /><Text style={styles.editText}>Edit</Text></Pressable><Pressable onPress={() => Alert.alert("Remove banner", `Permanently remove “${banner.title}”?`, [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => removeBanner.mutate({ id: banner.id }) }])} style={styles.removeButton}><Ionicons name="trash-outline" size={16} color="#B42318" /></Pressable></View></View>
        </View>)}
      </ScrollView>
    </ScreenContainer>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; autoCapitalize?: "none" | "sentences" | "words" | "characters"; keyboardType?: "default" | "number-pad" | "url" }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{props.label}</Text><TextInput value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder} placeholderTextColor="#9AA99C" multiline={props.multiline} autoCapitalize={props.autoCapitalize} keyboardType={props.keyboardType} style={[styles.input, props.multiline && styles.textarea]} /></View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 2 },
  backButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  headerCopy: { flex: 1 }, kicker: { color: "#28723B", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }, title: { color: "#173C25", fontSize: 28, fontWeight: "800", marginTop: 3 }, subtitle: { color: "#718278", fontSize: 13, lineHeight: 19, marginTop: 5 },
  formCard: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 16, borderWidth: 1, borderColor: "#E5EEE3", gap: 12 }, formHeading: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, formTitle: { color: "#173C25", fontSize: 17, fontWeight: "800" }, formHint: { color: "#718278", fontSize: 11, lineHeight: 16, marginTop: 4, maxWidth: 260 }, cancelLabel: { color: "#28723B", fontSize: 12, fontWeight: "800", paddingVertical: 4 },
  field: { gap: 6 }, fieldLabel: { color: "#405747", fontSize: 11, fontWeight: "800" }, input: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: "#DCE7DB", paddingHorizontal: 12, color: "#173C25", fontSize: 13, backgroundColor: "#FCFEFC" }, textarea: { minHeight: 76, textAlignVertical: "top", paddingTop: 10 }, twoColumn: { flexDirection: "row", gap: 10 }, grow: { flex: 1 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, actionChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#DCE7DB" }, actionChipSelected: { borderColor: "#28723B", backgroundColor: "#E7F5E8" }, actionChipText: { textTransform: "capitalize", color: "#718278", fontSize: 11, fontWeight: "800" }, actionChipTextSelected: { color: "#14532D" },
  activeRow: { borderRadius: 13, padding: 12, backgroundColor: "#F4F8F0", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, activeTitle: { color: "#173C25", fontSize: 13, fontWeight: "800" }, activeHint: { color: "#718278", fontSize: 10, marginTop: 2 },
  primaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: "#FDE68A", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 }, primaryButtonText: { color: "#14532D", fontSize: 13, fontWeight: "800" }, disabled: { opacity: 0.65 }, gateTitle: { color: "#173C25", fontSize: 20, fontWeight: "800", marginBottom: 16 },
  listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }, listTitle: { color: "#173C25", fontSize: 18, fontWeight: "800" }, listHint: { color: "#718278", fontSize: 11, marginTop: 3 }, count: { color: "#28723B", backgroundColor: "#E7F5E8", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, fontSize: 12, fontWeight: "800" }, emptyText: { color: "#718278", fontSize: 13, textAlign: "center", paddingVertical: 22 },
  bannerCard: { backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E5EEE3", padding: 12, flexDirection: "row", gap: 12 }, bannerPreview: { width: 68, minHeight: 90, borderRadius: 14, alignItems: "center", justifyContent: "center" }, imageMarker: { color: "#8A5A00", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, bannerCopy: { flex: 1, minWidth: 0 }, bannerTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 }, bannerTitle: { flex: 1, color: "#173C25", fontSize: 13, fontWeight: "800" }, statusPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 }, livePill: { backgroundColor: "#DDF6E8" }, draftPill: { backgroundColor: "#FDE7E7" }, statusText: { fontSize: 9, fontWeight: "800" }, liveText: { color: "#167044" }, draftText: { color: "#B42318" }, bannerDescription: { color: "#718278", fontSize: 11, lineHeight: 15, marginTop: 4 }, bannerMeta: { color: "#8A9A8D", fontSize: 10, marginTop: 6 }, bannerActions: { flexDirection: "row", gap: 8, marginTop: 9 }, editButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#E7F5E8", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 }, editText: { color: "#14532D", fontSize: 10, fontWeight: "800" }, removeButton: { backgroundColor: "#FDE7E7", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 },
});
