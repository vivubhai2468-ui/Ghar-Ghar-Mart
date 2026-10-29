import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc';

type AddressRecord = {
  id: number;
  label: string;
  recipientName?: string | null;
  phone?: string | null;
  addressLine: string;
  apartment?: string | null;
  floor?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  deliveryInstructions?: string | null;
  latitude: number | string;
  longitude: number | string;
  isDefault: boolean;
};

type AddressForm = {
  label: string; recipientName: string; phone: string; addressLine: string; apartment: string; floor: string;
  landmark: string; city: string; state: string; pincode: string; deliveryInstructions: string; latitude: string; longitude: string;
};

const EMPTY_FORM: AddressForm = { label: 'Home', recipientName: '', phone: '', addressLine: '', apartment: '', floor: '', landmark: '', city: '', state: '', pincode: '', deliveryInstructions: '', latitude: '', longitude: '' };

export default function MyAddressesScreen() {
  const { user, userRole } = useAuth();
  const utils = trpc.useUtils();
  const listQuery = trpc.addresses.list.useQuery(undefined, { enabled: Boolean(user && userRole !== 'guest') });
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<AddressRecord | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);

  const invalidate = async () => { await utils.addresses.list.invalidate(); };
  const createMutation = trpc.addresses.create.useMutation({ onSuccess: async () => { await invalidate(); setEditorVisible(false); } });
  const updateMutation = trpc.addresses.update.useMutation({ onSuccess: async () => { await invalidate(); setEditorVisible(false); } });
  const deleteMutation = trpc.addresses.delete.useMutation({ onSuccess: invalidate });
  const defaultMutation = trpc.addresses.setDefault.useMutation({ onSuccess: invalidate });
  const addresses = useMemo(() => (listQuery.data ?? []) as AddressRecord[], [listQuery.data]);

  useEffect(() => {
    if (!editorVisible) return;
    setForm(editing ? {
      label: editing.label, recipientName: editing.recipientName ?? '', phone: editing.phone ?? '', addressLine: editing.addressLine,
      apartment: editing.apartment ?? '', floor: editing.floor ?? '', landmark: editing.landmark ?? '', city: editing.city ?? '', state: editing.state ?? '', pincode: editing.pincode ?? '',
      deliveryInstructions: editing.deliveryInstructions ?? '', latitude: String(editing.latitude), longitude: String(editing.longitude),
    } : { ...EMPTY_FORM, recipientName: user?.name ?? '', phone: user?.phone ?? '' });
  }, [editorVisible, editing, user?.name, user?.phone]);

  const updateField = (field: keyof AddressForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const captureLocation = async () => {
    if (Platform.OS === 'web') { Alert.alert('Use the mobile app', 'Current-location pinning is available on iOS and Android.'); return; }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') { Alert.alert('Location permission needed', 'Allow location access to save this delivery address precisely.'); return; }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    updateField('latitude', current.coords.latitude.toFixed(7));
    updateField('longitude', current.coords.longitude.toFixed(7));
  };

  const save = () => {
    const latitude = Number(form.latitude); const longitude = Number(form.longitude);
    if (!form.label.trim() || !form.addressLine.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert('Complete your address', 'Add a label, address line, and exact location coordinates before saving.'); return;
    }
    const payload = { label: form.label.trim(), recipientName: form.recipientName.trim() || undefined, phone: form.phone.trim() || undefined, addressLine: form.addressLine.trim(), apartment: form.apartment.trim() || undefined, floor: form.floor.trim() || undefined, landmark: form.landmark.trim() || undefined, city: form.city.trim() || undefined, state: form.state.trim() || undefined, pincode: form.pincode.trim() || undefined, deliveryInstructions: form.deliveryInstructions.trim() || undefined, latitude, longitude };
    if (editing) updateMutation.mutate({ id: editing.id, ...payload }); else createMutation.mutate({ ...payload, isDefault: addresses.length === 0 });
  };

  if (!user || userRole === 'guest') return <ScreenContainer className="items-center justify-center bg-[#F5FAF4] px-6" containerClassName="bg-[#F5FAF4]"><Ionicons name="lock-closed-outline" size={38} color="#2E7D32" /><Text className="mt-4 text-xl font-extrabold text-[#173C25]">Sign in to save addresses</Text><Text className="mt-2 text-center text-sm leading-5 text-[#68776D]">Saved locations keep checkout fast and give riders your exact delivery details.</Text><TouchableOpacity onPress={() => router.push('/login')} className="mt-6 rounded-2xl bg-[#2E7D32] px-6 py-4"><Text className="font-extrabold text-white">Sign in</Text></TouchableOpacity></ScreenContainer>;

  return <ScreenContainer className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]"><View className="bg-[#14532D] px-5 pb-6 pt-5"><TouchableOpacity onPress={() => router.back()}><Text className="text-sm font-bold text-[#FDE68A]">‹ Profile</Text></TouchableOpacity><View className="mt-4 flex-row items-center justify-between"><View><Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#BBF7D0]">Delivery settings</Text><Text className="mt-1 text-[27px] font-extrabold text-white">Saved addresses</Text><Text className="mt-1 text-sm text-[#DCFCE7]">Pins, floors, landmarks, and handoff notes.</Text></View><View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE68A]"><Ionicons name="location" size={24} color="#14532D" /></View></View></View>
    <FlatList data={addresses} keyExtractor={(item) => String(item.id)} contentContainerStyle={{ padding: 16, paddingBottom: 110 }} refreshing={listQuery.isRefetching} onRefresh={() => { void listQuery.refetch(); }} ListEmptyComponent={!listQuery.isLoading ? <View className="items-center rounded-3xl border border-dashed border-[#B9D9B8] bg-white px-6 py-10"><Ionicons name="location-outline" size={36} color="#2E7D32" /><Text className="mt-3 text-base font-extrabold text-[#173C25]">No saved addresses yet</Text><Text className="mt-1 text-center text-sm leading-5 text-[#68776D]">Add your home, work, or another delivery point with exact rider notes.</Text></View> : <ActivityIndicator color="#2E7D32" />} renderItem={({ item }) => <View className="mb-3 rounded-3xl border border-[#DCE9D9] bg-white p-4"><View className="flex-row items-start justify-between"><View className="flex-1"><View className="flex-row items-center gap-2"><Text className="text-base font-extrabold text-[#173C25]">{item.label}</Text>{item.isDefault ? <View className="rounded-full bg-[#DCFCE7] px-2 py-1"><Text className="text-[10px] font-extrabold text-[#166534]">DEFAULT</Text></View> : null}</View><Text className="mt-2 text-sm font-semibold text-[#36543E]">{item.addressLine}</Text><Text className="mt-1 text-xs text-[#68776D]">{[item.apartment, item.floor && `Floor ${item.floor}`, item.landmark && `Near ${item.landmark}`, item.city, item.state, item.pincode].filter(Boolean).join(' · ')}</Text>{item.deliveryInstructions ? <View className="mt-3 rounded-xl bg-[#FFF8E1] p-3"><Text className="text-[10px] font-extrabold uppercase tracking-wide text-[#92400E]">Rider instructions</Text><Text className="mt-1 text-xs leading-5 text-[#7C5A12]">{item.deliveryInstructions}</Text></View> : null}<Text className="mt-3 text-[10px] font-bold text-[#2E7D32]">PIN {Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</Text></View><TouchableOpacity onPress={() => { setEditing(item); setEditorVisible(true); }} className="ml-3 rounded-xl bg-[#F1F8F1] p-2"><Ionicons name="create-outline" size={19} color="#2E7D32" /></TouchableOpacity></View><View className="mt-4 flex-row gap-2">{!item.isDefault ? <TouchableOpacity onPress={() => defaultMutation.mutate({ id: item.id })} className="flex-1 rounded-xl border border-[#B9D9B8] py-3"><Text className="text-center text-xs font-extrabold text-[#2E7D32]">Set default</Text></TouchableOpacity> : null}<TouchableOpacity onPress={() => Alert.alert('Delete address', 'Remove this saved delivery address?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate({ id: item.id }) }])} className="rounded-xl bg-[#FFF1F2] px-4 py-3"><Text className="text-xs font-extrabold text-[#BE123C]">Delete</Text></TouchableOpacity></View></View>} />
    <TouchableOpacity onPress={() => { setEditing(null); setEditorVisible(true); }} className="absolute bottom-5 left-5 right-5 items-center rounded-2xl bg-[#2E7D32] py-4"><Text className="text-sm font-extrabold text-white">+ Add delivery address</Text></TouchableOpacity>
    <Modal visible={editorVisible} animationType="slide" onRequestClose={() => setEditorVisible(false)}><ScreenContainer className="bg-[#F5FAF4]" containerClassName="bg-[#F5FAF4]"><View className="flex-row items-center justify-between px-5 py-4"><TouchableOpacity onPress={() => setEditorVisible(false)}><Text className="text-sm font-bold text-[#2E7D32]">Cancel</Text></TouchableOpacity><Text className="text-lg font-extrabold text-[#173C25]">{editing ? 'Edit address' : 'New address'}</Text><TouchableOpacity onPress={save} disabled={createMutation.isPending || updateMutation.isPending}><Text className="text-sm font-extrabold text-[#2E7D32]">{createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}</Text></TouchableOpacity></View><FlatList data={[['label','Address label'],['recipientName','Recipient name'],['phone','Mobile number'],['addressLine','Address line'],['apartment','Apartment / flat'],['floor','Floor'],['landmark','Landmark'],['city','City'],['state','State'],['pincode','Pincode'],['deliveryInstructions','Delivery instructions']]} keyExtractor={([key]) => key} contentContainerStyle={{ padding: 16, paddingBottom: 36 }} renderItem={({ item: [key, label] }) => <View className="mb-3"><Text className="mb-1 text-xs font-extrabold text-[#52715A]">{label}</Text><TextInput value={form[key as keyof AddressForm]} onChangeText={(value) => updateField(key as keyof AddressForm, value)} multiline={key === 'deliveryInstructions' || key === 'addressLine'} placeholder={label} placeholderTextColor="#94A59A" className="rounded-xl border border-[#DCE9D9] bg-white px-3 py-3 text-sm text-[#173C25]" /></View>} ListFooterComponent={<View><View className="mt-2 rounded-2xl border border-[#B9D9B8] bg-[#F1F8F1] p-4"><View className="flex-row items-center justify-between"><View><Text className="text-sm font-extrabold text-[#173C25]">Exact delivery pin</Text><Text className="mt-1 text-xs text-[#68776D]">{form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : 'Add current location for rider navigation.'}</Text></View><TouchableOpacity onPress={captureLocation} className="rounded-xl bg-[#2E7D32] px-3 py-2"><Text className="text-xs font-extrabold text-white">Use GPS</Text></TouchableOpacity></View></View></View>} /></ScreenContainer></Modal>
  </ScreenContainer>;
}
