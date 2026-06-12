'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Menu } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isDispatcher } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else if (!isDispatcher()) {
      router.replace('/driver');
    }
  }, []);

  if (!isAuthenticated()) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 text-white">
            <button onClick={() => setMobileNavOpen(true)} className="p-1 rounded hover:bg-gray-700">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-bold text-lg">Hontal</h1>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
