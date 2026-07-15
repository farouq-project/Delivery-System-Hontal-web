import Link from 'next/link';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type Severity = 'error' | 'warning' | 'info';

interface InsightCardProps {
  title: string;
  count: number;
  description?: string;
  href?: string;
  linkLabel?: string;
  severity?: Severity;
}

const severityConfig: Record<Severity, { icon: React.ElementType; bg: string; text: string; border: string }> = {
  error:   { icon: AlertCircle,   bg: 'bg-red-50 dark:bg-red-900/20',   text: 'text-red-700 dark:text-red-400',   border: 'border-red-200 dark:border-red-800' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  info:    { icon: Info,          bg: 'bg-blue-50 dark:bg-blue-900/20',  text: 'text-blue-700 dark:text-blue-400',  border: 'border-blue-200 dark:border-blue-800'  },
};

export function InsightCard({
  title,
  count,
  description,
  href,
  linkLabel = 'View',
  severity = 'info',
}: InsightCardProps) {
  const { icon: Icon, bg, text, border } = severityConfig[severity];

  return (
    <div className={cn('rounded-lg border p-4 flex items-start gap-3', bg, border)}>
      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', text)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold', text)}>{count}</span>
          <span className={cn('text-sm font-medium', text)}>{title}</span>
        </div>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className={cn('text-xs font-medium underline shrink-0 mt-0.5', text)}
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
