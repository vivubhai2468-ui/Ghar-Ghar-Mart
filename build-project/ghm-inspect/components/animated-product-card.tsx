import React, { useEffect } from 'react';
import { Animated, Pressable, View, Text } from 'react-native';
import { ProductImage } from './product-image';
import { createFadeInAnimation, createScaleAnimation } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface AnimatedProductCardProps {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image?: string;
  rating?: number;
  reviewCount?: number;
  onPress?: () => void;
  onAddToCart?: () => void;
  delay?: number;
}

export function AnimatedProductCard({
  id,
  name,
  price,
  originalPrice,
  discount,
  image,
  rating = 4.5,
  reviewCount = 0,
  onPress,
  onAddToCart,
  delay = 0,
}: AnimatedProductCardProps) {
  const { fadeAnim, startAnimation: startFade } = createFadeInAnimation(400);
  const { scaleAnim, scaleDown, scaleUp } = createScaleAnimation(1, 0.97, 100);

  useEffect(() => {
    // Start fade animation with delay
    setTimeout(() => {
      startFade();
    }, delay);
  }, [delay, startFade]);

  const handlePressIn = () => {
    scaleDown();
  };

  const handlePressOut = () => {
    scaleUp();
  };

  const handlePress = () => {
    onPress?.();
  };

  const handleAddToCart = () => {
    // Trigger ripple effect
    scaleDown();
    setTimeout(() => {
      scaleUp();
      onAddToCart?.();
    }, 100);
  };

  const discountPercentage = discount || (originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="bg-surface rounded-lg overflow-hidden mb-4 shadow-sm"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View className="relative">
          {/* Product Image */}
          <ProductImage
            uri={image}
            alt={name}
            className="w-full h-40"
            containerClassName="bg-surface"
          />

          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <View className="absolute top-2 right-2 bg-error rounded-full px-2 py-1">
              <Text className="text-white text-xs font-bold">
                -{discountPercentage}%
              </Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View className="p-3">
          {/* Product Name */}
          <Text
            className="text-sm font-semibold text-foreground mb-1 line-clamp-2"
            numberOfLines={2}
          >
            {name}
          </Text>

          {/* Rating */}
          {rating > 0 && (
            <View className="flex-row items-center mb-2">
              <Text className="text-yellow-500 text-xs">★</Text>
              <Text className="text-xs text-muted ml-1">
                {rating.toFixed(1)} ({reviewCount} reviews)
              </Text>
            </View>
          )}

          {/* Price Section */}
          <View className="flex-row items-center mb-3">
            <Text className="text-lg font-bold text-primary">
              ₹{price.toFixed(0)}
            </Text>
            {originalPrice && originalPrice > price && (
              <Text className="text-xs text-muted line-through ml-2">
                ₹{originalPrice.toFixed(0)}
              </Text>
            )}
          </View>

          {/* Add to Cart Button */}
          <Pressable
            onPress={handleAddToCart}
            className="bg-primary rounded-lg py-2 items-center active:opacity-80"
          >
            <Text className="text-white text-sm font-semibold">
              Add to Cart
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}
