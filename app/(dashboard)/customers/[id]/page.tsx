'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, customerDomainApi } from '@/lib/api';
import { formatCurrency, formatDate, formatTime, VIP_COLORS } from '@/lib/utils';
import {
  ArrowLeft, User, Clock, BarChart2, LineChart, Megaphone,
  Heart, Tag, ShoppingBag, Truck, AlertCircle, CheckCircle,
  XCircle, Package, Phone, MapPin, Calendar, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CustomerProfile, CustomerTimeline, CustomerTag } from '@/types';

// ─── Constants ────────────────────────────────────────────────────

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

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  created:         <User className="h-4 w-4" />,
  order_created:   <Package className="h-4 w-4" />,
  order_delivered: <CheckCircle className="h-4 w-4 text-green-600" />,
  order_failed:    <XCircle className="h-4 w-4 text-red-500" />,
  address_changed: <MapPin className="h-4 w-4" />,
  phone_updated:   <Phone className="h-4 w-4" />,
  vip_changed:     <Star className="h-4 w-4 text-yellow-500" />,
  status_changed:  <AlertCircle className="h-4 w-4" />,
  health_changed:  <Heart className="h-4 w-4" />,
  segment_changed: <Tag className="h-4 w-4" />,
};

const TIMELINE_LABELS: Record<string, string> = {
  created:         'Customer created',
  order_created:   'Order placed',
  order_delivered: 'Order delivered',
  order_failed:    'Order failed',
  address_changed: 'Address updated',
  phone_updated:   'Phone number updated',
  vip_changed:     'VIP level changed',
  status_changed:  'Account status changed',
  health_changed:  'Health status changed',
  segment_changed: 'Segment updated',
};

// ─── Tab types ────────────────────────────────────────────────────

type Tab = 'profile' | 'timeline' | 'metrics' | 'analytics' | 'marketing';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',   label: 'Profile',   icon: <User className="h-4 w-4" /> },
  { id: 'timeline',  label: 'Timeline',  icon: <Clock className="h-4 w-4" /> },
  { id: 'metrics',   label: 'Metrics',   icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <LineChart className="h-4 w-4" /> },
  { id: 'marketing', label: 'Marketing', icon: <Megaphone className="h-4 w-4" /> },
];

