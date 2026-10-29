import { ScrollView, Text, View, FlatList, Pressable, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useCart } from "@/lib/cart-context";
import { CouponInput } from "@/components/coupon-input";
import { useCoupon } from "@/lib/coupon-context";
import { calculateDiscount } from "@/lib/coupons-data";
import { router, useLocalSearchParams } from "expo-router";
import { ProductImage } from "@/components/product-image";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

export default function CartScreen() {
  const { couponCode } = useLocalSearchParams<{ couponCode?: string | string[] }>();
  const { items, getTotalItems, getSubtotal, removeItem, updateQuantity } = useCart();
  const { user } = useAuth();
  const { appliedCoupon } = useCoupon();
  const [couponDiscount, setCouponDiscount] = useState(0);

  const subtotal = getSubtotal();
  const discount = appliedCoupon ? calculateDiscount(appliedCoupon, subtotal) : couponDiscount;
  const addressesQuery = trpc.addresses.list.useQuery(undefined, { enabled: Boolean(user && user.role !== "guest") });
  const address = (addressesQuery.data ?? [])[0] as { latitude?: number | string; longitude?: number | string } | undefined;
  const sellerId = Number(items[0]?.sellerId ?? 0);
  const quoteQuery = trpc.delivery.quote.useQuery({ sellerId: sellerId || 1, deliveryLatitude: Number(address?.latitude ?? 0), deliveryLongitude: Number(address?.longitude ?? 0) }, { enabled: Boolean(sellerId && address), refetchOnWindowFocus: true });
  const deliveryCharge = quoteQuery.data?.deliveryCharge;
  const total = deliveryCharge === undefined ? null : Math.max(0, subtotal + deliveryCharge - discount);

  const handleContinueShopping = () => {
    router.back();
  };

  if (items.length === 0) {
    return (
      <ScreenContainer className="items-center justify-center bg-white">
        <View className="items-center">
          <View className="w-20 h-20 rounded-full bg-lightGreen items-center justify-center mb-4">
            <Ionicons name="cart-outline" size={40} color="#2E7D32" />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2">
            Your Cart is Empty
          </Text>
          <Text className="text-sm text-muted text-center mb-6 px-4">
            Add some delicious products to get started!
          </Text>
          <Pressable
            onPress={handleContinueShopping}
            className="bg-primary px-8 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Continue Shopping</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 py-4 bg-primary">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-white">
                Your Cart
              </Text>
              <Text className="text-sm text-white opacity-90 mt-1">
                {getTotalItems()} items
              </Text>
            </View>
            <Pressable onPress={handleContinueShopping}>
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
          </View>
        </View>

        {/* Cart Items */}
        <FlatList
          data={items}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4 py-3 border-b border-border">
              <View className="flex-row gap-3">
                {/* Product Image */}
                <ProductImage
                  uri={item.image || ""}
                  alt={item.productName}
                  containerClassName="w-20 h-20 rounded-lg"
                />

                {/* Product Info */}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground mb-1">
                    {item.productName}
                  </Text>
                  <Text className="text-xs text-muted mb-2">
                    ₹{item.price} each
                  </Text>

                  {/* Quantity Controls */}
                  <View className="flex-row items-center bg-lightGreen rounded-lg p-1 w-24">
                    <Pressable
                      onPress={() =>
                        updateQuantity(Number(item.productId), item.quantity - 1)
                      }
                      className="px-2 py-1"
                    >
                      <Text className="text-primary font-bold text-lg">−</Text>
                    </Pressable>
                    <Text className="flex-1 text-center text-sm font-semibold text-foreground">
                      {item.quantity}
                    </Text>
                    <Pressable
                      onPress={() =>
                        updateQuantity(Number(item.productId), item.quantity + 1)
                      }
                      className="px-2 py-1"
                    >
                      <Text className="text-primary font-bold text-lg">+</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Remove Button */}
                <Pressable
                  onPress={() => removeItem(Number(item.productId))}
                  className="ml-2 justify-center"
                >
                  <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                </Pressable>
              </View>

              {/* Item Total */}
              <View className="flex-row justify-between mt-2 pt-2 border-t border-border">
                <Text className="text-xs text-muted">Subtotal:</Text>
                <Text className="text-sm font-semibold text-foreground">
                  ₹{(item.price * item.quantity).toFixed(0)}
                </Text>
              </View>
            </View>
          )}
        />

        {/* Coupon Section */}
        <View className="px-4 py-4">
          <CouponInput orderAmount={subtotal} initialCode={Array.isArray(couponCode) ? couponCode[0] : couponCode} />
        </View>

        {/* Price Breakdown */}
        <View className="px-4 py-4 bg-surface rounded-2xl m-4">
          <Text className="text-lg font-bold text-foreground mb-4">
            Price Breakdown
          </Text>

          {/* Product Total */}
          <View className="flex-row justify-between mb-3">
            <Text className="text-sm text-muted">Product Total</Text>
            <Text className="text-sm font-semibold text-foreground">
              ₹{subtotal.toFixed(0)}
            </Text>
          </View>

          {/* Delivery Charge */}
          <View className="flex-row justify-between mb-3">
            <Text className="text-sm text-muted">Delivery Charge</Text>
            <Text className="text-sm font-semibold text-foreground">
              {deliveryCharge === undefined ? "—" : `₹${deliveryCharge.toFixed(0)}`}
            </Text>
          </View>
          <Text className="text-xs text-muted mb-3">{quoteQuery.isFetching ? "Calculating actual road distance…" : quoteQuery.error ? "Delivery charge unavailable until the route can be calculated." : quoteQuery.data ? `Distance: ${quoteQuery.data.distanceKm.toFixed(1)} km` : "Select a delivery address at checkout."}</Text>

          {/* Discount */}
          {discount > 0 && (
            <View className="flex-row justify-between mb-3">
              <Text className="text-sm text-muted">Discount</Text>
              <Text className="text-sm font-semibold text-success">
                −₹{discount}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View className="h-px bg-border my-3" />

          {/* Grand Total */}
          <View className="flex-row justify-between">
            <Text className="text-base font-bold text-foreground">Total</Text>
            <Text className="text-base font-bold text-primary">
              {total === null ? "—" : `₹${total.toFixed(0)}`}
            </Text>
          </View>
        </View>

        {/* Proceed to Checkout */}
        <View className="px-4 py-4">
          <Pressable
            onPress={() => router.push("/checkout")}
            className="bg-primary rounded-lg py-4 items-center"
          >
            <Text className="text-white font-bold text-base">
              Proceed to Checkout
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
