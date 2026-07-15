'use client';

import { useQuery } from '@tanstack/react-query';
import { biApi } from '@/lib/api';
import { ComparisonTable } from '@/components/bi/ComparisonTable';
import { SectionHeader }   from '@/components/bi/SectionHeader';
import { StatCard }        from '@/components/bi/StatCard';
import { EmptyState }      from '@/components/bi/EmptyState';
import { fmtIdr, fmtNum, fmtPct } from '@/components/bi/format';
import { Truck, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColor: Record<string, string> = {
  available:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  delivering: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  on_delivery:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  offline:    'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function BiDriversPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bi', 'drivers'],
    queryFn: biApi.drivers,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading driver insights…</div>;
  if (error)     return <div className="p-6 text-red-500 text-sm">Failed to load driver data.</div>;

  const d = data?.data?.data;
  if (!d) return null;

  const ranking: Array<Record<string, unknown>> = d.ranking ?? [];
  const offlineDrivers: Array<{ id: number; driver_name: string }> = d.offline_drivers ?? [];

  const bestDriver = ranking[0];

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Drivers</h1>
        <p className="text-sm text-gray-500 mt-0.5">Driver performance ranking — lifetime figures</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard title="Total Drivers"    value={fmtNum(d.total_drivers)}      icon={Truck} href="/drivers" />
        <StatCard title="Offline (Active)" value={fmtNum(offlineDrivers.length)} icon={Truck} iconColor="text-gray-400"
          variant={offlineDrivers.length > 0 ? 'warning' : 'default'} />
        {bestDriver && (
          <StatCard
            title="Best Performer"
            value={String(bestDriver.driver_name)}
            icon={CheckCircle}
            iconColor="text-green-500"
            variant="success"
          />
        )}
      </div>

      {/* Ranking table */}
      <section>
        <SectionHeader title="Driver Ranking" description="Sorted by completed deliveries" />
        {ranking.length === 0 ? (
          <EmptyState description="No driver delivery data recorded yet." />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-200 w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-200">Driver</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-200">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-200">Completed</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-200">Failed</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-200">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-200">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {ranking.map((row, i) => (
                    <tr key={String(row.driver_id)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {String(row.driver_name)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          statusColor[String(row.status)] ?? statusColor.offline)}>
                          {String(row.status).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtNum(Number(row.completed))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={Number(row.failed) > 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-400'}>
                          {fmtNum(Number(row.failed))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmtIdr(Number(row.revenue))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.success_rate != null ? (
                          <span className={Number(row.success_rate) >= 80 ? 'text-green-600' : 'text-amber-500'}>
                            {fmtPct(Number(row.success_rate))}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Offline drivers needing attention */}
      {offlineDrivers.length > 0 && (
        <section>
          <SectionHeader title="Needs Attention" description="Active drivers currently offline" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {offlineDrivers.map((dr) => (
              <div key={dr.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400 truncate">{dr.driver_name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