// ─── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function TimelineItem({ event }: { event: CustomerTimeline }) {
  const icon   = TIMELINE_ICONS[event.event_type] ?? <Clock className="h-4 w-4" />;
  const label  = TIMELINE_LABELS[event.event_type] ?? event.event_type.replace(/_/g, ' ');
  const data   = event.event_data;

  const subtitle = data?.order_number
    ? `#${data.order_number}${data.order_value ? ` · ${formatCurrency(Number(data.order_value))}` : ''}`
    : data?.failure_reason
    ? String(data.failure_reason)
    : null;

  return (
    <div className="flex gap-3 py-3">
      <div className="mt-0.5 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        {event.actor_role && (
          <p className="text-xs text-gray-400">by {event.actor_role}</p>
        )}
      </div>
      <div className="text-xs text-gray-400 whitespace-nowrap pt-0.5">
        {formatDate(event.occurred_at, 'dd MMM HH:mm')}
      </div>
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <LineChart className="h-7 w-7 text-gray-400" />
      </div>
      <h3 className="font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs">{description}</p>
      <span className="mt-3 text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">Coming soon</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const params     = useParams();
  const router     = useRouter();
  const qc         = useQueryClient();
  const customerId = Number(params.id);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [timelinePage, setTimelinePage] = useState(1);

  // Basic customer data
  const { data: customerRes, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn:  () => customersApi.get(customerId),
  });

  // Profile + tags (fetched for Profile and Metrics tabs)
  const { data: profileRes, isLoading: profileLoading } = useQuery({
    queryKey: ['customer-domain', 'profile', customerId],
    queryFn:  () => customerDomainApi.profile(customerId),
    enabled:  activeTab === 'profile' || activeTab === 'metrics',
  });

  // Timeline (fetched only when Timeline tab is active)
  const { data: timelineRes, isLoading: timelineLoading } = useQuery({
    queryKey: ['customer-domain', 'timeline', customerId, timelinePage],
    queryFn:  () => customerDomainApi.timeline(customerId, { page: timelinePage, per_page: 20 }),
    enabled:  activeTab === 'timeline',
  });

  // Tag removal mutation
  const removeTagMutation = useMutation({
    mutationFn: (tagId: number) => customerDomainApi.removeTag(customerId, tagId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['customer-domain', 'profile', customerId] }),
  });

  const customer = customerRes?.data?.data ?? customerRes?.data;
  const domainData: { customer: typeof customer; profile: CustomerProfile; tags: CustomerTag[] } | null =
    profileRes?.data?.data ?? null;
  const profile  = domainData?.profile ?? null;
  const tags     = domainData?.tags    ?? [];

  const timelineData = timelineRes?.data?.data;
  const timelineItems: CustomerTimeline[] = timelineData?.data ?? [];
  const timelineMeta = timelineData
    ? { current_page: timelineData.current_page, last_page: timelineData.last_page }
    : null;

  if (customerLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-gray-400">Loading customer...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-red-500">Customer not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Customer header */}
      <div className="bg-white rounded-xl border p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold">{customer.customer_name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VIP_COLORS[customer.vip_level]}`}>
                {customer.vip_level}
              </span>
              {!customer.is_active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inactive</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone}
                </span>
              )}
              {customer.cluster && customer.cluster !== 'no cluster' && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {customer.cluster}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Customer since {formatDate(customer.created_at)}
              </span>
            </div>
          </div>

          {/* Health + segment badges */}
          {profile && (
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 ${HEALTH_CONFIG[profile.health_status]?.className ?? 'bg-gray-100 text-gray-600'}`}>
                <Heart className="h-3 w-3" />
                {HEALTH_CONFIG[profile.health_status]?.label ?? profile.health_status}
              </span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 ${SEGMENT_CONFIG[profile.segment]?.className ?? 'bg-gray-100 text-gray-600'}`}>
                <Tag className="h-3 w-3" />
                {SEGMENT_CONFIG[profile.segment]?.label ?? profile.segment}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (
        <div className="space-y-5">
          {profileLoading ? (
            <p className="text-gray-400 text-sm py-8 text-center">Loading profile...</p>
          ) : profile ? (
            <>
              {/* Order stats */}
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Order Summary</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Total Orders" value={String(profile.total_orders)} />
                  <StatCard label="Delivered" value={String(profile.total_deliveries)} />
                  <StatCard label="Failed" value={String(profile.total_failed)} />
                  <StatCard
                    label="Success Rate"
                    value={
                      profile.total_orders > 0
                        ? `${Math.round((profile.total_deliveries / profile.total_orders) * 100)}%`
                        : '—'
                    }
                  />
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Preferences</h2>
                <div className="bg-white rounded-lg border divide-y">
                  <div className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" /> Preferred Payment
                    </span>
                    <span className="font-medium capitalize">
                      {profile.preferred_payment?.replace(/_/g, ' ') ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Preferred Delivery Time
                    </span>
                    <span className="font-medium">
                      {profile.preferred_delivery_time
                        ? formatTime(profile.preferred_delivery_time)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Avg Delivery Time
                    </span>
                    <span className="font-medium">
                      {profile.avg_delivery_time_hours != null
                        ? `${profile.avg_delivery_time_hours.toFixed(1)} hrs`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> First Order
                    </span>
                    <span className="font-medium">{formatDate(profile.first_order_at)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Last Order
                    </span>
                    <span className="font-medium">{formatDate(profile.last_order_at)}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-sm text-gray-400">No tags assigned</p>
                  ) : (
                    tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: tag.color ? `${tag.color}20` : undefined,
                          color: tag.color ?? undefined,
                          border: tag.color ? `1px solid ${tag.color}40` : '1px solid #e5e7eb',
                        }}
                      >
                        {tag.name}
                        <button
                          onClick={() => removeTagMutation.mutate(tag.id)}
                          className="ml-0.5 opacity-60 hover:opacity-100"
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">
              Profile not available. This customer has no order history yet.
            </p>
          )}
        </div>
      )}

      {/* ── Timeline Tab ── */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-lg border">
          {timelineLoading ? (
            <p className="text-gray-400 text-sm py-8 text-center">Loading timeline...</p>
          ) : timelineItems.length === 0 ? (
            <p className="text-gray-400 text-sm py-12 text-center">No events recorded yet</p>
          ) : (
            <>
              <div className="divide-y px-4">
                {timelineItems.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))}
              </div>

              {timelineMeta && timelineMeta.last_page > 1 && (
                <div className="flex justify-between items-center px-4 py-3 border-t">
                  <p className="text-xs text-gray-500">
                    Page {timelineMeta.current_page} of {timelineMeta.last_page}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="outline"
                      disabled={timelinePage <= 1}
                      onClick={() => setTimelinePage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      disabled={timelinePage >= timelineMeta.last_page}
                      onClick={() => setTimelinePage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Metrics Tab ── */}
      {activeTab === 'metrics' && (
        <div className="space-y-5">
          {profileLoading ? (
            <p className="text-gray-400 text-sm py-8 text-center">Loading metrics...</p>
          ) : profile ? (
            <>
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Spending</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard
                    label="Total Spending"
                    value={formatCurrency(profile.total_spending)}
                    sub="from delivered orders"
                  />
                  <StatCard
                    label="Avg Order Value"
                    value={profile.total_deliveries > 0 ? formatCurrency(profile.avg_order_value) : '—'}
                    sub="per delivered order"
                  />
                  <StatCard
                    label="Total Orders"
                    value={String(profile.total_orders)}
                    sub={`${profile.total_deliveries} delivered · ${profile.total_failed} failed`}
                  />
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Delivery Performance</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard
                    label="Success Rate"
                    value={
                      profile.total_orders > 0
                        ? `${Math.round((profile.total_deliveries / profile.total_orders) * 100)}%`
                        : '—'
                    }
                  />
                  <StatCard
                    label="Avg Delivery Time"
                    value={
                      profile.avg_delivery_time_hours != null
                        ? `${profile.avg_delivery_time_hours.toFixed(1)}h`
                        : '—'
                    }
                    sub="order placed → delivered"
                  />
                  <StatCard
                    label="Last Order"
                    value={profile.last_order_at ? formatDate(profile.last_order_at, 'dd MMM yyyy') : '—'}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">
              No metrics available yet.
            </p>
          )}
        </div>
      )}

      {/* ── Analytics Tab (placeholder) ── */}
      {activeTab === 'analytics' && (
        <PlaceholderTab
          title="Analytics"
          description="Order trends, delivery patterns, and comparative performance will appear here in a future release."
        />
      )}

      {/* ── Marketing Tab (placeholder) ── */}
      {activeTab === 'marketing' && (
        <PlaceholderTab
          title="Marketing"
          description="Campaigns, re-engagement flows, and WhatsApp notifications will appear here in a future release."
        />
      )}
    </div>
  );
}
