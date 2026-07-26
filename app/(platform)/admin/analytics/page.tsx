'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import type { GoogleApiAnalytics, GoogleApiTypeBreakdown } from '@/types';
import { Zap, TrendingUp, Users, DollarSign, LayoutGrid } from 'lucide-react';

function PeriodCard({ title, requests, units, cacheHits, cacheHitRate, costUsd }: {
  title: string;
  requests: number;
  units: number;
  cacheHits: number;
  cacheHitRate: number;
  costUsd?: number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-2xl font-bold text-gray-900">{requests.toLocaleString()}</p>
          <p className="text-xs text-gray-400">requests</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{units.toLocaleString()}</p>
          <p className="text-xs text-gray-400">estimated units</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{cacheHits.toLocaleString()}</p>
          <p className="text-xs text-gray-400">cache hits</p>
        </div>
        <div>
          <p className={`text-2xl font-bold ${cacheHitRate >= 50 ? 'text-emerald-600' : cacheHitRate >= 20 ? 'text-amber-600' : 'text-gray-900'}`}>
            {cacheHitRate}%
          </p>
          <p className="text-xs text-gray-400">cache hit rate</p>
        </div>
        {costUsd !== undefined && (
          <div className="col-span-2 pt-1 border-t border-gray-100">
            <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              ${costUsd.toFixed(2)} USD
            </p>
            <p className="text-xs text-gray-400">est. Google API cost</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleApiAnalyticsPage() {
  const { data, isLoading, isError } = useQuery<{ data: { data: GoogleApiAnalytics } }>({
    queryKey: ['admin', 'google-api-analytics'],
    queryFn: () => adminApi.getGoogleApiAnalytics(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const analytics = data?.data?.data;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Google API Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Geocoding request volume, cache performance, and top consumers</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map(i => <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 h-36 animate-pulse" />)}
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-red-700 text-sm">
          Failed to load API analytics data. Check the API connection and try refreshing.
        </div>
      )}

      {analytics && (
        <>
          {/* Period stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PeriodCard
              title="Today"
              requests={analytics.today.requests}
              units={analytics.today.estimated_units}
              cacheHits={analytics.today.cache_hits}
              cacheHitRate={analytics.today.cache_hit_rate}
            />
            <PeriodCard
              title="This Month"
              requests={analytics.this_month.requests}
              units={analytics.this_month.estimated_units}
              cacheHits={analytics.this_month.cache_hits}
              cacheHitRate={analytics.this_month.cache_hit_rate}
              costUsd={analytics.this_month.estimated_cost_usd}
            />
          </div>

          {/* API Type breakdown */}
          {analytics.by_api_type && analytics.by_api_type.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Breakdown by API Type (This Month)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-gray-600">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-2 pr-4">API Type</th>
                      <th className="pb-2 pr-4 text-right">Requests</th>
                      <th className="pb-2 pr-4 text-right">Est. Units</th>
                      <th className="pb-2 pr-4 text-right">Cache Hits</th>
                      <th className="pb-2 text-right">Est. Cost (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {analytics.by_api_type.map((row: GoogleApiTypeBreakdown) => (
                      <tr key={row.api_type} className="hover:bg-gray-50">
                        <td className="py-1.5 pr-4 font-mono capitalize">{row.api_type.replace(/_/g, ' ')}</td>
                        <td className="py-1.5 pr-4 text-right">{row.requests.toLocaleString()}</td>
                        <td className="py-1.5 pr-4 text-right">{row.estimated_units.toLocaleString()}</td>
                        <td className="py-1.5 pr-4 text-right">{row.cache_hits.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-medium text-green-700">${row.estimated_cost_usd.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily trend */}
          {analytics.daily_trend.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Daily Request Trend</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-gray-600">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4 text-right">Requests</th>
                      <th className="pb-2 text-right">Est. Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {analytics.daily_trend.map((d) => (
                      <tr key={d.date} className="hover:bg-gray-50">
                        <td className="py-1.5 pr-4 font-mono">{d.date}</td>
                        <td className="py-1.5 pr-4 text-right">{d.requests.toLocaleString()}</td>
                        <td className="py-1.5 text-right">{d.estimated_units.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top consumers */}
          {analytics.top_consumers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Top Consumers (This Month)</p>
              </div>
              <div className="space-y-2">
                {analytics.top_consumers.map((c, idx) => (
                  <div key={c.merchant_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right">{idx + 1}.</span>
                      <a href={`/admin/merchants/${c.merchant_id}`} className="text-sm font-medium text-gray-900 hover:text-emerald-700 hover:underline">
                        {c.merchant_name}
                      </a>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span><span className="font-semibold text-gray-700">{c.requests.toLocaleString()}</span> req</span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-400" />
                        {c.estimated_units.toLocaleString()} units
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
