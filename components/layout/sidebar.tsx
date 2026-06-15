'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Truck, PackageOpen,
  Map, Route, LogOut, Menu, Layers, UserCog, X, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import { useState } from 'react';
import { InstallButton } from './install-button';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/customers',  label: 'Customers',   icon: Users },
  { href: '/drivers',    label: 'Drivers',     icon: Truck },
  { href: '/orders',     label: 'Orders',      icon: PackageOpen },
  { href: '/dispatch',   label: 'Dispatch',    icon: Route },
  { href: '/klotter',    label: 'Klotter',     icon: Layers },
  { href: '/live',       label: 'Live Map',    icon: Map },
  { href: '/reports',    label: 'Reports',     icon: ClipboardList },
];

const adminNavItems = [
  { href: '/users', label: 'Users', icon: UserCog },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const canManageUsers = ['super_admin', 'developer', 'merchant_owner'].includes(user?.role ?? '');
  const items = canManageUsers ? [...navItems, ...adminNavItems] : navItems;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          'flex flex-col h-screen bg-gray-900 text-white transition-all duration-200 z-50',
          'fixed inset-y-0 left-0 w-60 md:static',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'md:w-16' : 'md:w-60'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg">Hontal</h1>
              <p className="text-xs text-gray-400">Delivery Platform</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden md:block p-1 rounded hover:bg-gray-700">
            <Menu className="h-5 w-5" />
          </button>
          <button onClick={onMobileClose} className="md:hidden p-1 rounded hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                pathname.startsWith(href)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          {!collapsed && user && (
            <div className="mb-3">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          )}
          <InstallButton collapsed={collapsed} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>
    </>
  );
}
