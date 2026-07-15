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

const severityConfig: Record<Severity, { icon: React.ElementType; text: string; border: string }> = {
  error:   { icon: AlertCircle,   text: 'text-red-600',   border: 'border-red-300' },
  warning: { icon: AlertTriangle, text: 'text-amber-600', border: 'border-amber-300' },
  info:    { icon: Info,          text: 'text-blue-600',  border: 'border-blue-300' },
};

export function InsightCard({
  title,
  count,
  description,
  href,
  linkLabel = 'View',
  severity = 'info',
}: InsightCardProps) {
  const { icon: Icon, text, border } = severityConfig[severity];

  return (
    <div className={cn('bg-white rounded-lg border p-4 flex items-start gap-3 shadow-sm', border)}>
      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', text)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold', text)}>{count}</span>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
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
