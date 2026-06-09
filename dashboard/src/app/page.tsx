'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#a855f7] border-t-transparent"></div>
    </div>
  );
}
