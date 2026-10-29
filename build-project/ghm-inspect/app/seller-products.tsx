import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

type SellerProduct = { id: number; name: string; description?: string | null; price: string | number; stock: number; categoryId?: number | null; approvalStatus?: "pending" | "approved" | "rejected"; moderationNote?: string | null };
type SellerCategory = { id: number; name: string };

export default function SellerProductsScreen() {
  const utils = trpc.useUtils();
  const profileQuery = trpc.user.getProfile.useQuery();
  const profile = profileQuery.data;
  const approved = profile?.shopStatus === "approved" && profile?.isActive !== false;
  const productsQuery = trpc.products.getSellerProducts.useQuery(profile?.id ?? 0, { enabled: Boolean(profile?.id && approved) });
  const categoriesQuery = trpc.categories.list.useQuery();
  const createProduct = trpc.products.create.useMutation({ onSuccess: () => void utils.products.getSellerProducts.invalidate() });
  const updateProduct = trpc.products.update.useMutation({ onSuccess: () => void utils.products.getSellerProducts.invalidate() });
  const deleteProduct = trpc.products.delete.useMutation({ onSuccess: () => void utils.products.getSellerProducts.invalidate() });
  const uploadImage = trpc.seller.catalog.uploadImage.useMutation();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");

  const categories = (categoriesQuery.data ?? []) as SellerCategory[];
  const products = useMemo(() => (productsQuery.data ?? []) as SellerProduct[], [productsQuery.data]);
  const resetForm = () => { setName(""); setDescription(""); setPrice(""); setStock(""); setCategoryId(null); setImageUrl(null); setShowForm(false); };
  const beginEdit = (product: SellerProduct) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditDescription(product.description ?? "");
    setEditPrice(String(product.price));
    setEditStock(String(product.stock));
  };
  const closeEditor = () => {
    setEditingProduct(null);
    setEditName("");
    setEditDescription("");
    setEditPrice("");
    setEditStock("");
  };
  const pickProductImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.72, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) throw new Error("Unable to prepare the selected image");
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB");
      const mimeType = asset.mimeType === "image/png" || asset.mimeType === "image/webp" ? asset.mimeType : "image/jpeg";
      const upload = await uploadImage.mutateAsync({ mimeType, contentBase64: asset.base64 });
      setImageUrl(upload.url);
    } catch (error) {
      Alert.alert("Image upload failed", error instanceof Error ? error.message : "Please try again.");
    }
  };
  const submit = async () => {
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);
    if (!name.trim() || !categoryId || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isInteger(parsedStock) || parsedStock < 0) {
      Alert.alert("Check product details", "Enter a name, category, positive price, and whole-number stock quantity.");
      return;
    }
    try {
      await createProduct.mutateAsync({ categoryId, name: name.trim(), description: description.trim() || undefined, price: parsedPrice, stock: parsedStock, images: imageUrl ? [imageUrl] : undefined });
      resetForm();
      Alert.alert("Product submitted", "Your product is now awaiting administrator moderation before it appears to shoppers.");
    } catch (error) {
      Alert.alert("Could not save product", error instanceof Error ? error.message : "Please try again.");
    }
  };
  const saveEdit = async () => {
    if (!editingProduct) return;
    const parsedPrice = Number(editPrice);
    const parsedStock = Number(editStock);
    if (!editName.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isInteger(parsedStock) || parsedStock < 0) {
      Alert.alert("Check product details", "Enter a product name, positive price, and whole-number stock quantity.");
      return;
    }
    try {
      await updateProduct.mutateAsync({ id: editingProduct.id, name: editName.trim(), description: editDescription.trim() || undefined, price: parsedPrice, stock: parsedStock });
      closeEditor();
      Alert.alert("Product updated", "The updated product is awaiting catalogue moderation before it is visible to shoppers.");
    } catch (error) {
      Alert.alert("Could not update product", error instanceof Error ? error.message : "Please try again.");
    }
  };
  const adjustStock = (product: SellerProduct, difference: number) => {
    const nextStock = Math.max(0, Number(product.stock || 0) + difference);
    if (nextStock === Number(product.stock || 0)) return;
    updateProduct.mutate({ id: product.id, stock: nextStock }, { onError: (error) => Alert.alert("Could not update stock", error.message || "Please try again.") });
  };

  if (profileQuery.isLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#2E7D32" /></ScreenContainer>;
  if (!approved) {
    return (
      <ScreenContainer className="bg-[#F6FAF4]" containerClassName="bg-[#F6FAF4]">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full rounded-3xl border border-[#F8D988] bg-[#FFFBEA] p-6">
            <Ionicons name="lock-closed-outline" size={34} color="#A16207" />
            <Text className="mt-4 text-2xl font-extrabold text-[#173C25]">Catalog access is locked</Text>
            <Text className="mt-2 text-sm leading-5 text-[#68776D]">Your seller profile must be approved by the Ghar Ghar Mart administrator before you can add or manage products.</Text>
            <Pressable onPress={() => router.replace("/seller-dashboard")} style={({ pressed }) => ({ marginTop: 20, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}><Text className="text-base font-extrabold text-white">View application status</Text></Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-[#F6FAF4]" containerClassName="bg-[#F6FAF4]">
      <View className="bg-[#14532D] px-5 py-5">
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-sm font-bold text-[#FDE68A]">‹ Seller workspace</Text></Pressable>
        <View className="mt-4 flex-row items-end justify-between">
          <View><Text className="text-xs font-bold uppercase tracking-[2px] text-[#BBF7D0]">Verified catalog</Text><Text className="mt-1 text-3xl font-extrabold text-white">My products</Text></View>
          <Pressable onPress={() => setShowForm(true)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", borderRadius: 14, backgroundColor: "#FDE68A", paddingHorizontal: 14, paddingVertical: 11, opacity: pressed ? 0.7 : 1 })}><Ionicons name="add" size={19} color="#14532D" /><Text className="ml-1 text-sm font-extrabold text-[#14532D]">Add</Text></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="text-sm text-[#68776D]">Products are linked to your approved seller account and appear to shoppers when active.</Text>
        {productsQuery.isLoading ? <ActivityIndicator className="mt-8" color="#2E7D32" /> : null}
        {products.length === 0 && !productsQuery.isLoading ? <View className="mt-6 items-center rounded-3xl border border-dashed border-[#B9D9B8] bg-white px-6 py-10"><Ionicons name="cube-outline" size={38} color="#2E7D32" /><Text className="mt-3 text-lg font-extrabold text-[#173C25]">Your catalog is ready</Text><Text className="mt-1 text-center text-sm leading-5 text-[#68776D]">Add your first product to start selling with Ghar Ghar Mart.</Text><Pressable onPress={() => setShowForm(true)} style={({ pressed }) => ({ marginTop: 18, borderRadius: 14, backgroundColor: "#2E7D32", paddingHorizontal: 18, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}><Text className="font-extrabold text-white">Add first product</Text></Pressable></View> : null}
        {products.map((product) => { const moderation = product.approvalStatus ?? "approved"; const moderationColor = moderation === "approved" ? "text-[#166534]" : moderation === "rejected" ? "text-[#B91C1C]" : "text-[#A16207]"; return <View key={product.id} className="mt-4 rounded-3xl border border-[#DCE9D9] bg-white p-4"><View className="flex-row justify-between"><View className="flex-1 pr-3"><Text className="text-lg font-extrabold text-[#173C25]">{product.name}</Text><Text className="mt-1 text-sm text-[#68776D]">Stock: {product.stock} · ₹{product.price}</Text><Text className={`mt-2 text-xs font-bold uppercase tracking-wide ${moderationColor}`}>{moderation === "approved" ? "Live to shoppers" : moderation === "rejected" ? "Needs changes before approval" : "Awaiting moderation"}</Text>{product.moderationNote ? <Text className="mt-1 text-xs text-[#68776D]">Admin note: {product.moderationNote}</Text> : null}</View><View className={`rounded-full px-3 py-1 ${Number(product.stock) > 0 ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"}`}><Text className={`text-xs font-extrabold ${Number(product.stock) > 0 ? "text-[#166534]" : "text-[#B91C1C]"}`}>{Number(product.stock) > 0 ? "IN STOCK" : "OUT"}</Text></View></View><View className="mt-4 flex-row items-center justify-between rounded-2xl bg-[#F6FAF4] px-3 py-2"><View><Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Quick stock update</Text><Text className="mt-1 text-sm font-extrabold text-[#173C25]">{product.stock} units available</Text></View><View className="flex-row items-center gap-2"><Pressable disabled={updateProduct.isPending || Number(product.stock) <= 0} onPress={() => adjustStock(product, -1)} style={({ pressed }) => ({ height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "white", opacity: pressed || updateProduct.isPending || Number(product.stock) <= 0 ? 0.45 : 1 })}><Ionicons name="remove" size={18} color="#2E7D32" /></Pressable><Pressable disabled={updateProduct.isPending} onPress={() => adjustStock(product, 1)} style={({ pressed }) => ({ height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#E8F5E9", opacity: pressed || updateProduct.isPending ? 0.45 : 1 })}><Ionicons name="add" size={18} color="#2E7D32" /></Pressable></View></View><View className="mt-4 flex-row items-center gap-4"><Pressable onPress={() => beginEdit(product)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-sm font-bold text-[#2E7D32]">Edit product</Text></Pressable><Pressable onPress={() => Alert.alert("Remove product", `Remove ${product.name} from your catalog?`, [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => deleteProduct.mutate(product.id) }])} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-sm font-bold text-[#B91C1C]">Remove product</Text></Pressable></View></View>; })}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={resetForm}>
        <View className="flex-1 justify-end bg-black/45"><View className="max-h-[90%] rounded-t-[32px] bg-white p-5"><View className="h-1.5 w-12 self-center rounded-full bg-[#DCE9D9]" /><ScrollView showsVerticalScrollIndicator={false}><Text className="mt-5 text-xl font-extrabold text-[#173C25]">Add a product</Text><Text className="mt-1 text-sm text-[#68776D]">Keep names, prices and stock accurate for customer trust.</Text>
          <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Product name</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Organic tomatoes" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" />
          <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-[#68776D]">Description</Text><TextInput value={description} onChangeText={setDescription} multiline placeholder="Short product description" placeholderTextColor="#9AA79E" className="mt-2 min-h-[80px] rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" />
          <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-[#68776D]">Product image</Text><Pressable onPress={pickProductImage} disabled={uploadImage.isPending} style={({ pressed }) => ({ marginTop: 8, minHeight: 92, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 18, borderWidth: 1, borderStyle: "dashed", borderColor: "#B9D9B8", backgroundColor: "#F6FAF4", opacity: pressed || uploadImage.isPending ? 0.65 : 1 })}>{uploadImage.isPending ? <ActivityIndicator color="#2E7D32" /> : imageUrl ? <Image source={{ uri: imageUrl }} style={{ width: "100%", height: 128 }} resizeMode="cover" /> : <><Ionicons name="image-outline" size={26} color="#2E7D32" /><Text className="mt-2 text-sm font-bold text-[#2E7D32]">Choose product image</Text></>}</Pressable><Text className="mt-2 text-xs text-[#68776D]">Optional · JPG, PNG or WebP under 5 MB. Images are reviewed with the product.</Text>
          <View className="mt-4 flex-row gap-3"><View className="flex-1"><Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Price (₹)</Text><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" /></View><View className="flex-1"><Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Stock</Text><TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" /></View></View>
          <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Category</Text><View className="mt-2 flex-row flex-wrap gap-2">{categories.map((category) => <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={({ pressed }) => ({ borderRadius: 14, backgroundColor: categoryId === category.id ? "#2E7D32" : "#F1F6EF", paddingHorizontal: 13, paddingVertical: 10, opacity: pressed ? 0.65 : 1 })}><Text className={`text-sm font-bold ${categoryId === category.id ? "text-white" : "text-[#58705E]"}`}>{category.name}</Text></Pressable>)}</View>
          <Pressable onPress={submit} disabled={createProduct.isPending} style={({ pressed }) => ({ marginTop: 24, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 16, opacity: pressed || createProduct.isPending ? 0.65 : 1 })}>{createProduct.isPending ? <ActivityIndicator color="white" /> : <Text className="text-base font-extrabold text-white">Save product</Text>}</Pressable><Pressable onPress={resetForm} style={({ pressed }) => ({ marginTop: 10, alignItems: "center", paddingVertical: 12, opacity: pressed ? 0.65 : 1 })}><Text className="text-sm font-bold text-[#68776D]">Cancel</Text></Pressable>
        </ScrollView></View></View>
      </Modal>
      <Modal visible={Boolean(editingProduct)} transparent animationType="slide" onRequestClose={closeEditor}>
        <View className="flex-1 justify-end bg-black/45"><View className="max-h-[90%] rounded-t-[32px] bg-white p-5"><View className="h-1.5 w-12 self-center rounded-full bg-[#DCE9D9]" /><ScrollView showsVerticalScrollIndicator={false}><Text className="mt-5 text-xl font-extrabold text-[#173C25]">Edit product</Text><Text className="mt-1 text-sm leading-5 text-[#68776D]">Name, description, and price changes are sent for moderation. Stock updates remain operational and update immediately.</Text><Text className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68776D]">Product name</Text><TextInput value={editName} onChangeText={setEditName} placeholder="Product name" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" /><Text className="mt-4 text-xs font-bold uppercase tracking-wide text-[#68776D]">Description</Text><TextInput value={editDescription} onChangeText={setEditDescription} multiline placeholder="Short product description" placeholderTextColor="#9AA79E" className="mt-2 min-h-[80px] rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" /><View className="mt-4 flex-row gap-3"><View className="flex-1"><Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Price (₹)</Text><TextInput value={editPrice} onChangeText={setEditPrice} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" /></View><View className="flex-1"><Text className="text-xs font-bold uppercase tracking-wide text-[#68776D]">Stock</Text><TextInput value={editStock} onChangeText={setEditStock} keyboardType="number-pad" placeholder="0" placeholderTextColor="#9AA79E" className="mt-2 rounded-2xl border border-[#DCE9D9] bg-[#F9FCF8] px-4 py-3 text-base text-[#173C25]" /></View></View><Pressable onPress={saveEdit} disabled={updateProduct.isPending} style={({ pressed }) => ({ marginTop: 24, alignItems: "center", borderRadius: 16, backgroundColor: "#2E7D32", paddingVertical: 16, opacity: pressed || updateProduct.isPending ? 0.65 : 1 })}>{updateProduct.isPending ? <ActivityIndicator color="white" /> : <Text className="text-base font-extrabold text-white">Save changes</Text>}</Pressable><Pressable onPress={closeEditor} style={({ pressed }) => ({ marginTop: 10, alignItems: "center", paddingVertical: 12, opacity: pressed ? 0.65 : 1 })}><Text className="text-sm font-bold text-[#68776D]">Cancel</Text></Pressable></ScrollView></View></View>
      </Modal>
    </ScreenContainer>
  );
}
