import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer className="bg-background p-0">
      <View className="bg-primary px-4 py-6">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Privacy Policy</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        <Text className="text-xs text-muted mb-6" style={{ color: colors.muted }}>
          Effective Date: 15 July 2026
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          Ghar Ghar Mart values your privacy. We are committed to protecting your personal information and ensuring you have a positive experience on our platform.
        </Text>

        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          Information We Collect
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          We collect the following information:
        </Text>

        <View className="mb-6">
          {[
            '• Name',
            '• Mobile Number',
            '• Email Address',
            '• Delivery Address',
            '• Device Information',
            '• Order History',
            '• Payment Details (processed securely)',
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

        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          How We Use Your Information
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          We use your information to:
        </Text>

        <View className="mb-6">
          {[
            '• Deliver orders',
            '• Process payments',
            '• Improve services',
            '• Provide customer support',
            '• Send order updates',
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

        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          Data Protection
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          We never sell your personal information. Your payment details are processed through secure payment gateways. We use industry-standard security measures to protect your data.
        </Text>

        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          Your Rights
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          You may request deletion of your account and associated data by contacting customer support.
        </Text>

        <View className="bg-primary/10 rounded-lg p-4 mb-6" style={{ borderColor: colors.primary }}>
          <Text className="text-base font-semibold" style={{ color: colors.primary }}>
            By using this application, you agree to this Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
