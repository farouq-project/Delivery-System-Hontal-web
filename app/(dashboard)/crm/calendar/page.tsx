'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtNum } from '@/components/bi/format';
import type { CustomerHabit } from '@/types';
import {
  STATUS_ORDER, WEEKDAYS, WEEKDAYS_LONG,
  CategoryBadge, ProductList, RefreshButton, StatusBadge, WhatsAppLink,
  addDays, daysBetween, formatDay, isoWeekday, relativeDays, useCustomerHabits,
} from '@/components/crm/habits';

/** Repeat purchases are projected this far ahead; further out the guess is too rough. */
const PROJECTION_DAYS = 90;

type Kind = 'ordered' | 'overdue' | 'expected';
interface Entry { customer: CustomerHabit; kind: Kind; repeat: boolean }

const KIND_LABEL: Record<Kind, { label: string; className: string }> = {
  ordered:  { label: 'Already ordered', className: 'bg-blue-100 text-blue-700' },
  overdue:  { label: 'Overdue',         className: 'bg-red-100 text-red-700' },
  expected: { label: 'Expected',        className: 'bg-amber-100 text-amber-800' },
};
const KIND_ORDER: Kind[] = ['overdue', 'expected', 'ordered'];

/**
 * When each customer is expected to buy:
 *  - already ordered → the order date, then every average gap after it
 *  - overdue         → today only (follow up now)
 *  - due / on track  → the expected date (not before today), then every average gap after it
 * One-time and lapsed customers have no rhythm to project.
 */
function buildSchedule(customers: CustomerHabit[], today: string): Map<string, Entry[]> {
  const byDate = new Map<string, Entry[]>();
  const add = (date: string, entry: Entry) => {
    const list = byDate.get(date);
    if (list) list.push(entry); else byDate.set(date, [entry]);
  };
  const horizon = addDays(today, PROJECTION_DAYS);

  for (const c of customers) {
    const step = c.avg_gap_days ? Math.max(1, Math.round(c.avg_gap_days)) : null;

    if (c.status === 'overdue') {
      add(today, { customer: c, kind: 'overdue', repeat: false });
      continue;
    }
    if (!['scheduled', 'due', 'on_track'].includes(c.status) || !c.next_expected_date) continue;

    const first = c.next_expected_date < today ? today : c.next_expected_date;
    add(first, { customer: c, kind: c.status === 'scheduled' ? 'ordered' : 'expected', repeat: false });
    if (!step) continue;

    for (let d = addDays(c.next_expected_date, step); d <= horizon; d = addDays(d, step)) {
      if (d > first) add(d, { customer: c, kind: 'expected', repeat: true });
    }
  }
  return byDate;
}

