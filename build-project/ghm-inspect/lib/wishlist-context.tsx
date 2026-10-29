import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  shop: string;
  image: string;
  discount: number;
  rating: number;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => Promise<void>;
  removeFromWishlist: (id: string) => Promise<void>;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load wishlist from AsyncStorage on mount
  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const saved = await AsyncStorage.getItem('wishlist');
      if (saved) {
        setWishlist(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWishlist = async (items: WishlistItem[]) => {
    try {
      await AsyncStorage.setItem('wishlist', JSON.stringify(items));
      setWishlist(items);
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  };

  const addToWishlist = async (item: WishlistItem) => {
    const exists = wishlist.some((w) => w.id === item.id);
    if (!exists) {
      const updated = [...wishlist, item];
      await saveWishlist(updated);
    }
  };

  const removeFromWishlist = async (id: string) => {
    const updated = wishlist.filter((item) => item.id !== id);
    await saveWishlist(updated);
  };

  const isInWishlist = (id: string) => {
    return wishlist.some((item) => item.id === id);
  };

  const clearWishlist = async () => {
    await saveWishlist([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}
