'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { growthApi } from '@/lib/api';
import { useMerchantLabels } from '@/lib/merchant-labels';
import { SectionHeader }  from '@/components/bi/SectionHeader';
import { RankingTable }   from '@/components/bi/RankingTable';
import { EmptyState }     from '@/components/bi/EmptyState';
import { fmtIdr, fmtNum, fmtPct } from '@/components/bi/format';
import { TrendingUp, Package, Users, ShoppingBag, BarChart2 } from 'lucide-react';
import type { WeeklyTrendRow, MonthlyTrendRow, CustomerTypeRow } from '@/types';
import { cn } from '@/lib/utils';

type Period = 'weekly' | 'monthly';

function TrendBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className={cn('h-1.5 rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-400 text-xs">—</span>;
  const up = pct >= 0;
  return (
    <span className={cn('text-xs font-semibold', up ? 'text-green-600' : 'text-red-500')}>
      {up ? '+' : ''}{pct}%
    </span>
  );
}

export default function BiSalesPage() {
  const { label, unitLabel } = useMerchantLabels();
  const [period, setPeriod] = useState<Period>('monthly');

  const { data, isLoading, error } = useQuery({
    queryKey: ['growth', 'sales', period],
    queryFn: () => growthApi.sales(period),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading sales data…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load sales data.</div>;

  const d = data?.data?.data;
  if (!d) return null;

  const trend: (WeeklyTrendRow | MonthlyTrendRow)[] = d.trend ?? [];
  const byType: CustomerTypeRow[] = d.by_customer_type ?? [];
  const maxRevenue = Math.max(...trend.map((r) => Number('revenue' in r ? r.revenue : 0)), 1);

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue trends, top performers, and customer type breakdown</p>
        </div>
        {/* Period toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue trend chart (bar-style table) */}
      <section>
        <SectionHeader
          title={period === 'weekly' ? 'Weekly Revenue Trend (8 weeks)' : 'Monthly Revenue Trend (6 months)'}
          description={`${label('revenue')} and ${label('orders').toLowerCase()} over time`}
        />
        {trend.length === 0 ? (
          <EmptyState description="No sales data for this period." />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      {period === 'weekly' ? 'Week' : 'Month'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">{label('revenue')}</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 w-32">Trend</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">{label('orders')}</th>
                    {'new_customers' in (trend[0] ?? {}) && (
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">New {label('customers')}</th>
                    )}
                    {'success_rate' in (trend[0] ?? {}) && (
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Success</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trend.map((row, i) => {
                    const lbl = 'week_label' in row ? row.week_label : (row as MonthlyTrendRow).month_label;
                    const rev = Number(row.revenue);
                    const ord = Number(row.orders);
                    const nc  = 'new_customers' in row ? Number(row.new_customers) : null;
                    const sr  = 'success_rate' in row ? Number((row as WeeklyTrendRow).success_rate) : null;

                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{lbl}</td>
                        <td className="px-4 py-3 text-right text-gray-800 font-semibold">{fmtIdr(rev)}</td>
                        <td className="px-4 py-3">
                          <TrendBar value={rev} max={maxRevenue} color="bg-indigo-500" />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmtNum(ord)}</td>
                        {nc !== null && (
                          <td className="px-4 py-3 text-right text-teal-600">{fmtNum(nc)}</td>
                        )}
                        {sr !== null && (
                          <td className="px-4 py-3 text-right">
                            <span className={sr < 80 ? 'text-amber-500' : 'text-green-600'}>
                              {fmtPct(sr)}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Revenue by Customer Type */}
      <section>
        <SectionHeader title="Revenue by Customer Type" description="Breakdown by customer business category this month" />
        {byType.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700 max-w-lg">
            No customer type data yet. Edit customers and assign a type (e.g. Restaurant, Cafe, Retail) to enable this breakdown.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Customer Type</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">{label('revenue')}</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">{label('orders')}</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Unique {label('customers')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byType.map((row) => (
                    <tr key={row.customer_type} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.customer_type}</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-semibold">{fmtIdr(row.revenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtNum(row.orders)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtNum(row.unique_customers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Top performers grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section>
          <SectionHeader title={`Top ${label('customers')}`} description="By total delivered spending" />
          <RankingTable
            rows={d.top_customers ?? []}
            keyField="customer_id"
            columns={[
              { key: 'customer_name', label: 'Customer' },
              { key: 'total_spending', label: label('revenue'), align: 'right', render: (v) => fmtIdr(Number(v)) },
              { key: 'total_orders', label: label('orders'), align: 'right', render: (v) => fmtNum(Number(v)) },
            ]}
          />
        </section>

        <section>
          <SectionHeader title="Top Products" description="By order volume" />
          <RankingTable
            rows={d.top_products ?? []}
            keyField="product_name"
            columns={[
              { key: 'product_name', label: 'Product' },
              { key: 'revenue', label: label('revenue'), align: 'right', render: (v) => fmtIdr(Number(v)) },
              { key: 'total_orders', label: label('orders'), align: 'right', render: (v) => fmtNum(Number(v)) },
            ]}
          />
        </section>

        <section>
          <SectionHeader title="Top Areas" description="By cluster revenue" />
          <RankingTable
            rows={d.top_areas ?? []}
            keyField="cluster"
            columns={[
              { key: 'cluster', label: 'Area' },
              { key: 'revenue', label: label('revenue'), align: 'right', render: (v) => fmtIdr(Number(v)) },
              { key: 'total_orders', label: label('orders'), align: 'right', render: (v) => fmtNum(Number(v)) },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
