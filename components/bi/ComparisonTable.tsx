import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

interface ComparisonColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface ComparisonTableProps {
  rows: Record<string, unknown>[];
  columns: ComparisonColumn[];
  labelKey: string;
  highlightFirst?: boolean;
}

export function ComparisonTable({
  rows,
  columns,
  labelKey,
  highlightFirst = true,
}: ComparisonTableProps) {
  if (rows.length === 0) return <EmptyState />;

  const maxVal = highlightFirst && columns[1]
    ? Math.max(...rows.map((r) => Number(r[columns[1].key]) || 0))
    : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-700">{labelKey}</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-2 py-2.5 text-xs font-bold text-gray-700',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => {
              const isTop = highlightFirst && i === 0;
              const progress = columns[1]
                ? Math.round((Number(row[columns[1].key]) / maxVal) * 100)
                : 0;

              return (
                <tr key={String(row[labelKey])} className={cn('hover:bg-gray-50', isTop && 'bg-blue-50/40')}>
                  <td className="px-3 py-2.5">
                    <p className={cn('font-semibold text-gray-900', isTop && 'text-blue-700')}>
                      {String(row[labelKey])}
                    </p>
                    {highlightFirst && columns[1] && (
                      <div className="mt-1 h-1 rounded-full bg-gray-100 w-full">
                        <div
                          className="h-1 rounded-full bg-blue-400"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-2 py-2.5 text-gray-800',
                        col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
