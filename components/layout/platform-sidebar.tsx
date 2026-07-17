'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2, FileText, CreditCard, Activity, Shield, ClipboardList, LogOut,
  LayoutDashboard, BarChart2, Search, Settings2, FlaskConical, ContactRound
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';

const platformNav = [
  { href: '/admin',               label: 'Dashboard',       icon: LayoutDashboard, exact: true },
  { href: '/admin/applications',  label: 'Applications',    icon: FileText },
  { href: '/admin/merchants',     label: 'Merchants',       icon: Building2 },
  { href: '/admin/plans',         label: 'Plans',           icon: CreditCard },
  { href: '/admin/subscriptions', label: 'Subscriptions',   icon: ClipboardList },
  { href: '/admin/health',        label: 'Merchant Health', icon: Activity },
  { href: '/admin/logs',          label: 'Activity Feed',   icon: Shield },
  { href: '/admin/analytics',     label: 'API Analytics',   icon: BarChart2 },
  { href: '/admin/search',        label: 'Global Search',   icon: Search },
  { href: '/admin/settings',      label: 'Settings',        icon: Settings2 },
  { href: '/admin/trial-wizard',  label: 'Trial Wizard',    icon: FlaskConical },
  { href: '/admin/crm',           label: 'CRM Prospects',   icon: ContactRound },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  };

  return (
    <aside className="flex flex-col h-screen w-60 bg-gray-900 text-white shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h1 className="font-bold text-lg text-emerald-400">Hontal Platform</h1>
        <p className="text-xs text-gray-400 mt-0.5">Super Admin Console</p>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Platform
        </p>
        {platformNav.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              (exact ? pathname === href : pathname.startsWith(href))
                ? 'bg-emerald-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        {user && (
          <div className="mb-3">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-900 text-emerald-300 text-xs rounded-full">
              super_admin
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
