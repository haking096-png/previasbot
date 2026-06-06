'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ChannelSelector from '@/components/ChannelSelector';
import ProfessionalSidebar from '@/components/layout/ProfessionalSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <ProfessionalSidebar />

      <div className="ml-64 min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 border-b border-[#1f2937] px-8 py-3.5 bg-[#0a0e1a]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChannelSelector />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse opacity-50" />
                </div>
                <span className="text-[11px] font-medium text-emerald-400">Sistema Online</span>
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}