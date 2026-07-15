import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = 'No data available',
  description = 'Data will appear here once orders are recorded.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
      {icon ?? <Inbox className="h-10 w-10 mb-3 opacity-40" />}
      <p className="font-medium text-gray-500">{title}</p>
      {description && <p className="text-sm mt-1 max-w-xs">{description}</p>}
    </div>
  );
}
