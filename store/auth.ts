'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isDispatcher: () => boolean;
  isDriver: () => boolean;
  isMerchantOps: () => boolean;
  isHontalDispatcher: () => boolean;
  isKirimMerchant: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('hontal_token', token);
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('hontal_token');
        localStorage.removeItem('hontal_platform_merchant');
        set({ user: null, token: null });
      },
      isAuthenticated: () => !!get().token,
      isDispatcher: () => {
        const role = get().user?.role;
        return role === 'owner' || role === 'merchant_owner' ||
               role === 'dispatcher' || role === 'kasir' ||
               role === 'super_admin' || role === 'developer' ||
               role === 'merchant_ops';
      },
      isDriver: () => get().user?.role === 'driver',
      isMerchantOps: () => get().user?.role === 'merchant_ops',
      isHontalDispatcher: () => get().user?.role === 'hontal_dispatcher',
      isKirimMerchant: () => get().user?.merchant?.merchant_type === 'kirim',
    }),
    { name: 'hontal_auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);
