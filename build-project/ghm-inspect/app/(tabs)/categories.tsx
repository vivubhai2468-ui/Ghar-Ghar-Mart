import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { trpc } from "@/lib/trpc";

type SortMode = "name" | "price" | "rating";

const CATEGORY_THEMES = [
  { background: "#FFF2C7", icon: "#A86E00", accent: "#F6C43E", label: "Fresh picks" },
  { background: "#E7F5E8", icon: "#28723B", accent: "#76C986", label: "Daily essentials" },
  { background: "#E6F3FF", icon: "#1D78C8", accent: "#8DC9F5", label: "Kitchen favourites" },
  { background: "#F5EAFE", icon: "#7440A4", accent: "#CDA7EE", label: "Home care" },
  { background: "#FFEAE4", icon: "#B14A2D", accent: "#F2A58C", label: "Good for you" },
  { background: "#E8F6F4", icon: "#19716A", accent: "#89D5C9", label: "Everyday value" },
];

const SORT_OPTIONS: Array<{ id: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "name", label: "A–Z", icon: "text-outline" },
  { id: "price", label: "Price", icon: "pricetag-outline" },
  { id: "rating", label: "Top rated", icon: "star-outline" },
];

function CategorySkeleton() {
  return (
    <View style={styles.loadingPanel}>
      <ActivityIndicator size="large" color="#28723B" />
      <Text style={styles.loadingText}>Finding fresh choices near you…</Text>
    </View>
  );
}

