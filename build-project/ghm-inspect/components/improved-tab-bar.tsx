import React from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ImprovedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");
  const tabWidth = width / state.routes.length;
  const bottomPadding = Math.max(insets.bottom, 8);

  const tabConfig: Record<string, { label: string; icon: string; activeIcon: string }> = {
    index: { label: "Home", icon: "home-outline", activeIcon: "home" },
    categories: { label: "Categories", icon: "grid-outline", activeIcon: "grid" },
    orders: { label: "Orders", icon: "receipt-outline", activeIcon: "receipt" },
    wishlist: { label: "Wishlist", icon: "heart-outline", activeIcon: "heart" },
    profile: { label: "Profile", icon: "person-outline", activeIcon: "person" },
  };

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderTopColor: "#E0E0E0",
        borderTopWidth: 1,
        paddingBottom: bottomPadding,
        paddingTop: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 5,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config = tabConfig[route.name as keyof typeof tabConfig] || {
          label: options.title || route.name,
          icon: "help-outline",
          activeIcon: "help",
        };

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              width: tabWidth,
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 8,
              backgroundColor: isFocused ? "#E8F5E9" : "transparent",
            }}
          >
            <Ionicons
              name={isFocused ? (config.activeIcon as any) : (config.icon as any)}
              size={24}
              color={isFocused ? "#2E7D32" : "#616161"}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: isFocused ? "600" : "500",
                color: isFocused ? "#2E7D32" : "#616161",
                textAlign: "center",
                marginTop: 4,
              }}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
