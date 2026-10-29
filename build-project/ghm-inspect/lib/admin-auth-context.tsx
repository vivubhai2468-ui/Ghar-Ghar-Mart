import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidAdminPreviewCredential } from '@/lib/admin-credentials';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager';
  permissions: string[];
  lastLogin: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isAdminLoggedIn: boolean;
  isLoading: boolean;
  adminLogin: (username: string, password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);
const ADMIN_SESSION_VERSION = 'admin-credentials-v2';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const adminToken = await AsyncStorage.getItem('admin_token');
      const adminData = await AsyncStorage.getItem('admin_user');
      const sessionVersion = await AsyncStorage.getItem('admin_session_version');

      if (adminToken && adminData && sessionVersion === ADMIN_SESSION_VERSION) {
        setAdminUser(JSON.parse(adminData));
      } else if (adminToken || adminData) {
        await AsyncStorage.multiRemove(['admin_token', 'admin_user', 'admin_session_version']);
      }
    } catch (e) {
      console.error('Failed to restore admin session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (username: string, password: string) => {
    try {
      // The preview account is deliberately restricted to the documented
      // administrator test credentials until server-backed admin auth is enabled.
      if (!isValidAdminPreviewCredential(username, password)) {
        throw new Error('Invalid administrator credentials');
      }

      const mockAdminUser: AdminUser = {
        id: 'admin_001',
        email: username,
        name: 'Ghar Ghar Mart Administrator',
        role: 'super_admin',
        permissions: [
          'manage_products',
          'manage_orders',
          'manage_customers',
          'manage_sellers',
          'manage_inventory',
          'manage_coupons',
          'manage_banners',
          'manage_payments',
          'view_analytics',
          'manage_settings',
        ],
        lastLogin: new Date().toISOString(),
      };

      await AsyncStorage.setItem('admin_token', 'mock_admin_token_' + Date.now());
      await AsyncStorage.setItem('admin_user', JSON.stringify(mockAdminUser));
      await AsyncStorage.setItem('admin_session_version', ADMIN_SESSION_VERSION);
      setAdminUser(mockAdminUser);
    } catch (error) {
      throw new Error('Admin login failed');
    }
  };

  const adminLogout = async () => {
    try {
      await AsyncStorage.removeItem('admin_token');
      await AsyncStorage.removeItem('admin_user');
      await AsyncStorage.removeItem('admin_session_version');
      setAdminUser(null);
    } catch (error) {
      throw new Error('Admin logout failed');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!adminUser) return false;
    return adminUser.permissions.includes(permission);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isAdminLoggedIn: !!adminUser,
        isLoading,
        adminLogin,
        adminLogout,
        hasPermission,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
