import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Image,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useCart } from "@/lib/cart-context";
import { PRODUCTS } from "@/lib/products-data";
import { router, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const productId = Number(Array.isArray(id) ? id[0] : id);
  const productQuery = trpc.products.getById.useQuery(productId, { enabled: Number.isFinite(productId) });
  const liveProduct = productQuery.data;
  const product = liveProduct ? {
    id: String(liveProduct.id),
    sellerId: Number(liveProduct.sellerId),
    name: liveProduct.name,
    category: "Groceries",
    unit: liveProduct.description?.match(/·\s*([^·]+)/)?.[1] ?? "1 pack",
    price: Number(liveProduct.price),
    originalPrice: Number(liveProduct.originalPrice ?? liveProduct.price),
    discount: Number(liveProduct.discount ?? 0),
    rating: Number(liveProduct.rating ?? 0),
    reviews: Number(liveProduct.reviewCount ?? 0),
    image: liveProduct.images?.[0] ?? "https://via.placeholder.com/400x400?text=Grocery",
    stock: Number(liveProduct.stock ?? 0),
    description: liveProduct.description ?? "Everyday grocery essential",
  } : PRODUCTS.find((item) => item.id === id);
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const imageZoomAnim = useRef(new Animated.Value(1)).current;

  if (productQuery.isLoading) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#2E7D32" /><Text className="mt-3 text-muted">Loading product…</Text></ScreenContainer>;
  }

  if (!product) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-foreground text-lg">Product not found</Text>
      </ScreenContainer>
    );
  }

  const handleAddToCart = async () => {
    setIsAdding(true);

    // Animate button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Add to cart
    setTimeout(() => {
      for (let i = 0; i < quantity; i++) {
        addItem({
          id: `${product.id}-${Date.now()}-${i}`,
          productId: product.id,
          productName: product.name,
          price: product.price,
          image: product.image,
          sellerId: product.sellerId,
          quantity: 1,
        });
      }

      setIsAdding(false);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1500);
    }, 300);
  };

  const handleImageZoom = () => {
    Animated.sequence([
      Animated.timing(imageZoomAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(imageZoomAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
          <Pressable onPress={() => router.back()}>
            <Text className="text-2xl">←</Text>
          </Pressable>
          <Text className="text-foreground font-bold text-lg flex-1 text-center ml-4">
            Product Details
          </Text>
          <Pressable>
            <Text className="text-2xl">❤️</Text>
          </Pressable>
        </View>

        {/* Product Image */}
        <Animated.View
          style={{ transform: [{ scale: imageZoomAnim }] }}
          className="bg-surface m-4 rounded-2xl overflow-hidden"
        >
          <Pressable onPress={handleImageZoom}>
            <Image
              source={{ uri: product.image }}
              className="w-full h-80"
              resizeMode="cover"
            />
          </Pressable>

          {/* Discount Badge */}
          {product.discount > 0 && (
            <View className="absolute top-4 right-4 bg-error rounded-full px-3 py-1">
              <Text className="text-white font-bold text-sm">
                {product.discount}% OFF
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Product Info */}
        <View className="px-4 py-4">
          <Text className="text-foreground font-bold text-2xl mb-2">
            {product.name}
          </Text>
          <Text className="text-muted text-sm mb-3">{product.unit}</Text>

          {/* Rating */}
          <View className="flex-row items-center mb-4">
            <Text className="text-lg">⭐</Text>
            <Text className="text-muted text-sm ml-2">
              {product.rating} ({product.reviews} reviews)
            </Text>
          </View>

          {/* Price */}
          <View className="flex-row items-center gap-3 mb-4">
            <Text className="text-secondary font-bold text-3xl">
              ₹{product.price}
            </Text>
            {product.originalPrice > product.price && (
              <Text className="text-muted text-lg line-through">
                ₹{product.originalPrice}
              </Text>
            )}
          </View>

          {/* Stock Status */}
          <View className="bg-surface rounded-lg p-3 mb-4">
            <Text className="text-success font-semibold">
              ✓ {product.stock > 10 ? "In Stock" : `Only ${product.stock} left`}
            </Text>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-foreground font-semibold mb-2">
              Description
            </Text>
            <Text className="text-muted text-sm leading-6">
              {product.description}
            </Text>
          </View>

          {/* Quantity Selector */}
          <View className="bg-surface rounded-lg p-4 mb-4">
            <Text className="text-foreground font-semibold mb-3">Quantity</Text>
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 bg-primary rounded-lg items-center justify-center"
              >
                <Text className="text-white font-bold text-lg">−</Text>
              </Pressable>
              <Text className="text-foreground font-bold text-lg flex-1 text-center">
                {quantity}
              </Text>
              <Pressable
                onPress={() => setQuantity(quantity + 1)}
                className="w-10 h-10 bg-primary rounded-lg items-center justify-center"
              >
                <Text className="text-white font-bold text-lg">+</Text>
              </Pressable>
            </View>
          </View>

          {/* Add to Cart Button */}
          <Animated.View
            style={{ transform: [{ scale: scaleAnim }] }}
            className="mb-4"
          >
            <Pressable
              onPress={handleAddToCart}
              disabled={isAdding}
              className={`rounded-lg py-4 items-center justify-center flex-row gap-2 ${
                isAdding ? "bg-primary/70" : "bg-primary"
              }`}
            >
              {isAdding ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-bold">Adding...</Text>
                </>
              ) : (
                <>
                  <Text className="text-white text-xl">🛒</Text>
                  <Text className="text-white font-bold">Add to Cart</Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Success Message */}
          {showSuccess && (
            <View className="bg-success/20 rounded-lg p-3 items-center">
              <Text className="text-success font-bold">
                ✓ Added to Cart Successfully!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
