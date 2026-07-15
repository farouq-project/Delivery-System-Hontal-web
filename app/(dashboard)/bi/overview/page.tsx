'use client';

import { useQuery } from '@tanstack/react-query';
import { biApi } from '@/lib/api';
import { StatCard }      from '@/components/bi/StatCard';
import { AttentionPanel } from '@/components/bi/AttentionPanel';
import { SectionHeader }  from '@/components/bi/SectionHeader';
import { PerformanceCard } from '@/components/bi/PerformanceCard';
import { fmtIdr, fmtPct, fmtNum } from '@/components/bi/format';
import {
  TrendingUp, Package, Truck, Users, BarChart2,
  CheckCircle, Star, ShoppingBag
} from 'lucide-react';

export default function BiOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bi', 'overview'],
    queryFn: biApi.overview,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading overview…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load business overview.</div>;

  const d = data?.data?.data;
  if (!d)        return null;

  const ops   = d.operations_today;
  const month = d.business_this_month;
  const cust  = d.customer_health;

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Business Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">60-second snapshot of your business health</p>
      </div>

      {/* Today */}
      <section>
        <SectionHeader title="Today's Operations" description="Live figures — updates on refresh" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            title="Revenue Today"
            value={fmtIdr(ops.revenue)}
            icon={TrendingUp}
            iconColor="text-green-500"
            variant="success"
          />
          <StatCard
            title="Orders Today"
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
        <SectionHeader title="This Month" description="Calendar month to date" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            title="Revenue MTD"
            value={fmtIdr(month.revenue)}
            icon={TrendingUp}
            iconColor="text-indigo-500"
            href="/bi/operations"
          />
          <StatCard
            title="Orders MTD"
            value={fmtNum(month.orders)}
            icon={Package}
            href="/bi/operations"
          />
          <StatCard
            title="Avg Order"
            value={fmtIdr(month.avg_order_value)}
            icon={ShoppingBag}
          />
          <StatCard
            title="New Customers"
            value={fmtNum(month.new_customers)}
            delta={month.customer_growth_pct}
            deltaLabel="vs last month"
            icon={Users}
            iconColor="text-teal-500"
            href="/bi/customers"
          />
          <StatCard
            title="Repeat Customers"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard title="Total Customers"    value={fmtNum(cust.total)}          icon={Users} href="/bi/customers" />
          <StatCard title="New This Month"     value={fmtNum(cust.new_this_month)} delta={cust.growth_pct} deltaLabel="vs last" href="/bi/customers" />
          <StatCard title="Dormant"            value={cust.dormant != null ? fmtNum(cust.dormant) : 'N/A'} variant="warning" href="/bi/customers" />
          <StatCard title="Growth This Month"  value={fmtPct(cust.growth_pct)} />
        </div>
      </section>

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
