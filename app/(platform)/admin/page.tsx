'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { PlatformDashboardStats } from '@/types';
import { Building2, Users, ShoppingCart, Truck, BarChart2, Zap } from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, color = 'text-emerald-600' }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-start gap-4 shadow-sm">
      <div className={`mt-0.5 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function HealthBadge({ status }: { status: string }) {
  const cls = status === 'healthy'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'degraded'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cls}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function PlatformDashboardPage() {
  const { data, isLoading } = useQuery<{ data: PlatformDashboardStats }>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard(),
    refetchInterval: 60_000,
  });

  const stats = data?.data;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Live overview of all merchants and platform activity</p>
        </div>
        {stats && <HealthBadge status={stats.platform_health} />}
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Merchants" value={stats.merchants.total} icon={Building2} />
            <StatCard label="Active Users" value={stats.active_users.toLocaleString()} icon={Users} color="text-blue-600" />
            <StatCard label="Orders Today" value={stats.orders_today.toLocaleString()} icon={ShoppingCart} color="text-indigo-600" />
            <StatCard label="Deliveries Today" value={stats.deliveries_today.toLocaleString()} icon={Truck} color="text-violet-600" />
            <StatCard label="Orders This Month" value={stats.orders_this_month.toLocaleString()} icon={BarChart2} color="text-amber-600" />
            <StatCard
              label="API Requests / Month"
              value={stats.google_api.requests_this_month.toLocaleString()}
              sub={`Cache hit ${stats.google_api.cache_hit_rate}%`}
              icon={Zap}
              color="text-rose-600"
            />
          </div>

          {/* Merchant breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Merchant Breakdown</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
              {[
                { label: 'Trial',     value: stats.merchants.trial,     color: 'text-amber-600 bg-amber-50' },
                { label: 'Paid',      value: stats.merchants.paid,      color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Active',    value: stats.merchants.active,    color: 'text-blue-600 bg-blue-50' },
                { label: 'Suspended', value: stats.merchants.suspended, color: 'text-red-600 bg-red-50' },
                { label: 'Expired',   value: stats.merchants.expired,   color: 'text-gray-600 bg-gray-50' },
                { label: 'Cancelled', value: stats.merchants.cancelled, color: 'text-gray-400 bg-gray-50' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-lg p-3 ${color.split(' ')[1]}`}>
                  <p className={`text-xl font-bold ${color.split(' ')[0]}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Google API summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Google API Summary (This Month)</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Requests</p>
                <p className="text-lg font-semibold text-gray-900">{stats.google_api.requests_this_month.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Estimated Units</p>
                <p className="text-lg font-semibold text-gray-900">{stats.google_api.estimated_units_this_month.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Cache Hit Rate</p>
                <p className="text-lg font-semibold text-gray-900">{stats.google_api.cache_hit_rate}%</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
