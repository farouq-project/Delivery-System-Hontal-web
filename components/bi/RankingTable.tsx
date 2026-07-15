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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-600">
            <th className="pb-2 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 w-8">#</th>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  'pb-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-300',
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
            const href = linkFn?.(row);
            return (
              <tr key={String(row[keyField])} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-2 pr-3 text-xs text-gray-500 dark:text-gray-400 font-medium">{i + 1}</td>
                {columns.map((col) => {
                  const cell = col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? '—');

                  const isFirst = columns.indexOf(col) === 0;
                  return (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'py-2 px-2 text-gray-700 dark:text-gray-300',
                        col.align === 'right' ? 'text-right' : 'text-left',
                        isFirst && 'font-medium'
                      )}
                    >
                      {isFirst && href ? (
                        <Link href={href} className="hover:text-blue-600 hover:underline">{cell}</Link>
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
  );
}
