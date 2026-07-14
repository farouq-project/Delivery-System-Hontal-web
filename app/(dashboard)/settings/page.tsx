'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { featuresApi } from '@/lib/api';
import { ProfileTab } from '@/components/settings/profile-tab';
import { OperationalTab } from '@/components/settings/operational-tab';
import { HoursTab } from '@/components/settings/hours-tab';
import { InvoiceTab } from '@/components/settings/invoice-tab';
import { PaymentMethodsTab } from '@/components/settings/payment-methods-tab';
import { CashiersTab } from '@/components/settings/cashiers-tab';
import { ClustersTab } from '@/components/settings/clusters-tab';
import { TrackingTab } from '@/components/settings/tracking-tab';
import { NotificationsTab } from '@/components/settings/notifications-tab';
import { BranchesTab } from '@/components/settings/branches-tab';

const OWNER_ROLES = ['merchant_owner', 'developer', 'super_admin'];

const TABS = [
  { id: 'profile',       label: 'Business Profile' },
  { id: 'operational',   label: 'Operational' },
  { id: 'hours',         label: 'Business Hours' },
  { id: 'invoice',       label: 'Invoice' },
  { id: 'payments',      label: 'Payment Methods' },
  { id: 'cashiers',      label: 'Cashiers' },
  { id: 'clusters',      label: 'Clusters' },
  { id: 'tracking',      label: 'Tracking' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'branches',      label: 'Branches' },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('profile');

  const { data: featuresRes, isLoading: featuresLoading } = useQuery({
    queryKey: ['features'],
    queryFn: featuresApi.list,
    staleTime: 5 * 60 * 1000,
  });

  const isOwner = OWNER_ROLES.includes(user?.role ?? '');

  if (!isOwner) {
    return (
      <div className="p-6">
        <p className="text-gray-500 text-sm">You do not have permission to access Settings.</p>
      </div>
    );
  }

  if (featuresLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-40 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const platformEnabled = featuresRes?.data?.data?.merchant_platform ?? false;

  if (!platformEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-500 text-sm">Merchant Platform settings are not available for your account.</p>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':       return <ProfileTab />;
      case 'operational':   return <OperationalTab />;
      case 'hours':         return <HoursTab />;
      case 'invoice':       return <InvoiceTab />;
      case 'payments':      return <PaymentMethodsTab />;
      case 'cashiers':      return <CashiersTab />;
      case 'clusters':      return <ClustersTab />;
      case 'tracking':      return <TrackingTab />;
      case 'notifications': return <NotificationsTab />;
      case 'branches':      return <BranchesTab />;
      default:              return null;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Configure your merchant platform</p>
      </div>

      {/* Tab navigation — horizontal scroll on mobile */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 overflow-x-auto -mb-px" aria-label="Settings tabs">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="max-w-3xl">
        {renderTab()}
      </div>
    </div>
  );
}
