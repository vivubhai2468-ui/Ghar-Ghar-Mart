import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { validateCoupon, calculateDiscount, Coupon } from '@/lib/coupons-data';
import { useCoupon } from '@/lib/coupon-context';

interface CouponInputProps {
  orderAmount: number;
  initialCode?: string;
  onCouponApplied?: (coupon: Coupon, discount: number) => void;
  onCouponRemoved?: () => void;
}

export function CouponInput({
  orderAmount,
  initialCode = '',
  onCouponApplied,
  onCouponRemoved,
}: CouponInputProps) {
  const { appliedCoupon, applyCoupon, removeCoupon, recentCoupons } =
    useCoupon();
  const [couponCode, setCouponCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecentCoupons, setShowRecentCoupons] = useState(false);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (initialCode) setCouponCode(initialCode);
  }, [initialCode]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate API call
    setTimeout(() => {
      const result = validateCoupon(couponCode, orderAmount);

      if (result.valid && result.coupon) {
        const discount = calculateDiscount(result.coupon, orderAmount);

        // Animate success
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        applyCoupon(result.coupon);
        onCouponApplied?.(result.coupon, discount);
        setCouponCode('');
        setShowRecentCoupons(false);
      } else {
        setError(result.error || 'Invalid coupon code');
      }

      setIsLoading(false);
    }, 500);
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    onCouponRemoved?.();
    setCouponCode('');
  };

  const handleRecentCoupon = (code: string) => {
    setCouponCode(code);
    setShowRecentCoupons(false);
  };

  if (appliedCoupon) {
    const discount = calculateDiscount(appliedCoupon, orderAmount);

    return (
      <View className="bg-surface rounded-lg p-4 border border-border mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-foreground font-bold mb-1">
              ✓ Coupon Applied
            </Text>
            <Text className="text-secondary font-bold text-lg">
              {appliedCoupon.code}
            </Text>
            <Text className="text-muted text-sm mt-1">
              {appliedCoupon.title}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-success font-bold text-lg">
              −₹{discount}
            </Text>
            <Text className="text-muted text-xs">Saved</Text>
          </View>
        </View>

        <Pressable
          onPress={handleRemoveCoupon}
          className="bg-error/20 rounded-lg py-2 items-center"
        >
          <Text className="text-error font-semibold text-sm">Remove</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="mb-4">
      {/* Coupon Input */}
      <View className="flex-row gap-2 mb-3">
        <TextInput
          placeholder="Enter coupon code"
          placeholderTextColor="#999"
          value={couponCode}
          onChangeText={setCouponCode}
          onFocus={() => recentCoupons.length > 0 && setShowRecentCoupons(true)}
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-3 text-foreground"
        />
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            onPress={handleApplyCoupon}
            disabled={isLoading}
            className={`rounded-lg px-4 py-3 items-center justify-center ${
              isLoading ? 'bg-primary/70' : 'bg-primary'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-bold">Apply</Text>
            )}
          </Pressable>
        </Animated.View>
      </View>

      {/* Error Message */}
      {error && (
        <View className="bg-error/20 rounded-lg p-2 mb-3">
          <Text className="text-error text-sm font-semibold">{error}</Text>
        </View>
      )}

      {/* Recent Coupons */}
      {showRecentCoupons && recentCoupons.length > 0 && (
        <View className="bg-surface rounded-lg border border-border p-3 mb-3">
          <Text className="text-muted text-xs font-semibold mb-2">
            RECENT COUPONS
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {recentCoupons.map((code) => (
              <Pressable
                key={code}
                onPress={() => handleRecentCoupon(code)}
                className="bg-primary/20 rounded-lg px-3 py-2"
              >
                <Text className="text-secondary font-bold text-sm">{code}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
