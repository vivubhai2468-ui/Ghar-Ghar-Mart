import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SessionAuth from '@/lib/_core/auth';
import * as Api from '@/lib/_core/api';
import { shouldInvalidateCachedSession } from '@/lib/session-validation';

export type UserRole = 'customer' | 'seller' | 'delivery_partner' | 'admin' | 'guest';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  profilePhoto?: string;
  address?: string;
  savedAddresses?: string[];
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  userRole: UserRole;
  login: (phone: string, otp: string, role: UserRole) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: Partial<User>) => Promise<void>;
  completeVerifiedPhoneAuth: (payload: { sessionToken: string; user: { id: number; name: string | null; phone: string | null; address: string | null; role: string } }) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('[AUTH] AuthProvider function called');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('guest');

  const clearPersistedSession = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('userToken'),
      AsyncStorage.removeItem('user'),
      AsyncStorage.removeItem('userRole'),
      SessionAuth.removeSessionToken(),
    ]);
  };

  // Initialize auth state on app load
  useEffect(() => {
    console.log('[AUTH] AuthProvider useEffect triggered');
    let isMounted = true;

    const bootstrap = async () => {
      console.log('[AUTH] Bootstrap started - timestamp:', new Date().toISOString());
      try {
        // Try to restore token from secure storage with timeout
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => {
            console.log('[AUTH] Auth timeout reached');
            reject(new Error('Auth timeout'));
          }, 5000)
        );

        const restorePromise = (async () => {
          try {
            console.log('[AUTH] Attempting to restore token from SecureStore');
            const token = await SecureStore.getItemAsync('userToken');
            console.log('[AUTH] Token restored:', !!token);
            
            console.log('[AUTH] Attempting to restore user from AsyncStorage');
            const storedUser = await AsyncStorage.getItem('user');
            console.log('[AUTH] User restored:', !!storedUser);
            
            const storedRole = await AsyncStorage.getItem('userRole');
            console.log('[AUTH] Role restored:', storedRole);

            if (token && storedUser) {
              const parsedUser = JSON.parse(storedUser);
              const serverUser = await Api.getMe();
              if (shouldInvalidateCachedSession(parsedUser.id, serverUser)) {
                console.log('[AUTH] Stored account is no longer valid. Clearing cached session.');
                await clearPersistedSession();
                if (isMounted) {
                  setUser(null);
                  setUserRole('guest');
                }
                return;
              }
              console.log('[AUTH] Validated restored account:', parsedUser.id);
              if (isMounted) {
                setUser(parsedUser);
                setUserRole((storedRole as UserRole) || parsedUser.role || 'guest');
              }
            } else {
              console.log('[AUTH] No stored user, setting as guest');
              if (isMounted) {
                setUserRole('guest');
              }
            }
          } catch (innerError) {
            console.error('[AUTH] Error in restorePromise:', innerError);
            throw innerError;
          }
        })();

        await Promise.race([restorePromise, timeoutPromise]);
        console.log('[AUTH] Bootstrap completed successfully');
      } catch (e) {
        console.error('[AUTH] Failed to restore token:', e);
        console.log('[AUTH] Continuing as guest due to error');
        if (isMounted) {
          setUserRole('guest');
        }
      } finally {
        console.log('[AUTH] Setting isLoading to false');
        if (isMounted) {
          setIsLoading(false);
        }
        console.log('[AUTH] Bootstrap finally block complete');
      }
    };

    bootstrap();

    return () => {
      console.log('[AUTH] AuthProvider useEffect cleanup');
      isMounted = false;
    };
  }, []);

  const authContext: AuthContextType = {
    user,
    isLoading,
    isSignedIn: !!user,
    userRole,
    login: async (phone: string, otp: string, role: UserRole) => {
      setIsLoading(true);
      try {
        // TODO: Call backend API to verify OTP and get user
        const mockUser: User = {
          id: Math.random().toString(),
          name: 'User',
          phone,
          role,
          createdAt: new Date().toISOString(),
        };

        // Store user and token
        const token = 'mock-token-' + Date.now();
        await SecureStore.setItemAsync('userToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(mockUser));
        await AsyncStorage.setItem('userRole', role);

        setUser(mockUser);
        setUserRole(role);
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    loginAsGuest: async () => {
      setIsLoading(true);
      try {
        setUserRole('guest');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    logout: async () => {
      setIsLoading(true);
      try {
        await clearPersistedSession();
        setUser(null);
        setUserRole('guest');
      } catch (error) {
        console.error('Logout failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
    register: async (userData: Partial<User>) => {
      setIsLoading(true);
      try {
        // TODO: Call backend API to register user
        const newUser: User = {
          id: Math.random().toString(),
          name: userData.name || 'User',
          phone: userData.phone || '',
          role: userData.role || 'customer',
          address: userData.address,
          savedAddresses: userData.savedAddresses,
          createdAt: new Date().toISOString(),
        };

        const token = 'mock-token-' + Date.now();
        await SecureStore.setItemAsync('userToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        await AsyncStorage.setItem('userRole', newUser.role);

        setUser(newUser);
        setUserRole(newUser.role);
      } catch (error) {
        console.error('Registration failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    completeVerifiedPhoneAuth: async ({ sessionToken, user: verifiedUser }) => {
      setIsLoading(true);
      try {
        const user: User = {
          id: String(verifiedUser.id),
          name: verifiedUser.name || 'Ghar Ghar Mart user',
          phone: verifiedUser.phone || '',
          address: verifiedUser.address || undefined,
          role: verifiedUser.role === 'seller' ? 'seller' : verifiedUser.role === 'delivery_partner' ? 'delivery_partner' : 'customer',
          createdAt: new Date().toISOString(),
        };

        await Promise.all([
          SecureStore.setItemAsync('userToken', sessionToken),
          AsyncStorage.setItem('user', JSON.stringify(user)),
          AsyncStorage.setItem('userRole', user.role),
        ]);
        await SessionAuth.setSessionToken(sessionToken).catch(() => undefined);
        setUser(user);
        setUserRole(user.role);
      } finally {
        setIsLoading(false);
      }
    },
    updateProfile: async (userData: Partial<User>) => {
      try {
        if (!user) throw new Error('No user logged in');

        const updatedUser = { ...user, ...userData };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } catch (error) {
        console.error('Profile update failed:', error);
        throw error;
      }
    },
  };

  console.log('[AUTH] Rendering AuthProvider, isLoading:', isLoading, 'isSignedIn:', !!user);
  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  console.log('[AUTH] useAuth hook called');
  const context = useContext(AuthContext);
  if (!context) {
    console.error('[AUTH] useAuth called outside AuthProvider!');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  console.log('[AUTH] useAuth returning context, isLoading:', context.isLoading);
  return context;
}
