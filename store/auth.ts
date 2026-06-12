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
        set({ user: null, token: null });
      },
      isAuthenticated: () => !!get().token,
      isDispatcher: () => {
        const role = get().user?.role;
        return role === 'dispatcher' || role === 'merchant_owner' || role === 'super_admin';
      },
      isDriver: () => get().user?.role === 'driver',
    }),
    { name: 'hontal_auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);
