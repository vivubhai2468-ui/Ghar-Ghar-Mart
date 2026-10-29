import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ONBOARDING_SCREENS = [
  {
    id: 1,
    title: 'Shop from Nearby Stores',
    description: 'Discover and shop from a wide variety of nearby stores with just a few taps.',
    icon: '🏪',
  },
  {
    id: 2,
    title: 'Fast and Secure Delivery',
    description: 'Get your orders delivered quickly and securely to your doorstep.',
    icon: '🚚',
  },
  {
    id: 3,
    title: 'Easy Ordering with Live Tracking',
    description: 'Track your order in real-time and know exactly when it will arrive.',
    icon: '📍',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const colors = useColors();

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    router.replace('/login');
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SCREENS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    router.replace('/login');
  };

  const currentScreen = ONBOARDING_SCREENS[currentIndex];
  const isLastScreen = currentIndex === ONBOARDING_SCREENS.length - 1;

  return (
    <ScreenContainer
      containerClassName="bg-background"
      className="flex-1 justify-between"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{currentScreen.icon}</Text>
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: colors.foreground },
          ]}
        >
          {currentScreen.title}
        </Text>

        {/* Description */}
        <Text
          style={[
            styles.description,
            { color: colors.muted },
          ]}
        >
          {currentScreen.description}
        </Text>
      </ScrollView>

      {/* Indicators */}
      <View style={styles.indicatorsContainer}>
        {ONBOARDING_SCREENS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor:
                  index === currentIndex ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          onPress={handleSkip}
          style={[styles.skipButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.skipButtonText, { color: colors.muted }]}>
            Skip
          </Text>
        </TouchableOpacity>

        {!isLastScreen ? (
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.nextButtonText, { color: colors.background }]}>
              Next
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleGetStarted}
            style={[styles.getStartedButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.getStartedButtonText, { color: colors.background }]}>
              Get Started
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 30,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  getStartedButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
