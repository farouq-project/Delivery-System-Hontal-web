'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Building2, FileText, CreditCard, Activity, Shield, ClipboardList, LogOut,
  LayoutDashboard, BarChart2, Search, Settings2, FlaskConical, ContactRound,
  Menu, ChevronLeft, X, Truck, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';

const platformNav = [
  { href: '/admin',               label: 'Dashboard',       icon: LayoutDashboard, exact: true },
  { href: '/admin/applications',  label: 'Applications',    icon: FileText },
  { href: '/admin/merchants',     label: 'Sistem Merchants', icon: Building2 },
  { href: '/admin/plans',         label: 'Plans',           icon: CreditCard },
  { href: '/admin/subscriptions', label: 'Subscriptions',   icon: ClipboardList },
  { href: '/admin/health',        label: 'Merchant Health', icon: Activity },
  { href: '/admin/growth',        label: 'Platform Growth', icon: BarChart2 },
  { href: '/admin/logs',          label: 'Activity Feed',   icon: Shield },
  { href: '/admin/analytics',     label: 'API Analytics',   icon: BarChart2 },
  { href: '/admin/search',        label: 'Global Search',   icon: Search },
  { href: '/admin/settings',      label: 'Settings',        icon: Settings2 },
  { href: '/admin/trial-wizard',  label: 'Trial Wizard',    icon: FlaskConical },
  { href: '/admin/crm',           label: 'Sales CRM',       icon: ContactRound },
];

const kirimNav = [
  { href: '/admin/kirim/merchants', label: 'Kirim Merchants', icon: Building2 },
  { href: '/admin/kirim/team',      label: 'Hontal Team',     icon: Users },
];

interface PlatformSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function PlatformSidebar({ mobileOpen, onCloseMobile }: PlatformSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  };

  const navContent = (isMobile = false) => (
    <aside
      className={cn(
        'flex flex-col h-screen bg-gray-900 text-white shrink-0 transition-all duration-200',
        isMobile ? 'w-64' : (collapsed ? 'w-16' : 'w-60')
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center border-b border-gray-700 shrink-0',
        (!isMobile && collapsed) ? 'justify-center p-3' : 'justify-between p-4'
      )}>
        {(isMobile || !collapsed) && (
          <div className="min-w-0">
            <h1 className="font-bold text-lg text-emerald-400 leading-tight">Hontal Platform</h1>
            <p className="text-xs text-gray-400 mt-0.5">Super Admin Console</p>
          </div>
        )}
        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors shrink-0"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {(!isMobile && !collapsed) && (
          <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Platform
          </p>
        )}
        {(!isMobile && collapsed) && <div className="pt-2" />}
        {isMobile && (
          <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Platform
          </p>
        )}
        {platformNav.map(({ href, label, icon: Icon, exact }) => {
          // Prevent /admin/merchants from matching /admin/kirim/merchants
          const active = exact
            ? pathname === href
            : href === '/admin/merchants'
              ? pathname === '/admin/merchants' || pathname.startsWith('/admin/merchants/')
              : pathname.startsWith(href);
          const isCollapsed = !isMobile && collapsed;
          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed ? label : undefined}
              onClick={isMobile ? onCloseMobile : undefined}
              className={cn(
                'flex items-center rounded-md text-sm transition-colors',
                isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                active
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && label}
            </Link>
          );
        })}

        {/* Hontal Kirim section */}
        {(!isMobile && !collapsed) && (
          <p className="px-3 pt-4 pb-1 text-xs font-semibold text-orange-400 uppercase tracking-wider">
            Hontal Kirim
          </p>
        )}
        {(!isMobile && collapsed) && <div className="pt-2 border-t border-gray-700 mt-2" />}
        {isMobile && (
          <p className="px-3 pt-4 pb-1 text-xs font-semibold text-orange-400 uppercase tracking-wider">
            Hontal Kirim
          </p>
        )}
        {kirimNav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const isCollapsed = !isMobile && collapsed;
          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed ? label : undefined}
              onClick={isMobile ? onCloseMobile : undefined}
              className={cn(
                'flex items-center rounded-md text-sm transition-colors',
                isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                active
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn('border-t border-gray-700 shrink-0', (!isMobile && collapsed) ? 'p-2' : 'p-4')}>
        {(isMobile || !collapsed) && user && (
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
          title={(!isMobile && collapsed) ? 'Logout' : undefined}
          className={cn(
            'flex items-center w-full rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors',
            (!isMobile && collapsed) ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(isMobile || !collapsed) && 'Logout'}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        {navContent(false)}
      </div>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onCloseMobile}
          />
          {/* Drawer */}
          <div className="relative z-10">
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
