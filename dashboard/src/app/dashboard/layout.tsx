'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ChannelSelector from '@/components/ChannelSelector';
import ParticleBackground from '@/components/effects/ParticleBackground';
import AuroraStreak from '@/components/effects/AuroraStreak';
import Logo, { RobotIcon } from '@/components/ui/Logo';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/dashboard/posts', label: 'Publicações', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { path: '/dashboard/media', label: 'Imagens', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { path: '/dashboard/previews', label: 'Prévias', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { path: '/dashboard/channels', label: 'Canais', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { path: '/dashboard/settings', label: 'Configurações', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-base)] mesh-bg noise-overlay">
      <ParticleBackground />
      <AuroraStreak />

      <div className="flex relative z-10">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen fixed left-0 top-0 z-40 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)]/90 backdrop-blur-2xl">
          <div className="p-5 border-b border-[var(--border-subtle)]">
            <Logo variant="full" size="md" />
          </div>

          <nav className="flex-1 px-3 py-5 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-md)] transition-all duration-200 ${
                  isActive(item.path)
                    ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/[0.06]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]'
                }`}
              >
                {isActive(item.path) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[var(--accent-cyan)] shadow-glow-sm" style={{ boxShadow: '0 0 12px 2px rgba(6, 182, 212, 0.5)' }} />
                )}
                <svg className={`w-[18px] h-[18px] flex-shrink-0 transition-all duration-200 ${!isActive(item.path) ? 'group-hover:scale-110' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                <span className="text-[13px] font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 mx-3 mb-4 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--accent-cyan)]/[0.04] to-[var(--accent-indigo)]/[0.04] border border-[var(--border-subtle)]">
            <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Sistema</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse-ring" />
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">Operacional</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 min-h-screen">
          {/* Top Bar */}
          <div className="sticky top-0 z-30 border-b border-[var(--border-subtle)] px-8 py-3.5 bg-[var(--surface-base)]/70 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="group flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] hover:bg-white/[0.05] transition-all duration-200" title="Home">
                <RobotIcon size={32} className="group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all duration-200" />
              </Link>
              <div className="w-px h-5 bg-[var(--border-subtle)]" />
              <ChannelSelector />
            </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20">
                  <div className="relative">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-ring" />
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400">Online</span>
                </div>
              </div>
            </div>
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
