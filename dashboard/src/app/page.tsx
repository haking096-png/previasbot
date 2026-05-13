'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-blue border-t-transparent mx-auto"></div>
        <p className="mt-4 text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}
