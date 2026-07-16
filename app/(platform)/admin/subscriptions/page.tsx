'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { MerchantSubscription, SubscriptionStatus, PlatformPlan } from '@/types';
import { MoreHorizontal } from 'lucide-react';

const STATUS_CHIP: Record<SubscriptionStatus, string> = {
  trial:     'bg-amber-100 text-amber-800',
  active:    'bg-emerald-100 text-emerald-700',
  paused:    'bg-indigo-100 text-indigo-700',
  suspended: 'bg-red-100 text-red-700',
  expired:   'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function AdminSubscriptionsPage() {
  const qc = useQueryClient();
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState('');
  const [search, setSearch]   = useState('');
  const [activeMenu, setActiveMenu]     = useState<number | null>(null);
  const [changePlanSub, setChangePlanSub] = useState<MerchantSubscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [extendSub, setExtendSub]       = useState<MerchantSubscription | null>(null);
  const [extendDays, setExtendDays]     = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', page, status, search],
    queryFn: () => adminApi.listSubscriptions({
      page,
      status: status || undefined,
      search: search || undefined,
      per_page: 25,
    }),
    staleTime: 30_000,
  });

  const { data: plansData } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => adminApi.listPlans(),
    enabled: !!changePlanSub,
    staleTime: 120_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });

  const actionMutation = useMutation({
    mutationFn: ({ action, subId }: { action: string; subId: number }) => {
      switch (action) {
        case 'pause':    return adminApi.pauseSubscription(subId);
        case 'resume':   return adminApi.resumeSubscription(subId);
        case 'activate': return adminApi.activateSubscription(subId);
        case 'expire':   return adminApi.expireSubscription(subId);
        case 'cancel':   return adminApi.cancelSubscription(subId);
        default:         return Promise.reject(new Error('Unknown'));
      }
    },
    onSuccess: () => { invalidate(); setActiveMenu(null); },
  });

  const changePlanMutation = useMutation({
    mutationFn: ({ subId, planId }: { subId: number; planId: number }) =>
      adminApi.changePlan(subId, planId),
    onSuccess: () => { invalidate(); setChangePlanSub(null); setSelectedPlanId(null); },
  });

  const extendMutation = useMutation({
    mutationFn: ({ subId, days }: { subId: number; days: number }) =>
      adminApi.extendTrial(subId, days),
    onSuccess: () => { invalidate(); setExtendSub(null); },
  });

  const subs: MerchantSubscription[] = data?.data?.data ?? [];
  const lastPage = data?.data?.last_page ?? 1;
  const plans: PlatformPlan[] = plansData?.data?.data ?? [];

  function getActions(s: MerchantSubscription) {
    const id = s.id;
    const acts: { label: string; action: string }[] = [];
    if (s.status === 'trial') {
      acts.push({ label: 'Activate', action: 'activate' });
      acts.push({ label: 'Extend Trial', action: 'extend' });
      acts.push({ label: 'Cancel', action: 'cancel' });
    } else if (s.status === 'active') {
      acts.push({ label: 'Change Plan', action: 'change-plan' });
      acts.push({ label: 'Pause', action: 'pause' });
      acts.push({ label: 'Expire', action: 'expire' });
      acts.push({ label: 'Cancel', action: 'cancel' });
    } else if (s.status === 'paused') {
      acts.push({ label: 'Resume', action: 'resume' });
      acts.push({ label: 'Cancel', action: 'cancel' });
    } else if (s.status === 'suspended' || s.status === 'expired') {
      acts.push({ label: 'Re-activate', action: 'activate' });
      acts.push({ label: 'Cancel', action: 'cancel' });
    }
    return { id, acts };
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">All merchant subscriptions on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search merchant…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-52"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {['trial', 'active', 'paused', 'suspended', 'expired', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm" onClick={() => setActiveMenu(null)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Merchant</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Trial Ends</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Started</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && subs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No subscriptions found.</td></tr>
              )}
              {subs.map((s) => {
                const { id, acts } = getActions(s);
                return (
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
                    <td className="px-4 py-3 text-right">
                      {acts.length > 0 && (
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === s.id ? null : s.id); }}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {activeMenu === s.id && (
                            <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                              {acts.map((act) => (
                                <button
                                  key={act.action}
                                  onClick={() => {
                                    if (act.action === 'change-plan') { setChangePlanSub(s); setActiveMenu(null); }
                                    else if (act.action === 'extend') { setExtendSub(s); setExtendDays(7); setActiveMenu(null); }
                                    else actionMutation.mutate({ action: act.action, subId: id });
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  {act.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
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

      {/* Change Plan modal */}
      {changePlanSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-sm p-6">
            <p className="font-bold text-gray-900 mb-1">Change Plan</p>
            <p className="text-sm text-gray-500 mb-4">{changePlanSub.merchant?.company_name}</p>
            <div className="space-y-2 mb-4">
              {plans.filter((p) => p.is_active && !p.deleted_at).map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-3 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="plan" value={p.id} checked={selectedPlanId === p.id} onChange={() => setSelectedPlanId(p.id)} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">Rp {new Intl.NumberFormat('id-ID').format(p.monthly_price)}/mo</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setChangePlanSub(null); setSelectedPlanId(null); }} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
              <button
                onClick={() => { if (selectedPlanId) changePlanMutation.mutate({ subId: changePlanSub.id, planId: selectedPlanId }); }}
                disabled={!selectedPlanId || changePlanMutation.isPending}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {changePlanMutation.isPending ? 'Changing…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Trial modal */}
      {extendSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-xs p-6">
            <p className="font-bold text-gray-900 mb-1">Extend Trial</p>
            <p className="text-sm text-gray-500 mb-4">{extendSub.merchant?.company_name}</p>
            <label className="block text-xs font-medium text-gray-700 mb-1">Days to add</label>
            <input
              type="number" min={1} max={365} value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setExtendSub(null)} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
              <button
                onClick={() => extendMutation.mutate({ subId: extendSub.id, days: extendDays })}
                disabled={extendMutation.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {extendMutation.isPending ? 'Extending…' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
