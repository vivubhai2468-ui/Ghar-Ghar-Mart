import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCart } from '@/lib/cart-context';

export function CartIconHeader() {
  const { getTotalItems } = useCart();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Update cart count whenever cart changes
    const count = getTotalItems();
    setCartCount(count);
  }, [getTotalItems]);

  const handleCartPress = () => {
    router.push('/cart');
  };

  return (
    <Pressable
      onPress={handleCartPress}
      className="relative p-2"
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text className="text-2xl">🛒</Text>
      {cartCount > 0 && (
        <View className="absolute -top-1 -right-1 bg-error rounded-full w-6 h-6 items-center justify-center border-2 border-background">
          <Text className="text-white text-xs font-bold">
            {cartCount > 99 ? '99+' : cartCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
