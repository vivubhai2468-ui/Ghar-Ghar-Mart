import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { createTRPCClient } from "@/lib/trpc";

export const DELIVERY_BACKGROUND_LOCATION_TASK = "ghar-ghar-mart-delivery-background-location";
const ACTIVE_DELIVERY_ORDER_KEY = "ghar-ghar-mart-active-delivery-order";
const backgroundClient = createTRPCClient();

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(DELIVERY_BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(DELIVERY_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const orderIdRaw = await AsyncStorage.getItem(ACTIVE_DELIVERY_ORDER_KEY);
    const orderId = Number(orderIdRaw);
    const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
    const latest = locations[locations.length - 1];
    if (!Number.isFinite(orderId) || !latest) return;
    try {
      await backgroundClient.deliveryPartner.updateLocation.mutate({
        orderId,
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
        accuracy: latest.coords.accuracy ?? undefined,
        source: "background",
      });
    } catch {
      // A subsequent location update retries when connectivity is restored.
    }
  });
}

export async function startBackgroundDeliveryTracking(orderId: number) {
  if (Platform.OS === "web" || !(await TaskManager.isAvailableAsync())) {
    throw new Error("Background GPS needs the installed Android or iOS development build, not Expo Go or web.");
  }
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") throw new Error("Allow location access before enabling background tracking.");
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") throw new Error("Choose 'Allow all the time' to keep tracking this delivery in the background.");

  await AsyncStorage.setItem(ACTIVE_DELIVERY_ORDER_KEY, String(orderId));
  if (await Location.hasStartedLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK);
  }
  await Location.startLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30_000,
    distanceInterval: 50,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Ghar Ghar Mart delivery tracking",
      notificationBody: "Sharing your route with the customer during this active delivery.",
      notificationColor: "#2E7D32",
      killServiceOnDestroy: true,
    },
  });
  return { active: true, orderId };
}

export async function stopBackgroundDeliveryTracking() {
  if (Platform.OS !== "web" && await Location.hasStartedLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK);
  }
  await AsyncStorage.removeItem(ACTIVE_DELIVERY_ORDER_KEY);
}

export async function getBackgroundDeliveryTrackingState() {
  if (Platform.OS === "web" || !(await TaskManager.isAvailableAsync())) return { active: false, orderId: null as number | null, supported: false };
  const active = await Location.hasStartedLocationUpdatesAsync(DELIVERY_BACKGROUND_LOCATION_TASK);
  const orderId = Number(await AsyncStorage.getItem(ACTIVE_DELIVERY_ORDER_KEY));
  return { active, orderId: Number.isFinite(orderId) ? orderId : null, supported: true };
}
