'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { SubscriptionStatus, PlatformPlan, MerchantFeatureFlag, MerchantUsage, MerchantActivityLogEntry, MerchantSupportConsole } from '@/types';
import { ArrowLeft, Building2, Users, Package, Settings, Activity, CreditCard, Zap, BarChart2, HeadphonesIcon } from 'lucide-react';

type Tab = 'overview' | 'subscription' | 'usage' | 'billing' | 'users' | 'features' | 'settings' | 'activity' | 'support';

const STATUS_CHIP: Record<SubscriptionStatus, string> = {
  trial:     'bg-amber-100 text-amber-800',
  active:    'bg-emerald-100 text-emerald-700',
  paused:    'bg-indigo-100 text-indigo-700',
  suspended: 'bg-red-100 text-red-700',
  expired:   'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
};

function fmtIdr(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const isWarning = !!limit && pct >= 80 && pct < 100;
  const isDanger  = !!limit && pct >= 100;
  const barColor  = isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500';
  const textColor = isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-900';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className={`font-semibold ${textColor}`}>
          {used.toLocaleString()}{limit ? ` / ${limit.toLocaleString()} (${pct}%)` : ' (unlimited)'}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        {limit ? <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} /> : <div className="h-full bg-emerald-200 rounded-full w-full opacity-30" />}
      </div>
      {isDanger && <p className="text-xs text-red-600 font-medium">Limit reached</p>}
      {isWarning && <p className="text-xs text-amber-600">Approaching limit</p>}
    </div>
  );
}

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');

  // Subscription action state
  const [changePlanModal, setChangePlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId]   = useState<number | null>(null);
  const [extendModal, setExtendModal]         = useState(false);
  const [extendDays, setExtendDays]           = useState(7);

  // User action state
  const [resetPwdUser, setResetPwdUser] = useState<{ id: number; name: string } | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: number; name: string } | null>(null);

  // Support tab state
  const [supportNotes, setSupportNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [supportSaved, setSupportSaved] = useState(false);

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

  const { data: featuresData, isLoading: isLoadingFeatures } = useQuery({
    queryKey: ['admin', 'merchant', id, 'features'],
    queryFn: () => adminApi.getMerchantFeatures(Number(id)),
    enabled: tab === 'features',
    staleTime: 30_000,
  });

  const { data: usageData, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['admin', 'merchant', id, 'usage'],
    queryFn: () => adminApi.getMerchantUsage(Number(id)),
    enabled: tab === 'usage',
    staleTime: 60_000,
  });

  const { data: activityData } = useQuery({
    queryKey: ['admin', 'merchant', id, 'activity'],
    queryFn: () => adminApi.getMerchantActivity(Number(id)),
    enabled: tab === 'activity',
    staleTime: 30_000,
  });

  const { data: plansData } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => adminApi.listPlans(),
    enabled: tab === 'subscription' || changePlanModal,
    staleTime: 120_000,
  });

  const { data: deliveryData } = useQuery({
    queryKey: ['admin', 'merchant', id, 'delivery'],
    queryFn: () => adminApi.getMerchantDeliverySummary(Number(id)),
    enabled: tab === 'overview',
    staleTime: 60_000,
  });

  const { data: supportData, isLoading: isLoadingSupport } = useQuery<{ data: MerchantSupportConsole }>({
    queryKey: ['admin', 'merchant', id, 'support'],
    queryFn: () => adminApi.getMerchantSupport(Number(id)).then(r => r.data),
    enabled: tab === 'support',
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'merchant', id] });
    qc.invalidateQueries({ queryKey: ['admin', 'merchant', id, 'activity'] });
  };

  const supportConsole: MerchantSupportConsole | undefined = supportData?.data;

  useEffect(() => {
    if (supportConsole) {
      setSupportNotes(supportConsole.support_notes ?? '');
      setInternalNotes(supportConsole.internal_notes ?? '');
    }
  // Only sync when support data first loads, not on every re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportData]);

  const changePlanMutation = useMutation({
    mutationFn: ({ subId, planId }: { subId: number; planId: number }) =>
      adminApi.changePlan(subId, planId),
    onSuccess: () => { invalidate(); setChangePlanModal(false); setSelectedPlanId(null); },
  });

  const extendMutation = useMutation({
    mutationFn: ({ subId, days }: { subId: number; days: number }) =>
      adminApi.extendTrial(subId, days),
    onSuccess: () => { invalidate(); setExtendModal(false); },
  });

  const subActionMutation = useMutation({
    mutationFn: ({ action, subId, merchantId }: { action: string; subId: number; merchantId: number }) => {
      switch (action) {
        case 'pause':     return adminApi.pauseSubscription(subId);
        case 'resume':    return adminApi.resumeSubscription(subId);
        case 'activate':  return adminApi.activateSubscription(subId);
        case 'expire':    return adminApi.expireSubscription(subId);
        case 'cancel':    return adminApi.cancelSubscription(subId);
        case 'suspend':   return adminApi.updateMerchantStatus(merchantId, 'suspended');
        default:          return Promise.reject(new Error('Unknown action'));
      }
    },
    onSuccess: () => invalidate(),
  });

  const featureMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      adminApi.updateMerchantFeature(Number(id), key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'merchant', id, 'features'] }),
  });

  const resetPwdMutation = useMutation({
    mutationFn: (userId: number) =>
      adminApi.resetMerchantUserPassword(Number(id), userId),
    onSuccess: (res) => {
      setTempPassword(res.data.temp_password);
    },
  });

  const userStatusMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: number; action: 'deactivate' | 'reactivate' }) =>
      action === 'deactivate'
        ? adminApi.deactivateMerchantUser(Number(id), userId)
        : adminApi.reactivateMerchantUser(Number(id), userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'merchant', id, 'users'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => adminApi.deleteMerchantUser(Number(id), userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchant', id, 'users'] });
      setConfirmDeleteUser(null);
    },
  });

  const supportNotesMutation = useMutation({
    mutationFn: () => adminApi.updateMerchantSupportNotes(Number(id), {
      support_notes:  supportNotes || null,
      internal_notes: internalNotes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'merchant', id, 'support'] });
      setSupportSaved(true);
      setTimeout(() => setSupportSaved(false), 2500);
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Loading merchant…</div>;

  const d = data?.data?.data;
  if (!d) return <div className="p-6 text-sm text-red-500">Merchant not found.</div>;

  const { merchant, delivery_summary, monthly_revenue } = d;
  const sub = merchant.subscription;
  const subId = sub?.id as number | undefined;
  const plans: PlatformPlan[] = plansData?.data?.data ?? [];
  const usage: MerchantUsage | undefined = usageData?.data?.data;
  const activityLog: MerchantActivityLogEntry[] = activityData?.data?.data ?? [];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',     label: 'Overview',     icon: <Building2 className="h-4 w-4" /> },
    { key: 'subscription', label: 'Subscription', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'usage',        label: 'Usage',        icon: <BarChart2 className="h-4 w-4" /> },
    { key: 'billing',      label: 'Billing',      icon: <Package className="h-4 w-4" /> },
    { key: 'users',        label: 'Users',        icon: <Users className="h-4 w-4" /> },
    { key: 'features',     label: 'Features',     icon: <Zap className="h-4 w-4" /> },
    { key: 'settings',     label: 'Settings',     icon: <Settings className="h-4 w-4" /> },
    { key: 'activity',     label: 'Activity',     icon: <Activity className="h-4 w-4" /> },
    { key: 'support',      label: 'Support',      icon: <HeadphonesIcon className="h-4 w-4" /> },
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

      <div className="flex gap-0 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
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
            <h2 className="font-bold text-gray-900 mb-3">Delivery Summary</h2>
            <div className="space-y-2">
              {Object.entries(delivery_summary as Record<string, number> ?? {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{status.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Revenue this month</span>
                <span className="font-bold text-gray-900">{fmtIdr(monthly_revenue ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription ── */}
      {tab === 'subscription' && (
        <div className="max-w-xl space-y-5">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Current Subscription</h2>
            {sub ? (
              <div className="space-y-2 text-sm">
                {[
                  ['Plan', sub.plan?.name ?? '—'],
                  ['Status', sub.status],
                  ['Started', sub.started_at?.slice(0, 10) ?? '—'],
                  ['Trial ends', sub.trial_ends_at?.slice(0, 10) ?? '—'],
                  ['Expires', sub.expires_at?.slice(0, 10) ?? '—'],
                  ['Paused at', sub.paused_at?.slice(0, 10) ?? '—'],
                  ['Billing', sub.billing_cycle ?? '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex gap-4">
                    <span className="w-28 shrink-0 text-gray-500">{l}</span>
                    <span className="text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No subscription record.</p>
            )}
          </div>

          {sub && subId && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Lifecycle Actions</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {sub.status === 'trial' && (
                  <>
                    <button onClick={() => subActionMutation.mutate({ action: 'activate', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">Activate</button>
                    <button onClick={() => setExtendModal(true)} className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100">Extend Trial</button>
                    <button onClick={() => subActionMutation.mutate({ action: 'cancel', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                  </>
                )}
                {sub.status === 'active' && (
                  <>
                    <button onClick={() => setChangePlanModal(true)} className="px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100">Change Plan</button>
                    <button onClick={() => subActionMutation.mutate({ action: 'pause', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 disabled:opacity-50">Pause</button>
                    <button onClick={() => subActionMutation.mutate({ action: 'suspend', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50">Suspend</button>
                    <button onClick={() => subActionMutation.mutate({ action: 'expire', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50">Expire</button>
                    <button onClick={() => subActionMutation.mutate({ action: 'cancel', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                  </>
                )}
                {sub.status === 'paused' && (
                  <>
                    <button onClick={() => subActionMutation.mutate({ action: 'resume', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">Resume</button>
                    <button onClick={() => subActionMutation.mutate({ action: 'cancel', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                  </>
                )}
                {(sub.status === 'suspended' || sub.status === 'expired') && (
                  <>
                    <button onClick={() => subActionMutation.mutate({ action: 'activate', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">Re-activate</button>
                    <button onClick={() => subActionMutation.mutate({ action: 'cancel', subId, merchantId: merchant.id })} disabled={subActionMutation.isPending} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                  </>
                )}
              </div>
              {subActionMutation.isSuccess && <p className="text-xs text-emerald-600">Action completed.</p>}
              {subActionMutation.isError && <p className="text-xs text-red-600">Action failed. Try again.</p>}
            </div>
          )}
        </div>
      )}

      {/* ── Usage ── */}
      {tab === 'usage' && (
        <div className="max-w-xl">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-1">Platform Usage</h2>
            {usage && <p className="text-xs text-gray-400 mb-4">Plan: {usage.plan?.name ?? '—'} · Status: {usage.subscription_status ?? '—'}</p>}
            {isLoadingUsage ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : usage ? (
              <div className="space-y-5">
                <UsageBar label="Deliveries this month" used={usage.deliveries.used} limit={usage.deliveries.limit} />
                <UsageBar label="Active drivers" used={usage.drivers.used} limit={usage.drivers.limit} />
                <UsageBar label="Active branches" used={usage.branches.used} limit={usage.branches.limit} />
                <UsageBar label="Active customers" used={usage.customers.used} limit={usage.customers.limit} />
              </div>
            ) : (
              <p className="text-sm text-gray-400">No usage data.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Billing (placeholder) ── */}
      {tab === 'billing' && (
        <div className="max-w-lg">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Billing</h2>
            {merchant.billing ? (
              <div className="space-y-2 text-sm">
                {[
                  ['Invoice #', merchant.billing.invoice_number ?? '—'],
                  ['Amount', merchant.billing.invoice_amount ? fmtIdr(merchant.billing.invoice_amount) : '—'],
                  ['Due date', merchant.billing.due_date ?? '—'],
                  ['Payment status', merchant.billing.payment_status],
                  ['Last payment', merchant.billing.last_payment_at?.slice(0, 10) ?? '—'],
                  ['Outstanding balance', fmtIdr(merchant.billing.outstanding_balance ?? 0)],
                  ['Renewal date', merchant.billing.renewal_date ?? '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex gap-4">
                    <span className="w-36 shrink-0 text-gray-500">{l}</span>
                    <span className="text-gray-900">{v}</span>
                  </div>
                ))}
                {merchant.billing.billing_notes && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-gray-500 mb-1 text-xs">Notes</p>
                    <p className="text-gray-700 bg-gray-50 rounded p-2 text-xs">{merchant.billing.billing_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No billing record</p>
                <p className="text-xs mt-1">Payment gateway integration — Phase 6</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Last Login</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(usersData?.data?.data ?? []).map((u: { id: number; name: string; email: string; role: string; is_active: boolean; last_login_at: string | null }) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{u.role}</span></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('id-ID') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setResetPwdUser({ id: u.id, name: u.name }); setTempPassword(null); resetPwdMutation.mutate(u.id); }}
                          disabled={resetPwdMutation.isPending}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50"
                        >
                          Reset Pwd
                        </button>
                        {u.is_active ? (
                          <button
                            onClick={() => userStatusMutation.mutate({ userId: u.id, action: 'deactivate' })}
                            disabled={userStatusMutation.isPending}
                            className="px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => userStatusMutation.mutate({ userId: u.id, action: 'reactivate' })}
                            disabled={userStatusMutation.isPending}
                            className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Reactivate
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDeleteUser({ id: u.id, name: u.name })}
                          disabled={deleteUserMutation.isPending}
                          className="px-2 py-1 text-xs bg-gray-50 text-gray-500 border border-gray-200 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Features ── */}
      {tab === 'features' && (
        <div className="max-w-md">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Feature Flags</h2>
            {isLoadingFeatures ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="space-y-3">
                {(featuresData?.data?.data as MerchantFeatureFlag[] ?? []).map((f) => (
                  <div key={f.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm text-gray-800 font-medium">{f.label}</p>
                      <p className="text-xs text-gray-400">{f.key}</p>
                    </div>
                    <button
                      onClick={() => featureMutation.mutate({ key: f.key, enabled: !f.is_enabled })}
                      disabled={featureMutation.isPending}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${f.is_enabled ? 'bg-emerald-600' : 'bg-gray-200'} disabled:opacity-60`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${f.is_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Settings ── */}
      {tab === 'settings' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm max-w-lg">
          <h2 className="font-bold text-gray-900 mb-4">Operational Settings</h2>
          {merchant.settings ? (
            <div className="space-y-2 text-sm">
              {Object.entries(merchant.settings as Record<string, unknown>)
                .filter(([k]) => !['id', 'merchant_id', 'created_at', 'updated_at'].includes(k))
                .map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <span className="w-48 shrink-0 text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-gray-900">{String(v ?? '—')}</span>
                  </div>
                ))}
            </div>
          ) : <p className="text-sm text-gray-400">No settings configured.</p>}
        </div>
      )}

      {/* ── Activity ── */}
      {tab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm max-w-2xl">
          {activityLog.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activity logged yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activityLog.map((entry) => (
                <div key={entry.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mb-1">{entry.event_type}</span>
                      <p className="text-sm text-gray-800">{entry.description}</p>
                      {entry.actor && <p className="text-xs text-gray-400 mt-0.5">by {entry.actor.name}</p>}
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">{new Date(entry.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Support ── */}
      {tab === 'support' && (
        <div className="space-y-5 max-w-2xl">
          {isLoadingSupport && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400 animate-pulse">
              Loading support data…
            </div>
          )}

          {supportConsole && (
            <>
              {/* Notes editor */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Support Notes</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Visible to support staff</label>
                    <textarea
                      rows={4}
                      value={supportNotes}
                      onChange={e => setSupportNotes(e.target.value)}
                      placeholder="Add notes visible to support staff…"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Internal notes (super admin only)</label>
                    <textarea
                      rows={3}
                      value={internalNotes}
                      onChange={e => setInternalNotes(e.target.value)}
                      placeholder="Internal notes not shared with merchant…"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm transition-opacity ${supportSaved ? 'text-emerald-600 opacity-100' : 'opacity-0'}`}>
                      Notes saved.
                    </p>
                    <button
                      onClick={() => supportNotesMutation.mutate()}
                      disabled={supportNotesMutation.isPending}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {supportNotesMutation.isPending ? 'Saving…' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </div>

              {/* API Usage Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">API Usage (This Month)</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Requests</p>
                    <p className="text-lg font-semibold text-gray-900">{supportConsole.api_usage_summary.requests_this_month.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Est. Units</p>
                    <p className="text-lg font-semibold text-gray-900">{supportConsole.api_usage_summary.estimated_units_this_month.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Cache Hit Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{supportConsole.api_usage_summary.cache_hit_rate}%</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {supportConsole.recent_activity.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <p className="px-5 py-3 text-sm font-semibold text-gray-700 border-b border-gray-100">Recent Activity</p>
                  <div className="divide-y divide-gray-100">
                    {supportConsole.recent_activity.map((e) => (
                      <div key={e.id} className="px-5 py-3 flex items-start justify-between gap-4">
                        <div>
                          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{e.event_type}</span>
                          {e.actor_name && <span className="text-xs text-gray-400 ml-2">by {e.actor_name}</span>}
                          <p className="text-sm text-gray-700 mt-0.5">{e.description}</p>
                        </div>
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(e.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Change Plan modal */}
      {changePlanModal && subId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-sm p-6">
            <p className="font-bold text-gray-900 mb-4">Change Plan</p>
            <div className="space-y-2 mb-5">
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
              <button onClick={() => { setChangePlanModal(false); setSelectedPlanId(null); }} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
              <button
                onClick={() => { if (selectedPlanId) changePlanMutation.mutate({ subId, planId: selectedPlanId }); }}
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
      {extendModal && subId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-xs p-6">
            <p className="font-bold text-gray-900 mb-4">Extend Trial</p>
            <label className="block text-xs font-medium text-gray-700 mb-1">Days to add</label>
            <input
              type="number"
              min={1}
              max={365}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setExtendModal(false)} className="flex-1 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
              <button
                onClick={() => extendMutation.mutate({ subId, days: extendDays })}
                disabled={extendMutation.isPending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {extendMutation.isPending ? 'Extending…' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete user confirmation */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-xs p-6">
            <p className="font-bold text-gray-900 mb-1">Delete User Permanently</p>
            <p className="text-sm text-gray-500 mb-3">{confirmDeleteUser.name}</p>
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-4">
              This action cannot be undone. The user account will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUserMutation.mutate(confirmDeleteUser.id)}
                disabled={deleteUserMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteUserMutation.isPending ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password reset result modal */}
      {tempPassword && resetPwdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-xs p-6">
            <p className="font-bold text-gray-900 mb-1">Password Reset</p>
            <p className="text-sm text-gray-500 mb-4">{resetPwdUser.name}</p>
            <div className="bg-gray-50 rounded p-3 mb-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Temporary password</p>
              <code className="font-mono font-bold text-blue-700 text-lg">{tempPassword}</code>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">Share securely. This cannot be retrieved again.</p>
            <button onClick={() => { setTempPassword(null); setResetPwdUser(null); }} className="w-full py-2 bg-gray-900 text-white rounded-md text-sm font-medium">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
