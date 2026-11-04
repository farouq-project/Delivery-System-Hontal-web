import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(error: unknown): string | null {
  const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  if (!data) return null;
  if (data.errors) {
    const first = Object.values(data.errors)[0];
    if (first?.[0]) return first[0];
  }
  return data.message ?? null;
}

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value ?? 0);
}

// Returns YYYY-MM-DD in the browser's local timezone, not UTC.
// new Date().toISOString() is UTC — wrong at midnight WIB (UTC+7).
export function localDateString(date = new Date()): string {
  return date.toLocaleDateString('en-CA'); // en-CA always produces YYYY-MM-DD
}

// Product lines of an order: structured items ("Galon × 2") when present,
// otherwise the product_name summary (older orders have no items).
export function orderProductLines(order: {
  items?: { name: string; quantity?: number | null }[] | null;
  product_name?: string | null;
}): string[] {
  if (order.items?.length) {
    return order.items
      .filter((it) => it.name)
      .map((it) => (it.quantity ? `${it.name} × ${it.quantity}` : it.name));
  }
  return order.product_name ? [order.product_name] : [];
}

// Value for <input type="date">. The API sends date columns either as 'YYYY-MM-DD' or as an
// ISO timestamp (Laravel's date cast: 2026-11-04 in Jakarta arrives as 2026-11-03T17:00:00Z).
// Convert to the calendar date in Asia/Jakarta (the backend's timezone), never by slicing.
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

export function formatDate(date: string | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '-';
  try { return format(parseISO(date), fmt); } catch { return date; }
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return '-';
  return time.substring(0, 5);
}

export const VIP_COLORS: Record<string, string> = {
  standard: 'bg-gray-100 text-gray-700',
  silver:   'bg-slate-200 text-slate-700',
  gold:     'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
};

export const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-orange-100 text-orange-700',
  assigned:   'bg-blue-100 text-blue-700',
  in_transit: 'bg-cyan-100 text-cyan-700',
  delivered:  'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
  cancelled:  'bg-gray-100 text-gray-500',
};

export const DRIVER_STATUS_COLORS: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  on_delivery: 'bg-blue-100 text-blue-700',
  break:       'bg-yellow-100 text-yellow-700',
  off_duty:    'bg-gray-100 text-gray-500',
};
