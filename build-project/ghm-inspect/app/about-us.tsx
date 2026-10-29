import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { Ionicons } from '@expo/vector-icons';

export default function AboutUsScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer className="bg-background p-0">
      <View className="bg-primary px-4 py-6">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">About Us</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          About Ghar Ghar Mart
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          Welcome to Ghar Ghar Mart, your trusted grocery delivery platform dedicated to bringing fresh groceries, daily essentials, household products, fruits, vegetables, dairy items, snacks, beverages, and much more directly to your doorstep.
        </Text>

        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          Our Mission
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          Our mission is to make grocery shopping fast, convenient, affordable, and reliable for every household. We partner with trusted local sellers to ensure high-quality products at competitive prices while supporting local businesses.
        </Text>

        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          Why Choose Ghar Ghar Mart?
        </Text>

        <View className="mb-6">
          {[
            '✓ Fresh groceries delivered quickly',
            '✓ Affordable prices and exciting offers',
            '✓ Secure online payments',
            '✓ Easy order tracking',
            '✓ Trusted local sellers',
            '✓ Friendly customer support',
            '✓ Safe and reliable delivery',
          ].map((item, index) => (
            <Text
              key={index}
              className="text-base leading-relaxed mb-2"
              style={{ color: colors.foreground }}
            >
              {item}
            </Text>
          ))}
        </View>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          We continuously improve our platform to provide the best shopping experience for our customers.
        </Text>

        <View className="bg-primary/10 rounded-lg p-4 mb-6" style={{ borderColor: colors.primary }}>
          <Text className="text-base font-semibold" style={{ color: colors.primary }}>
            Thank you for choosing Ghar Ghar Mart.
          </Text>
        </View>

        <Text className="text-xs text-center mb-6" style={{ color: colors.muted }}>
          Version 1.0.0 • © 2026 Ghar Ghar Mart
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
