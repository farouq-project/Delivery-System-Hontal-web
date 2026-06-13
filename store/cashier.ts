'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CashierName } from '@/types';

export const CASHIER_NAMES: CashierName[] = ['Mian', 'Sela', 'Epa', 'Tira'];

interface CashierState {
  cashierName: CashierName;
  setCashierName: (name: CashierName) => void;
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
