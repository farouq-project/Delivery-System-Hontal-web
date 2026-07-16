'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { MerchantSubscription, SubscriptionStatus } from '@/types';

const STATUS_CHIP: Record<SubscriptionStatus, string> = {
  trial:     'bg-amber-100 text-amber-700',
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  expired:   'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function AdminSubscriptionsPage() {
  const [page, setPage]   = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', page, status],
    queryFn: () => adminApi.listSubscriptions({ page, status: status || undefined, per_page: 25 }),
    staleTime: 30_000,
  });

  const subs: MerchantSubscription[] = data?.data?.data ?? [];
  const meta = data?.data;
  const lastPage = meta?.last_page ?? 1;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">All merchant subscriptions on the platform</p>
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {['trial', 'active', 'suspended', 'expired', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Merchant</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Trial Ends</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && subs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No subscriptions found.</td></tr>
              )}
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.merchant?.company_name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{s.merchant?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{s.plan?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CHIP[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.trial_ends_at ? s.trial_ends_at.slice(0, 10) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.started_at ? s.started_at.slice(0, 10) : '—'}</td>
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
