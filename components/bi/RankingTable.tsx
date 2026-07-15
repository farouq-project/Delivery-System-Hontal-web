import Link from 'next/link';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T;
  label: string;
  align?: 'left' | 'right';
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface RankingTableProps<T extends Record<string, unknown>> {
  rows: T[];
  columns: Column<T>[];
  keyField: keyof T;
  linkFn?: (row: T) => string;
  emptyMessage?: string;
}

export function RankingTable<T extends Record<string, unknown>>({
  rows,
  columns,
  keyField,
  linkFn,
  emptyMessage,
}: RankingTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState description={emptyMessage} />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/60">
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 dark:text-gray-200 w-8">#</th>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-2 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-200',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.map((row, i) => {
              const href = linkFn?.(row);
              return (
                <tr key={String(row[keyField])} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500 font-medium">{i + 1}</td>
                  {columns.map((col) => {
                    const cell = col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '—');

                    const isFirst = columns.indexOf(col) === 0;
                    return (
                      <td
                        key={String(col.key)}
                        className={cn(
                          'px-2 py-2.5 text-gray-800 dark:text-gray-100',
                          col.align === 'right' ? 'text-right' : 'text-left',
                          isFirst && 'font-semibold'
                        )}
                      >
                        {isFirst && href ? (
                          <Link href={href} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">{cell}</Link>
                        ) : cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
