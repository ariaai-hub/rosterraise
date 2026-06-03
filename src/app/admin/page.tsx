'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminGatePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in as admin
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role === 'ADMIN' || data.user?.role === 'SALES_REP') {
            router.push('/admin/crm');
          } else {
            router.push('/auth/login');
          }
        } else {
          router.push('/auth/login');
        }
      } catch {
        router.push('/auth/login');
      }
    };
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
      <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
    </div>
  );
}
