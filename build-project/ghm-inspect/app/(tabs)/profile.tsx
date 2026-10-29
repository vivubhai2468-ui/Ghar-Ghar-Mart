import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc';

const WHATSAPP_SUPPORT_URL = 'https://wa.me/message/CP543HR63BK4E1';
const SUPPORT_PHONE_URL = 'tel:+917856091971';

function AccountRow({ icon, label, detail, onPress, tone = '#2E7D32' }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail: string; onPress: () => void; tone?: string }) {
  return <TouchableOpacity onPress={onPress} style={styles.accountRow}><View style={[styles.rowIcon, { backgroundColor: `${tone}14` }]}><Ionicons name={icon} size={20} color={tone} /></View><View style={styles.rowCopy}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowDetail}>{detail}</Text></View><Ionicons name="chevron-forward" size={19} color="#90A092" /></TouchableOpacity>;
}

export default function ProfileScreen() {
  const { user, userRole, logout } = useAuth();
  const utils = trpc.useUtils();
  const signedIn = Boolean(user && userRole !== 'guest');
  const profileQuery = trpc.user.getProfile.useQuery(undefined, { enabled: signedIn });
  const ordersQuery = trpc.orders.list.useQuery(undefined, { enabled: signedIn });
  const wishlistQuery = trpc.wishlist.list.useQuery(undefined, { enabled: signedIn });
  const addressQuery = trpc.addresses.list.useQuery(undefined, { enabled: signedIn });
  const updateProfile = trpc.user.updateProfile.useMutation({ onSuccess: async () => { await utils.user.getProfile.invalidate(); setEditorOpen(false); Alert.alert('Profile updated', 'Your account details have been saved.'); } });
  const [editorOpen, setEditorOpen] = useState(false);
  const [contactNotice, setContactNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const profile = (profileQuery.data ?? user) as any;
  const profileName = profile?.name ?? '';
  const profileEmail = profile?.email ?? '';
  const orders = useMemo(() => (ordersQuery.data ?? []) as any[], [ordersQuery.data]);
  const wishlist = (wishlistQuery.data ?? []) as any[];
  const addresses = (addressQuery.data ?? []) as any[];
  const totalSpent = useMemo(() => orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0), [orders]);

  useEffect(() => { setName(profileName); setEmail(profileEmail); }, [profileName, profileEmail]);

  const confirmLogout = () => Alert.alert('Log out?', 'You can sign back in using your verified mobile number anytime.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } }]);
  const saveProfile = () => { if (!name.trim()) { Alert.alert('Name required', 'Add a display name before saving your profile.'); return; } updateProfile.mutate({ name: name.trim(), email: email.trim() || undefined }); };
  const openWhatsAppSupport = async () => {
    try {
      const supported = await Linking.canOpenURL(WHATSAPP_SUPPORT_URL);
      if (!supported) {
        setContactNotice('WhatsApp is not available on this device. Use Help & Support for email or a support ticket.');
        return;
      }
      setContactNotice(null);
      await Linking.openURL(WHATSAPP_SUPPORT_URL);
    } catch {
      setContactNotice('WhatsApp could not be opened. Use Help & Support for email or a support ticket.');
    }
  };
  const callSupport = async () => {
    try {
      const supported = await Linking.canOpenURL(SUPPORT_PHONE_URL);
      if (!supported) {
        setContactNotice('Phone calling is not available on this device. Use Help & Support or dial +91 78560 91971 manually.');
        return;
      }
      setContactNotice(null);
      await Linking.openURL(SUPPORT_PHONE_URL);
    } catch {
      setContactNotice('The phone dialer could not be opened. Use Help & Support or dial +91 78560 91971 manually.');
    }
  };

  if (!signedIn) return <ScreenContainer className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]"><View style={styles.guestWrap}><View style={styles.guestIcon}><Ionicons name="person-outline" size={38} color="#2E7D32" /></View><Text style={styles.guestTitle}>Your Ghar Ghar profile</Text><Text style={styles.guestCopy}>Sign in to save delivery pins, track groceries, build a wishlist, and unlock quick reorders.</Text><TouchableOpacity onPress={() => router.push('/login')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Sign in to continue</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push('/register')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Create an account</Text></TouchableOpacity></View></ScreenContainer>;

  const defaultAddress = addresses.find((address) => address.isDefault);
  return <ScreenContainer className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]"><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <View style={styles.hero}><View style={styles.heroTop}><View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.name || 'G').trim().slice(0, 1).toUpperCase()}</Text></View><View style={styles.heroCopy}><Text style={styles.eyebrow}>MY ACCOUNT</Text><Text numberOfLines={1} style={styles.userName}>{profile?.name || 'Grocery shopper'}</Text><Text numberOfLines={1} style={styles.userPhone}>{profile?.phone || 'Verified member'}</Text></View><TouchableOpacity onPress={() => setEditorOpen(true)} style={styles.editButton}><Ionicons name="pencil" size={17} color="#14532D" /></TouchableOpacity></View><View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{orders.length}</Text><Text style={styles.statLabel}>Orders</Text></View><View style={styles.statDivider} /><View style={styles.stat}><Text style={styles.statValue}>₹{Math.round(totalSpent)}</Text><Text style={styles.statLabel}>Spent</Text></View><View style={styles.statDivider} /><View style={styles.stat}><Text style={styles.statValue}>{wishlist.length}</Text><Text style={styles.statLabel}>Saved</Text></View></View></View>

    <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Shopping shortcuts</Text><Text style={styles.sectionNote}>Quick access</Text></View><View style={styles.shortcuts}><TouchableOpacity onPress={() => router.push('/orders' as any)} style={styles.shortcut}><View style={[styles.shortcutIcon, { backgroundColor: '#E8F5E9' }]}><Ionicons name="receipt-outline" size={22} color="#2E7D32" /></View><Text style={styles.shortcutLabel}>My orders</Text><Text style={styles.shortcutMeta}>{orders.length ? `${orders.length} tracked` : 'No orders yet'}</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push('/wishlist' as any)} style={styles.shortcut}><View style={[styles.shortcutIcon, { backgroundColor: '#FFF1F2' }]}><Ionicons name="heart-outline" size={22} color="#E11D48" /></View><Text style={styles.shortcutLabel}>Wishlist</Text><Text style={styles.shortcutMeta}>{wishlist.length ? `${wishlist.length} saved` : 'Start saving'}</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push('/my-addresses' as any)} style={styles.shortcut}><View style={[styles.shortcutIcon, { backgroundColor: '#FFF8E1' }]}><Ionicons name="location-outline" size={22} color="#B45309" /></View><Text style={styles.shortcutLabel}>Addresses</Text><Text numberOfLines={1} style={styles.shortcutMeta}>{defaultAddress ? 'Default ready' : 'Add a pin'}</Text></TouchableOpacity></View></View>

    <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Account & delivery</Text><Text style={styles.sectionNote}>Manage details</Text></View><View style={styles.card}><AccountRow icon="location-outline" label="Saved delivery addresses" detail={defaultAddress ? `${defaultAddress.label} is your default` : 'Add home, work, or a pinned location'} onPress={() => router.push('/my-addresses' as any)} /><View style={styles.divider} /><AccountRow icon="wallet-outline" label="Wallet & refunds" detail="Balance, cashback, and payment activity" onPress={() => router.push('/wallet' as any)} /><View style={styles.divider} /><AccountRow icon="notifications-outline" label="Delivery notifications" detail="Order updates and nearby rider alerts" onPress={() => router.push('/notifications' as any)} /></View></View>

    <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Help & trust</Text><Text style={styles.sectionNote}>Support when needed</Text></View>{contactNotice ? <View style={styles.contactNotice}><Ionicons name="information-circle-outline" size={19} color="#2E7D32" /><Text style={styles.contactNoticeText}>{contactNotice}</Text><TouchableOpacity onPress={() => router.push('/help-support' as any)}><Text style={styles.contactNoticeLink}>Help & Support</Text></TouchableOpacity></View> : null}<View style={styles.card}><AccountRow icon="call-outline" label="Call Help & Support" detail="+91 78560 91971 · Tap to call" onPress={() => void callSupport()} tone="#2563EB" /><View style={styles.divider} /><AccountRow icon="logo-whatsapp" label="Chat on WhatsApp" detail="Quick help with orders, payments, and delivery" onPress={() => void openWhatsAppSupport()} tone="#25D366" /><View style={styles.divider} /><AccountRow icon="help-circle-outline" label="Help & support" detail="Orders, payments, and delivery help" onPress={() => router.push('/help-support' as any)} /><View style={styles.divider} /><AccountRow icon="shield-checkmark-outline" label="Privacy & security" detail="Manage your account data and policies" onPress={() => router.push('/privacy-policy' as any)} /><View style={styles.divider} /><AccountRow icon="document-text-outline" label="Terms & conditions" detail="Read the Ghar Ghar Mart terms" onPress={() => router.push('/terms-conditions' as any)} /></View></View>

    <TouchableOpacity onPress={confirmLogout} style={styles.logout}><Ionicons name="log-out-outline" size={20} color="#BE123C" /><Text style={styles.logoutText}>Log out securely</Text></TouchableOpacity><Text style={styles.version}>Ghar Ghar Mart · Fresh at every doorstep</Text>
  </ScrollView>
  <Modal visible={editorOpen} transparent animationType="slide" onRequestClose={() => setEditorOpen(false)}><View style={styles.modalBack}><View style={styles.modalSheet}><View style={styles.modalHead}><View><Text style={styles.modalTitle}>Edit profile</Text><Text style={styles.modalSubtitle}>Keep your delivery account up to date.</Text></View><TouchableOpacity onPress={() => setEditorOpen(false)} style={styles.close}><Ionicons name="close" size={20} color="#173C25" /></TouchableOpacity></View><Text style={styles.fieldLabel}>Display name</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#9BA99E" style={styles.field} /><Text style={styles.fieldLabel}>Email address</Text><TextInput value={email} onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor="#9BA99E" keyboardType="email-address" autoCapitalize="none" style={styles.field} /><View style={styles.fixedPhone}><Ionicons name="phone-portrait-outline" size={18} color="#2E7D32" /><View><Text style={styles.fixedPhoneLabel}>Verified mobile number</Text><Text style={styles.fixedPhoneValue}>{profile?.phone || 'Not available'}</Text></View></View><TouchableOpacity onPress={saveProfile} disabled={updateProfile.isPending} style={[styles.primaryButton, updateProfile.isPending && styles.pendingButton]}>{updateProfile.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save profile changes</Text>}</TouchableOpacity></View></View></Modal>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 42 }, contactNotice: { marginBottom: 10, borderRadius: 15, borderWidth: 1, borderColor: '#CDE6CE', backgroundColor: '#F0F9F0', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }, contactNoticeText: { flex: 1, color: '#386143', fontSize: 11, fontWeight: '700', lineHeight: 16 }, contactNoticeLink: { color: '#2E7D32', fontSize: 11, fontWeight: '900' }, hero: { backgroundColor: '#14532D', padding: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }, heroTop: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 60, height: 60, borderRadius: 21, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 26, fontWeight: '900', color: '#14532D' }, heroCopy: { flex: 1, marginLeft: 13 }, eyebrow: { color: '#BBF7D0', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, userName: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 3 }, userPhone: { color: '#DCFCE7', fontSize: 12, fontWeight: '700', marginTop: 3 }, editButton: { width: 39, height: 39, borderRadius: 14, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' }, stats: { marginTop: 19, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', padding: 14, flexDirection: 'row', alignItems: 'center' }, stat: { flex: 1, alignItems: 'center' }, statValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' }, statLabel: { color: '#BBF7D0', fontSize: 10, fontWeight: '800', marginTop: 3 }, statDivider: { height: 28, width: 1, backgroundColor: 'rgba(255,255,255,0.24)' }, section: { paddingHorizontal: 16, marginTop: 22 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }, sectionTitle: { color: '#173C25', fontSize: 16, fontWeight: '900' }, sectionNote: { color: '#768B79', fontSize: 11, fontWeight: '700' }, shortcuts: { flexDirection: 'row', gap: 9 }, shortcut: { flex: 1, backgroundColor: '#FFFFFF', borderColor: '#E2EDE0', borderWidth: 1, borderRadius: 18, padding: 11 }, shortcutIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, shortcutLabel: { marginTop: 10, color: '#173C25', fontSize: 12, fontWeight: '900' }, shortcutMeta: { marginTop: 3, color: '#718174', fontSize: 10, fontWeight: '700' }, card: { overflow: 'hidden', borderRadius: 19, borderColor: '#E2EDE0', borderWidth: 1, backgroundColor: '#FFFFFF' }, accountRow: { minHeight: 73, alignItems: 'center', flexDirection: 'row', paddingHorizontal: 14 }, rowIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, marginLeft: 12 }, rowLabel: { color: '#173C25', fontSize: 13, fontWeight: '900' }, rowDetail: { color: '#748378', fontSize: 10, fontWeight: '600', marginTop: 3 }, divider: { height: 1, backgroundColor: '#EDF3EC', marginLeft: 65 }, logout: { marginHorizontal: 16, marginTop: 26, minHeight: 52, borderRadius: 17, backgroundColor: '#FFF1F2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, logoutText: { color: '#BE123C', fontWeight: '900', fontSize: 14 }, version: { textAlign: 'center', color: '#93A394', fontSize: 11, fontWeight: '700', marginTop: 20 }, guestWrap: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' }, guestIcon: { width: 78, height: 78, borderRadius: 28, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }, guestTitle: { marginTop: 18, color: '#173C25', fontSize: 23, fontWeight: '900' }, guestCopy: { marginTop: 9, color: '#6D7E70', fontSize: 14, textAlign: 'center', lineHeight: 21 }, primaryButton: { marginTop: 22, width: '100%', borderRadius: 16, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', minHeight: 53 }, pendingButton: { opacity: 0.65 }, primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, secondaryButton: { marginTop: 10, width: '100%', borderRadius: 16, borderWidth: 1.5, borderColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', minHeight: 50 }, secondaryButtonText: { color: '#2E7D32', fontSize: 14, fontWeight: '900' }, modalBack: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,29,17,0.45)' }, modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#F8FCF7', padding: 21 }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, modalTitle: { color: '#173C25', fontSize: 21, fontWeight: '900' }, modalSubtitle: { marginTop: 4, color: '#768B79', fontSize: 12, fontWeight: '600' }, close: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#EAF3E8', justifyContent: 'center', alignItems: 'center' }, fieldLabel: { marginBottom: 6, color: '#405A47', fontSize: 12, fontWeight: '900' }, field: { borderWidth: 1, borderColor: '#DCE9D9', borderRadius: 14, backgroundColor: '#FFFFFF', paddingHorizontal: 13, minHeight: 48, marginBottom: 14, color: '#173C25', fontSize: 14 }, fixedPhone: { marginTop: 2, borderRadius: 14, backgroundColor: '#EAF3E8', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, fixedPhoneLabel: { color: '#54705B', fontSize: 10, fontWeight: '900' }, fixedPhoneValue: { marginTop: 2, color: '#173C25', fontSize: 13, fontWeight: '800' },
});
