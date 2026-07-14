'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { DashboardAttentionItem } from '@/types';

const SEVERITY_CONFIG = {
  error:   { Icon: AlertCircle,   cls: 'text-red-600 bg-red-50 border-red-200' },
  warning: { Icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50 border-amber-200' },
  info:    { Icon: Info,          cls: 'text-blue-600 bg-blue-50 border-blue-200' },
} as const;

export function AttentionPanel({ items, loading }: { items: DashboardAttentionItem[]; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Requires Attention</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-green-600 font-medium">All clear!</p>
            <p className="text-xs text-gray-400 mt-1">Nothing requires immediate attention.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const { Icon, cls } = SEVERITY_CONFIG[item.severity];
              return (
                <div key={item.type} className={`flex items-center gap-3 p-3 rounded-lg border ${cls}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <p className="flex-1 text-sm font-medium min-w-0">{item.label}</p>
                  <span className="text-lg font-bold shrink-0">{item.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
