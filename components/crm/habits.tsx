'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { crmApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CustomerHabit, CustomerHabitsResponse, HabitCategory, HabitStatus } from '@/types';

const QUERY_KEY = ['crm', 'customer-habits'];

export function useCustomerHabits() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await crmApi.customerHabits()).data.data as CustomerHabitsResponse,
    staleTime: 5 * 60 * 1000,
  });
}

/** The API caches the numbers for 10 minutes; this asks it to recompute now. */
export function RefreshButton({ generatedAt }: { generatedAt?: string }) {
  const qc = useQueryClient();
  const refresh = useMutation({
    mutationFn: async () => (await crmApi.customerHabits(true)).data.data as CustomerHabitsResponse,
    onSuccess: (data) => qc.setQueryData(QUERY_KEY, data),
  });

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      {generatedAt && (
        <span>
          Updated {new Date(generatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      <button
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
        className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', refresh.isPending && 'animate-spin')} />
        Refresh
      </button>
    </div>
  );
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<HabitCategory, { label: string; range: string; className: string }> = {
  frequent:   { label: 'Frequent',      range: 'every 1–3 days',  className: 'bg-emerald-100 text-emerald-700' },
  weekly:     { label: 'Weekly',        range: 'every 4–9 days',  className: 'bg-blue-100 text-blue-700' },
  biweekly:   { label: 'Every 2 weeks', range: 'every 10–18 days', className: 'bg-indigo-100 text-indigo-700' },
  monthly:    { label: 'Monthly',       range: 'every 19–40 days', className: 'bg-violet-100 text-violet-700' },
  occasional: { label: 'Occasional',    range: 'over 40 days',    className: 'bg-gray-100 text-gray-600' },
  one_time:   { label: 'One-time',      range: 'bought on 1 day only', className: 'bg-gray-100 text-gray-500' },
  new:        { label: 'New',           range: 'first order is upcoming', className: 'bg-sky-100 text-sky-700' },
};
export const CATEGORY_ORDER: HabitCategory[] = ['frequent', 'weekly', 'biweekly', 'monthly', 'occasional', 'one_time', 'new'];

export const STATUS_META: Record<HabitStatus, { label: string; hint: string; className: string }> = {
  overdue:   { label: 'Overdue',  hint: 'Later than their usual gap — follow up', className: 'bg-red-100 text-red-700' },
  due:       { label: 'Due now',  hint: 'Expected within a day of today',        className: 'bg-amber-100 text-amber-800' },
  on_track:  { label: 'On track', hint: 'Next purchase not expected yet',        className: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Ordered',  hint: 'Already has an upcoming order',         className: 'bg-blue-100 text-blue-700' },
  one_time:  { label: 'One-time', hint: 'Only one purchase day so far',          className: 'bg-gray-100 text-gray-600' },
  lapsed:    { label: 'Lapsed',   hint: 'Silent for more than twice their usual gap', className: 'bg-gray-200 text-gray-700' },
};
export const STATUS_ORDER: HabitStatus[] = ['overdue', 'due', 'on_track', 'scheduled', 'one_time', 'lapsed'];

/** Index 0 = Monday, matching weekday_counts. ISO weekday n is WEEKDAYS[n - 1]. */
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Dates (all 'YYYY-MM-DD', calculated in UTC so the browser timezone never shifts a day) ──

const toUtc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** 1 = Monday … 7 = Sunday */
export function isoWeekday(iso: string): number {
  const d = new Date(toUtc(iso)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function formatDay(iso: string | null, withWeekday = true): string {
  if (!iso) return '—';
  return new Date(toUtc(iso)).toLocaleDateString('en-GB', {
    timeZone: 'UTC', day: 'numeric', month: 'short', ...(withWeekday ? { weekday: 'short' } : {}),
  });
}

export function relativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

// ── Small pieces ─────────────────────────────────────────────────────────────

export function CategoryBadge({ category }: { category: HabitCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', meta.className)} title={meta.range}>
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: HabitStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', meta.className)} title={meta.hint}>
      {meta.label}
    </span>
  );
}

/** Seven tiny bars, Monday to Sunday, for the customer's recent purchase days. */
export function WeekdayBars({ counts, usual }: { counts: number[]; usual: number[] }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="flex items-end gap-0.5" aria-label="Purchases by weekday">
      {counts.map((n, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5" title={`${WEEKDAYS_LONG[i]}: ${n}`}>
          <div className="flex h-5 w-3 items-end rounded-sm bg-gray-100">
            <div
              className={cn('w-full rounded-sm', usual.includes(i + 1) ? 'bg-indigo-500' : 'bg-gray-300')}
              style={{ height: `${(n / max) * 100}%` }}
            />
          </div>
          <span className={cn('text-[9px] leading-none', usual.includes(i + 1) ? 'font-semibold text-indigo-600' : 'text-gray-400')}>
            {WEEKDAYS[i][0]}
          </span>
        </div>
      ))}
    </div>
  );
}

export function UsualDays({ days }: { days: number[] }) {
  if (!days.length) return <span className="text-xs text-gray-400">No fixed day</span>;
  return <span className="text-sm font-medium text-gray-800">{days.map((d) => WEEKDAYS[d - 1]).join(', ')}</span>;
}

export function ProductList({ products }: { products: CustomerHabit['top_products'] }) {
  if (!products.length) return <span className="text-xs text-gray-400">—</span>;
  return (
    <ul className="space-y-0.5">
      {products.map((p) => (
        <li key={p.name} className="text-xs text-gray-700 whitespace-nowrap">
          {p.name} <span className="text-gray-400">{Math.round(p.share * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

/** wa.me link; Indonesian numbers starting with 0 or 8 get the 62 country code. */
export function WhatsAppLink({ phone }: { phone: string | null }) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('8') ? `62${digits}` : digits;
  return (
    <a
      href={`https://wa.me/${intl}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-green-700 hover:bg-green-50"
      title={`WhatsApp ${phone}`}
    >
      <MessageCircle className="h-3.5 w-3.5" /> Chat
    </a>
  );
}

/** Follow-up order: overdue (latest first), due, on track, ordered, one-time, lapsed. */
export function followUpRank(c: CustomerHabit, today: string): number {
  const statusRank = STATUS_ORDER.indexOf(c.status) * 100_000;
  const late = c.next_expected_date ? daysBetween(c.next_expected_date, today) : 0;
  return statusRank - late;
}