export default function CrmCalendarPage() {
  const { data, isLoading, error } = useCustomerHabits();
  const [month, setMonth]       = useState<string | null>(null);    // 'YYYY-MM-01'
  const [selected, setSelected] = useState<string | null>(null);    // 'YYYY-MM-DD'
  const [includeQuiet, setIncludeQuiet] = useState(false);

  const today = data?.today ?? '';
  const schedule = useMemo(() => (data ? buildSchedule(data.customers, data.today) : new Map<string, Entry[]>()), [data]);

  const usualCountByWeekday = useMemo(() => {
    const counts = Array(7).fill(0) as number[];
    (data?.customers ?? []).forEach((c) => c.usual_weekdays.forEach((d) => counts[d - 1]++));
    return counts;
  }, [data]);

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Loading calendar…</div>;
  if (error || !data) return <div className="p-6 text-sm text-red-500">Failed to load customer habits.</div>;

  const viewMonth = month ?? `${today.slice(0, 7)}-01`;
  const day = selected ?? today;
  const weekday = isoWeekday(day);

  // Month grid, Monday first
  const year = Number(viewMonth.slice(0, 4));
  const monthIndex = Number(viewMonth.slice(5, 7)) - 1;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leading = isoWeekday(viewMonth) - 1;
  const cells: (string | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(viewMonth, i)),
  ];
  while (cells.length % 7) cells.push(null);
  const maxInMonth = Math.max(1, ...cells.map((d) => (d ? schedule.get(d)?.length ?? 0 : 0)));

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(year, monthIndex + delta, 1));
    setMonth(d.toISOString().slice(0, 10));
  };
  const pick = (d: string) => {
    setSelected(d);
    setMonth(`${d.slice(0, 7)}-01`);
  };
  // Header click: the next date (from today) on that weekday
  const pickWeekday = (iso: number) => pick(addDays(today, (iso - isoWeekday(today) + 7) % 7));

  const expected = [...(schedule.get(day) ?? [])].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.customer.customer_name.localeCompare(b.customer.customer_name),
  );
  const expectedIds = new Set(expected.map((e) => e.customer.customer_id));
  const usual = data.customers
    .filter((c) => c.usual_weekdays.includes(weekday) && !expectedIds.has(c.customer_id))
    .filter((c) => includeQuiet || !['lapsed', 'one_time'].includes(c.status))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (b.days_since_last ?? 0) - (a.days_since_last ?? 0));

  const offset = daysBetween(today, day);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pick a day to see who is expected to buy and who usually buys on that weekday. Opens on today.
          </p>
        </div>
        <RefreshButton generatedAt={data.generated_at} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[26rem_1fr] gap-6 items-start">
        {/* Month */}
        <section className="rounded-lg border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <button onClick={() => shiftMonth(-1)} className="rounded p-1 hover:bg-gray-100" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">
                {new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </p>
              {(day !== today || viewMonth !== `${today.slice(0, 7)}-01`) && (
                <button onClick={() => { setSelected(null); setMonth(null); }} className="text-xs text-indigo-600 hover:underline">
                  Back to today
                </button>
              )}
            </div>
            <button onClick={() => shiftMonth(1)} className="rounded p-1 hover:bg-gray-100" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-100 p-px text-center">
            {WEEKDAYS.map((w, i) => (
              <button
                key={w}
                onClick={() => pickWeekday(i + 1)}
                className={cn('bg-white py-1.5 hover:bg-indigo-50', weekday === i + 1 && 'text-indigo-600')}
                title={`${fmtNum(usualCountByWeekday[i])} customers usually buy on ${WEEKDAYS_LONG[i]}`}
              >
                <span className="block text-xs font-semibold">{w}</span>
                <span className="block text-[10px] text-gray-400">{fmtNum(usualCountByWeekday[i])}</span>
              </button>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`blank-${i}`} className="bg-gray-50 h-14" />;
              const n = schedule.get(d)?.length ?? 0;
              const isToday = d === today;
              const isSelected = d === day;
              return (
                <button
                  key={d}
                  onClick={() => pick(d)}
                  className={cn(
                    'relative h-14 bg-white p-1 text-left hover:bg-indigo-50',
                    d < today && 'bg-gray-50 text-gray-400',
                    isSelected && 'ring-2 ring-inset ring-indigo-500',
                  )}
                >
                  <span className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs',
                    isToday && 'bg-indigo-600 font-semibold text-white',
                  )}>
                    {Number(d.slice(8))}
                  </span>
                  {n > 0 && (
                    <span
                      className="absolute bottom-1 right-1 rounded px-1 text-[11px] font-semibold text-indigo-900"
                      style={{ backgroundColor: `rgba(99, 102, 241, ${0.12 + 0.45 * (n / maxInMonth)})` }}
                    >
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="px-3 py-2 text-xs text-gray-400">
            Numbers = customers expected that day (already ordered, due, or a repeat at their usual gap, up to {PROJECTION_DAYS} days ahead).
            Under each weekday: customers who usually buy on it.
          </p>
        </section>

        {/* Selected day */}
        <div className="space-y-6 min-w-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {WEEKDAYS_LONG[weekday - 1]}, {formatDay(day, false)}
              <span className="ml-2 text-sm font-normal text-gray-400">{relativeDays(offset)}</span>
            </h2>
          </div>

          <CustomerTable
            title={`Expected to buy (${fmtNum(expected.length)})`}
            empty={offset < 0 ? 'Past day — expectations are only projected from today onwards.' : 'Nobody is expected on this day.'}
            rows={expected.map((e) => ({ customer: e.customer, tag: e.kind, repeat: e.repeat }))}
            today={today}
          />

          <CustomerTable
            title={`Usually buy on ${WEEKDAYS_LONG[weekday - 1]} (${fmtNum(usual.length)})`}
            empty={`No other customers usually buy on ${WEEKDAYS_LONG[weekday - 1]}.`}
            rows={usual.map((c) => ({ customer: c }))}
            today={today}
            extra={
              <label className="flex items-center gap-1.5 text-xs font-normal text-gray-500">
                <input type="checkbox" checked={includeQuiet} onChange={(e) => setIncludeQuiet(e.target.checked)} />
                Include lapsed and one-time
              </label>
            }
          />
        </div>
      </div>
    </div>
  );
}

function CustomerTable({ title, empty, rows, today, extra }: {
  title: string;
  empty: string;
  rows: { customer: CustomerHabit; tag?: Kind; repeat?: boolean }[];
  today: string;
  extra?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {extra}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Customer</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-left font-semibold">Last purchase</th>
              <th className="px-3 py-2 text-left font-semibold">Avg gap</th>
              <th className="px-3 py-2 text-left font-semibold">Usual products</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ customer: c, tag, repeat }) => (
              <tr key={c.customer_id} className="align-top hover:bg-gray-50">
                <td className="px-3 py-2.5 min-w-40">
                  <Link href={`/customers/${c.customer_id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                    {c.customer_name}
                  </Link>
                  <p className="text-xs text-gray-400">{[c.cluster, c.phone].filter(Boolean).join(' · ')}</p>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {tag ? (
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', KIND_LABEL[tag].className)}>
                      {KIND_LABEL[tag].label}
                    </span>
                  ) : (
                    <StatusBadge status={c.status} />
                  )}
                  {repeat && <p className="text-[11px] text-gray-400 mt-0.5">projected repeat</p>}
                  {tag === 'overdue' && c.next_expected_date && (
                    <p className="text-[11px] text-red-500 mt-0.5">{daysBetween(c.next_expected_date, today)} days late</p>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <p className="text-gray-800">{formatDay(c.last_purchase_date)}</p>
                  {c.days_since_last !== null && <p className="text-xs text-gray-400">{relativeDays(-c.days_since_last)}</p>}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <p className="text-gray-800">{c.avg_gap_days !== null ? `${c.avg_gap_days} days` : '—'}</p>
                  <CategoryBadge category={c.category} />
                </td>
                <td className="px-3 py-2.5"><ProductList products={c.top_products} /></td>
                <td className="px-3 py-2.5"><WhatsAppLink phone={c.phone} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
