import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useCart } from "@/lib/cart-context";
import { useWishlist, type WishlistItem } from "@/lib/wishlist-context";

type SortMode = "price-low" | "price-high" | "discount" | "rating";

const SORT_OPTIONS: Array<{ id: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "rating", label: "Top rated", icon: "star-outline" },
  { id: "discount", label: "Best value", icon: "pricetag-outline" },
  { id: "price-low", label: "Price low", icon: "arrow-down-outline" },
  { id: "price-high", label: "Price high", icon: "arrow-up-outline" },
];

const CARD_BACKGROUNDS = ["#FFF3C9", "#E8F6EB", "#E7F3FF", "#F4E9FF", "#FFEAE3", "#E9F7F4"];

function money(value: number) {
  return `₹${Math.round(value)}`;
}

export default function WishlistScreen() {
  const router = useRouter();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addItem, getTotalItems } = useCart();
  const [selectedSort, setSelectedSort] = useState<SortMode>("rating");

  const sortedWishlist = useMemo(() => {
    const items = [...wishlist];
    if (selectedSort === "price-low") return items.sort((a, b) => a.price - b.price);
    if (selectedSort === "price-high") return items.sort((a, b) => b.price - a.price);
    if (selectedSort === "discount") return items.sort((a, b) => b.discount - a.discount);
    return items.sort((a, b) => b.rating - a.rating);
  }, [wishlist, selectedSort]);

  const savedAmount = useMemo(() => wishlist.reduce((sum, item) => sum + Math.max(0, item.originalPrice - item.price), 0), [wishlist]);
  const dealCount = useMemo(() => wishlist.filter((item) => item.discount > 0).length, [wishlist]);
  const cartCount = getTotalItems();

  const handleRemove = (item: WishlistItem) => {
    Alert.alert("Remove saved item?", `${item.name} will be removed from your wishlist.`, [
      { text: "Keep it", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void removeFromWishlist(item.id) },
    ]);
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItem({ productId: item.id, productName: item.name, price: item.price, quantity: 1, image: item.image });
    Alert.alert("Added to your cart", `${item.name} is ready when you are.`);
  };

  const handleAddAll = () => {
    wishlist.forEach((item) => addItem({ productId: item.id, productName: item.name, price: item.price, quantity: 1, image: item.image }));
    Alert.alert("Saved items added", `${wishlist.length} item${wishlist.length === 1 ? "" : "s"} added to your cart.`);
  };

  const openProduct = (item: WishlistItem) => {
    router.push({ pathname: "/product-detail", params: { id: item.id, name: item.name, price: item.price, originalPrice: item.originalPrice, image: item.image, discount: item.discount, rating: item.rating, shop: item.shop } } as never);
  };

  const renderItem = ({ item, index }: { item: WishlistItem; index: number }) => {
    const savings = Math.max(0, item.originalPrice - item.price);
    return (
      <View style={styles.productCard}>
        <Pressable onPress={() => openProduct(item)} style={({ pressed }) => [styles.productTapTarget, pressed && styles.pressed]}>
          <View style={[styles.imageContainer, { backgroundColor: CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length] }]}>
            <Image source={{ uri: item.image }} style={styles.productImage} />
            {item.discount > 0 ? <View style={styles.discountBadge}><Text style={styles.discountText}>{item.discount}% OFF</Text></View> : null}
            <Pressable onPress={() => handleRemove(item)} style={({ pressed }) => [styles.heartButton, pressed && styles.pressed]} accessibilityLabel={`Remove ${item.name} from wishlist`}><Ionicons name="heart" size={19} color="#D7485D" /></Pressable>
            <View style={styles.ratingPill}><Ionicons name="star" size={11} color="#8A5A00" /><Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text></View>
          </View>
          <View style={styles.productCopy}>
            <Text style={styles.shopName} numberOfLines={1}>{item.shop || "Neighbourhood store"}</Text>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.priceRow}><Text style={styles.productPrice}>{money(item.price)}</Text><Text style={styles.originalPrice}>{money(item.originalPrice)}</Text></View>
            {savings > 0 ? <Text style={styles.savingText}>You save {money(savings)}</Text> : <Text style={styles.savingText}>Saved for later</Text>}
          </View>
        </Pressable>
        <View style={styles.productActions}>
          <Pressable onPress={() => openProduct(item)} style={({ pressed }) => [styles.viewButton, pressed && styles.pressed]}><Text style={styles.viewButtonText}>View</Text></Pressable>
          <Pressable onPress={() => handleAddToCart(item)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><Ionicons name="add" size={16} color="#14532D" /><Text style={styles.addButtonText}>Add</Text></Pressable>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.hero}>
        <View style={styles.heroCircleLarge} />
        <View style={styles.heroCircleSmall} />
        <View style={styles.heroTopRow}>
          <View><Text style={styles.heroEyebrow}>YOUR SAVED SHELF</Text><Text style={styles.heroTitle}>Little favourites, ready whenever you are.</Text></View>
          <Pressable onPress={() => router.push("/cart" as never)} style={({ pressed }) => [styles.cartButton, pressed && styles.pressed]}><Ionicons name="bag-handle-outline" size={21} color="#14532D" />{cartCount > 0 ? <View style={styles.cartCount}><Text style={styles.cartCountText}>{cartCount > 99 ? "99+" : cartCount}</Text></View> : null}</Pressable>
        </View>
        <Text style={styles.heroSubtitle}>Keep track of the groceries you love and catch the best value when you’re ready to shop.</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}><Text style={styles.heroStatValue}>{wishlist.length}</Text><Text style={styles.heroStatLabel}>saved items</Text></View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}><Text style={styles.heroStatValue}>{dealCount}</Text><Text style={styles.heroStatLabel}>great deals</Text></View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}><Text style={styles.heroStatValue}>{money(savedAmount)}</Text><Text style={styles.heroStatLabel}>potential savings</Text></View>
        </View>
      </View>

      <View style={styles.valueBanner}><View style={styles.valueIcon}><Ionicons name="sparkles" size={19} color="#8A5A00" /></View><View style={styles.valueCopy}><Text style={styles.valueTitle}>Good things are worth saving</Text><Text style={styles.valueText}>Prices and stock can refresh with your delivery area.</Text></View></View>

      {wishlist.length > 0 ? <>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Your saved picks</Text><Text style={styles.sectionSubtitle}>{wishlist.length} item{wishlist.length === 1 ? "" : "s"} waiting in your shelf</Text></View><View style={styles.heartCount}><Ionicons name="heart" size={14} color="#D7485D" /><Text style={styles.heartCountText}>{wishlist.length}</Text></View></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRail}>{SORT_OPTIONS.map((option) => { const selected = selectedSort === option.id; return <Pressable key={option.id} onPress={() => setSelectedSort(option.id)} style={({ pressed }) => [styles.sortChip, selected && styles.sortChipSelected, pressed && styles.pressed]}><Ionicons name={option.icon} size={15} color={selected ? "#14532D" : "#657666"} /><Text style={[styles.sortChipText, selected && styles.sortChipTextSelected]}>{option.label}</Text></Pressable>; })}</ScrollView>
      </> : null}
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}><Ionicons name="heart-outline" size={32} color="#D7485D" /></View>
      <Text style={styles.emptyTitle}>Your saved shelf is open</Text>
      <Text style={styles.emptyText}>Tap the heart on products you love. They’ll wait here for your next grocery run.</Text>
      <Pressable onPress={() => router.push("/categories" as never)} style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}><Text style={styles.emptyActionText}>Browse fresh picks</Text><Ionicons name="arrow-forward" size={16} color="#14532D" /></Pressable>
      <View style={styles.emptyTip}><Ionicons name="bulb-outline" size={15} color="#8A5A00" /><Text style={styles.emptyTipText}>Tip: save everyday staples to find them faster later.</Text></View>
    </View>
  );

  const renderFooter = () => wishlist.length > 0 ? <View style={styles.footerWrap}><Pressable onPress={handleAddAll} style={({ pressed }) => [styles.addAllButton, pressed && styles.pressed]}><View style={styles.addAllIcon}><Ionicons name="bag-add-outline" size={19} color="#14532D" /></View><View style={styles.addAllCopy}><Text style={styles.addAllTitle}>Add all saved picks</Text><Text style={styles.addAllText}>{wishlist.length} item{wishlist.length === 1 ? "" : "s"} · {money(wishlist.reduce((sum, item) => sum + item.price, 0))}</Text></View><Ionicons name="arrow-forward" size={19} color="#14532D" /></Pressable></View> : null;

  return (
    <ScreenContainer className="bg-[#F4F8F0] p-0" containerClassName="bg-[#F4F8F0]">
      <FlatList
        data={sortedWishlist}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={sortedWishlist.length > 0 ? styles.columnWrapper : undefined}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 28 },
  hero: { overflow: "hidden", paddingHorizontal: 17, paddingTop: 19, paddingBottom: 21, backgroundColor: "#14532D" },
  heroCircleLarge: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "#28723B", right: -71, top: -117 },
  heroCircleSmall: { position: "absolute", width: 104, height: 104, borderRadius: 52, backgroundColor: "#FDE68A", right: 39, bottom: -72, opacity: 0.16 },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  heroEyebrow: { color: "#FDE68A", fontSize: 10, fontWeight: "800", letterSpacing: 1.35 },
  heroTitle: { color: "#FFFFFF", fontSize: 26, lineHeight: 32, fontWeight: "800", maxWidth: 330, marginTop: 6 },
  heroSubtitle: { color: "#DDF6E8", fontSize: 13, lineHeight: 19, maxWidth: 410, marginTop: 8 },
  cartButton: { width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FDE68A" },
  cartCount: { position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  cartCountText: { color: "#14532D", fontSize: 9, fontWeight: "800" },
  heroStats: { flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 19 },
  heroStat: { gap: 2 },
  heroStatValue: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  heroStatLabel: { color: "#DDF6E8", fontSize: 10, fontWeight: "700" },
  heroStatDivider: { width: 1, height: 26, backgroundColor: "#4B9360" },
  valueBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 13, backgroundColor: "#FFF8E2" },
  valueIcon: { width: 37, height: 37, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0B3" },
  valueCopy: { flex: 1 },
  valueTitle: { color: "#5F4A10", fontSize: 12, fontWeight: "800" },
  valueText: { color: "#786322", fontSize: 10, lineHeight: 14, marginTop: 3 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 22 },
  sectionTitle: { color: "#173C25", fontSize: 20, fontWeight: "800" },
  sectionSubtitle: { color: "#718278", fontSize: 12, marginTop: 4 },
  heartCount: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: "#FCE9ED" },
  heartCountText: { color: "#B9344C", fontSize: 11, fontWeight: "800" },
  sortRail: { gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  sortChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, borderWidth: 1, borderColor: "#E1EBE0", backgroundColor: "#FFFFFF", paddingHorizontal: 11, paddingVertical: 8 },
  sortChipSelected: { borderColor: "#B6DABB", backgroundColor: "#E7F5E8" },
  sortChipText: { color: "#657666", fontSize: 11, fontWeight: "800" },
  sortChipTextSelected: { color: "#14532D" },
  columnWrapper: { gap: 11, paddingHorizontal: 16, marginBottom: 11 },
  productCard: { flex: 1, minWidth: 0, overflow: "hidden", borderRadius: 19, borderWidth: 1, borderColor: "#E2EBE0", backgroundColor: "#FFFFFF" },
  productTapTarget: { flex: 1 },
  imageContainer: { height: 143, position: "relative" },
  productImage: { width: "100%", height: "100%", resizeMode: "cover" },
  discountBadge: { position: "absolute", top: 8, left: 8, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: "#C6462A" },
  discountText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  heartButton: { position: "absolute", top: 8, right: 8, width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.92)" },
  ratingPill: { position: "absolute", left: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: "#FFF4C8" },
  ratingText: { color: "#795000", fontSize: 9, fontWeight: "800" },
  productCopy: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8 },
  shopName: { color: "#718278", fontSize: 9, fontWeight: "700" },
  productName: { color: "#173C25", fontSize: 13, lineHeight: 18, fontWeight: "800", minHeight: 36, marginTop: 3 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  productPrice: { color: "#28723B", fontSize: 15, fontWeight: "800" },
  originalPrice: { color: "#91A092", fontSize: 10, fontWeight: "600", textDecorationLine: "line-through" },
  savingText: { color: "#5C7B63", fontSize: 9, fontWeight: "700", marginTop: 4 },
  productActions: { flexDirection: "row", gap: 7, paddingHorizontal: 10, paddingBottom: 10 },
  viewButton: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#CFE3D0", borderRadius: 10, paddingVertical: 8 },
  viewButtonText: { color: "#28723B", fontSize: 11, fontWeight: "800" },
  addButton: { flex: 1.1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 10, paddingVertical: 8, backgroundColor: "#FDE68A" },
  addButtonText: { color: "#14532D", fontSize: 11, fontWeight: "800" },
  emptyCard: { alignItems: "center", marginHorizontal: 16, marginTop: 19, borderRadius: 23, paddingHorizontal: 25, paddingVertical: 30, backgroundColor: "#FFFFFF" },
  emptyIcon: { width: 61, height: 61, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#FCE9ED" },
  emptyTitle: { color: "#173C25", fontSize: 16, fontWeight: "800", textAlign: "center", marginTop: 14 },
  emptyText: { color: "#718278", fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 270, marginTop: 6 },
  emptyAction: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, marginTop: 18, backgroundColor: "#FDE68A" },
  emptyActionText: { color: "#14532D", fontSize: 12, fontWeight: "800" },
  emptyTip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8, marginTop: 17, backgroundColor: "#FFF8E2" },
  emptyTipText: { color: "#786322", fontSize: 10, fontWeight: "700" },
  footerWrap: { paddingHorizontal: 16, paddingTop: 8 },
  addAllButton: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, padding: 13, backgroundColor: "#FDE68A" },
  addAllIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.46)" },
  addAllCopy: { flex: 1 },
  addAllTitle: { color: "#14532D", fontSize: 13, fontWeight: "800" },
  addAllText: { color: "#3C653F", fontSize: 10, fontWeight: "700", marginTop: 2 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});
