'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { growthApi } from '@/lib/api';
import { useMerchantLabels } from '@/lib/merchant-labels';
import { fmtIdr, fmtNum, fmtPct } from '@/components/bi/format';
import { Printer, RefreshCw, AlertCircle, Info } from 'lucide-react';
import type { ReportRecommendation } from '@/types';
import { cn } from '@/lib/utils';

type ReportPeriod = 'monthly' | 'quarterly' | 'yearly';

const PRIORITY_COLORS = {
  high:   'border-red-300 bg-red-50',
  medium: 'border-amber-300 bg-amber-50',
  low:    'border-blue-200 bg-blue-50',
};

const PRIORITY_ICON = {
  high:   AlertCircle,
  medium: AlertCircle,
  low:    Info,
};

function GradeCircle({ score, grade, label }: { score: number; grade: string; label: string }) {
  const colors: Record<string, string> = {
    A: 'text-green-600 border-green-500',
    B: 'text-blue-600 border-blue-500',
    C: 'text-amber-600 border-amber-500',
    D: 'text-orange-600 border-orange-500',
    F: 'text-red-600 border-red-500',
  };
  return (
    <div className={cn('w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center', colors[grade] ?? 'text-gray-600 border-gray-400')}>
      <span className="text-3xl font-black">{grade}</span>
      <span className="text-xs font-medium">{score}/100</span>
      <span className="text-[10px] text-gray-500 leading-tight text-center px-1">{label}</span>
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 print:mt-6 mt-8">
      <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">{title}</h2>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function MetricRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
    </div>
  );
}

