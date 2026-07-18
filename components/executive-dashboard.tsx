'use client';

import { useQuery } from '@tanstack/react-query';
import { executiveDashboardApi } from '@/lib/api';
import { StatCard } from '@/components/dashboard/stat-card';
import { SummaryTable, type TableColumn } from '@/components/dashboard/summary-table';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { AttentionPanel } from '@/components/dashboard/attention-panel';
import type { ExecutiveDashboardData } from '@/types';

const formatRp = (val: number | null | undefined) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(val ?? 0));

const formatPct = (val: number | null | undefined) =>
  val != null ? `${val}%` : '—';

const CLUSTER_COLUMNS: TableColumn[] = [
  { key: 'cluster', label: 'Cluster' },
  { key: 'total_orders', label: 'Orders', align: 'right' },
  { key: 'revenue', label: 'Revenue', align: 'right', render: (v) => formatRp(v as number) },
  { key: 'deliveries', label: 'Delivered', align: 'right' },
  { key: 'success_rate', label: 'Success', align: 'right', render: (v) => formatPct(v as number | null) },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}

export default function ExecutiveDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['executive-dashboard'],
    queryFn: executiveDashboardApi.summary,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  const d: ExecutiveDashboardData | undefined = data?.data?.data;
  const loading = isLoading;

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">Executive Dashboard is not available for your account.</p>
      </div>
    );
  }

  const ot = d?.operations_today;
  const bm = d?.business_this_month;
  const ch = d?.customer_health;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-gray-500 text-sm">Business overview · refreshes every 5 minutes</p>
      </div>

      {/* Operations Today */}
      <section>
        <SectionHeading>Operations Today</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Revenue Today"   value={ot ? formatRp(ot.revenue) : null} loading={loading} />
          <StatCard label="Orders"          value={ot?.orders ?? null} loading={loading} />
          <StatCard label="Delivered"       value={ot?.deliveries_completed ?? null} loading={loading} />
          <StatCard label="Active Drivers"  value={ot?.active_drivers ?? null} loading={loading} />
          <StatCard label="Success Rate"    value={formatPct(ot?.success_rate)} loading={loading} />
        </div>
      </section>

      {/* Business This Month */}
      <section>
        <SectionHeading>Business This Month</SectionHeading>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Monthly Revenue"  value={bm ? formatRp(bm.revenue) : null} loading={loading} />
          <StatCard label="Total Orders"     value={bm?.orders ?? null} loading={loading} />
          <StatCard label="Avg Order Value"  value={bm ? formatRp(bm.avg_order_value) : null} loading={loading} />
          <StatCard
            label="Repeat Customers"
            value={bm?.repeat_customers ?? null}
            loading={loading}
          />
        </div>
      </section>

      {/* Customer Health + Requires Attention (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <SectionHeading>Customer Health</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Customers" value={ch?.total ?? null} loading={loading} />
            <StatCard
              label="New This Month"
              value={ch?.new_this_month ?? null}
              loading={loading}
            />
            <StatCard
              label="Repeat Customers"
              value={ch?.repeat !== null && ch?.repeat !== undefined ? ch.repeat : 'N/A'}
              loading={loading}
            />
            <StatCard
              label="Dormant / Lost"
              value={ch?.dormant !== null && ch?.dormant !== undefined ? ch.dormant : 'N/A'}
              loading={loading}
            />
          </div>
        </section>

        {/* AttentionPanel has its own CardTitle — no section heading needed */}
        <div className="mt-6 lg:mt-0">
          <div className="hidden lg:block h-[28px] mb-3" /> {/* align with SectionHeading height */}
          <AttentionPanel items={d?.requires_attention ?? []} loading={loading} />
        </div>
      </div>

      {/* Cluster Summary + Recent Activity (side by side) */}
      {/* Both cards have their own CardTitle — no section headings needed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SummaryTable
          title="Branch / Cluster Summary"
          columns={CLUSTER_COLUMNS}
          rows={(d?.cluster_summary ?? []) as unknown as Record<string, unknown>[]}
          loading={loading}
          emptyText="No cluster data yet"
        />
        <ActivityFeed items={d?.recent_activity ?? []} loading={loading} />
      </div>
    </div>
  );
}
