'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { biApi, growthApi } from '@/lib/api';
import { useMerchantLabels } from '@/lib/merchant-labels';
import { StatCard }      from '@/components/bi/StatCard';
import { AttentionPanel } from '@/components/bi/AttentionPanel';
import { SectionHeader }  from '@/components/bi/SectionHeader';
import { PerformanceCard } from '@/components/bi/PerformanceCard';
import { fmtIdr, fmtPct, fmtNum } from '@/components/bi/format';
import {
  TrendingUp, Package, Truck, Users, BarChart2,
  CheckCircle, Star, ShoppingBag, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-600 border-green-500 bg-green-50',
  B: 'text-blue-600 border-blue-500 bg-blue-50',
  C: 'text-amber-600 border-amber-500 bg-amber-50',
  D: 'text-orange-600 border-orange-500 bg-orange-50',
  F: 'text-red-600 border-red-500 bg-red-50',
};

const PILLAR_COLORS: Record<string, string> = {
  revenue:    'bg-indigo-500',
  customer:   'bg-teal-500',
  operations: 'bg-blue-500',
  growth:     'bg-violet-500',
  goals:      'bg-amber-500',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function monthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function BiOverviewPage() {
  const { label } = useMerchantLabels();
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());

  const now = new Date();
  const isCurrentMonth = viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() === now.getMonth();
  const monthLabel = `${MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  const param = monthParam(viewMonth);

  const goBack = () => setViewMonth(prev => { const d = new Date(prev); d.setDate(1); d.setMonth(d.getMonth() - 1); return d; });
  const goForward = () => setViewMonth(prev => { const d = new Date(prev); d.setDate(1); d.setMonth(d.getMonth() + 1); return d; });

  const { data, isLoading, error } = useQuery({
    queryKey: ['bi', 'overview', param],
    queryFn: () => biApi.overview(param),
    staleTime: 2 * 60 * 1000,
  });

  const { data: execData } = useQuery({
    queryKey: ['growth', 'executive'],
    queryFn: growthApi.executive,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading overview…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load business overview.</div>;

  const d = data?.data?.data;
  if (!d) return <div className="p-6 text-gray-400 text-sm">No overview data available yet.</div>;

  const ops   = d.operations_today;
  const month = d.business_this_month;
  const cust  = d.customer_health;

  const exec = execData?.data?.data;
  const hs   = exec?.health_score;
  const mc   = exec?.month_comparison;

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">60-second snapshot of your business health</p>
      </div>

      {/* Today */}
      <section>
        <SectionHeader title="Today's Operations" description="Live figures — updates on refresh" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            title={`${label('revenue')} Today`}
            value={fmtIdr(ops.revenue)}
            icon={TrendingUp}
            iconColor="text-green-500"
            variant="success"
          />
          <StatCard
            title={`${label('orders')} Today`}
            value={fmtNum(ops.orders)}
            icon={Package}
            href="/orders"
          />
          <StatCard
            title="Completed"
            value={fmtNum(ops.deliveries_completed)}
            icon={CheckCircle}
            iconColor="text-emerald-500"
            variant="success"
          />
          <StatCard
            title="Success Rate"
            value={fmtPct(ops.success_rate)}
            icon={BarChart2}
            iconColor={ops.success_rate != null && ops.success_rate < 70 ? 'text-red-500' : 'text-blue-500'}
            variant={ops.success_rate != null && ops.success_rate < 70 ? 'danger' : 'default'}
          />
          <StatCard
            title="Active Drivers"
            value={fmtNum(ops.active_drivers)}
            icon={Truck}
            iconColor="text-purple-500"
            href="/drivers"
          />
        </div>
      </section>

      {/* This Month */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800 tracking-tight">
              {isCurrentMonth ? 'This Month' : monthLabel}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isCurrentMonth ? 'Calendar month to date' : monthLabel}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goBack}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => setViewMonth(new Date())}
                className="px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              >
                Current
              </button>
            )}
            <button
              onClick={goForward}
              disabled={isCurrentMonth}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            title={`${label('revenue')} MTD`}
            value={fmtIdr(month.revenue)}
            icon={TrendingUp}
            iconColor="text-indigo-500"
            href="/bi/operations"
          />
          <StatCard
            title={`${label('orders')} MTD`}
            value={fmtNum(month.orders)}
            icon={Package}
            href="/bi/operations"
          />
          <StatCard
            title={label('avg_order_value')}
            value={fmtIdr(month.avg_order_value)}
            icon={ShoppingBag}
          />
          <StatCard
            title={`New ${label('customers')}`}
            value={fmtNum(month.new_customers)}
            icon={Users}
            iconColor="text-teal-500"
            href="/bi/customers"
          />
          <StatCard
            title={`Repeat ${label('customers')}`}
            value={fmtNum(month.repeat_customers)}
            icon={Star}
            iconColor="text-amber-500"
            href="/bi/customers"
          />
        </div>
      </section>

      {/* Customers */}
      <section>
        <SectionHeader title="Customer Health" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard title={`Total ${label('customers')}`}  value={fmtNum(cust.total)} icon={Users} href="/bi/customers" />
          <StatCard title="Dormant / Lost"   value={cust.dormant != null ? fmtNum(cust.dormant) : '—'} variant="warning" href="/bi/customers" />
        </div>
      </section>

      {/* Business Health Score */}
      {hs && (
        <section>
          <SectionHeader title="Business Health Score" description="5-pillar assessment · updates every 5 min" />
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {/* Grade circle */}
              <div className={cn('w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shrink-0',
                GRADE_COLORS[hs.grade] ?? 'text-gray-600 border-gray-400 bg-gray-50')}>
                <span className="text-3xl font-black">{hs.grade}</span>
                <span className="text-xs font-medium">{hs.score}/100</span>
              </div>
              {/* Pillar bars */}
              <div className="flex-1 space-y-2">
                {(Object.values(hs.pillars ?? {}) as Array<{ name: string; score: number; label?: string }>).map((p) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20 shrink-0 capitalize">{p.label ?? p.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full', PILLAR_COLORS[p.name] ?? 'bg-gray-400')}
                        style={{ width: `${Math.min((p.score / 20) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-8 text-right">{p.score}/20</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 text-right">
              <Link href="/bi/reports" className="text-xs text-indigo-600 hover:underline">View full report →</Link>
            </div>
          </div>
        </section>
      )}

      {/* Month Comparison */}
      {mc && (
        <section>
          <SectionHeader title="Month-to-Date vs Prior Month" description="Same day-number comparison" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: 'revenue',      metricLabel: label('revenue'),          format: fmtIdr },
              { key: 'orders',       metricLabel: label('orders'),           format: fmtNum },
              { key: 'delivered',    metricLabel: 'Delivered',               format: fmtNum },
              { key: 'new_customers',metricLabel: `New ${label('customers')}`, format: fmtNum },
              { key: 'success_rate', metricLabel: 'Success Rate',            format: fmtPct },
            ].map(({ key, metricLabel, format }) => {
              const item = mc[key as keyof typeof mc] as { current: number; growth_pct?: number; delta?: number } | undefined;
              if (!item) return null;
              const pct = item.growth_pct ?? item.delta ?? null;
              return (
                <div key={key} className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
                  <p className="text-xs text-gray-400 truncate">{metricLabel}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{format(item.current)}</p>
                  {pct !== null && (
                    <p className={cn('text-xs font-semibold mt-0.5', pct >= 0 ? 'text-green-600' : 'text-red-500')}>
                      {pct >= 0 ? '+' : ''}{pct}% vs prior
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top Performers + Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader title="Top Performers" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {d.top_cluster && (
              <PerformanceCard
                name={d.top_cluster.cluster}
                subtitle="Top Branch / Cluster"
                metrics={[
                  { label: 'Revenue',    value: fmtIdr(d.top_cluster.revenue) },
                  { label: 'Orders',     value: fmtNum(d.top_cluster.orders) },
                ]}
                href="/bi/branches"
              />
            )}
            {d.top_driver && (
              <PerformanceCard
                name={d.top_driver.driver_name}
                subtitle="Top Driver"
                metrics={[
                  { label: 'Deliveries', value: fmtNum(d.top_driver.deliveries) },
                  { label: 'Revenue',    value: fmtIdr(d.top_driver.revenue) },
                ]}
                href="/bi/drivers"
              />
            )}
            {d.top_customer && (
              <PerformanceCard
                name={d.top_customer.customer_name}
                subtitle="Top Customer"
                metrics={[
                  { label: 'Spending',   value: fmtIdr(d.top_customer.spending) },
                  { label: 'Orders',     value: fmtNum(d.top_customer.orders) },
                ]}
                href="/bi/customers"
              />
            )}
            {d.top_product && (
              <PerformanceCard
                name={d.top_product.product_name}
                subtitle="Top Product"
                metrics={[
                  { label: 'Orders',     value: fmtNum(d.top_product.orders) },
                ]}
                href="/bi/products"
              />
            )}
          </div>
        </div>

        <div>
          <SectionHeader title="Requires Attention" />
          <AttentionPanel items={d.requires_attention ?? []} title="" />
        </div>
      </div>
    </div>
  );
}
