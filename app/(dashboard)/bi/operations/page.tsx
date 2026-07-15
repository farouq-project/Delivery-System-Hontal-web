'use client';

import { useQuery } from '@tanstack/react-query';
import { biApi } from '@/lib/api';
import { StatCard }       from '@/components/bi/StatCard';
import { SectionHeader }  from '@/components/bi/SectionHeader';
import { AttentionPanel } from '@/components/bi/AttentionPanel';
import { fmtNum, fmtPct } from '@/components/bi/format';
import { Package, Clock, AlertTriangle, XCircle, Truck, CheckCircle, BarChart2 } from 'lucide-react';

export default function BiOperationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bi', 'operations'],
    queryFn: biApi.operations,
    staleTime: 60 * 1000,
  });

  const { data: attData } = useQuery({
    queryKey: ['bi', 'attention'],
    queryFn: biApi.attention,
    staleTime: 60 * 1000,
  });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading operations data…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load operations data.</div>;

  const d = data?.data?.data;
  if (!d) return null;

  const attention = attData?.data?.data ?? [];
  const offlineDrivers: Array<{ id: number; driver_name: string }> = d.offline_drivers ?? [];

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Current operational status — live figures</p>
      </div>

      {/* Queue */}
      <section>
        <SectionHeader title="Order Queue" description="Orders currently in the system" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Pending Orders"
            value={fmtNum(d.pending_orders)}
            icon={Package}
            href="/orders"
          />
          <StatCard
            title="Awaiting Assignment"
            value={fmtNum(d.pending_assignment)}
            icon={Clock}
            iconColor="text-amber-500"
            variant={d.pending_assignment > 0 ? 'warning' : 'default'}
            href="/dispatch"
          />
          <StatCard
            title="Delayed Deliveries"
            value={fmtNum(d.delayed_deliveries)}
            icon={AlertTriangle}
            iconColor="text-orange-500"
            variant={d.delayed_deliveries > 0 ? 'warning' : 'default'}
            href="/orders"
          />
          <StatCard
            title="Failed Today"
            value={fmtNum(d.failed_today)}
            icon={XCircle}
            iconColor="text-red-500"
            variant={d.failed_today > 0 ? 'danger' : 'default'}
            href="/orders"
          />
        </div>
      </section>

      {/* Today's performance */}
      <section>
        <SectionHeader title="Today's Performance" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Orders Today" value={fmtNum(d.total_orders_today)} icon={Package}      href="/orders" />
          <StatCard title="Delivered Today"    value={fmtNum(d.delivered_today)}    icon={CheckCircle}  iconColor="text-green-500" variant="success" />
          <StatCard
            title="Success Rate"
            value={fmtPct(d.success_rate_today)}
            icon={BarChart2}
            variant={d.success_rate_today != null && d.success_rate_today < 70 ? 'danger' : 'default'}
          />
          <StatCard title="Active Drivers"     value={fmtNum(d.active_drivers)}     icon={Truck}        iconColor="text-blue-500" href="/drivers" />
        </div>
      </section>

      {/* Offline drivers + attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionHeader title="Offline Drivers" description="Active drivers currently not online" />
          {offlineDrivers.length === 0 ? (
            <p className="text-sm text-gray-500">All active drivers are online.</p>
          ) : (
            <div className="space-y-2">
              {offlineDrivers.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-sm font-medium text-gray-800">{d.driver_name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Offline</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeader title="Requires Attention" />
          <AttentionPanel items={attention} title="" />
        </div>
      </div>
    </div>
  );
}
