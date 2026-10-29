import React, { createContext, useContext, useState } from 'react';
import { Coupon } from './coupons-data';

interface CouponContextType {
  appliedCoupon: Coupon | null;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  recentCoupons: string[];
  addRecentCoupon: (code: string) => void;
}

const CouponContext = createContext<CouponContextType | undefined>(undefined);

export function CouponProvider({ children }: { children: React.ReactNode }) {
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [recentCoupons, setRecentCoupons] = useState<string[]>([]);

  const applyCoupon = (coupon: Coupon) => {
    setAppliedCoupon(coupon);
    addRecentCoupon(coupon.code);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const addRecentCoupon = (code: string) => {
    setRecentCoupons(prev => {
      const filtered = prev.filter(c => c !== code);
      return [code, ...filtered].slice(0, 5);
    });
  };

  return (
    <CouponContext.Provider
      value={{
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        recentCoupons,
        addRecentCoupon,
      }}
    >
      {children}
    </CouponContext.Provider>
  );
}

export function useCoupon() {
  const context = useContext(CouponContext);
  if (!context) {
    throw new Error('useCoupon must be used within a CouponProvider');
  }
  return context;
}
