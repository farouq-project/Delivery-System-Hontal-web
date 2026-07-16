'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { SubscriptionStatus } from '@/types';
import { ArrowLeft, Building2, Users, Package, Settings, Activity, CreditCard } from 'lucide-react';

type Tab = 'overview' | 'subscription' | 'users' | 'delivery' | 'settings' | 'activity';

const STATUS_CHIP: Record<SubscriptionStatus, string> = {
  trial:     'bg-amber-100 text-amber-700',
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  expired:   'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_ACTIONS: { label: string; status: SubscriptionStatus; variant: string }[] = [
  { label: 'Approve Trial',      status: 'trial',     variant: 'bg-amber-600 text-white hover:bg-amber-700' },
  { label: 'Activate',           status: 'active',    variant: 'bg-green-600 text-white hover:bg-green-700' },
  { label: 'Suspend',            status: 'suspended', variant: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' },
  { label: 'End Trial / Expire', status: 'expired',   variant: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  { label: 'Deactivate',         status: 'cancelled', variant: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
];

function fmtIdr(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'merchant', id],
    queryFn: () => adminApi.getMerchant(Number(id)),
    staleTime: 30_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'merchant', id, 'users'],
    queryFn: () => adminApi.getMerchantUsers(Number(id)),
    enabled: tab === 'users',
    staleTime: 30_000,
  });

  const { data: deliveryData } = useQuery({
    queryKey: ['admin', 'merchant', id, 'delivery'],
    queryFn: () => adminApi.getMerchantDeliverySummary(Number(id)),
    enabled: tab === 'delivery',
    staleTime: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: SubscriptionStatus) => adminApi.updateMerchantStatus(Number(id), status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'merchant', id] }),
  });

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Loading merchant…</div>;

  const d = data?.data?.data;
  if (!d) return <div className="p-6 text-sm text-red-500">Merchant not found.</div>;

  const { merchant, delivery_summary, monthly_revenue } = d;
  const sub = merchant.subscription;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',     label: 'Overview',     icon: <Building2 className="h-4 w-4" /> },
    { key: 'subscription', label: 'Subscription', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'users',        label: 'Users',        icon: <Users className="h-4 w-4" /> },
    { key: 'delivery',     label: 'Delivery',     icon: <Package className="h-4 w-4" /> },
    { key: 'settings',     label: 'Settings',     icon: <Settings className="h-4 w-4" /> },
    { key: 'activity',     label: 'Activity',     icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Merchants
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{merchant.company_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{merchant.email} · {merchant.phone}</p>
          </div>
          {sub && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CHIP[sub.status as SubscriptionStatus]}`}>
              {sub.status}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900 mb-3">Business Profile</h2>
            {[
              ['Company', merchant.company_name],
              ['Email', merchant.email],
              ['Phone', merchant.phone],
              ['Address', merchant.address],
              ['Timezone', merchant.timezone],
              ['Created', new Date(merchant.created_at).toLocaleDateString('id-ID')],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4 text-sm">
                <span className="w-24 shrink-0 text-gray-500">{label}</span>
                <span className="text-gray-900">{value ?? '—'}</span>
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-3">This Month</h2>
            <div className="space-y-3">
              {Object.entries(delivery_summary as Record<string, number>).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-600">Revenue (delivered)</span>
                <span className="font-bold text-gray-900">{fmtIdr(monthly_revenue ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'subscription' && (
        <div className="max-w-lg space-y-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900 mb-3">Current Subscription</h2>
            {sub ? (
              <>
                {[
                  ['Plan', sub.plan?.name ?? '—'],
                  ['Status', sub.status],
                  ['Started', sub.started_at?.slice(0, 10) ?? '—'],
                  ['Trial ends', sub.trial_ends_at?.slice(0, 10) ?? '—'],
                  ['Expires', sub.expires_at?.slice(0, 10) ?? '—'],
                  ['Billing cycle', sub.billing_cycle ?? '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4 text-sm">
                    <span className="w-28 shrink-0 text-gray-500">{label}</span>
                    <span className="text-gray-900">{value}</span>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-gray-400">No subscription record.</p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Change Status</h2>
            <div className="flex flex-wrap gap-2">
              {STATUS_ACTIONS.map((action) => (
                <button
                  key={action.status}
                  onClick={() => statusMutation.mutate(action.status)}
                  disabled={statusMutation.isPending || sub?.status === action.status}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 ${action.variant}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {statusMutation.isSuccess && (
              <p className="text-sm text-green-600 mt-3">Status updated successfully.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Role</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(usersData?.data?.data ?? []).map((u: {id: number; name: string; email: string; role: string; is_active: boolean; last_login_at: string | null}) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{u.role}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('id-ID') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'delivery' && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Delivery by Status</h2>
            {Object.entries((deliveryData?.data?.data?.byStatus as {status: string; count: number}[] ?? []).reduce((a: Record<string, number>, r: {status: string; count: number}) => ({ ...a, [r.status]: r.count }), {})).map(([s, c]) => (
              <div key={s} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-600 capitalize">{s.replace('_', ' ')}</span>
                <span className="font-semibold text-gray-900">{Number(c).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Monthly Revenue (last 12 months)</h2>
            <div className="space-y-2">
              {(deliveryData?.data?.data?.byMonth ?? []).map((r: {month: string; deliveries: number; revenue: number}) => (
                <div key={r.month} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{r.month}</span>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{fmtIdr(r.revenue)}</p>
                    <p className="text-xs text-gray-400">{Number(r.deliveries).toLocaleString()} deliveries</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm max-w-lg">
          <h2 className="font-bold text-gray-900 mb-4">Operational Settings</h2>
          {merchant.settings ? (
            <div className="space-y-2 text-sm">
              {Object.entries(merchant.settings as Record<string, unknown>)
                .filter(([k]) => !['id', 'merchant_id', 'created_at', 'updated_at'].includes(k))
                .map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <span className="w-48 shrink-0 text-gray-500">{k.replace(/_/g, ' ')}</span>
                    <span className="text-gray-900">{String(v ?? '—')}</span>
                  </div>
                ))}
            </div>
          ) : <p className="text-sm text-gray-400">No settings configured.</p>}
        </div>
      )}

      {tab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 flex flex-col items-center gap-3 text-center shadow-sm max-w-md">
          <Activity className="h-10 w-10 text-gray-300" />
          <p className="font-semibold text-gray-700">Coming in Phase 5.3</p>
          <p className="text-sm text-gray-400">Merchant-specific audit log — provisioning, status changes, user activity.</p>
        </div>
      )}
    </div>
  );
}
