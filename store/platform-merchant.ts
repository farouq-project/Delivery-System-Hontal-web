'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlatformMerchant {
  id: number;
  company_name: string;
  email: string;
  city: string | null;
  plan_name: string | null;
  plan_slug: string | null;
  sub_status: string | null;
}

interface PlatformMerchantState {
  selectedMerchant: PlatformMerchant | null;
  isViewingMode: boolean;
  setSelectedMerchant: (merchant: PlatformMerchant) => void;
  clearSelectedMerchant: () => void;
}

export const usePlatformMerchantStore = create<PlatformMerchantState>()(
  persist(
    (set) => ({
      selectedMerchant: null,
      isViewingMode: false,
      setSelectedMerchant: (merchant) =>
        set({ selectedMerchant: merchant, isViewingMode: true }),
      clearSelectedMerchant: () =>
        set({ selectedMerchant: null, isViewingMode: false }),
    }),
    {
      name: 'hontal_platform_merchant',
      partialize: (s) => ({
        selectedMerchant: s.selectedMerchant,
        isViewingMode: s.isViewingMode,
      }),
    }
  )
);
