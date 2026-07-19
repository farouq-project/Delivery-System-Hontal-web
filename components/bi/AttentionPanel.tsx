import { InsightCard } from './InsightCard';
import { EmptyState } from './EmptyState';
import { CheckCircle } from 'lucide-react';

type Severity = 'error' | 'warning' | 'info';

interface AttentionItem {
  type: string;
  label: string;
  count: number;
  severity: Severity;
}

const hrefForType: Record<string, string> = {
  delayed_deliveries: '/orders?status=in_progress',
  failed_today:       '/orders?status=failed',
  missing_gps:        '/customers',
  dormant_customers:  '/bi/customers',
  offline_drivers:    '/drivers',
  pending_assignment: '/dispatch',
};

const descriptionForType: Record<string, string> = {
  delayed_deliveries: 'Active orders pending delivery for more than 4 hours',
  failed_today:       'Orders that failed delivery today',
  missing_gps:        'Active customers with no GPS coordinates recorded',
  dormant_customers:  'Customers with no orders in 90+ days',
  offline_drivers:    'Active drivers currently offline',
  pending_assignment: 'Orders waiting to be assigned to a driver',
};

interface AttentionPanelProps {
  items: AttentionItem[];
  title?: string;
}

export function AttentionPanel({ items, title = 'Requires Attention' }: AttentionPanelProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {items.length === 0 ? (
        <EmptyState
          title="All clear"
          description="No items require immediate attention."
          icon={<CheckCircle className="h-8 w-8 text-green-400 mb-2" />}
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <InsightCard
              key={item.type}
              title={item.label}
              count={item.count}
              description={descriptionForType[item.type]}
              href={hrefForType[item.type]}
              severity={item.severity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
