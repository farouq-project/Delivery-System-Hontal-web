'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminGrowthIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/growth/overview');
  }, [router]);
  return null;
}
