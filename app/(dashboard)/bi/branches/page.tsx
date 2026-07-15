'use client';

import { useQuery } from '@tanstack/react-query';
import { biApi } from '@/lib/api';
import { ComparisonTable } from '@/components/bi/ComparisonTable';
import { SectionHeader }   from '@/components/bi/SectionHeader';
import { StatCard }        from '@/components/bi/StatCard';
import { EmptyState }      from '@/components/bi/EmptyState';
import { fmtIdr, fmtNum, fmtPct } from '@/components/bi/format';
import { Layers, TrendingUp } from 'lucide-react';

export default function BiBranchesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bi', 'branches'],
    queryFn: biApi.branches,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading branch insights…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load branch data.</div>;

  const d = data?.data?.data;
  if (!d) return null;

  const clusters: Array<Record<string, unknown>> = d.clusters ?? [];

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Branches</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Performance by customer cluster. Each cluster represents a delivery area or branch grouping.
        </p>
      </div>

      {/* Top cluster */}
      {d.top_cluster && (
        <section>
          <SectionHeader title="Top Performing Branch" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Branch"        value={String(d.top_cluster.cluster)}                 icon={Layers}    iconColor="text-indigo-500" />
            <StatCard title="Revenue"       value={fmtIdr(Number(d.top_cluster.revenue))}          icon={TrendingUp} iconColor="text-green-500" variant="success" />
            <StatCard title="Orders"        value={fmtNum(Number(d.top_cluster.total_orders))}     />
            <StatCard title="Success Rate"  value={fmtPct(d.top_cluster.success_rate as number | null)} />
          </div>
        </section>
      )}

      {/* All clusters */}
      <section>
        <SectionHeader title="Branch Comparison" description="All clusters ranked by revenue" />
        {clusters.length === 0 ? (
          <EmptyState description="No cluster data available. Assign clusters to customers to see branch analytics." />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-200 w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-200">Cluster / Branch</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-200">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-200">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-200">Deliveries</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-200">Success Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-200">Avg Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {clusters.map((row, i) => (
                    <tr key={String(row.cluster)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {String(row.cluster)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtIdr(Number(row.revenue))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtNum(Number(row.total_orders))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtNum(Number(row.deliveries))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.success_rate != null ? (
                          <span className={Number(row.success_rate) >= 80 ? 'text-green-600' : 'text-amber-500'}>
                            {fmtPct(Number(row.success_rate))}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtIdr(Number(row.avg_order))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
