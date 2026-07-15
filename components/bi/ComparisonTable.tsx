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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="pb-2 pr-4 text-left text-xs font-medium text-gray-400">{labelKey}</th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'pb-2 px-2 text-xs font-medium text-gray-400',
                  col.align === 'right' ? 'text-right' : 'text-left'
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => {
            const isTop = highlightFirst && i === 0;
            const progress = columns[1]
              ? Math.round((Number(row[columns[1].key]) / maxVal) * 100)
              : 0;

            return (
              <tr key={String(row[labelKey])} className={cn(isTop && 'bg-blue-50/50 dark:bg-blue-900/10')}>
                <td className="py-2 pr-4">
                  <p className={cn('font-medium text-gray-900 dark:text-gray-100', isTop && 'text-blue-700 dark:text-blue-400')}>
                    {String(row[labelKey])}
                  </p>
                  {highlightFirst && columns[1] && (
                    <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-gray-700 w-full">
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
                      'py-2 px-2 text-gray-700 dark:text-gray-300',
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
  );
}
