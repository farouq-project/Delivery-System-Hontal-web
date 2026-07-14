'use client';

import { Heart, Tag, TrendingUp, Calendar, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Customer, CustomerProfile } from '@/types';

const HEALTH_CONFIG: Record<string, { label: string; className: string }> = {
  healthy:  { label: 'Healthy',  className: 'bg-green-100 text-green-700' },
  active:   { label: 'Active',   className: 'bg-blue-100 text-blue-700' },
  at_risk:  { label: 'At Risk',  className: 'bg-orange-100 text-orange-700' },
  dormant:  { label: 'Dormant',  className: 'bg-yellow-100 text-yellow-700' },
  lost:     { label: 'Lost',     className: 'bg-red-100 text-red-700' },
};

const SEGMENT_CONFIG: Record<string, { label: string; className: string }> = {
  vip:        { label: 'VIP',        className: 'bg-purple-100 text-purple-700' },
  high_value: { label: 'High Value', className: 'bg-indigo-100 text-indigo-700' },
  returning:  { label: 'Returning',  className: 'bg-cyan-100 text-cyan-700' },
  new:        { label: 'New',        className: 'bg-gray-100 text-gray-700' },
  dormant:    { label: 'Dormant',    className: 'bg-yellow-100 text-yellow-700' },
};

interface Props {
  customer: Customer;
  profile?: CustomerProfile | null;
  className?: string;
}

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function Kpi({ icon, label, value }: KpiProps) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="text-xs text-gray-400 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <div className="text-sm font-semibold text-gray-800 truncate">{value}</div>
    </div>
  );
}

export function CustomerSummaryCard({ customer, profile, className = '' }: Props) {
  const health  = profile ? (HEALTH_CONFIG[profile.health_status]  ?? null) : null;
  const segment = profile ? (SEGMENT_CONFIG[profile.segment] ?? null) : null;

  return (
    <div className={`bg-white rounded-lg border p-4 flex flex-wrap gap-4 sm:gap-6 ${className}`}>
      {/* Health */}
      <Kpi
        icon={<Heart className="h-3 w-3" />}
        label="Health"
        value={
          health ? (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${health.className}`}>
              {health.label}
            </span>
          ) : <span className="text-gray-300 text-xs">—</span>
        }
      />

      {/* Segment */}
      <Kpi
        icon={<Tag className="h-3 w-3" />}
        label="Segment"
        value={
          segment ? (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${segment.className}`}>
              {segment.label}
            </span>
          ) : <span className="text-gray-300 text-xs">—</span>
        }
      />

      {/* Lifetime Value */}
      <Kpi
        icon={<TrendingUp className="h-3 w-3" />}
        label="Lifetime Value"
        value={profile ? formatCurrency(profile.total_spending) : <span className="text-gray-300 text-xs">—</span>}
      />

      {/* Last Order */}
      <Kpi
        icon={<Clock className="h-3 w-3" />}
        label="Last Order"
        value={
          profile?.last_order_at
            ? formatDate(profile.last_order_at, 'dd MMM yyyy')
            : <span className="text-gray-300 text-xs">No orders yet</span>
        }
      />

      {/* Member Since */}
      <Kpi
        icon={<Calendar className="h-3 w-3" />}
        label="Member Since"
        value={formatDate(customer.created_at, 'MMM yyyy')}
      />
    </div>
  );
}

export default CustomerSummaryCard;
