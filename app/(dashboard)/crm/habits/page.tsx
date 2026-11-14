'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtIdr, fmtNum } from '@/components/bi/format';
import type { CustomerHabit, HabitCategory, HabitStatus } from '@/types';
import {
  CATEGORY_META, CATEGORY_ORDER, STATUS_META, STATUS_ORDER, WEEKDAYS_LONG,
  CategoryBadge, ProductList, RefreshButton, StatusBadge, UsualDays, WeekdayBars, WhatsAppLink,
  daysBetween, followUpRank, formatDay, relativeDays, useCustomerHabits,
} from '@/components/crm/habits';

const PAGE_SIZE = 50;

type SortKey = 'priority' | 'name' | 'last' | 'gap' | 'next' | 'orders' | 'value';

export default function CustomerHabitsPage() {
  const { data, isLoading, error } = useCustomerHabits();

  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState<HabitStatus | ''>('');
  const [category, setCategory] = useState<HabitCategory | ''>('');
  const [weekday, setWeekday]   = useState(0); // 0 = any, 1 = Monday … 7 = Sunday
  const [cluster, setCluster]   = useState('');
  const [sort, setSort]         = useState<{ key: SortKey; desc: boolean }>({ key: 'priority', desc: false });
  const [page, setPage]         = useState(0);

  const customers = useMemo(() => data?.customers ?? [], [data]);
  const today = data?.today ?? '';

  const clusters = useMemo(
    () => [...new Set(customers.map((c) => c.cluster).filter((c): c is string => !!c))].sort(),
    [customers],
  );

  const weekdayCounts = useMemo(() => {
    const counts = Array(7).fill(0) as number[];
    customers.forEach((c) => c.usual_weekdays.forEach((d) => counts[d - 1]++));
    return counts;
  }, [customers]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = customers.filter((c) =>
      (!status || c.status === status) &&
      (!category || c.category === category) &&
      (!weekday || c.usual_weekdays.includes(weekday)) &&
      (!cluster || c.cluster === cluster) &&
      (!q || [c.customer_name, c.phone, c.address].some((v) => v?.toLowerCase().includes(q))),
    );

    const value = (c: CustomerHabit): number | string => {
      switch (sort.key) {
        case 'name':   return c.customer_name.toLowerCase();
        case 'last':   return c.last_purchase_date ?? '';
        case 'gap':    return c.avg_gap_days ?? Number.MAX_SAFE_INTEGER;
        case 'next':   return c.next_expected_date ?? '9999';
        case 'orders': return c.purchase_days;
        case 'value':  return c.total_value;
        default:       return followUpRank(c, today);
      }
    };
    return filtered.sort((a, b) => {
      const va = value(a), vb = value(b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.desc ? -cmp : cmp;
    });
  }, [customers, search, status, category, weekday, cluster, sort, today]);

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Loading customer habits…</div>;
  if (error || !data) return <div className="p-6 text-sm text-red-500">Failed to load customer habits.</div>;

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const total = customers.length;
  const hasFilter = !!(search || status || category || weekday || cluster);

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0); };
  const toggle = <T,>(current: T, next: T, setter: (v: T) => void, empty: T) =>
    resetPage(setter)(current === next ? empty : next);

  const sortBy = (key: SortKey) =>
    setSort((s) => ({ key, desc: s.key === key ? !s.desc : key === 'last' || key === 'orders' || key === 'value' }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Habits</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            When each customer last bought, what and on which day they usually buy, and how often.
            Habits use each customer&apos;s last {data.habit_window} purchase days.
          </p>
        </div>
        <RefreshButton generatedAt={data.generated_at} />
      </div>

      {/* Follow-up status — click to filter */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_ORDER.map((s) => {
          const n = data.summary.by_status[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => toggle(status, s, setStatus, '')}
              className={cn(
                'rounded-lg border bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md',
                status === s ? 'ring-2 ring-indigo-500' : '',
              )}
              title={STATUS_META[s].hint}
            >
              <StatusBadge status={s} />
              <p className="mt-2 text-2xl font-bold text-gray-900">{fmtNum(n)}</p>
              <p className="text-xs text-gray-400">{total ? Math.round((n / total) * 100) : 0}% of {fmtNum(total)}</p>
            </button>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* How often they buy */}
        <section className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <h2 className="px-4 py-3 border-b text-sm font-semibold text-gray-800">How often they buy (average gap)</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Category</th>
                <th className="px-4 py-2 text-left font-semibold">Gap between purchases</th>
                <th className="px-4 py-2 text-right font-semibold">Customers</th>
                <th className="px-4 py-2 text-left font-semibold w-32">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {CATEGORY_ORDER.filter((c) => c !== 'new' || data.summary.by_category.new).map((c) => {
                const n = data.summary.by_category[c] ?? 0;
                return (
                  <tr
                    key={c}
                    onClick={() => toggle(category, c, setCategory, '')}
                    className={cn('cursor-pointer hover:bg-gray-50', category === c && 'bg-indigo-50')}
                  >
                    <td className="px-4 py-2"><CategoryBadge category={c} /></td>
                    <td className="px-4 py-2 text-gray-500">{CATEGORY_META[c].range}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtNum(n)}</td>
                    <td className="px-4 py-2">
                      <div className="h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Usual buying day */}
        <section className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <h2 className="px-4 py-3 border-b text-sm font-semibold text-gray-800">Usual buying day</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Day</th>
                <th className="px-4 py-2 text-right font-semibold">Customers who usually buy</th>
                <th className="px-4 py-2 text-left font-semibold w-32">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {WEEKDAYS_LONG.map((day, i) => (
                <tr
                  key={day}
                  onClick={() => toggle(weekday, i + 1, setWeekday, 0)}
                  className={cn('cursor-pointer hover:bg-gray-50', weekday === i + 1 && 'bg-indigo-50')}
                >
                  <td className="px-4 py-2 text-gray-800">{day}</td>
                  <td className="px-4 py-2 text-right font-semibold">{fmtNum(weekdayCounts[i])}</td>
                  <td className="px-4 py-2">
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${total ? (weekdayCounts[i] / total) * 100 : 0}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-gray-400 border-t">
            A day counts as usual when at least 30% of a customer&apos;s recent purchases (and 2 or more) fall on it.
          </p>
        </section>
      </div>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            placeholder="Search name, phone, address"
            className="w-full rounded-md border bg-white py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={status} onChange={(e) => resetPage(setStatus)(e.target.value as HabitStatus | '')} className="rounded-md border bg-white px-2 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select value={category} onChange={(e) => resetPage(setCategory)(e.target.value as HabitCategory | '')} className="rounded-md border bg-white px-2 py-2 text-sm">
          <option value="">All intervals</option>
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
        </select>
        <select value={weekday} onChange={(e) => resetPage(setWeekday)(Number(e.target.value))} className="rounded-md border bg-white px-2 py-2 text-sm">
          <option value={0}>Any usual day</option>
          {WEEKDAYS_LONG.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
        </select>
        {clusters.length > 0 && (
          <select value={cluster} onChange={(e) => resetPage(setCluster)(e.target.value)} className="rounded-md border bg-white px-2 py-2 text-sm">
            <option value="">All clusters</option>
            {clusters.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {hasFilter && (
          <button
            onClick={() => { setSearch(''); setStatus(''); setCategory(''); setWeekday(0); setCluster(''); setPage(0); }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-gray-500 hover:text-gray-800"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">{fmtNum(rows.length)} customers</span>
      </section>

      {/* Customers */}
      <section className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <SortHeader label="Customer" k="name" sort={sort} onSort={sortBy} />
                <SortHeader label="Last purchase" k="last" sort={sort} onSort={sortBy} />
                <SortHeader label="Avg gap" k="gap" sort={sort} onSort={sortBy} />
                <th className="px-3 py-2 text-left font-semibold">Usual day</th>
                <th className="px-3 py-2 text-left font-semibold">Usual products</th>
                <SortHeader label="Next expected" k="next" sort={sort} onSort={sortBy} />
                <SortHeader label="Status" k="priority" sort={sort} onSort={sortBy} />
                <SortHeader label="Orders" k="orders" sort={sort} onSort={sortBy} align="right" />
                <SortHeader label="Value" k="value" sort={sort} onSort={sortBy} align="right" />
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {pageRows.map((c) => (
                <tr key={c.customer_id} className="align-top hover:bg-gray-50">
                  <td className="px-3 py-2.5 min-w-44">
                    <Link href={`/customers/${c.customer_id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                      {c.customer_name}
                    </Link>
                    <p className="text-xs text-gray-400">{[c.cluster, c.phone].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <p className="text-gray-800">{formatDay(c.last_purchase_date)}</p>
                    {c.days_since_last !== null && <p className="text-xs text-gray-400">{relativeDays(-c.days_since_last)}</p>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <p className="text-gray-800">{c.avg_gap_days !== null ? `${c.avg_gap_days} days` : '—'}</p>
                    <CategoryBadge category={c.category} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <WeekdayBars counts={c.weekday_counts} usual={c.usual_weekdays} />
                      <UsualDays days={c.usual_weekdays} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><ProductList products={c.top_products} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <p className="text-gray-800">{formatDay(c.next_expected_date)}</p>
                    {c.next_expected_date && <p className="text-xs text-gray-400">{relativeDays(daysBetween(today, c.next_expected_date))}</p>}
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {fmtNum(c.purchase_days)}
                    {c.total_orders > c.purchase_days && <p className="text-xs text-gray-400">{fmtNum(c.total_orders)} orders</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{fmtIdr(c.total_value)}</td>
                  <td className="px-3 py-2.5"><WhatsAppLink phone={c.phone} /></td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-400">No customers match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t px-3 py-2 text-sm text-gray-500">
            <span>
              {fmtNum(currentPage * PAGE_SIZE + 1)}–{fmtNum(Math.min(rows.length, (currentPage + 1) * PAGE_SIZE))} of {fmtNum(rows.length)}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0} className="rounded border p-1 disabled:opacity-40" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1} className="rounded border p-1 disabled:opacity-40" aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-400">
        Orders count once per day; cancelled and failed orders are left out. Next expected = last purchase + average gap.
        {data.summary.never_purchased > 0 && ` ${fmtNum(data.summary.never_purchased)} customers have no orders yet and are not listed.`}
      </p>
    </div>
  );
}

function SortHeader({ label, k, sort, onSort, align = 'left' }: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; desc: boolean };
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp;
  return (
    <th className={cn('px-3 py-2 font-semibold whitespace-nowrap', align === 'right' ? 'text-right' : 'text-left')}>
      <button onClick={() => onSort(k)} className={cn('inline-flex items-center gap-1 hover:text-gray-900', active && 'text-indigo-600')}>
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}
