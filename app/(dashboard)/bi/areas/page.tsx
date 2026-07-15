'use client';

import { useQuery } from '@tanstack/react-query';
import { biApi } from '@/lib/api';
import { SectionHeader }  from '@/components/bi/SectionHeader';
import { StatCard }       from '@/components/bi/StatCard';
import { EmptyState }     from '@/components/bi/EmptyState';
import { fmtIdr, fmtNum, fmtPct } from '@/components/bi/format';
import { Map, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export default function BiAreasPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bi', 'areas'],
    queryFn: biApi.areas,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading area insights…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load area data.</div>;

  const d = data?.data?.data;
  if (!d) return null;

  const areas: Array<Record<string, unknown>> = d.areas ?? [];
  const topArea = d.top_area as Record<string, unknown> | null;

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Areas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue and order distribution by delivery area / cluster</p>
      </div>

      {/* Top area */}
      {topArea && (
        <section>
          <SectionHeader title="Highest Revenue Area" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Area"          value={String(topArea.cluster)}                icon={Map}        iconColor="text-indigo-500" />
            <StatCard title="Revenue"       value={fmtIdr(Number(topArea.revenue))}        icon={TrendingUp}  iconColor="text-green-500" variant="success" />
            <StatCard title="Orders"        value={fmtNum(Number(topArea.total_orders))}   />
            <StatCard title="Unique Customers" value={fmtNum(Number(topArea.unique_customers))} icon={Users} iconColor="text-blue-500" />
          </div>
        </section>
      )}

      {/* All areas */}
      <section>
        <SectionHeader title="All Areas" description="Click a cluster to view filtered customers" />
        {areas.length === 0 ? (
          <EmptyState description="No cluster data. Assign clusters to customers to enable area analytics." />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300">Area / Cluster</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300">Delivered</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300">Success Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300">Customers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {areas.map((row, i) => (
                    <tr key={String(row.cluster)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/customers?cluster=${encodeURIComponent(String(row.cluster))}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {String(row.cluster)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtIdr(Number(row.revenue))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtNum(Number(row.total_orders))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtNum(Number(row.delivered))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.success_rate != null ? (
                          <span className={Number(row.success_rate) >= 80 ? 'text-green-600' : 'text-amber-500'}>
                            {fmtPct(Number(row.success_rate))}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtNum(Number(row.unique_customers))}
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
