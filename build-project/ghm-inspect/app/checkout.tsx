import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc';
import { getUserFacingError } from '@/lib/user-facing-error';
import { DestinationMapPicker, type DestinationCoordinate } from '@/components/destination-map-picker';
import { calculateOrderTotal, POOR_PEOPLE_DONATION } from '@/shared/delivery-pricing';

type CheckoutAddress = {
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
  latitude: number;
  longitude: number;
  deliveryInstructions?: string;
};

type PersistedAddress = {
  id: number;
  label: string;
  addressLine: string;
  apartment?: string | null;
  floor?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude: number | string;
  longitude: number | string;
  isDefault: boolean;
  deliveryInstructions?: string | null;
};

type PaymentProof = { uri: string; base64Data: string; contentType: 'image/jpeg' | 'image/png' };

const EMPTY_MAP_PIN: DestinationCoordinate = { latitude: 20.5937, longitude: 78.9629 };

const PHONEPE_PAYMENT_QR = require('../assets/images/phonepe-payment-qr.jpg');

export default function CheckoutScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { items, clearCart, getSubtotal } = useCart();
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [customLocation, setCustomLocation] = useState<CheckoutAddress | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [draftCoordinate, setDraftCoordinate] = useState<DestinationCoordinate>(EMPTY_MAP_PIN);
  const [draftAddress, setDraftAddress] = useState('');
  const [paymentProof, setPaymentProof] = useState<PaymentProof | null>(null);
  const createOrder = trpc.orders.create.useMutation();
  const uploadPaymentProof = trpc.orders.uploadPaymentProof.useMutation();
  const savedAddressesQuery = trpc.addresses.list.useQuery(undefined, { enabled: Boolean(user && user.role !== 'guest') });
  const savePinnedMutation = trpc.addresses.create.useMutation({ onSuccess: async () => { await savedAddressesQuery.refetch(); Alert.alert('Saved', 'This delivery pin is now available in your profile.'); } });
  const addressSearch = trpc.addresses.search.useQuery({ query: submittedSearch }, { enabled: submittedSearch.trim().length >= 3, staleTime: 60_000 });
  const reverseAddress = trpc.addresses.reverse.useMutation({ onSuccess: (result) => { if (result?.label) setDraftAddress(result.label); } });

  const savedAddresses = useMemo<CheckoutAddress[]>(() => ((savedAddressesQuery.data ?? []) as PersistedAddress[]).map((address) => ({
    id: `saved-${address.id}`,
    label: address.label,
    address: [address.addressLine, address.apartment, address.floor && `Floor ${address.floor}`, address.landmark && `Near ${address.landmark}`, address.city, address.state, address.pincode].filter(Boolean).join(', '),
    isDefault: address.isDefault,
    latitude: Number(address.latitude),
    longitude: Number(address.longitude),
    deliveryInstructions: address.deliveryInstructions ?? undefined,
  })), [savedAddressesQuery.data]);
  const addresses = useMemo(() => {
    return customLocation ? [customLocation, ...savedAddresses] : savedAddresses;
  }, [customLocation, savedAddresses]);
  useEffect(() => {
    const defaultAddress = savedAddresses.find((address) => address.isDefault);
    if (!customLocation && defaultAddress && !selectedAddressId) setSelectedAddressId(defaultAddress.id);
  }, [customLocation, savedAddresses, selectedAddressId]);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? addresses[0];
  const subtotal = getSubtotal();
  const cartSellerId = Number(items[0]?.sellerId ?? 0);
  const firstProductId = Number(items[0]?.productId ?? 0);
  const cartProductQuery = trpc.products.getById.useQuery(firstProductId, {
    enabled: Boolean(items.length && !(Number.isInteger(cartSellerId) && cartSellerId > 0) && Number.isInteger(firstProductId) && firstProductId > 0),
  });
  const sellerId = Number.isInteger(cartSellerId) && cartSellerId > 0
    ? cartSellerId
    : Number(cartProductQuery.data?.sellerId ?? 0);
  const deliveryQuoteQuery = trpc.delivery.quote.useQuery({ sellerId: sellerId || 1, deliveryLatitude: selectedAddress?.latitude ?? 0, deliveryLongitude: selectedAddress?.longitude ?? 0 }, { enabled: Boolean(user && sellerId && selectedAddress), refetchOnWindowFocus: true });
  const delivery = deliveryQuoteQuery.data?.deliveryCharge;
  const baseDelivery = deliveryQuoteQuery.data?.baseCharge;
  const additionalDelivery = deliveryQuoteQuery.data ? deliveryQuoteQuery.data.additionalDistanceKm * deliveryQuoteQuery.data.additionalChargePerKm : undefined;
  const total = delivery === undefined ? null : calculateOrderTotal({ subtotal, deliveryCharge: delivery });

  const choosePaymentProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const contentType: PaymentProof['contentType'] = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    try {
      const base64Data = Platform.OS === 'web'
        ? await fetch(asset.uri).then(async (response) => { const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); })
        : await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      setPaymentProof({ uri: asset.uri, base64Data, contentType });
    } catch {
      Alert.alert('Could not read image', 'Please choose the payment screenshot again.');
    }
  };

  const useCurrentLocation = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Use the mobile app', 'Exact destination pins are available when checkout is opened on iOS or Android.');
      return;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Location permission needed', 'Allow location access to save an exact delivery pin for your rider.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const nextAddress: CheckoutAddress = {
      id: 'current-location',
      label: 'Current GPS location',
      address: 'Exact delivery pin captured from your device',
      isDefault: false,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setCustomLocation(nextAddress);
    setSelectedAddressId(nextAddress.id);
  };

  const openDestinationPicker = () => {
    setDraftCoordinate(selectedAddress ? { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude } : EMPTY_MAP_PIN);
    setDraftAddress(selectedAddress?.address ?? '');
    setSearchInput('');
    setSubmittedSearch('');
    setPickerVisible(true);
  };

  const selectPin = (coordinate: DestinationCoordinate) => {
    setDraftCoordinate(coordinate);
    reverseAddress.mutate(coordinate);
  };

  const savePinnedDestination = () => {
    const nextAddress: CheckoutAddress = {
      id: 'custom-destination',
      label: 'Pinned delivery address',
      address: draftAddress || 'Pinned delivery location',
      isDefault: false,
      latitude: draftCoordinate.latitude,
      longitude: draftCoordinate.longitude,
    };
    setCustomLocation(nextAddress);
    setSelectedAddressId(nextAddress.id);
    setPickerVisible(false);
  };

  const saveCurrentPinToProfile = () => {
    if (!user || user.role === 'guest' || !customLocation) {
      Alert.alert('Sign in required', 'Sign in to save a delivery pin to your profile.');
      return;
    }
    savePinnedMutation.mutate({
      label: customLocation.label,
      recipientName: user.name,
      phone: user.phone,
      addressLine: customLocation.address,
      deliveryInstructions: customLocation.deliveryInstructions,
      latitude: customLocation.latitude,
      longitude: customLocation.longitude,
      isDefault: savedAddresses.length === 0,
    });
  };

  const handlePlaceOrder = async () => {
    if (createOrder.isPending || uploadPaymentProof.isPending) return;
    if (!user || user.role === 'guest') {
      Alert.alert('Sign in required', 'Please sign in before placing an order so your delivery destination can be saved.');
      router.push('/login');
      return;
    }
    if (!items.length) {
      Alert.alert('Your cart is empty', 'Add some groceries before continuing to checkout.');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Delivery address required', 'Save an address or choose your exact delivery pin before placing the order.');
      return;
    }
    if (cartProductQuery.isLoading) {
      Alert.alert('Loading store information', 'Please wait while we identify the store for your items.');
      return;
    }
    if (!sellerId) {
      Alert.alert('Store unavailable', 'We could not identify the store for this cart. Remove the affected item and add it again from the product page.');
      return;
    }
    if (deliveryQuoteQuery.isFetching && !deliveryQuoteQuery.data) {
      Alert.alert('Calculating delivery charge', 'Please wait while we calculate the delivery route.');
      return;
    }
    if (!deliveryQuoteQuery.data) {
      if (deliveryQuoteQuery.error) {
        await deliveryQuoteQuery.refetch();
        return;
      }
      Alert.alert('Delivery charge unavailable', 'We could not calculate the actual route. Please try again.');
      return;
    }
    if (paymentMethod === 'online' && !paymentProof) {
      Alert.alert('Upload payment proof', 'Scan the PhonePe QR, complete payment, and upload the payment screenshot before placing the order.');
      return;
    }
    try {
      const order = await createOrder.mutateAsync({
        sellerId,
        orderNumber: `GGM-${Date.now()}`,
        paymentMethod,
        deliveryAddress: [selectedAddress.address, selectedAddress.deliveryInstructions ? `Instructions: ${selectedAddress.deliveryInstructions}` : null].filter(Boolean).join('\n'),
        deliveryPhone: user.phone,
        deliveryLatitude: selectedAddress.latitude,
        deliveryLongitude: selectedAddress.longitude,
        subtotal,
        tax: 0,
        shippingCost: deliveryQuoteQuery.data.deliveryCharge,
        total: total ?? 0,
        items: items.map((item) => ({
          productId: Number(item.productId),
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
      });
      if (paymentMethod === 'online' && paymentProof) {
        await uploadPaymentProof.mutateAsync({ orderId: order.orderId, base64Data: paymentProof.base64Data, contentType: paymentProof.contentType });
      }
      clearCart();
      Alert.alert('Order placed successfully', `Order ${order.orderId} is confirmed.\n\nYour delivery OTP: ${order.deliveryOtp}\nShare this 4-digit OTP with the delivery partner only when your order arrives.\n\nCalculated order total: ₹${order.total.toFixed(2)}\nDelivery charge: ₹${order.deliveryCharge.toFixed(2)} (${order.deliveryDistanceKm.toFixed(1)} km)\n\n${paymentMethod === 'online' ? 'Payment proof is awaiting admin confirmation.' : 'Cash will be collected when the rider arrives.'}`, [
        { text: 'Track order', onPress: () => router.replace({ pathname: '/order-tracking', params: { orderId: String(order.orderId) } }) },
      ]);
    } catch (error) {
      Alert.alert('Could not place order', getUserFacingError(error, 'Please try again in a moment.'));
    }
  };

  return (
    <ScreenContainer className="bg-background" containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={[styles.backButton, { color: colors.primary }]}>← Back</Text></TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.pinCard, { backgroundColor: '#14532D' }]}>
          <Text style={styles.pinEyebrow}>DELIVERY PIN</Text>
          <Text style={styles.pinTitle}>Your rider will navigate to this exact destination.</Text>
          <Text style={styles.pinCopy}>Choose a saved area or capture your current GPS location for the live delivery map.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery address</Text>
          {!addresses.length ? <Text style={[styles.noAddressText, { color: colors.muted }]}>No saved delivery address yet. Use your current location or choose a pin on the map.</Text> : null}
          {addresses.map((address) => {
            const selected = selectedAddressId === address.id;
            return (
              <TouchableOpacity key={address.id} onPress={() => setSelectedAddressId(address.id)} style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1 }]}>
                <View style={styles.addressContent}>
                  <View style={styles.addressHeader}>
                    <Text style={[styles.addressLabel, { color: colors.foreground }]}>{address.label}</Text>
                    {address.isDefault ? <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}><Text style={styles.defaultText}>Default</Text></View> : null}
                    {address.id === 'current-location' || address.id === 'custom-destination' ? <View style={styles.gpsBadge}><Text style={styles.gpsText}>PINNED</Text></View> : null}
                  </View>
                  <Text style={[styles.addressText, { color: colors.muted }]}>{address.address}</Text>
                  <Text style={[styles.coordinateText, { color: selected ? colors.primary : colors.muted }]}>{address.latitude.toFixed(5)}, {address.longitude.toFixed(5)}</Text>
                </View>
                <View style={[styles.radioButton, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' }]}>{selected ? <Text style={styles.radioCheck}>✓</Text> : null}</View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={useCurrentLocation} style={[styles.currentLocationButton, { borderColor: colors.primary }]}> 
            <Text style={[styles.currentLocationText, { color: colors.primary }]}>⌖ Use my current location for the delivery pin</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openDestinationPicker} style={[styles.searchAddressButton, { backgroundColor: '#14532D' }]}> 
            <Text style={styles.searchAddressText}>⌕ Search address or choose on map</Text>
          </TouchableOpacity>
          {customLocation ? <TouchableOpacity onPress={saveCurrentPinToProfile} disabled={savePinnedMutation.isPending} style={[styles.saveProfileButton, { borderColor: colors.primary }]}><Text style={[styles.currentLocationText, { color: colors.primary }]}>{savePinnedMutation.isPending ? 'Saving address…' : '♡ Save this pin to my profile'}</Text></TouchableOpacity> : null}
          <TouchableOpacity onPress={() => router.push('/my-addresses')} style={styles.manageAddressesButton}><Text style={[styles.manageAddressesText, { color: colors.primary }]}>Manage saved addresses</Text></TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment method</Text>
          {(['online', 'cod'] as const).map((method) => {
            const selected = paymentMethod === method;
            const isOnline = method === 'online';
            return <TouchableOpacity key={method} onPress={() => setPaymentMethod(method)} style={[styles.paymentOption, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1 }]}>
              <View style={styles.paymentContent}><Text style={styles.paymentIcon}>{isOnline ? '💳' : '💵'}</Text><View><Text style={[styles.paymentLabel, { color: colors.foreground }]}>{isOnline ? 'Online payment' : 'Cash on delivery'}</Text><Text style={[styles.paymentDescription, { color: colors.muted }]}>{isOnline ? 'UPI, card, or wallet' : 'Pay when the rider arrives'}</Text></View></View>
              <View style={[styles.radioButton, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' }]}>{selected ? <Text style={styles.radioCheck}>✓</Text> : null}</View>
            </TouchableOpacity>;
          })}
          {paymentMethod === 'online' ? <View style={[styles.qrPaymentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.qrPaymentTitle, { color: colors.foreground }]}>Pay using PhonePe QR</Text>
            <Text style={[styles.qrPaymentCopy, { color: colors.muted }]}>Scan this QR in the PhonePe app and pay the exact order total shown below.</Text>
            <Image source={PHONEPE_PAYMENT_QR} resizeMode="contain" style={styles.qrPaymentImage} accessibilityLabel="PhonePe payment QR code" />
            <Text style={[styles.qrPaymentNote, { color: colors.muted }]}>After payment, place the order. The payment will remain subject to admin confirmation.</Text>
            <TouchableOpacity onPress={choosePaymentProof} style={[styles.uploadProofButton, { borderColor: colors.primary }]}><Text style={[styles.uploadProofButtonText, { color: colors.primary }]}>{paymentProof ? 'Change payment screenshot' : 'Upload payment screenshot'}</Text></TouchableOpacity>
            {paymentProof ? <View style={styles.proofPreviewRow}><Image source={{ uri: paymentProof.uri }} resizeMode="cover" style={styles.proofPreviewImage} /><View style={styles.proofPreviewCopy}><Text style={[styles.proofPreviewTitle, { color: colors.foreground }]}>Payment proof attached</Text><Text style={[styles.proofPreviewText, { color: colors.muted }]}>It will be sent to the admin for confirmation with this order.</Text></View></View> : <Text style={[styles.proofRequiredText, { color: '#B42318' }]}>Required for online payment</Text>}
          </View> : null}
        </View>

        <View style={[styles.summaryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: colors.muted }]}>Subtotal</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>₹{subtotal.toFixed(0)}</Text></View>
          <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: colors.muted }]}>Delivery charge (first 2 km)</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>{baseDelivery === undefined ? '—' : `₹${baseDelivery.toFixed(2)}`}</Text></View>
          <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: colors.muted }]}>{deliveryQuoteQuery.data ? `Additional distance (${deliveryQuoteQuery.data.additionalDistanceKm.toFixed(0)} km × ₹${deliveryQuoteQuery.data.additionalChargePerKm.toFixed(2)})` : 'Additional distance (₹5 per started km after 2 km)'}</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>{additionalDelivery === undefined ? '—' : `₹${additionalDelivery.toFixed(2)}`}</Text></View>
          <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: colors.muted }]}>Donation for people in need</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>₹{POOR_PEOPLE_DONATION.toFixed(0)}</Text></View>
          {deliveryQuoteQuery.isFetching ? <Text style={[styles.pricingHint, { color: colors.muted }]}>Calculating actual road distance from the store…</Text> : null}
          {deliveryQuoteQuery.error ? <Text style={[styles.pricingError, { color: '#B42318' }]}>Delivery pricing unavailable: {deliveryQuoteQuery.error.message}</Text> : null}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}><Text style={[styles.totalLabel, { color: colors.foreground }]}>Total amount to be paid</Text><Text style={[styles.totalValue, { color: colors.primary }]}>{total === null ? '—' : `₹${total.toFixed(2)}`}</Text></View>
          <Text style={[styles.pricingHint, { color: colors.muted }]}>Delivery starts at ₹10 for the first 2 km. The final delivery charge may vary according to your location and calculated road distance.</Text>
        </View>
      </ScrollView>

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <ScreenContainer className="bg-background" containerClassName="bg-background">
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setPickerVisible(false)}><Text style={[styles.backButton, { color: colors.primary }]}>Cancel</Text></TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>Choose delivery pin</Text>
            <TouchableOpacity onPress={savePinnedDestination}><Text style={[styles.savePinText, { color: colors.primary }]}>Save</Text></TouchableOpacity>
          </View>
          <View style={[styles.searchBar, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
            <TextInput value={searchInput} onChangeText={setSearchInput} placeholder="Search an address in India" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} returnKeyType="search" onSubmitEditing={() => setSubmittedSearch(searchInput.trim())} />
            <TouchableOpacity onPress={() => setSubmittedSearch(searchInput.trim())} disabled={searchInput.trim().length < 3 || addressSearch.isFetching} style={[styles.searchSubmit, { backgroundColor: colors.primary }]}>{addressSearch.isFetching ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.searchSubmitText}>Search</Text>}</TouchableOpacity>
          </View>
          {submittedSearch.length >= 3 ? <FlatList data={addressSearch.data ?? []} keyExtractor={(item) => `${item.latitude}-${item.longitude}`} style={styles.resultsList} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <TouchableOpacity onPress={() => { setDraftCoordinate({ latitude: item.latitude, longitude: item.longitude }); setDraftAddress(item.label); }} style={[styles.searchResult, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text numberOfLines={2} style={[styles.searchResultText, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.searchResultCoordinate, { color: colors.primary }]}>{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Text></TouchableOpacity>} ListEmptyComponent={!addressSearch.isFetching ? <Text style={[styles.emptySearchText, { color: colors.muted }]}>No matching address found. Move the pin directly on the map.</Text> : null} /> : null}
          <View style={styles.mapPickerWrap}><DestinationMapPicker coordinate={draftCoordinate} onSelect={selectPin} /></View>
          <View style={[styles.selectedPinCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.selectedPinLabel, { color: colors.primary }]}>SELECTED DESTINATION</Text><Text numberOfLines={2} style={[styles.selectedPinAddress, { color: colors.foreground }]}>{reverseAddress.isPending ? 'Updating pin address…' : draftAddress}</Text><Text style={[styles.coordinateText, { color: colors.muted }]}>{draftCoordinate.latitude.toFixed(5)}, {draftCoordinate.longitude.toFixed(5)}</Text></View>
        </ScreenContainer>
      </Modal>

      <TouchableOpacity disabled={createOrder.isPending || uploadPaymentProof.isPending || cartProductQuery.isLoading || (deliveryQuoteQuery.isFetching && !deliveryQuoteQuery.data)} onPress={handlePlaceOrder} style={[styles.placeOrderButton, { backgroundColor: createOrder.isPending || uploadPaymentProof.isPending || cartProductQuery.isLoading || (deliveryQuoteQuery.isFetching && !deliveryQuoteQuery.data) ? '#8BAF90' : colors.primary }]}>
        {createOrder.isPending || uploadPaymentProof.isPending || cartProductQuery.isLoading || (deliveryQuoteQuery.isFetching && !deliveryQuoteQuery.data) ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.placeOrderText, { color: colors.background }]}>{!selectedAddress ? 'Choose delivery pin to continue' : !deliveryQuoteQuery.data && deliveryQuoteQuery.error ? 'Retry delivery calculation' : paymentMethod === 'online' && !paymentProof ? `Upload payment proof · ₹${total?.toFixed(2) ?? '—'}` : `Place order · ₹${total?.toFixed(2) ?? '—'}`}</Text>}
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 104 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backButton: { fontSize: 16, fontWeight: '700' }, title: { fontSize: 20, fontWeight: '800' },
  pinCard: { borderRadius: 22, padding: 18, marginBottom: 24 }, pinEyebrow: { color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, pinTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 6 }, pinCopy: { color: '#DCFCE7', fontSize: 12, lineHeight: 18, marginTop: 5 },
  section: { marginBottom: 24 }, sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  addressCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10 }, addressContent: { flex: 1 }, addressHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 }, addressLabel: { fontSize: 14, fontWeight: '800' }, defaultBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }, defaultText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' }, gpsBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }, gpsText: { color: '#166534', fontSize: 9, fontWeight: '900' }, addressText: { fontSize: 12, lineHeight: 17 }, noAddressText: { fontSize: 12, lineHeight: 18, marginBottom: 10 }, coordinateText: { marginTop: 5, fontSize: 10, fontWeight: '700' },
  radioButton: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' }, radioCheck: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  currentLocationButton: { borderRadius: 14, borderWidth: 1.5, paddingVertical: 12, alignItems: 'center' }, currentLocationText: { fontSize: 13, fontWeight: '800' },
  searchAddressButton: { marginTop: 10, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }, searchAddressText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, saveProfileButton: { marginTop: 10, borderRadius: 14, borderWidth: 1.5, paddingVertical: 12, alignItems: 'center' }, manageAddressesButton: { alignItems: 'center', paddingVertical: 12 }, manageAddressesText: { fontSize: 13, fontWeight: '800' },
  paymentOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10 }, paymentContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, paymentIcon: { fontSize: 30 }, paymentLabel: { fontSize: 14, fontWeight: '800', marginBottom: 2 }, paymentDescription: { fontSize: 12 }, qrPaymentCard: { alignItems: 'center', borderRadius: 16, borderWidth: 1, marginTop: 2, padding: 14 }, qrPaymentTitle: { fontSize: 15, fontWeight: '900' }, qrPaymentCopy: { fontSize: 12, lineHeight: 17, marginTop: 5, textAlign: 'center' }, qrPaymentImage: { height: 240, marginTop: 12, width: 170 }, qrPaymentNote: { fontSize: 10, lineHeight: 15, marginTop: 8, textAlign: 'center' }, uploadProofButton: { borderRadius: 12, borderWidth: 1.5, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10 }, uploadProofButtonText: { fontSize: 12, fontWeight: '900' }, proofPreviewRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' }, proofPreviewImage: { borderRadius: 8, height: 52, width: 52 }, proofPreviewCopy: { flex: 1 }, proofPreviewTitle: { fontSize: 12, fontWeight: '800' }, proofPreviewText: { fontSize: 10, lineHeight: 14, marginTop: 2 }, proofRequiredText: { fontSize: 10, fontWeight: '800', marginTop: 8 },
  summaryBox: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, summaryLabel: { fontSize: 14 }, summaryValue: { fontSize: 14, fontWeight: '700' }, pricingHint: { fontSize: 11, lineHeight: 16, marginBottom: 4 }, pricingError: { fontSize: 11, lineHeight: 16, marginBottom: 4 }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 10, borderTopWidth: 1 }, totalLabel: { fontSize: 16, fontWeight: '800' }, totalValue: { fontSize: 18, fontWeight: '900' },
  placeOrderButton: { position: 'absolute', bottom: 0, left: 16, right: 16, paddingVertical: 16, alignItems: 'center', marginVertical: 12, borderRadius: 15 }, placeOrderText: { fontSize: 15, fontWeight: '800' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 18 }, savePinText: { fontSize: 16, fontWeight: '900' },
  searchBar: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 15, padding: 6 }, searchInput: { flex: 1, minHeight: 40, paddingHorizontal: 10, fontSize: 14 }, searchSubmit: { borderRadius: 11, paddingHorizontal: 13, minWidth: 68, minHeight: 40, alignItems: 'center', justifyContent: 'center' }, searchSubmitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  resultsList: { marginHorizontal: 16, marginTop: 10, maxHeight: 155 }, searchResult: { borderWidth: 1, borderRadius: 13, padding: 11, marginBottom: 7 }, searchResultText: { fontSize: 12, fontWeight: '700', lineHeight: 17 }, searchResultCoordinate: { marginTop: 4, fontSize: 10, fontWeight: '800' }, emptySearchText: { paddingVertical: 14, textAlign: 'center', fontSize: 12 },
  mapPickerWrap: { marginHorizontal: 16, marginTop: 12 }, selectedPinCard: { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 13 }, selectedPinLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }, selectedPinAddress: { marginTop: 4, fontSize: 13, fontWeight: '800', lineHeight: 18 },
});
