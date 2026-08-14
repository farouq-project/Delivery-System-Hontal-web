'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import { PLATFORM } from '@/lib/brand';
import { LogOut, Layers } from 'lucide-react';

const ALLOWED_ROLES = ['hontal_dispatcher', 'super_admin', 'developer'];

export default function KirimDispatchPage() {
  const router = useRouter();
  const { isAuthenticated, user, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else if (!ALLOWED_ROLES.includes(user?.role ?? '')) {
      router.replace('/dashboard');
    }
  }, [user]);

  if (!isAuthenticated()) return null;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-blue-400" />
          <div>
            <p className="font-bold text-base leading-tight">{PLATFORM.name}</p>
            <p className="text-xs text-gray-400">Kirim Dispatch Console</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Layers className="h-7 w-7 text-blue-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Hontal Kirim Dispatch</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            The cross-merchant dispatch console is coming in Phase 2. It will show pooled delivery
            batches, allow manual route building, and live driver tracking across all Kirim merchants.
          </p>
          <div className="mt-6 pt-5 border-t border-gray-100 text-xs text-gray-400">
            Phase 2 — in development
          </div>
        </div>
      </main>
    </div>
  );
}
