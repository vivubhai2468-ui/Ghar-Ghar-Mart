import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
} from "react-native";
import { ProductImage } from "./product-image";
import { useCart } from "@/lib/cart-context";
import { Product } from "@/lib/products-data";
import { router } from "expo-router";

interface EnhancedProductCardProps {
  product: Product;
  onAddToCart?: () => void;
}

export function EnhancedProductCard({
  product,
  onAddToCart,
}: EnhancedProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleAddToCart = async () => {
    setIsAdding(true);

    // Animate button press
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

    // Simulate adding to cart
    setTimeout(() => {
      addItem({
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        price: product.price as number,
        image: product.image,
        sellerId: product.sellerId,
        quantity: 1,
      });

      setQuantity(1);
      setIsAdding(false);
      setShowSuccess(true);

      // Hide success message after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);

      onAddToCart?.();
    }, 300);
  };

  const handleIncreaseQuantity = () => {
    setQuantity(quantity + 1);
    addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      price: product.price as number,
      image: product.image,
      sellerId: product.sellerId,
      quantity: 1,
    });
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
    }
  };

  const stockStatus =
    product.stock > 10
      ? "In Stock"
      : product.stock > 0
        ? `Only ${product.stock} left`
        : "Out of Stock";

  const isOutOfStock = product.stock === 0;

  return (
    <Pressable
      onPress={() => router.push(`/product-detail?id=${product.id}`)}
      className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm"
    >
      {/* Product Image */}
      <View className="relative">
        <ProductImage
          uri={product.image}
          alt={product.name}
          containerClassName="w-full h-40"
        />

        {/* Discount Badge */}
        {product.discount > 0 && (
          <View className="absolute top-2 right-2 bg-error rounded-full px-2 py-1">
            <Text className="text-white text-xs font-bold">
              {product.discount}% OFF
            </Text>
          </View>
        )}

        {/* Stock Status */}
        <View
          className={`absolute bottom-2 left-2 px-2 py-1 rounded-full ${
            isOutOfStock ? "bg-muted" : "bg-success"
          }`}
        >
          <Text className="text-white text-xs font-semibold">
            {stockStatus}
          </Text>
        </View>
      </View>

      {/* Product Details */}
      <View className="p-3">
        {/* Product Name */}
        <Text className="text-sm font-semibold text-foreground line-clamp-2 mb-1">
          {product.name}
        </Text>

        {/* Unit */}
        <Text className="text-xs text-muted mb-2">{product.unit}</Text>

        {/* Rating */}
        <View className="flex-row items-center mb-2">
          <Text className="text-lg">⭐</Text>
          <Text className="text-xs text-muted ml-1">
            {product.rating} ({product.reviews})
          </Text>
        </View>

        {/* Price Section */}
        <View className="flex-row items-center gap-2 mb-3">
          <Text className="text-lg font-bold text-primary">
            ₹{product.price}
          </Text>
          {product.originalPrice > product.price && (
            <Text className="text-xs text-muted line-through">
              ₹{product.originalPrice}
            </Text>
          )}
        </View>

        {/* Add to Cart / Quantity Controls */}
        {quantity === 0 ? (
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
            }}
          >
            <Pressable
              onPress={handleAddToCart}
              disabled={isAdding || isOutOfStock}
              className={`rounded-lg py-2 items-center justify-center flex-row gap-2 ${
                isOutOfStock
                  ? "bg-muted/50"
                  : isAdding
                    ? "bg-primary/70"
                    : "bg-primary"
              }`}
            >
              {isAdding ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-semibold text-sm">
                    Adding...
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-white text-lg">+</Text>
                  <Text className="text-white font-semibold text-sm">
                    Add
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        ) : (
          <View className="flex-row items-center justify-between bg-lightGreen rounded-lg p-2">
            <Pressable
              onPress={handleDecreaseQuantity}
              className="w-8 h-8 items-center justify-center"
            >
              <Text className="text-primary font-bold text-lg">−</Text>
            </Pressable>
            <Text className="text-primary font-bold">{quantity}</Text>
            <Pressable
              onPress={handleIncreaseQuantity}
              className="w-8 h-8 items-center justify-center"
            >
              <Text className="text-primary font-bold text-lg">+</Text>
            </Pressable>
          </View>
        )}

        {/* Success Message */}
        {showSuccess && (
          <View className="mt-2 bg-success/10 rounded-lg p-2">
            <Text className="text-success text-xs font-semibold text-center">
              ✓ Added to Cart
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
