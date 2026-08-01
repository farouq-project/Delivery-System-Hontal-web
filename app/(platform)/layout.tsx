'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { PlatformSidebar } from '@/components/layout/platform-sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Menu } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.replace('/login');
    } else if (user && user.role !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [user]);

  if (!mounted || !isAuthenticated()) return null;
  if (user && user.role !== 'super_admin') return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <PlatformSidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 overflow-auto">
          {/* Mobile top bar — visible only on small screens */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 text-white sticky top-0 z-40">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-emerald-400 text-sm">Hontal Platform</span>
          </div>
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
}
