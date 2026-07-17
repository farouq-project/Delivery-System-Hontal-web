'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { MerchantHealthRecord, MerchantHealthStatus } from '@/types';
import { Activity } from 'lucide-react';

const HEALTH_CHIP: Record<MerchantHealthStatus, string> = {
  healthy:        'bg-emerald-100 text-emerald-700',
  needs_attention:'bg-amber-100 text-amber-700',
  inactive:       'bg-gray-100 text-gray-500',
};

function fmt(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MerchantHealthPage() {
  const { data, isLoading } = useQuery<{ data: { data: MerchantHealthRecord[]; summary: Record<string, number> } }>({
    queryKey: ['admin', 'health'],
    queryFn: () => adminApi.getHealth(),
    staleTime: 60_000,
  });

  const merchants: MerchantHealthRecord[] = Array.isArray(data?.data?.data) ? data.data.data : [];

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchant Health</h1>
          <p className="text-sm text-gray-500 mt-1">Activity, engagement, and delivery performance per merchant</p>
        </div>
        {!isLoading && (
          <div className="flex gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              {merchants.filter(m => m.health === 'healthy').length} Healthy
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
              {merchants.filter(m => m.health === 'needs_attention').length} Needs Attention
            </span>
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
              {merchants.filter(m => m.health === 'inactive').length} Inactive
            </span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
          <Activity className="h-6 w-6 mx-auto mb-2 animate-pulse" />
          Loading health data…
        </div>
      )}

      {!isLoading && merchants.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
          No merchants found.
        </div>
      )}

      {merchants.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Merchant</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Health</th>
                  <th className="px-4 py-3 text-right">Monthly Orders</th>
                  <th className="px-4 py-3 text-right">Success Rate</th>
                  <th className="px-4 py-3 text-right">Drivers</th>
                  <th className="px-4 py-3 text-left">Last Login</th>
                  <th className="px-4 py-3 text-left">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {merchants.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <a href={`/admin/merchants/${m.id}`} className="font-medium text-gray-900 hover:text-emerald-700 hover:underline">
                        {m.company_name}
                      </a>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${m.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700'
                        : m.subscription_status === 'trial' ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-500'}`}>
                        {m.subscription_status ?? 'none'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${HEALTH_CHIP[m.health]}`}>
                        {m.health.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{m.monthly_orders}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={m.delivery_success_rate >= 75 ? 'text-emerald-600 font-medium' : m.delivery_success_rate >= 40 ? 'text-amber-600' : 'text-red-500'}>
                        {m.delivery_success_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{m.active_drivers}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(m.last_login_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(m.last_order_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
