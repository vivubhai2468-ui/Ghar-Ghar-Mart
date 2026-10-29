import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string;
  productId: string | number;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
  sellerId?: number;
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addItem: (item: Omit<CartItem, 'id'> & { id?: string }) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = 'ghar_ghar_mart_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCart = async (cartItems: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  };

  const addItem = (item: Omit<CartItem, 'id'>) => {
    setItems((prevItems) => {
      // Check if item already exists
      const existingItem = prevItems.find((i) => i.productId === item.productId);

      let newItems: CartItem[];
      if (existingItem) {
        // Increase quantity instead of adding duplicate
        newItems = prevItems.map((i) =>
          i.productId === item.productId
            ? { ...i, sellerId: item.sellerId ?? i.sellerId, quantity: i.quantity + item.quantity }
            : i
        );
      } else {
        // Add new item
        newItems = [
          ...prevItems,
          {
            ...item,
            id: `${item.productId}-${Date.now()}`,
          },
        ];
      }

      saveCart(newItems);
      return newItems;
    });
  };

  const removeItem = (productId: number) => {
    setItems((prevItems) => {
      const newItems = prevItems.filter((i) => i.productId !== productId);
      saveCart(newItems);
      return newItems;
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prevItems) => {
      const newItems = prevItems.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      );
      saveCart(newItems);
      return newItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    saveCart([]);
  };

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const value: CartContextType = {
    items,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getSubtotal,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
