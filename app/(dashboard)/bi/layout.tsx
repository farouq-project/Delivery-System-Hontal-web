'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { featuresApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, PackageOpen, Truck,
  Layers, ClipboardList, Map, BarChart2
} from 'lucide-react';

const BI_ROLES = ['merchant_owner', 'super_admin', 'developer'];

const subNav = [
  { href: '/bi/overview',   label: 'Overview',    icon: LayoutDashboard },
  { href: '/bi/customers',  label: 'Customers',   icon: Users },
  { href: '/bi/operations', label: 'Operations',  icon: PackageOpen },
  { href: '/bi/drivers',    label: 'Drivers',     icon: Truck },
  { href: '/bi/branches',   label: 'Branches',    icon: Layers },
  { href: '/bi/products',   label: 'Products',    icon: ClipboardList },
  { href: '/bi/areas',      label: 'Areas',       icon: Map },
];

export default function BiLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);

  const { data: featuresRes, isLoading: featuresLoading } = useQuery({
    queryKey: ['features'],
    queryFn: featuresApi.list,
    staleTime: 5 * 60 * 1000,
  });

  // Role check
  if (!BI_ROLES.includes(user?.role ?? '')) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>You do not have permission to access Business Intelligence.</p>
      </div>
    );
  }

  const biEnabled = featuresRes?.data?.data?.business_intelligence ?? false;
  const isDeveloperOrAdmin = ['super_admin', 'developer'].includes(user?.role ?? '');

  if (!featuresLoading && !biEnabled && !isDeveloperOrAdmin) {
    return (
      <div className="p-8 text-center">
        <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Business Intelligence</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Business Intelligence is not enabled for your account.
          Contact your administrator to enable this feature.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="px-4 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-0 scrollbar-none">
            {subNav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/bi/overview' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    active
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
