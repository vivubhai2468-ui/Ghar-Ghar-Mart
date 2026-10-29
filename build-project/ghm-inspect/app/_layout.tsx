import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import "@/lib/_core/nativewind-pressable";
import "@/lib/delivery-background-location";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AdminAuthProvider } from "@/lib/admin-auth-context";
import { CartProvider } from "@/lib/cart-context";
import { CouponProvider } from "@/lib/coupon-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import * as SplashScreen from 'expo-splash-screen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function DeliveryPushRegistration() {
  const { user } = useAuth();
  const registerToken = trpc.delivery.registerDeviceToken.useMutation();

  useEffect(() => {
    if (!user || Platform.OS === "web") return;
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("delivery-updates", {
            name: "Delivery updates",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          });
          await Notifications.setNotificationChannelAsync("seller-alerts", {
            name: "Seller alerts",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 180, 120, 180],
          });
        }
        const permissions = await Notifications.getPermissionsAsync();
        const status = permissions.status === "granted" ? permissions.status : (await Notifications.requestPermissionsAsync()).status;
        if (status !== "granted" || cancelled) return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) return;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        if (!cancelled && token) {
          await registerToken.mutateAsync({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
        }
      } catch {
        // Push registration is optional and can be unavailable in Expo Go or on
        // devices without a configured notification token. Keep this silent so
        // infrastructure limitations never become a technical popup for users.
      }
    })();
    return () => { cancelled = true; };
  }, [user, registerToken]);

  return null;
}

console.log('[APP] App mounted');

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  console.log('[APP] RootLayout rendering');
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    console.log('[APP] Initializing Manus runtime');
    initManusRuntime();
    console.log('[APP] Manus runtime initialized');
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AdminAuthProvider>
              <CartProvider>
                <CouponProvider>
                  <WishlistProvider>
                      <DeliveryPushRegistration />
                  {/* Suppress native header rendering. Expo Router will render custom headers via Stack.Screen options. */}
                  {/* This prevents the native header from hiding and raw route segments from appearing (e.g. "(tabs)", "products/[id]"). */}
                  {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
                  {/* In order for iOS apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal" */}
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="splash" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="reset-password" />
                    <Stack.Screen name="register" />
                    <Stack.Screen name="delivery-register" />
                    <Stack.Screen name="admin-login" />
                  <Stack.Screen name="admin-dashboard" />
                  <Stack.Screen name="admin-records" />
                  <Stack.Screen name="admin-banners" />
                  <Stack.Screen name="admin-delivery" />
                  <Stack.Screen name="admin-verification" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="oauth/callback" />
                    <Stack.Screen name="product-detail" />
	                  <Stack.Screen name="delivery-partner" />
	                  <Stack.Screen name="delivery-navigation" />
	                  <Stack.Screen name="delivery-turn-navigation" />
	                  <Stack.Screen name="delivery-background" />
                  <Stack.Screen name="delivery-earnings" />
                  <Stack.Screen name="delivery-confirmation" />
                  <Stack.Screen name="order-tracking" />
                  <Stack.Screen name="seller-verification" />
                  <Stack.Screen name="seller-payout" />
                  <Stack.Screen name="seller-orders" />
                  <Stack.Screen name="seller-products" />
                  <Stack.Screen name="seller-profile" />
                  </Stack>
                    <StatusBar style="auto" />
                  </WishlistProvider>
                </CouponProvider>
              </CartProvider>
            </AdminAuthProvider>
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
  console.log('[APP] Content structure created');

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        <SafeAreaFrameContext.Provider value={frame}>
          <SafeAreaInsetsContext.Provider value={insets}>
            <ThemeProvider>{content}</ThemeProvider>
          </SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
      </SafeAreaProvider>
    );
  }

  console.log('[APP] Navigator rendering');
  return (
    <SafeAreaProvider initialMetrics={providerInitialMetrics}>
      <ThemeProvider>{content}</ThemeProvider>
    </SafeAreaProvider>
  );
}
