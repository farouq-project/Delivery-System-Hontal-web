'use client';

import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string | number | null;
  sub?: string;
  trend?: number | null;
  loading?: boolean;
}

export function StatCard({ label, value, sub, trend, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-gray-500 mb-1 truncate">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        {trend !== undefined && trend !== null && (
          <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
