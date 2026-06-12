import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
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
