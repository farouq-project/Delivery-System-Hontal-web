import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Metric {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface PerformanceCardProps {
  name: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  metrics: Metric[];
  href?: string;
}

export function PerformanceCard({
  name,
  subtitle,
  badge,
  badgeColor = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  metrics,
  href,
}: PerformanceCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{name}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', badgeColor)}>
            {badge}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map(({ label, value, highlight }) => (
          <div key={label}>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            <p className={cn('text-sm font-semibold mt-0.5', highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white')}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {href && (
        <Link href={href} className="mt-3 text-xs text-blue-600 hover:underline block">
          Open →
        </Link>
      )}
    </div>
  );
}
