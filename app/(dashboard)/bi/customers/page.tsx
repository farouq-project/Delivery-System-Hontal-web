'use client';

import { useQuery } from '@tanstack/react-query';
import { biApi, growthApi } from '@/lib/api';
import { useMerchantLabels } from '@/lib/merchant-labels';
import { StatCard }       from '@/components/bi/StatCard';
import { RankingTable }   from '@/components/bi/RankingTable';
import { SectionHeader }  from '@/components/bi/SectionHeader';
import { AttentionPanel } from '@/components/bi/AttentionPanel';
import { fmtIdr, fmtNum } from '@/components/bi/format';
import { Users, Star, AlertTriangle, UserX, Wifi, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEGMENT_COLORS: Record<string, string> = {
  healthy:  'bg-green-500',
  active:   'bg-blue-500',
  at_risk:  'bg-amber-500',
  dormant:  'bg-orange-400',
  lost:     'bg-red-500',
};

const CLV_LABELS: Record<string, string> = {
  under_100k: '< 100K',
  k100_500k:  '100K – 500K',
  k500_1m:    '500K – 1M',
  over_1m:    '> 1M',
};

export default function BiCustomersPage() {
  const { label } = useMerchantLabels();

  const { data, isLoading, error } = useQuery({
    queryKey: ['bi', 'customers'],
    queryFn: biApi.customers,
    staleTime: 2 * 60 * 1000,
  });

  const { data: growthData } = useQuery({
    queryKey: ['growth', 'customers'],
    queryFn: growthApi.customers,
    staleTime: 10 * 60 * 1000,
  });

  const { data: attData } = useQuery({
    queryKey: ['bi', 'attention'],
    queryFn: biApi.attention,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading customer insights…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load customer data.</div>;

  const d = data?.data?.data;
  if (!d) return null;

  const g = growthData?.data?.data;

  const customerAttention = (attData?.data?.data ?? []).filter((i: { type: string }) =>
    ['dormant_customers', 'missing_gps'].includes(i.type)
  );

  const segments: Record<string, number> = g?.segments ?? {};
  const totalSegmented = Object.values(segments).reduce((s, v) => s + Number(v), 0) - (segments.total ?? 0);

  const clv = g?.clv ?? {};

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-0.5">Customer base health and engagement metrics</p>
      </div>

      {/* KPI row */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard title="Total"         value={fmtNum(d.total)}          icon={Users}         href="/customers" />
          <StatCard title="New This Month" value={fmtNum(d.new_this_month)} icon={Users}         iconColor="text-teal-500" />
          <StatCard title="Repeat"        value={fmtNum(d.repeat)}         icon={Star}          iconColor="text-amber-500" />
          <StatCard title="VIP"           value={fmtNum(d.vip)}            icon={Star}          iconColor="text-yellow-500" />
          <StatCard
            title="Dormant"
            value={d.dormant != null ? fmtNum(d.dormant) : 'N/A'}
            icon={AlertTriangle}
            iconColor="text-orange-500"
            variant={d.dormant != null && d.dormant > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Lost"
            value={d.lost != null ? fmtNum(d.lost) : 'N/A'}
            icon={UserX}
            iconColor="text-red-500"
            variant={d.lost != null && d.lost > 0 ? 'danger' : 'default'}
          />
          <StatCard
            title="Missing GPS"
            value={fmtNum(d.without_gps)}
            icon={Wifi}
            iconColor="text-gray-400"
            variant={d.without_gps > 0 ? 'warning' : 'default'}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top by Revenue */}
        <div className="lg:col-span-1">
          <SectionHeader title="Highest Spending" description="By total delivered revenue" />
          <RankingTable
            rows={d.top_by_revenue}
            keyField="customer_id"
            linkFn={(r) => `/customers/${r.customer_id}`}
            columns={[
              { key: 'customer_name', label: 'Customer' },
              { key: 'total_spending', label: 'Revenue', align: 'right',
                render: (v) => fmtIdr(Number(v)) },
              { key: 'total_orders', label: 'Orders', align: 'right',
                render: (v) => fmtNum(Number(v)) },
            ]}
            emptyMessage="No delivered orders yet."
          />
        </div>

        {/* Top by Frequency */}
        <div className="lg:col-span-1">
          <SectionHeader title="Highest Frequency" description="By number of delivered orders" />
          <RankingTable
            rows={d.top_by_frequency}
            keyField="customer_id"
            linkFn={(r) => `/customers/${r.customer_id}`}
            columns={[
              { key: 'customer_name', label: 'Customer' },
              { key: 'total_orders',  label: 'Orders',  align: 'right',
                render: (v) => fmtNum(Number(v)) },
              { key: 'total_spending', label: 'Revenue', align: 'right',
                render: (v) => fmtIdr(Number(v)) },
            ]}
            emptyMessage="No delivered orders yet."
          />
        </div>

        {/* Attention */}
        <div>
          <SectionHeader title="Requires Attention" />
          <AttentionPanel items={customerAttention} title="" />
          {d.dormant == null && (
            <p className="mt-3 text-xs text-gray-500 italic">
              Dormant and lost counts require the Customer Domain feature to be enabled.
            </p>
          )}
        </div>
      </div>

      {/* ── Growth Intelligence sections ── */}
      {g && (
        <>
          {/* Segment Distribution */}
          {g.segments && (
            <section>
              <SectionHeader
                title="Customer Segment Distribution"
                description="Based on purchase recency and frequency"
              />
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                  {['healthy', 'active', 'at_risk', 'dormant', 'lost'].map((s) => (
                    <div key={s} className="text-center">
                      <p className="text-xs text-gray-400 capitalize mb-1">{s.replace('_', ' ')}</p>
                      <p className="text-xl font-bold text-gray-900">{fmtNum(g.segments[s] ?? 0)}</p>
                      <p className="text-xs text-gray-400">
                        {g.segments.total > 0 ? `${Math.round(((g.segments[s] ?? 0) / g.segments.total) * 100)}%` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Stacked bar */}
                {totalSegmented > 0 && (
                  <div className="flex rounded-full overflow-hidden h-3">
                    {['healthy', 'active', 'at_risk', 'dormant', 'lost'].map((s) => {
                      const w = Math.round(((segments[s] ?? 0) / totalSegmented) * 100);
                      return w > 0 ? (
                        <div key={s} className={cn(SEGMENT_COLORS[s])} style={{ width: `${w}%` }} title={s} />
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* CLV Buckets */}
          {g.clv && (
            <section>
              <SectionHeader
                title="Customer Lifetime Value Distribution"
                description={`Avg CLV: ${fmtIdr(clv.avg_clv ?? 0)} · all-time delivered revenue per customer`}
              />
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Value Tier</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Customers</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 w-40">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(CLV_LABELS).map(([key, lbl]) => {
                      const count = clv[key] ?? 0;
                      const total = (clv.under_100k ?? 0) + (clv.k100_500k ?? 0) + (clv.k500_1m ?? 0) + (clv.over_1m ?? 0);
                      const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-800">{lbl}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtNum(count)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-8">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {g.avg_order_frequency != null && (
                <p className="text-xs text-gray-500 mt-2">
                  Avg order frequency: <span className="font-semibold text-gray-700">{g.avg_order_frequency} orders/customer</span> (among customers with 2+ orders)
                </p>
              )}
            </section>
          )}

          {/* Acquisition Timeline */}
          {(g.acquisition_trend?.length ?? 0) > 0 && (
            <section>
              <SectionHeader title="New Customer Acquisition" description="Last 6 months" />
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Month</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">New {label('customers')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 w-40">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const rows: Array<{ year_month: string; new_customers: number }> = g.acquisition_trend;
                      const maxAcq = Math.max(...rows.map((r) => r.new_customers), 1);
                      return rows.map((row) => (
                        <tr key={row.year_month} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{row.year_month}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtNum(row.new_customers)}</td>
                          <td className="px-4 py-3">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-teal-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min((row.new_customers / maxAcq) * 100, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* VIP Customers */}
          {(g.vip_customers?.length ?? 0) > 0 && (
            <section>
              <SectionHeader
                title="VIP Customers"
                description="High-value customers by total order count"
              />
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">VIP Level</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Area</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">{label('orders')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {g.vip_customers.map((c: Record<string, unknown>) => (
                      <tr key={String(c.id)} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span className="font-medium text-gray-900">{String(c.customer_name)}</span>
                          </div>
                          <p className="text-xs text-gray-400 ml-5">{String(c.phone ?? '')}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 capitalize">{String(c.vip_level ?? '')}</td>
                        <td className="px-4 py-3 text-gray-600">{String(c.cluster ?? '—')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtNum(Number(c.total_orders))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
