'use client';

import { usePathname } from 'next/navigation';
import ChannelSelector from '@/components/ChannelSelector';
import ProfessionalSidebar from '@/components/layout/ProfessionalSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <ProfessionalSidebar />

      <div className="ml-64 min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 border-b border-[var(--border-default)] px-6 py-4 bg-[var(--bg-primary)]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChannelSelector />
            </div>
            <div className="flex items-center gap-4">
              {/* Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse opacity-50" />
                </div>
                <span className="text-[11px] font-medium text-emerald-400">Sistema Online</span>
              </div>

              {/* User Menu - Placeholder */}
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">A</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
