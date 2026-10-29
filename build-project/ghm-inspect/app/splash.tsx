import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import * as NativeSplashScreen from 'expo-splash-screen';
import { getSignedInEntryRoute } from '@/lib/entry-routing';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export default function SplashScreenComponent() {
  const router = useRouter();
  const { isLoading, isSignedIn, userRole } = useAuth();
  const mountedAt = useRef(Date.now());
  const emblemScale = useSharedValue(0.84);
  const progress = useSharedValue(0);

  useEffect(() => {
    emblemScale.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    progress.value = withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.cubic) });

    if (isLoading) return;
    const minimumWelcomeDuration = 5000;
    const remainingDuration = Math.max(0, minimumWelcomeDuration - (Date.now() - mountedAt.current));
    const timer = setTimeout(() => {
      NativeSplashScreen.hideAsync().catch(() => undefined);
      router.replace(isSignedIn ? getSignedInEntryRoute(userRole) : '/onboarding');
    }, remainingDuration);
    return () => clearTimeout(timer);
  }, [emblemScale, isLoading, isSignedIn, progress, router, userRole]);

  const emblemStyle = useAnimatedStyle(() => ({ transform: [{ scale: emblemScale.value }] }));
  const progressStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#146B32" />
      <View style={styles.sun} />
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <View style={styles.topLabel}>
        <Ionicons name="leaf" size={14} color="#DDF6E4" />
        <Text style={styles.topLabelText}>FRESH. LOCAL. TRUSTED.</Text>
      </View>

      <View style={styles.centerContent}>
        <Animated.View style={[styles.emblemOuter, emblemStyle]}>
          <View style={styles.emblemInner}>
            <Animated.View entering={FadeInDown.delay(150).duration(430)}>
              <Ionicons name="storefront" size={52} color="#146B32" />
            </Animated.View>
            <View style={styles.emblemSpark}>
              <Ionicons name="leaf" size={15} color="#146B32" />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).duration(500)} style={styles.wordmarkBlock}>
          <Text style={styles.wordmark}>Ghar Ghar</Text>
          <Text style={styles.wordmarkAccent}>Mart</Text>
          <Text style={styles.tagline}>Fresh groceries, right at your doorstep.</Text>
          <Text style={styles.deliveryOffer}>Delivery starting at ₹10</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(320).duration(500)} style={styles.loadingArea}>
        <View style={styles.loadingCopyRow}>
          <Text style={styles.loadingCopy}>{isLoading ? 'Preparing your fresh picks' : 'Welcome home'}</Text>
          <Text style={styles.loadingPercent}>{isLoading ? 'SYNCING' : 'READY'}</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <Text style={styles.loadingHint}>Your everyday essentials, thoughtfully delivered.</Text>
      </Animated.View>

      <View style={styles.bottomBrand}>
        <View style={styles.bottomDivider} />
        <Text style={styles.bottomBrandText}>INDIA&apos;S NEIGHBOURHOOD GROCERY SERVICE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#146B32', overflow: 'hidden', paddingHorizontal: 28, paddingTop: 62, paddingBottom: 34 },
  sun: { position: 'absolute', width: 310, height: 310, borderRadius: 155, backgroundColor: '#FFC107', top: -140, right: -120, opacity: 0.98 },
  orbTop: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 32, borderColor: 'rgba(255,255,255,0.06)', top: 80, left: -105 },
  orbBottom: { position: 'absolute', width: 270, height: 270, borderRadius: 135, backgroundColor: 'rgba(5,64,27,0.24)', bottom: -165, right: -88 },
  topLabel: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, borderWidth: 1, borderColor: 'rgba(221,246,228,0.32)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.06)' },
  topLabelText: { color: '#DDF6E4', fontSize: 10, fontWeight: '800', letterSpacing: 1.15 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  emblemOuter: { width: 144, height: 144, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', shadowColor: '#062E15', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 20, elevation: 8 },
  emblemInner: { width: 116, height: 116, borderRadius: 36, backgroundColor: '#FFF9E7', alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: 'rgba(255,255,255,0.42)' },
  emblemSpark: { position: 'absolute', bottom: -7, right: -7, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFC107', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#146B32' },
  wordmarkBlock: { alignItems: 'center', marginTop: 25 },
  wordmark: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -1.2, lineHeight: 38 },
  wordmarkAccent: { color: '#FFC107', fontSize: 34, fontWeight: '800', letterSpacing: -1.2, lineHeight: 38 },
  tagline: { color: '#DDF6E4', fontSize: 14, fontWeight: '500', textAlign: 'center', marginTop: 13, letterSpacing: 0.1 },
  deliveryOffer: { color: '#FFC107', fontSize: 19, fontWeight: '800', textAlign: 'center', marginTop: 16, letterSpacing: 0.2 },
  loadingArea: { marginBottom: 34 },
  loadingCopyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  loadingCopy: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  loadingPercent: { color: '#FFC107', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  progressTrack: { height: 7, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  progressFill: { flex: 1, backgroundColor: '#FFC107', borderRadius: 7 },
  loadingHint: { color: 'rgba(221,246,228,0.76)', fontSize: 11, marginTop: 11 },
  bottomBrand: { alignItems: 'center', gap: 11 },
  bottomDivider: { width: 36, height: 2, backgroundColor: '#FFC107', borderRadius: 2 },
  bottomBrandText: { color: 'rgba(221,246,228,0.74)', fontSize: 9, fontWeight: '700', letterSpacing: 1.15, textAlign: 'center' },
});
