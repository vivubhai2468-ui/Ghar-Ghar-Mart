import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Image } from 'react-native';
import { PROMOS } from '@/lib/coupons-data';
import { trpc } from '@/lib/trpc';

interface PromoBannerProps {
  onPromoSelect?: (promo: {
    actionType?: 'none' | 'coupon' | 'category' | 'url';
    actionValue?: string | null;
    couponCode?: string | null;
    code?: string;
  }) => void;
}

export function PromoBanner({ onPromoSelect }: PromoBannerProps) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bannersQuery = trpc.banners.list.useQuery(undefined, {
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const liveBanners = bannersQuery.data ?? [];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim }} className="px-4 py-3">
      <Text className="text-foreground font-bold text-lg mb-3">
        🎉 Special Offers
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
      >
        {(liveBanners.length ? liveBanners : PROMOS).map((promo: any) => (
          <Pressable
            key={promo.id}
            onPress={() => {
              onPromoSelect?.(promo);
            }}
            className="mr-3 rounded-lg overflow-hidden bg-surface border border-border w-56"
          >
            {/* Promo Image */}
            {promo.imageUrl || promo.image ? (
              <Image
                source={{ uri: promo.imageUrl || promo.image }}
                className="w-full h-24"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-24 justify-end p-3" style={{ backgroundColor: promo.backgroundColor || '#FFF7D1' }}>
                <Text className="text-foreground font-extrabold text-base">{promo.badgeText || 'Fresh value'}</Text>
              </View>
            )}

            {/* Promo Info */}
            <View className="p-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-foreground font-bold text-sm flex-1">
                  {promo.title}
                </Text>
                <View className="bg-secondary rounded-full px-2 py-1">
                  <Text className="text-black font-bold text-xs">
                  {promo.badgeText || `${promo.discountPercentage}% OFF`}
                  </Text>
                </View>
              </View>

              <Text className="text-muted text-xs mb-2 line-clamp-1">
                {promo.description}
              </Text>

              <View className="flex-row items-center justify-between">
                <Text className="text-muted text-xs">
                  {promo.endsAt || promo.validTill ? `Valid till ${new Date(promo.endsAt || promo.validTill).toLocaleDateString()}` : 'Limited-time offer'}
                </Text>
                {(promo.couponCode || promo.code) && (
                  <View className="bg-primary/20 rounded px-2 py-1">
                    <Text className="text-secondary text-xs font-bold">
                      {promo.couponCode || promo.code}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
