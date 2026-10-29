export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  expiryDate: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  applicableCategories?: string[];
}

export interface Promo {
  id: string;
  title: string;
  description: string;
  image: string;
  discountPercentage: number;
  validTill: string;
  code?: string;
  applicableOn?: string[];
}

export const COUPONS: Coupon[] = [
  {
    id: '1',
    code: 'FRESH20',
    title: '20% Off on Fresh Produce',
    description: 'Get 20% discount on all fruits and vegetables',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 100,
    maxDiscount: 200,
    expiryDate: '2026-12-31',
    usageLimit: 100,
    usageCount: 45,
    isActive: true,
    applicableCategories: ['Fruits', 'Vegetables'],
  },
  {
    id: '2',
    code: 'SAVE50',
    title: 'Flat ₹50 Off',
    description: 'Flat ₹50 discount on orders above ₹300',
    discountType: 'fixed',
    discountValue: 50,
    minOrderAmount: 300,
    expiryDate: '2026-08-31',
    usageLimit: 200,
    usageCount: 120,
    isActive: true,
  },
  {
    id: '3',
    code: 'GROCERY30',
    title: '30% Off on Groceries',
    description: 'Special discount on grocery items',
    discountType: 'percentage',
    discountValue: 30,
    minOrderAmount: 200,
    maxDiscount: 300,
    expiryDate: '2026-09-15',
    usageLimit: 150,
    usageCount: 78,
    isActive: true,
    applicableCategories: ['Groceries', 'Beverages'],
  },
  {
    id: '4',
    code: 'WELCOME15',
    title: '15% Off on First Order',
    description: 'New users get 15% discount',
    discountType: 'percentage',
    discountValue: 15,
    minOrderAmount: 50,
    maxDiscount: 150,
    expiryDate: '2026-12-31',
    usageLimit: 500,
    usageCount: 234,
    isActive: true,
  },
  {
    id: '5',
    code: 'DAIRY25',
    title: '25% Off on Dairy',
    description: 'Get 25% discount on all dairy products',
    discountType: 'percentage',
    discountValue: 25,
    minOrderAmount: 150,
    maxDiscount: 250,
    expiryDate: '2026-08-15',
    usageLimit: 100,
    usageCount: 67,
    isActive: true,
    applicableCategories: ['Dairy'],
  },
];

export const PROMOS: Promo[] = [
  {
    id: '1',
    title: 'Fresh Groceries Delivered',
    description: 'Get up to 30% off on fresh produce',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291840?w=400&h=200&fit=crop',
    discountPercentage: 30,
    validTill: '2026-08-31',
    code: 'FRESH20',
  },
  {
    id: '2',
    title: 'Dairy & Bakery Special',
    description: 'Save big on dairy and bakery items',
    image: 'https://images.unsplash.com/photo-1452894895917-032f4461a272?w=400&h=200&fit=crop',
    discountPercentage: 25,
    validTill: '2026-08-15',
    code: 'DAIRY25',
  },
  {
    id: '3',
    title: 'Pantry Essentials',
    description: 'Stock up your pantry with great deals',
    image: 'https://images.unsplash.com/photo-1586985289688-cacf913bb194?w=400&h=200&fit=crop',
    discountPercentage: 30,
    validTill: '2026-09-15',
    code: 'GROCERY30',
  },
];

export function validateCoupon(code: string, orderAmount: number, cartItems?: any[]): { valid: boolean; coupon?: Coupon; error?: string } {
  const coupon = COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase());

  if (!coupon) {
    return { valid: false, error: 'Coupon code not found' };
  }

  if (!coupon.isActive) {
    return { valid: false, error: 'This coupon is no longer active' };
  }

  const expiryDate = new Date(coupon.expiryDate);
  if (new Date() > expiryDate) {
    return { valid: false, error: 'This coupon has expired' };
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, error: 'This coupon has reached its usage limit' };
  }

  if (orderAmount < coupon.minOrderAmount) {
    return {
      valid: false,
      error: `Minimum order amount of ₹${coupon.minOrderAmount} required`,
    };
  }

  return { valid: true, coupon };
}

export function calculateDiscount(coupon: Coupon, orderAmount: number): number {
  let discount = 0;

  if (coupon.discountType === 'percentage') {
    discount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  return Math.round(discount);
}

export function getApplicableCoupons(orderAmount: number): Coupon[] {
  return COUPONS.filter(
    coupon =>
      coupon.isActive &&
      new Date(coupon.expiryDate) > new Date() &&
      orderAmount >= coupon.minOrderAmount &&
      (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit)
  );
}
