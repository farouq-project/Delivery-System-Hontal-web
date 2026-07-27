'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { usePlatformMerchantStore } from '@/store/platform-merchant';
import { PlatformMerchantBar } from '@/components/platform/PlatformMerchantBar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, PackageOpen, Truck,
  Layers, ClipboardList, Map,
  TrendingUp, Megaphone, Target, FileText,
  BarChart2, ChevronRight, Eye,
} from 'lucide-react';

const subNav = [
  { href: '/admin/growth/overview',   label: 'Overview',    icon: LayoutDashboard },
  { href: '/admin/growth/customers',  label: 'Customers',   icon: Users },
  { href: '/admin/growth/operations', label: 'Operations',  icon: PackageOpen },
  { href: '/admin/growth/drivers',    label: 'Drivers',     icon: Truck },
  { href: '/admin/growth/branches',   label: 'Branches',    icon: Layers },
  { href: '/admin/growth/products',   label: 'Products',    icon: ClipboardList },
  { href: '/admin/growth/areas',      label: 'Areas',       icon: Map },
  { href: '/admin/growth/sales',      label: 'Sales',       icon: TrendingUp },
  { href: '/admin/growth/marketing',  label: 'Marketing',   icon: Megaphone },
  { href: '/admin/growth/goals',      label: 'Goals',       icon: Target },
  { href: '/admin/growth/reports',    label: 'Reports',     icon: FileText },
];

function currentPageLabel(pathname: string) {
  return subNav.find((n) => pathname.startsWith(n.href))?.label ?? 'Overview';
}

function GrowthEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
        <BarChart2 className="h-8 w-8 text-indigo-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Select a Merchant</h2>
      <p className="text-sm text-gray-500 max-w-xs">
        Use the merchant selector above to choose which merchant's Growth Dashboard to view.
      </p>
      <p className="text-xs text-gray-400 mt-3">
        Data is read-only. No changes will be made to the merchant's account.
      </p>
    </div>
  );
}

export default function AdminGrowthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { selectedMerchant, isViewingMode } = usePlatformMerchantStore();

  if (user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Access restricted to super admin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Merchant selector bar */}
      <PlatformMerchantBar />

      {/* Read-only banner — shown when a merchant is selected */}
      {isViewingMode && selectedMerchant && (
        <div className="flex items-center gap-3 px-4 md:px-6 py-2.5 bg-amber-50 border-b border-amber-200">
          <Eye className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-amber-800">
              Viewing {selectedMerchant.company_name}
            </span>
            <span className="text-sm text-amber-700 ml-2">
              — Read-only mode. All create, update and delete actions are disabled.
            </span>
          </div>
        </div>
      )}

      {/* Breadcrumb + sub-nav — only when a merchant is selected */}
      {isViewingMode && (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 px-4 md:px-6 py-2 text-xs text-gray-500 bg-white border-b border-gray-100">
            <Link href="/admin" className="hover:text-gray-800 transition-colors">Platform</Link>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <Link href="/admin/growth/overview" className="hover:text-gray-800 transition-colors">Growth Dashboard</Link>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span className="text-gray-800 font-medium">{currentPageLabel(pathname)}</span>
          </div>

          {/* Sub-navigation tabs */}
          <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="px-4 md:px-6">
              <div className="flex items-center gap-1 overflow-x-auto py-0 scrollbar-none">
                {subNav.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                        active
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
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
        </>
      )}

      {/* Page content or empty state */}
      <div className="flex-1 overflow-auto flex flex-col">
        {isViewingMode ? children : <GrowthEmptyState />}
      </div>
    </div>
  );
}
