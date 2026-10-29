import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { Ionicons } from '@expo/vector-icons';

export default function TermsConditionsScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer className="bg-background p-0">
      <View className="bg-primary px-4 py-6">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Terms & Conditions</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          Welcome to Ghar Ghar Mart. By using this application, you agree to the following terms:
        </Text>

        <View className="mb-6">
          {[
            '1. Users must provide accurate information.',
            '2. Orders can only be canceled before processing.',
            '3. Prices may change without prior notice.',
            '4. Product availability depends on stock.',
            '5. Delivery times are estimates and may vary.',
            '6. Users are responsible for maintaining account security.',
            '7. Cashback and referral rewards may expire according to promotional rules.',
            '8. Fraudulent activities will result in account suspension.',
            '9. Ghar Ghar Mart reserves the right to update these terms at any time.',
            '10. Continued use of the application means acceptance of these terms.',
          ].map((item, index) => (
            <Text
              key={index}
              className="text-base leading-relaxed mb-3"
              style={{ color: colors.foreground }}
            >
              {item}
            </Text>
          ))}
        </View>

        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          Limitation of Liability
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          Ghar Ghar Mart is not liable for any indirect, incidental, special, consequential, or punitive damages resulting from the use of or inability to use the application or services.
        </Text>

        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          Intellectual Property
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          All content on the Ghar Ghar Mart application, including text, graphics, logos, and images, is the property of Ghar Ghar Mart or its content suppliers and is protected by international copyright laws.
        </Text>

        <Text className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>
          Governing Law
        </Text>

        <Text className="text-base leading-relaxed mb-6" style={{ color: colors.foreground }}>
          These terms and conditions are governed by and construed in accordance with the laws of India, and you irrevocably submit to the exclusive jurisdiction of the courts located in India.
        </Text>

        <View className="bg-primary/10 rounded-lg p-4 mb-6" style={{ borderColor: colors.primary }}>
          <Text className="text-base font-semibold" style={{ color: colors.primary }}>
            Last Updated: 15 July 2026
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
