'use client';

import { useQuery } from '@tanstack/react-query';
import { subscriptionApi, adminApi } from '@/lib/api';
import { Package, Zap, Calendar, TrendingUp, CheckCircle } from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-green-100 text-green-800',
    trial:     'bg-blue-100 text-blue-800',
    paused:    'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800',
    expired:   'bg-gray-100 text-gray-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function CreditBar({ used, total }: { used: number; total: number | null }) {
  if (total === null) {
    return <div className="text-sm text-gray-500">Unlimited credits (Enterprise)</div>;
  }
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{used.toLocaleString()} used</span>
        <span className="text-gray-600">{total.toLocaleString()} total</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-500">{pct}% used</div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { data: subData, isLoading } = useQuery({
    queryKey: ['subscription-own'],
    queryFn:  () => subscriptionApi.getOwn(),
  });

  const { data: packsData } = useQuery({
    queryKey: ['credit-packs-public'],
    queryFn:  () => adminApi.listCreditPacks(),
  });

  const sub   = subData?.data?.data;
  const packs = packsData?.data?.data ?? [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="p-6 text-gray-500">No subscription found. Contact support.</div>
    );
  }

  const trialEndsAt   = sub.trial_ends_at  ? new Date(sub.trial_ends_at)  : null;
  const expiresAt     = sub.expires_at     ? new Date(sub.expires_at)     : null;
  const creditsReset  = sub.credits_reset_at ? new Date(sub.credits_reset_at) : null;

  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>

      {/* Plan card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-lg">{sub.plan_name ?? 'No Plan'}</div>
              <StatusBadge status={sub.status} />
            </div>
          </div>
          {sub.included_routing_mode && (
            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              Routing: {sub.included_routing_mode}
            </span>
          )}
        </div>

        {sub.is_trial && trialEndsAt && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              Trial ends <strong>{fmtDate(trialEndsAt)}</strong>
              {sub.days_in_trial !== null && ` (${sub.days_in_trial} days remaining)`}
            </span>
          </div>
        )}

        {!sub.is_trial && expiresAt && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Expires <strong>{fmtDate(expiresAt)}</strong></span>
          </div>
        )}
      </div>

      {/* Credit usage */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Zap className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">Delivery Credits</div>
            <div className="text-sm text-gray-500">
              {sub.delivery_limit === null ? 'Unlimited' : `${sub.credits_available?.toLocaleString()} remaining`}
            </div>
          </div>
        </div>

        <CreditBar used={sub.credits_used ?? 0} total={sub.delivery_limit} />

        {sub.extra_credits > 0 && (
          <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            +{sub.extra_credits.toLocaleString()} bonus credits purchased
          </div>
        )}

        {creditsReset && (
          <div className="text-xs text-gray-400">
            Credits reset on {fmtDate(creditsReset)}
          </div>
        )}
      </div>

      {/* Credit packs */}
      {packs.length > 0 && sub.delivery_limit !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Credit Top-Up Packs</div>
              <div className="text-sm text-gray-500">Need more deliveries this month? Contact admin to purchase.</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {packs.map((pack: { slug: string; name: string; credits: number; price_idr: number }) => (
              <div key={pack.slug} className="border border-gray-200 rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  {pack.name}
                </div>
                <div className="text-xl font-bold text-gray-900">+{pack.credits}</div>
                <div className="text-sm text-gray-500">
                  Rp{pack.price_idr.toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">To purchase a credit pack, contact your platform administrator.</p>
        </div>
      )}
    </div>
  );
}
