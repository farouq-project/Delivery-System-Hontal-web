import type { Product } from '@/types/pos';

type StockUnit = { unit_label: string; conversion_to_base: string; is_active?: boolean };

export function num(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
}

/** 3.000 → "3", 2.500 → "2.5" */
export function formatQty(value: string | number | null | undefined): string {
  return String(Math.round(num(value) * 1000) / 1000);
}

/**
 * Stock is stored in the base unit. Shows it in the largest active unit when that reads
 * more naturally: 2940 pcs with a 30-pcs tray → "98 tray", 2935 pcs → "97 tray + 25 pcs".
 */
export function formatStock(product: Pick<Product, 'stock_qty' | 'base_unit'> & { units?: StockUnit[] }): string {
  const base = num(product.stock_qty);
  const largest = (product.units ?? [])
    .filter((u) => u.is_active !== false && num(u.conversion_to_base) > 1)
    .sort((a, b) => num(b.conversion_to_base) - num(a.conversion_to_base))[0];

  if (!largest || base <= 0) return `${formatQty(base)} ${product.base_unit}`;

  const size  = num(largest.conversion_to_base);
  const whole = Math.floor(base / size);
  const rest  = Math.round((base - whole * size) * 1000) / 1000;

  if (whole === 0) return `${formatQty(base)} ${product.base_unit}`;
  return rest > 0
    ? `${whole} ${largest.unit_label} + ${formatQty(rest)} ${product.base_unit}`
    : `${whole} ${largest.unit_label}`;
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  bayar_di_toko: 'Bayar di Toko',
  edc: 'EDC',
};

/** Pulls a readable message out of a Laravel error response (first validation error wins). */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return firstError ?? data?.message ?? fallback;
}
