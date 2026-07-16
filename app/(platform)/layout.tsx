'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { PlatformSidebar } from '@/components/layout/platform-sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else if (user && user.role !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [user]);

  if (!isAuthenticated()) return null;
  if (user && user.role !== 'super_admin') return null;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <PlatformSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
}
