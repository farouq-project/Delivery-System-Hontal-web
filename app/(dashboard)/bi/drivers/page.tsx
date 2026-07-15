'use client';

import { useQuery } from '@tanstack/react-query';
import { biApi } from '@/lib/api';
import { SectionHeader }   from '@/components/bi/SectionHeader';
import { StatCard }        from '@/components/bi/StatCard';
import { EmptyState }      from '@/components/bi/EmptyState';
import { fmtIdr, fmtNum, fmtPct } from '@/components/bi/format';
import { Truck, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColor: Record<string, string> = {
  available:  'bg-green-100 text-green-700',
  delivering: 'bg-blue-100 text-blue-700',
  on_delivery:'bg-blue-100 text-blue-700',
  offline:    'bg-gray-100 text-gray-600',
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
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <p className="text-sm text-gray-500 mt-0.5">Driver performance ranking — lifetime figures</p>
      </div>

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

      <section>
        <SectionHeader title="Driver Ranking" description="Sorted by completed deliveries" />
        {ranking.length === 0 ? (
          <EmptyState description="No driver delivery data recorded yet." />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Driver</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Completed</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Failed</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ranking.map((row, i) => (
                    <tr key={String(row.driver_id)} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{String(row.driver_name)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          statusColor[String(row.status)] ?? statusColor.offline)}>
                          {String(row.status).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">{fmtNum(Number(row.completed))}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={Number(row.failed) > 0 ? 'text-red-500' : 'text-gray-400'}>
                          {fmtNum(Number(row.failed))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">{fmtIdr(Number(row.revenue))}</td>
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

      {offlineDrivers.length > 0 && (
        <section>
          <SectionHeader title="Needs Attention" description="Active drivers currently offline" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {offlineDrivers.map((dr) => (
              <div key={dr.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-300 rounded-lg shadow-sm">
                <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm font-medium text-gray-800 truncate">{dr.driver_name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
