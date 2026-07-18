'use client';

import { useState, useCallback, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { SearchResult, AdminCustomer } from '@/types';
import { Search, Building2, Users, FileText, CreditCard, UserSearch, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

// ── Platform Search (merchants, users, applications, subscriptions) ──────────

const TYPE_ICON: Record<string, React.ElementType> = {
  merchant:     Building2,
  user:         Users,
  application:  FileText,
  subscription: CreditCard,
};

const TYPE_COLOR: Record<string, string> = {
  merchant:     'bg-blue-50 text-blue-600',
  user:         'bg-violet-50 text-violet-600',
  application:  'bg-amber-50 text-amber-600',
  subscription: 'bg-emerald-50 text-emerald-600',
};

function PlatformSearchTab() {
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((val: string) => {
    setQuery(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebouncedQ(val), 350);
    setTimer(t);
  }, [timer]);

  const { data, isLoading } = useQuery<{ data: { data: Record<string, SearchResult[]> } }>({
    queryKey: ['admin', 'search', debouncedQ],
    queryFn: () => adminApi.globalSearch(debouncedQ),
    enabled: debouncedQ.length >= 2,
    staleTime: 10_000,
  });

  const results: SearchResult[] = data?.data?.data
    ? (Object.values(data.data.data).flat() as SearchResult[])
    : [];

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search merchants, users, applications, subscriptions…"
          value={query}
          onChange={e => handleChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          autoFocus
        />
      </div>

      {isLoading && (
        <div className="text-sm text-gray-400 text-center py-8">Searching…</div>
      )}

      {debouncedQ.length >= 2 && !isLoading && results.length === 0 && (
        <div className="text-sm text-gray-400 text-center py-8">
          No results for &ldquo;{debouncedQ}&rdquo;
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const Icon = TYPE_ICON[type] ?? FileText;
        const chipCls = TYPE_COLOR[type] ?? 'bg-gray-50 text-gray-600';
        return (
          <div key={type} className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {type}s
            </p>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm divide-y divide-gray-100">
              {items.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.url}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${chipCls}`}>#{r.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                  </div>
                  <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {debouncedQ.length < 2 && (
        <div className="text-center py-12 text-sm text-gray-400">
          <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
          Enter at least 2 characters to search
        </div>
      )}
    </div>
  );
}

// ── Customer Intelligence (cross-merchant) ───────────────────────────────────

const VIP_COLOR: Record<string, string> = {
  platinum: 'bg-purple-100 text-purple-700',
  gold:     'bg-amber-100 text-amber-700',
  silver:   'bg-gray-200 text-gray-700',
  standard: 'bg-gray-100 text-gray-500',
};

const HEALTH_COLOR: Record<string, string> = {
  healthy:         'text-emerald-600',
  needs_attention: 'text-amber-600',
  inactive:        'text-red-500',
};

function CustomerSearchTab() {
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [cityFilter, setCityFilter] = useState('');

  const handleChange = useCallback((val: string) => {
    setQuery(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebouncedQ(val), 400);
    setTimer(t);
  }, [timer]);

  const enabled = debouncedQ.length >= 2 || cityFilter.length >= 2;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'customers', debouncedQ, cityFilter],
    queryFn: () => adminApi.searchCustomers({
      q: debouncedQ || undefined,
      city: cityFilter || undefined,
    }),
    enabled,
    staleTime: 15_000,
  });

  const customers: AdminCustomer[] = data?.data?.data ?? [];
  const total: number = data?.data?.total ?? 0;

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">
          <span className="font-semibold">Internal use only.</span> This view shows customer data across all merchants for platform intelligence and support. Merchants cannot access cross-tenant data.
        </p>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Name, phone, or address…"
            value={query}
            onChange={e => handleChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            autoFocus
          />
        </div>
        <input
          type="text"
          placeholder="Filter by city…"
          value={cityFilter}
          onChange={e => setCityFilter(e.target.value)}
          className="w-40 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {isLoading && (
        <div className="text-sm text-gray-400 text-center py-8">Searching customers…</div>
      )}

      {enabled && !isLoading && customers.length === 0 && (
        <div className="text-sm text-gray-400 text-center py-8">
          No customers found for that query.
        </div>
      )}

      {customers.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-3">{total.toLocaleString()} customers found (showing {customers.length})</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Merchant</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Phone</th>
                    <th className="px-4 py-3 text-right hidden md:table-cell">Orders</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Last Order</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Health</th>
                    <th className="px-4 py-3 text-left">VIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <tr key={`${c.merchant_id}-${c.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{c.customer_name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{c.default_address}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/merchants/${c.merchant_id}`}
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          {c.merchant_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">{c.phone ?? '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-right">
                        <span className={`font-semibold ${c.total_orders > 1 ? 'text-emerald-700' : 'text-gray-600'}`}>
                          {c.total_orders}
                        </span>
                        {c.total_orders > 1 && (
                          <span className="ml-1 text-xs text-emerald-500">repeat</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                        {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs">
                        {c.health_status ? (
                          <span className={`font-medium capitalize ${HEALTH_COLOR[c.health_status] ?? 'text-gray-500'}`}>
                            {c.health_status.replace(/_/g, ' ')}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${VIP_COLOR[c.vip_level] ?? 'bg-gray-100 text-gray-500'}`}>
                          {c.vip_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!enabled && (
        <div className="text-center py-12 text-sm text-gray-400">
          <UserSearch className="h-8 w-8 mx-auto mb-3 opacity-30" />
          Enter a name, phone number, address, or city to search customers across all merchants
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GlobalSearchPage() {
  const [tab, setTab] = useState<'platform' | 'customers'>('platform');

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-sm text-gray-500 mt-1">Platform search and cross-merchant customer intelligence</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 -mb-px">
          {[
            { id: 'platform' as const,  label: 'Platform',              icon: Search },
            { id: 'customers' as const, label: 'Customer Intelligence', icon: UserSearch },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <Suspense fallback={null}>
        {tab === 'platform' ? <PlatformSearchTab /> : <CustomerSearchTab />}
      </Suspense>
    </div>
  );
}
