import React, { useEffect } from "react";
import { View, Animated } from "react-native";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#E0E0E0",
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <View className="bg-surface rounded-lg border border-border overflow-hidden p-3">
      {/* Image skeleton */}
      <SkeletonLoader width="100%" height={160} borderRadius={8} />

      {/* Name skeleton */}
      <SkeletonLoader width="80%" height={14} style={{ marginTop: 12 }} />

      {/* Unit skeleton */}
      <SkeletonLoader width="40%" height={12} style={{ marginTop: 8 }} />

      {/* Rating skeleton */}
      <SkeletonLoader width="50%" height={12} style={{ marginTop: 8 }} />

      {/* Price skeleton */}
      <SkeletonLoader width="60%" height={16} style={{ marginTop: 12 }} />

      {/* Button skeleton */}
      <SkeletonLoader width="100%" height={40} borderRadius={8} style={{ marginTop: 12 }} />
    </View>
  );
}
