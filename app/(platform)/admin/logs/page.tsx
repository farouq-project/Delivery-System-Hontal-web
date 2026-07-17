'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { MerchantActivityLogEntry } from '@/types';

interface ActivityPage {
  data: MerchantActivityLogEntry[];
  current_page: number;
  last_page: number;
  total: number;
}

export default function ActivityFeedPage() {
  const [merchantId, setMerchantId] = useState('');
  const [eventType, setEventType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<ActivityPage>({
    queryKey: ['admin', 'activity', { merchantId, eventType, search, page }],
    queryFn: () => adminApi.getActivity({
      merchant_id: merchantId || undefined,
      event_type:  eventType || undefined,
      search:      search || undefined,
      page,
    }).then(r => r.data),
    staleTime: 15_000,
  });

  function fmt(d: string) {
    return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Activity Feed</h1>
        <p className="text-sm text-gray-500 mt-1">All merchant-level events across the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search description…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-56"
        />
        <input
          type="text"
          placeholder="Event type (e.g. user_created)"
          value={eventType}
          onChange={e => { setEventType(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-56"
        />
        <input
          type="number"
          placeholder="Merchant ID"
          value={merchantId}
          onChange={e => { setMerchantId(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-36"
        />
        {(search || eventType || merchantId) && (
          <button
            onClick={() => { setSearch(''); setEventType(''); setMerchantId(''); setPage(1); }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400 animate-pulse">
          Loading activity…
        </div>
      )}

      {data && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {data.data.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No activity found.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.data.map((e) => (
                  <div key={e.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {e.event_type}
                        </span>
                        {e.actor && (
                          <span className="text-xs text-gray-500">
                            by <span className="font-medium text-gray-700">{e.actor.name}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 mt-0.5">{e.description}</p>
                      {e.merchant_id && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Merchant{' '}
                          <a href={`/admin/merchants/${e.merchant_id}`} className="text-emerald-600 hover:underline">
                            #{e.merchant_id}
                          </a>
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap mt-0.5">{fmt(e.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {data.last_page > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-gray-500">{data.total} total events</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-gray-600">
                  {page} / {data.last_page}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.last_page, p + 1))}
                  disabled={page === data.last_page}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
