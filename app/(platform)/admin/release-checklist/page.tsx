'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Check {
  label:  string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
}

function CheckRow({ name, check }: { name: string; check: Check }) {
  const icon =
    check.status === 'ok'      ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0" /> :
    check.status === 'warning' ? <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" /> :
                                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />;

  const bg =
    check.status === 'ok'      ? 'bg-green-50 border-green-100' :
    check.status === 'warning' ? 'bg-yellow-50 border-yellow-100' :
                                  'bg-red-50 border-red-100';

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${bg}`}>
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900">{check.label}</div>
        <div className="text-xs text-gray-500 mt-0.5 font-mono truncate">{check.detail}</div>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${
        check.status === 'ok'      ? 'bg-green-100 text-green-700' :
        check.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
      }`}>
        {check.status}
      </span>
    </div>
  );
}

export default function ReleaseChecklistPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['release-checklist'],
    queryFn:  () => adminApi.getReleaseChecklist(),
    staleTime: 30_000,
  });

  const result = data?.data?.data;
  const checks: Record<string, Check> = result?.checks ?? {};

  const overall = result?.overall;
  const overallBg =
    overall === 'ok'      ? 'bg-green-50 border-green-200 text-green-800' :
    overall === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                             'bg-red-50 border-red-200 text-red-800';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">Release Checklist</h1>
            <p className="text-sm text-gray-500">Production readiness status</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {overall && (
            <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${overallBg}`}>
              {overall === 'ok'
                ? <CheckCircle className="h-5 w-5 shrink-0" />
                : overall === 'warning'
                ? <AlertTriangle className="h-5 w-5 shrink-0" />
                : <XCircle className="h-5 w-5 shrink-0" />}
              <div className="font-semibold capitalize">
                Overall: {overall}
                {result.errors > 0 && ` · ${result.errors} error(s)`}
                {result.warnings > 0 && ` · ${result.warnings} warning(s)`}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {Object.entries(checks).map(([key, check]) => (
              <CheckRow key={key} name={key} check={check} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