export default function BiReportsPage() {
  const { label } = useMerchantLabels();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['growth', 'reports', period],
    queryFn: () => growthApi.reports(period),
    staleTime: 15 * 60 * 1000,
  });

  const d = data?.data?.data;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Controls — hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Business performance summary — printable</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['monthly', 'quarterly', 'yearly'] as ReportPeriod[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {isLoading && <div className="text-gray-400 text-sm py-8 text-center">Generating report…</div>}
      {error    && <div className="text-red-500 text-sm py-8 text-center">Failed to generate report.</div>}

      {d && (
        <div className="max-w-4xl space-y-6 print:max-w-none print:space-y-4">

          {/* Report header — visible only in print */}
          <div className="hidden print:flex print:justify-between print:items-start print:mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Business Performance Report</h1>
              <p className="text-sm text-gray-500">{d.period} · Generated {d.generated_at}</p>
            </div>
          </div>

          {/* ── Executive Summary ── */}
          <SectionDivider title="Executive Summary" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex justify-center md:justify-start">
              <GradeCircle
                score={d.executive_summary?.health_score?.score ?? 0}
                grade={d.executive_summary?.health_score?.grade ?? 'F'}
                label={d.executive_summary?.health_score?.grade_label ?? ''}
              />
            </div>
            <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
              <MetricRow label={`${label('revenue')} (Period)`} value={fmtIdr(d.executive_summary?.revenue ?? 0)} />
              <MetricRow label={`${label('orders')} (Period)`}  value={fmtNum(d.executive_summary?.orders ?? 0)} />
              <MetricRow label="Delivery Success Rate" value={fmtPct(d.executive_summary?.success_rate ?? 0)} />
              <MetricRow label={`New ${label('customers')}`} value={fmtNum(d.executive_summary?.new_customers ?? 0)} />
            </div>
          </div>

          {/* ── Sales ── */}
          <SectionDivider title="Sales" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Period Metrics</h3>
              <MetricRow label={label('revenue')} value={fmtIdr(d.sales?.metrics?.revenue ?? 0)} />
              <MetricRow label={label('orders')}  value={fmtNum(d.sales?.metrics?.total_orders ?? 0)} />
              <MetricRow label="Delivered" value={fmtNum(d.sales?.metrics?.delivered_orders ?? 0)} />
              <MetricRow label="Success Rate" value={fmtPct(d.sales?.metrics?.success_rate ?? 0)} />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">vs Prior Period</h3>
              {d.sales?.comparison && (
                <>
                  <MetricRow
                    label={label('revenue')}
                    value={fmtIdr(d.sales.comparison.revenue?.current ?? 0)}
                    note={d.sales.comparison.revenue?.growth_pct !== null
                      ? `${(d.sales.comparison.revenue?.growth_pct ?? 0) >= 0 ? '+' : ''}${d.sales.comparison.revenue?.growth_pct}% vs prior`
                      : undefined}
                  />
                  <MetricRow
                    label="New Customers"
                    value={fmtNum(d.sales.comparison.new_customers?.current ?? 0)}
                    note={d.sales.comparison.new_customers?.growth_pct !== null
                      ? `${(d.sales.comparison.new_customers?.growth_pct ?? 0) >= 0 ? '+' : ''}${d.sales.comparison.new_customers?.growth_pct}% vs prior`
                      : undefined}
                  />
                </>
              )}
            </div>
          </div>

          {/* Top Products */}
          {(d.sales?.top_products?.length ?? 0) > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Top Products</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs">
                  <tr><th className="px-4 py-2 text-left">Product</th><th className="px-4 py-2 text-right">{label('revenue')}</th><th className="px-4 py-2 text-right">{label('orders')}</th></tr>
                </thead>
                <tbody>
                  {d.sales.top_products.map((p: Record<string, unknown>, i: number) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2">{String(p.product_name)}</td>
                      <td className="px-4 py-2 text-right">{fmtIdr(Number(p.revenue))}</td>
                      <td className="px-4 py-2 text-right">{fmtNum(Number(p.total_orders))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Marketing ── */}
          <SectionDivider title="Marketing" />
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-xs text-gray-400">Total Spend</p><p className="font-bold">{fmtIdr(d.marketing?.total_spend ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">Overall ROAS</p><p className="font-bold">{d.marketing?.overall_roas ? `${d.marketing.overall_roas}x` : '—'}</p></div>
              <div><p className="text-xs text-gray-400">Customers Acquired</p><p className="font-bold">{fmtNum(d.marketing?.total_customers_acquired ?? 0)}</p></div>
              <div><p className="text-xs text-gray-400">CAC</p><p className="font-bold">{d.marketing?.overall_cac ? fmtIdr(d.marketing.overall_cac) : '—'}</p></div>
            </div>
          </div>

          {/* ── Customers ── */}
          <SectionDivider title="Customers" />
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {['healthy', 'active', 'at_risk', 'dormant', 'lost'].map((s) => (
                <div key={s} className="text-center">
                  <p className="text-xs text-gray-400 capitalize">{s.replace('_', ' ')}</p>
                  <p className="text-xl font-bold text-gray-900">{fmtNum(d.customers?.segments?.[s] ?? 0)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Operations ── */}
          <SectionDivider title="Operations" />
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <MetricRow label="Success Rate" value={fmtPct(d.operations?.success_rate ?? 0)} />
            {d.operations?.avg_dispatch_min != null && (
              <MetricRow label="Avg Dispatch Time" value={`${d.operations.avg_dispatch_min} min`} />
            )}
            {d.operations?.avg_delivery_min != null && (
              <MetricRow label="Avg Delivery Time" value={`${d.operations.avg_delivery_min} min`} />
            )}
            {d.operations?.avg_route_score != null && (
              <MetricRow label="Avg Route Score" value={String(d.operations.avg_route_score)} />
            )}
          </div>

          {/* ── Goal Achievement ── */}
          {(d.goals?.length ?? 0) > 0 && (
            <>
              <SectionDivider title="Goal Achievement" />
              <div className="space-y-2">
                {d.goals.map((g: Record<string, unknown>, i: number) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-800 capitalize">{String(g.metric).replace('_', ' ')}</span>
                      <span className="ml-2 text-xs text-gray-400 capitalize">{String(g.period_type)}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn('text-sm font-bold', Number(g.pct) >= 100 ? 'text-green-600' : Number(g.pct) >= 80 ? 'text-blue-600' : 'text-amber-600')}>
                        {Number(g.pct)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Recommendations ── */}
          <SectionDivider title="Recommendations" />
          {(d.recommendations?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {d.recommendations.map((r: ReportRecommendation, i: number) => {
                const Icon = PRIORITY_ICON[r.priority] ?? Info;
                return (
                  <div key={i} className={cn('flex gap-3 rounded-lg border p-3', PRIORITY_COLORS[r.priority])}>
                    <Icon className="h-4 w-4 shrink-0 mt-0.5 text-current" />
                    <p className="text-sm text-gray-800">{r.text}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 bg-green-50 border border-green-200 rounded-lg p-3">
              No recommendations — all key metrics are within healthy ranges.
            </p>
          )}

          {/* ── Next Month Priorities ── */}
          {(d.next_priorities?.length ?? 0) > 0 && (
            <>
              <SectionDivider title="Next Month Priorities" />
              <div className="space-y-2">
                {d.next_priorities.map((p: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-gray-700">{p}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="text-xs text-gray-400 pt-4 border-t border-gray-100 print:block">
            Generated by Hontal Business Growth · {d.generated_at}
          </div>
        </div>
      )}
    </div>
  );
}
