'use client';

import { useQuery } from '@tanstack/react-query';
import { biApi } from '@/lib/api';
import { StatCard }       from '@/components/bi/StatCard';
import { RankingTable }   from '@/components/bi/RankingTable';
import { SectionHeader }  from '@/components/bi/SectionHeader';
import { AttentionPanel } from '@/components/bi/AttentionPanel';
import { fmtIdr, fmtNum, fmtPct } from '@/components/bi/format';
import { Users, Star, AlertTriangle, UserX, Wifi } from 'lucide-react';

export default function BiCustomersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bi', 'customers'],
    queryFn: biApi.customers,
    staleTime: 2 * 60 * 1000,
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

  const customerAttention = (attData?.data?.data ?? []).filter((i: { type: string }) =>
    ['dormant_customers', 'missing_gps'].includes(i.type)
  );

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
    </div>
  );
}
