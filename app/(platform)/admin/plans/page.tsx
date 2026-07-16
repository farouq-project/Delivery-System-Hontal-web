'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { PlatformPlan } from '@/types';

function fmtIdr(n: number) {
  if (n === 0) return 'Custom';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function AdminPlansPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: adminApi.listPlans,
    staleTime: 60_000,
  });

  const plans: PlatformPlan[] = data?.data?.data ?? [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Plans</h1>
        <p className="text-sm text-gray-500 mt-1">Subscription tiers available to merchants</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading plans…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white border rounded-lg p-5 shadow-sm ${plan.is_active ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900 text-lg">{plan.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                </div>
                {!plan.is_active && (
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-emerald-600 mb-4">
                {fmtIdr(plan.monthly_price)}
                {plan.monthly_price > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
              </p>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li><span className="font-medium">{plan.delivery_limit?.toLocaleString() ?? 'Unlimited'}</span> deliveries/mo</li>
                <li><span className="font-medium">{plan.branch_limit ?? 'Unlimited'}</span> branches</li>
                <li><span className="font-medium">{plan.driver_limit ?? 'Unlimited'}</span> drivers</li>
              </ul>
              {typeof plan.subscriber_count === 'number' && (
                <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                  {plan.subscriber_count} active subscriber{plan.subscriber_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
