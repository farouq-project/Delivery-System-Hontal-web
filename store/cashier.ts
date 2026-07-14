'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CashierState {
  cashierName: string;
  setCashierName: (name: string) => void;
}

export const useCashierStore = create<CashierState>()(
  persist(
    (set) => ({
      cashierName: 'Mian',
      setCashierName: (name) => set({ cashierName: name }),
    }),
    { name: 'hontal_cashier_store' },
  ),
);
