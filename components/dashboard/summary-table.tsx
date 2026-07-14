'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface SummaryTableProps {
  title: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  emptyText?: string;
}

export function SummaryTable({ title, columns, rows, loading, emptyText = 'No data yet' }: SummaryTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">{emptyText}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-2 font-medium text-gray-500 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 ${col.align === 'right' ? 'text-right' : ''}`}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