export default function CategoriesScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string | string[] }>();
  const { user } = useAuth();
  const { addItem, getTotalItems } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("name");
  const pincode = useMemo(() => user?.address?.match(/\b\d{6}\b/)?.[0] ?? "400001", [user?.address]);
  const cleanSearch = searchQuery.trim();

  const { data: categories = [], isLoading: categoriesLoading } = trpc.categories.listWithCounts.useQuery({ pincode });
  useEffect(() => {
    const categoryValue = Array.isArray(category) ? category[0] : category;
    if (!categoryValue || categories.length === 0) return;
    const normalizedValue = categoryValue.trim().toLocaleLowerCase();
    const matchingCategory = categories.find(
      (item: any) => String(item.id) === normalizedValue || item.name.trim().toLocaleLowerCase() === normalizedValue,
    );
    if (matchingCategory) setSelectedCategory(matchingCategory.id);
  }, [categories, category]);
  const { data: products = [], isLoading: productsLoading } = trpc.categories.getProductsWithFilters.useQuery(
    {
      categoryId: selectedCategory ?? 0,
      limit: 50,
      offset: 0,
      sortBy: sortBy as "name" | "price" | "rating" | "newest",
      pincode,
    },
    { enabled: Boolean(selectedCategory) },
  );
  const { data: searchResults = [], isLoading: searchLoading } = trpc.categories.searchAdvanced.useQuery(
    {
      query: cleanSearch,
      limit: 50,
      offset: 0,
      categoryId: selectedCategory ?? undefined,
      sortBy: "relevance",
      pincode,
    },
    { enabled: cleanSearch.length > 0 },
  );

  const selectedCategoryData = categories.find((category: any) => category.id === selectedCategory);
  const rawProducts = cleanSearch ? searchResults : products;
  const displayProducts = useMemo(() => {
    const copy = [...rawProducts] as any[];
    if (sortBy === "price") return copy.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === "rating") return copy.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
    return copy.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [rawProducts, sortBy]);
  const productLoading = cleanSearch ? searchLoading : Boolean(selectedCategory) && productsLoading;
  const browseMode = !selectedCategory && !cleanSearch;
  const cartCount = getTotalItems();

  const resetDiscovery = () => {
    setSelectedCategory(null);
    setSearchQuery("");
    setSortBy("name");
  };

  const openProduct = (item: any) => {
    router.push({
      pathname: "/product-detail",
      params: {
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.images?.[0] || "https://via.placeholder.com/200",
        discount: item.discount,
        rating: item.rating,
        stock: item.stock,
      },
    });
  };

  const addToCart = (item: any) => {
    if (Number(item.stock) <= 0) return;
    addItem({
      productId: item.id,
      productName: item.name,
      price: Number(item.price),
      quantity: 1,
      image: item.images?.[0],
      sellerId: item.sellerId,
    });
  };

  const renderCategoryCard = (item: any, index: number) => {
    const theme = CATEGORY_THEMES[index % CATEGORY_THEMES.length];
    const selected = selectedCategory === item.id;
    return (
      <Pressable
        key={item.id}
        onPress={() => {
          setSelectedCategory(item.id);
          setSearchQuery("");
        }}
        style={({ pressed }) => [styles.categoryCard, { backgroundColor: selected ? "#14532D" : theme.background }, pressed && styles.pressed]}
      >
        <View style={styles.categoryCardTop}>
          <View style={[styles.categoryEmojiCircle, { backgroundColor: selected ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.62)" }]}>
            <Text style={styles.categoryEmoji}>{item.icon || "🛍️"}</Text>
          </View>
          <View style={[styles.categoryArrow, { backgroundColor: selected ? "#FDE68A" : "rgba(255,255,255,0.72)" }]}>
            <Ionicons name="arrow-forward" size={14} color={selected ? "#14532D" : theme.icon} />
          </View>
        </View>
        <View>
          <Text style={[styles.categoryName, { color: selected ? "#FFFFFF" : "#173C25" }]} numberOfLines={2}>{item.name}</Text>
          <Text style={[styles.categoryNote, { color: selected ? "#DDF6E8" : theme.icon }]}>{item.productCount ?? 0} items · {theme.label}</Text>
        </View>
      </Pressable>
    );
  };

  const renderProductCard = (item: any) => {
    const inStock = Number(item.stock) > 0;
    const rating = Number(item.rating ?? 0);
    return (
      <View key={item.id} style={styles.productCard}>
        <Pressable onPress={() => openProduct(item)} style={({ pressed }) => [styles.productTapTarget, pressed && styles.pressed]}>
          <View style={styles.productImageWrap}>
            <Image source={{ uri: item.images?.[0] || "https://via.placeholder.com/200" }} style={styles.productImage} />
            {Number(item.discount) > 0 ? <View style={styles.discountPill}><Text style={styles.discountText}>{item.discount}% OFF</Text></View> : null}
            <View style={styles.ratingPill}><Ionicons name="star" size={11} color="#8A5A00" /><Text style={styles.ratingText}>{rating.toFixed(1)}</Text></View>
            {!inStock ? <View style={styles.soldOutOverlay}><Text style={styles.soldOutText}>Sold out</Text></View> : null}
          </View>
          <View style={styles.productCopy}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.productStock} numberOfLines={1}>{inStock ? `${item.stock} in stock` : "Back soon"}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>₹{Math.round(Number(item.price))}</Text>
              {item.originalPrice ? <Text style={styles.originalPrice}>₹{Math.round(Number(item.originalPrice))}</Text> : null}
            </View>
          </View>
        </Pressable>
        <View style={styles.productActionRow}>
          <Pressable onPress={() => openProduct(item)} style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}><Text style={styles.detailButtonText}>View</Text></Pressable>
          <Pressable disabled={!inStock} onPress={() => addToCart(item)} style={({ pressed }) => [styles.addButton, !inStock && styles.addButtonDisabled, pressed && styles.pressed]}>
            <Ionicons name={inStock ? "add" : "time-outline"} size={16} color={inStock ? "#14532D" : "#849285"} />
            <Text style={[styles.addButtonText, !inStock && styles.addButtonTextDisabled]}>{inStock ? "Add" : "Soon"}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const productHeading = cleanSearch ? `Results for “${cleanSearch}”` : selectedCategoryData ? selectedCategoryData.name : "Explore products";

  return (
    <ScreenContainer className="bg-[#F4F8F0] p-0" containerClassName="bg-[#F4F8F0]">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />
          <View style={styles.heroTopRow}>
            <View><Text style={styles.heroEyebrow}>GROCERY AISLES</Text><Text style={styles.heroTitle}>What are we stocking up on?</Text></View>
            <Pressable onPress={() => router.push("/cart" as never)} style={({ pressed }) => [styles.cartButton, pressed && styles.pressed]}>
              <Ionicons name="bag-handle-outline" size={21} color="#14532D" />
              {cartCount > 0 ? <View style={styles.cartCount}><Text style={styles.cartCountText}>{cartCount > 99 ? "99+" : cartCount}</Text></View> : null}
            </Pressable>
          </View>
          <Text style={styles.heroSubtitle}>Fresh picks, pantry staples, and everyday favourites — all near {pincode}.</Text>
          <View style={styles.heroValueRow}>
            <View style={styles.heroValue}><Ionicons name="flash-outline" size={16} color="#FDE68A" /><Text style={styles.heroValueText}>Fast local delivery</Text></View>
            <View style={styles.heroValueDivider} />
            <View style={styles.heroValue}><Ionicons name="leaf-outline" size={16} color="#FDE68A" /><Text style={styles.heroValueText}>Regional stock</Text></View>
          </View>
        </View>

        <View style={styles.searchCard}>
          <Ionicons name="search-outline" size={20} color="#5A7461" />
          <TextInput
            placeholder="Search milk, fruit, snacks and more"
            placeholderTextColor="#97A89A"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search grocery products"
          />
          {cleanSearch ? <Pressable onPress={() => setSearchQuery("")} style={({ pressed }) => [styles.clearSearchButton, pressed && styles.pressed]}><Ionicons name="close" size={17} color="#527057" /></Pressable> : <View style={styles.searchHint}><Text style={styles.searchHintText}>Search</Text></View>}
        </View>

        {browseMode ? (
          <>
            <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Browse the aisles</Text><Text style={styles.sectionSubtitle}>Choose a category to see what is available near you.</Text></View><View style={styles.categoryCountPill}><Ionicons name="grid-outline" size={14} color="#28723B" /><Text style={styles.categoryCountText}>{categories.length}</Text></View></View>
            {categoriesLoading ? <CategorySkeleton /> : categories.length > 0 ? <View style={styles.categoryGrid}>{categories.map(renderCategoryCard)}</View> : <View style={styles.noCategoryCard}><Ionicons name="storefront-outline" size={28} color="#718278" /><Text style={styles.noCategoryTitle}>Categories are being refreshed</Text><Text style={styles.noCategoryText}>Please check back in a moment for fresh grocery aisles.</Text></View>}
            <View style={styles.discoveryBanner}><View style={styles.discoveryIcon}><Ionicons name="sparkles" size={21} color="#8A5A00" /></View><View style={styles.discoveryCopy}><Text style={styles.discoveryTitle}>Shop your neighbourhood favourites</Text><Text style={styles.discoveryText}>Availability updates automatically for your delivery area.</Text></View></View>
          </>
        ) : (
          <>
            <View style={styles.selectionBar}>
              <Pressable onPress={resetDiscovery} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Ionicons name="arrow-back" size={18} color="#28723B" /><Text style={styles.backButtonText}>All aisles</Text></Pressable>
              {selectedCategoryData ? <View style={styles.activeCategoryChip}><Text style={styles.activeCategoryChipText}>{selectedCategoryData.name}</Text></View> : <View style={styles.activeCategoryChip}><Text style={styles.activeCategoryChipText}>Search</Text></View>}
            </View>
            <View style={styles.productSectionHeading}><View style={styles.productHeadingCopy}><Text style={styles.sectionTitle}>{productHeading}</Text><Text style={styles.sectionSubtitle}>{productLoading ? "Refreshing availability…" : `${displayProducts.length} items available in your area`}</Text></View><Pressable onPress={resetDiscovery} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}><Ionicons name="refresh-outline" size={16} color="#28723B" /></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRail}>
              {SORT_OPTIONS.map((option) => { const selected = sortBy === option.id; return <Pressable key={option.id} onPress={() => setSortBy(option.id)} style={({ pressed }) => [styles.sortChip, selected && styles.sortChipSelected, pressed && styles.pressed]}><Ionicons name={option.icon} size={15} color={selected ? "#14532D" : "#637665"} /><Text style={[styles.sortChipText, selected && styles.sortChipTextSelected]}>{option.label}</Text></Pressable>; })}
            </ScrollView>
            {productLoading ? <CategorySkeleton /> : displayProducts.length > 0 ? <View style={styles.productGrid}>{displayProducts.map(renderProductCard)}</View> : <View style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="search-outline" size={30} color="#28723B" /></View><Text style={styles.emptyTitle}>No exact matches yet</Text><Text style={styles.emptyText}>Try a different search or return to all aisles to keep browsing.</Text><Pressable onPress={resetDiscovery} style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}><Text style={styles.emptyActionText}>Browse all categories</Text><Ionicons name="arrow-forward" size={16} color="#14532D" /></Pressable></View>}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 28 },
  hero: { overflow: "hidden", paddingHorizontal: 17, paddingTop: 18, paddingBottom: 21, backgroundColor: "#14532D" },
  heroCircleLarge: { position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: "#28723B", right: -65, top: -102 },
  heroCircleSmall: { position: "absolute", width: 94, height: 94, borderRadius: 47, backgroundColor: "#FDE68A", right: 33, bottom: -66, opacity: 0.17 },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 14, alignItems: "flex-start" },
  heroEyebrow: { color: "#FDE68A", fontSize: 10, fontWeight: "800", letterSpacing: 1.35 },
  heroTitle: { color: "#FFFFFF", fontSize: 26, lineHeight: 32, fontWeight: "800", maxWidth: 310, marginTop: 5 },
  heroSubtitle: { color: "#DDF6E8", fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 380 },
  cartButton: { width: 43, height: 43, borderRadius: 15, backgroundColor: "#FDE68A", alignItems: "center", justifyContent: "center" },
  cartCount: { position: "absolute", minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, top: -5, right: -5, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  cartCountText: { color: "#14532D", fontSize: 9, fontWeight: "800" },
  heroValueRow: { flexDirection: "row", alignItems: "center", gap: 9, flexWrap: "wrap", marginTop: 17 },
  heroValue: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroValueText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  heroValueDivider: { width: 1, height: 13, backgroundColor: "#4B9360" },
  searchCard: { height: 54, flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: -10, paddingHorizontal: 14, borderWidth: 1, borderColor: "#E2EBE0", borderRadius: 16, backgroundColor: "#FFFFFF" },
  searchInput: { flex: 1, minWidth: 0, color: "#173C25", fontSize: 13, fontWeight: "600" },
  clearSearchButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#E7F5E8" },
  searchHint: { borderRadius: 8, backgroundColor: "#F0F5EF", paddingHorizontal: 7, paddingVertical: 4 },
  searchHintText: { color: "#809082", fontSize: 10, fontWeight: "700" },
  sectionHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 24, marginBottom: 14 },
  sectionTitle: { color: "#173C25", fontSize: 20, lineHeight: 25, fontWeight: "800" },
  sectionSubtitle: { color: "#718278", fontSize: 12, lineHeight: 17, marginTop: 4 },
  categoryCountPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 11, backgroundColor: "#E7F5E8", paddingHorizontal: 9, paddingVertical: 7 },
  categoryCountText: { color: "#28723B", fontSize: 11, fontWeight: "800" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11, paddingHorizontal: 16 },
  categoryCard: { flexBasis: "47%", flexGrow: 1, minHeight: 150, borderRadius: 20, padding: 13, justifyContent: "space-between" },
  categoryCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  categoryEmojiCircle: { width: 49, height: 49, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  categoryEmoji: { fontSize: 26 },
  categoryArrow: { width: 27, height: 27, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  categoryName: { fontSize: 15, lineHeight: 19, fontWeight: "800" },
  categoryNote: { fontSize: 10, lineHeight: 14, fontWeight: "700", marginTop: 4 },
  discoveryBanner: { flexDirection: "row", alignItems: "center", gap: 11, marginHorizontal: 16, marginTop: 18, borderRadius: 18, backgroundColor: "#FFF8DF", padding: 14 },
  discoveryIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#FFF0B3", alignItems: "center", justifyContent: "center" },
  discoveryCopy: { flex: 1 },
  discoveryTitle: { color: "#5F4A10", fontSize: 12, fontWeight: "800" },
  discoveryText: { color: "#796622", fontSize: 10, lineHeight: 14, marginTop: 3 },
  noCategoryCard: { alignItems: "center", marginHorizontal: 16, borderRadius: 20, backgroundColor: "#FFFFFF", padding: 28 },
  noCategoryTitle: { color: "#173C25", fontSize: 15, fontWeight: "800", marginTop: 10 },
  noCategoryText: { color: "#718278", fontSize: 12, textAlign: "center", marginTop: 5 },
  selectionBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 16 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingRight: 10 },
  backButtonText: { color: "#28723B", fontSize: 12, fontWeight: "800" },
  activeCategoryChip: { borderRadius: 99, backgroundColor: "#E7F5E8", paddingHorizontal: 10, paddingVertical: 7 },
  activeCategoryChipText: { color: "#28723B", fontSize: 11, fontWeight: "800", maxWidth: 165 },
  productSectionHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, paddingHorizontal: 16, marginTop: 13 },
  productHeadingCopy: { flex: 1 },
  resetButton: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  sortRail: { gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  sortChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E0EAE0", backgroundColor: "#FFFFFF" },
  sortChipSelected: { backgroundColor: "#E7F5E8", borderColor: "#B6DABB" },
  sortChipText: { color: "#637665", fontSize: 11, fontWeight: "800" },
  sortChipTextSelected: { color: "#14532D" },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11, paddingHorizontal: 16 },
  productCard: { flexBasis: "47%", flexGrow: 1, minWidth: 142, overflow: "hidden", borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3ECE1" },
  productTapTarget: { flex: 1 },
  productImageWrap: { height: 138, position: "relative", backgroundColor: "#F2F6F1" },
  productImage: { width: "100%", height: "100%", resizeMode: "cover" },
  discountPill: { position: "absolute", top: 8, left: 8, borderRadius: 8, backgroundColor: "#C6462A", paddingHorizontal: 7, paddingVertical: 4 },
  discountText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  ratingPill: { position: "absolute", right: 8, top: 8, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, backgroundColor: "#FFF5C7", paddingHorizontal: 6, paddingVertical: 4 },
  ratingText: { color: "#795000", fontSize: 9, fontWeight: "800" },
  soldOutOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(23,60,37,0.58)" },
  soldOutText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  productCopy: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 7 },
  productName: { color: "#173C25", fontSize: 13, lineHeight: 18, fontWeight: "800", minHeight: 36 },
  productStock: { color: "#718278", fontSize: 10, marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  productPrice: { color: "#28723B", fontSize: 15, fontWeight: "800" },
  originalPrice: { color: "#90A090", fontSize: 10, fontWeight: "600", textDecorationLine: "line-through" },
  productActionRow: { flexDirection: "row", gap: 7, paddingHorizontal: 10, paddingBottom: 10 },
  detailButton: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#CFE3D0", borderRadius: 10, paddingVertical: 8 },
  detailButtonText: { color: "#28723B", fontSize: 11, fontWeight: "800" },
  addButton: { flex: 1.1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3, borderRadius: 10, backgroundColor: "#FDE68A", paddingVertical: 8 },
  addButtonDisabled: { backgroundColor: "#EDF1ED" },
  addButtonText: { color: "#14532D", fontSize: 11, fontWeight: "800" },
  addButtonTextDisabled: { color: "#849285" },
  loadingPanel: { alignItems: "center", justifyContent: "center", minHeight: 220, marginHorizontal: 16, borderRadius: 20, backgroundColor: "#FFFFFF" },
  loadingText: { color: "#58705E", fontSize: 12, fontWeight: "700", marginTop: 12 },
  emptyCard: { alignItems: "center", marginHorizontal: 16, borderRadius: 23, backgroundColor: "#FFFFFF", padding: 28 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5E8" },
  emptyTitle: { color: "#173C25", fontSize: 16, fontWeight: "800", marginTop: 13 },
  emptyText: { color: "#718278", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6, maxWidth: 250 },
  emptyAction: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 17, borderRadius: 12, backgroundColor: "#FDE68A", paddingHorizontal: 13, paddingVertical: 10 },
  emptyActionText: { color: "#14532D", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});
