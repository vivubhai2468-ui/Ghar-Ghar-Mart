import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from "@/constants/oauth";

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

const isValidJwtFormat = (token: string) => token.split(".").length === 3;

async function readAdminToken() {
  let token = await AsyncStorage.getItem("admin_token");
  if (!token && typeof window !== "undefined") {
    token = window.localStorage.getItem("admin_token");
  }
  return token;
}

async function saveAdminToken(token: string) {
  await saveAdminToken(token);
  if (typeof window !== "undefined") {
    window.localStorage.setItem("admin_token", token);
  }
}

async function clearAdminSession() {
  await AsyncStorage.multiRemove([
    "admin_token",
    "admin_user",
    "admin_session_version",
  ]);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("admin_token");
    window.localStorage.removeItem("admin_user");
    window.localStorage.removeItem("admin_session_version");
  }
}


export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const adminToken = await readAdminToken();
      const sessionVersion = await AsyncStorage.getItem('admin_session_version');

      if (!adminToken || sessionVersion !== ADMIN_SESSION_VERSION) {
        await clearAdminSession();
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/admin/session`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!response.ok) {
        await clearAdminSession();
        return;
      }

      const session = await response.json();

      if (!session.authenticated) {
        await clearAdminSession();
        return;
      }

      const savedUser = await AsyncStorage.getItem('admin_user');
      const previousUser = savedUser ? JSON.parse(savedUser) : {};

      const verifiedAdmin: AdminUser = {
        id: 'admin_001',
        email: previousUser.email || '',
        name: session.name || 'Ghar Ghar Mart Administrator',
        role: 'super_admin',
        permissions: previousUser.permissions || [],
        lastLogin: previousUser.lastLogin || new Date().toISOString(),
      };

      await AsyncStorage.setItem('admin_user', JSON.stringify(verifiedAdmin));
      setAdminUser(verifiedAdmin);
    } catch (error) {
      console.error('Failed to verify admin session:', error);
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (username: string, password: string) => {
    const response = await fetch(
      `${getApiBaseUrl()}/api/admin/preview-login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error || result.message || `Login failed (${response.status})`
      );
    }

    const { token } = result as { token?: string };

    if (!token || !isValidJwtFormat(token)) {
      throw new Error(
        "The server returned an invalid administrator session. Please check the backend login deployment."
      );
    }

    // Verify the signed token with the backend before storing or logging in.
    const sessionResponse = await fetch(
      `${getApiBaseUrl()}/api/admin/session`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const verifiedSession = await sessionResponse.json().catch(() => ({}));

    if (!sessionResponse.ok || verifiedSession.authenticated !== true) {
      throw new Error(
        verifiedSession.error || "The administrator session could not be verified."
      );
    }

    const mockAdminUser: AdminUser = {
      id: "admin_001",
      email: username,
      name: "Ghar Ghar Mart Administrator",
      role: "super_admin",
      permissions: [
        "manage_products",
        "manage_orders",
        "manage_customers",
        "manage_sellers",
        "manage_inventory",
        "manage_coupons",
        "manage_banners",
        "manage_payments",
        "view_analytics",
        "manage_settings",
      ],
      lastLogin: new Date().toISOString(),
    };

    await AsyncStorage.setItem("admin_token", token);
    await AsyncStorage.setItem("admin_user", JSON.stringify(mockAdminUser));
    await AsyncStorage.setItem("admin_session_version", ADMIN_SESSION_VERSION);

    setAdminUser(mockAdminUser);
  };

  const adminLogout = async () => {
    try {
      await clearAdminSession();
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
