import Link from 'next/link';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
  href?: string;
  icon?: LucideIcon;
  iconColor?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

function formatDelta(delta: number) {
  const abs = Math.abs(delta).toFixed(1);
  return delta > 0 ? `+${abs}%` : `${abs}%`;
}

export function StatCard({
  title,
  value,
  delta,
  deltaLabel,
  href,
  icon: Icon,
  iconColor = 'text-blue-500',
  variant = 'default',
}: StatCardProps) {
  const borderColor = {
    default: 'border-l-blue-500',
    warning: 'border-l-amber-500',
    danger:  'border-l-red-500',
    success: 'border-l-green-500',
  }[variant];

  const DeltaIcon = delta == null ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta == null ? '' : delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400';

  const content = (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600',
      'border-l-4 p-4 flex items-start gap-3 shadow-sm',
      borderColor,
      href && 'cursor-pointer hover:shadow-md transition-shadow'
    )}>
      {Icon && (
        <Icon className={cn('h-5 w-5 mt-1 shrink-0', iconColor)} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-300 font-semibold uppercase tracking-wide truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {delta != null && DeltaIcon && (
          <p className={cn('flex items-center gap-1 text-xs mt-1', deltaColor)}>
            <DeltaIcon className="h-3 w-3" />
            {formatDelta(delta)}
            {deltaLabel && <span className="text-gray-400 dark:text-gray-400">{deltaLabel}</span>}
          </p>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
