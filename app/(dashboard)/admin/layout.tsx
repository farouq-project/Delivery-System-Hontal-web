'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'super_admin') return null;

  return <>{children}</>;
}
