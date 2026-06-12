'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isDriver } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else if (isDriver()) {
      router.replace('/driver');
    } else {
      router.replace('/dashboard');
    }
  }, []);

  return null;
}
