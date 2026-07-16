'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { AdminMerchantSummary, SubscriptionStatus } from '@/types';
import { Search } from 'lucide-react';

const STATUS_CHIP: Record<SubscriptionStatus, string> = {
  trial:     'bg-amber-100 text-amber-700',
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  expired:   'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
};

function fmtIdr(n: number) {
  if (!n) return '—';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminMerchantsPage() {
  const router = useRouter();
  const [page, setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const debounce = useCallback((value: string) => {
    const timer = setTimeout(() => setDebouncedSearch(value), 400);
    return () => clearTimeout(timer);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'merchants', page, debouncedSearch, status],
    queryFn: () => adminApi.listMerchants({
      page,
      search: debouncedSearch || undefined,
      per_page: 20,
    }),
    staleTime: 30_000,
  });

  const merchants: AdminMerchantSummary[] = data?.data?.data ?? [];
  const lastPage = data?.data?.last_page ?? 1;
  const total    = data?.data?.total ?? 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
        <p className="text-sm text-gray-500 mt-1">{total > 0 ? `${total} merchant${total !== 1 ? 's' : ''} on the platform` : 'Merchant directory'}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search merchants…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              debounce(e.target.value);
            }}
            className="pl-9 border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Company</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Branches</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">This Month</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && merchants.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No merchants found.</td></tr>
              )}
              {merchants.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => router.push(`/admin/merchants/${m.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{m.company_name}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {m.owner ? (
                      <>
                        <p className="text-gray-800">{m.owner.name}</p>
                        <p className="text-xs text-gray-500">{m.owner.email}</p>
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{m.subscription?.plan_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {m.subscription ? (
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CHIP[m.subscription.status]}`}>
                          {m.subscription.status}
                        </span>
                        {m.subscription.status === 'trial' && m.subscription.trial_ends_at && (
                          <p className="text-xs text-gray-400 mt-0.5">until {m.subscription.trial_ends_at}</p>
                        )}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{m.branches_count}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-gray-800">{m.monthly_deliveries.toLocaleString()} deliveries</p>
                    <p className="text-xs text-gray-500">{fmtIdr(m.monthly_revenue)}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lastPage > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 justify-end">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {lastPage}</span>
            <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page === lastPage} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
