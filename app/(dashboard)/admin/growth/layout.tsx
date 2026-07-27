'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { PlatformMerchantBar } from '@/components/platform/PlatformMerchantBar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, PackageOpen, Truck,
  Layers, ClipboardList, Map,
  TrendingUp, Megaphone, Target, FileText,
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

export default function AdminGrowthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);

  if (user?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Access restricted to super admin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PlatformMerchantBar />

      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-4 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-0 scrollbar-none">
            {subNav.map(({ href, label, icon: Icon }) => {
              const segment = href.split('/').pop()!;
              const active  = pathname === href || pathname.startsWith(`/admin/growth/${segment}`);
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

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
