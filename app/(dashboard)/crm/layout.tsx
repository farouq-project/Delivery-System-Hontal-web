'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { CalendarDays, ListChecks } from 'lucide-react';

// Same roles the API allows on /crm/*
const CRM_ROLES = ['merchant_owner', 'super_admin', 'developer', 'merchant_ops'];

const subNav = [
  { href: '/crm/habits',   label: 'Customer Habits', icon: ListChecks },
  { href: '/crm/calendar', label: 'Calendar',        icon: CalendarDays },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);

  if (!CRM_ROLES.includes(user?.role ?? '')) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>You do not have permission to access the CRM.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-navigation */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-4 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-0 scrollbar-none">
            {subNav.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
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

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
