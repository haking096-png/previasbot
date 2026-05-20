'use client';

import { useEffect, useState, useRef } from 'react';
import { mediaApi, postApi, previewApi, channelApi } from '@/lib/api';
import { Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import AnimatedBorderCard from '@/components/ui/AnimatedBorderCard';
import ProgressRing from '@/components/ui/ProgressRing';
import Sparkline from '@/components/ui/Sparkline';
import MiniBarChart from '@/components/ui/MiniBarChart';

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>();
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return <span>{count}</span>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalMedia: 0, pendingPreviews: 0, scheduledPosts: 0, publishedPosts: 0 });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedChannelId } = useChannelStore();

  useEffect(() => { loadStats(); loadChannels(); }, [selectedChannelId]);

  const loadStats = async () => {
    try {
      const [mediaRes, previewsRes, postsRes] = await Promise.all([
        mediaApi.getAll(selectedChannelId || undefined).catch(() => ({ data: [] })),
        previewApi.getAll(selectedChannelId || undefined).catch(() => ({ data: [] })),
        postApi.getAll(selectedChannelId || undefined).catch(() => ({ data: [] })),
      ]);
      const media = mediaRes.data || [];
      const previews = previewsRes.data || [];
      const posts = postsRes.data || [];
      setStats({
        totalMedia: media.length,
        pendingPreviews: previews.filter((p: any) => !p.approved).length,
        scheduledPosts: posts.filter((p: any) => p.status === 'SCHEDULED').length,
        publishedPosts: posts.filter((p: any) => p.status === 'PUBLISHED').length,
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
      setStats({ totalMedia: 0, pendingPreviews: 0, scheduledPosts: 0, publishedPosts: 0 });
    } finally { setLoading(false); }
  };

  const loadChannels = async () => {
    try {
      const response = await channelApi.getAll();
      setChannels(response.data.filter((c: Channel) => c.enabled));
    } catch (error) { console.warn('Failed to load channels'); }
  };

  const handleImport = async () => {
    try {
      await mediaApi.triggerImport();
      toast.success('Importação iniciada!');
      setTimeout(loadStats, 2000);
    } catch (error: any) { toast.error('Erro ao iniciar importação'); }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8"><div className="skeleton h-8 w-48 mb-2" /><div className="skeleton h-4 w-64" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (<div key={i} className="skeleton h-40 rounded-[var(--radius-lg)]" />))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          <div className="lg:col-span-2 skeleton h-72 rounded-[var(--radius-lg)]" />
          <div className="skeleton h-72 rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  const totalPosts = stats.scheduledPosts + stats.publishedPosts;
  const statCards = [
    { label: 'Total de Imagens', value: stats.totalMedia, ringColor: '#06b6d4', ringValue: stats.totalMedia, ringMax: Math.max(stats.totalMedia, 20), sparkData: [3, 5, 4, 7, 6, 8, stats.totalMedia > 0 ? stats.totalMedia : 2], trend: '+12%', trendUp: true },
    { label: 'Prévias Pendentes', value: stats.pendingPreviews, ringColor: '#f59e0b', ringValue: stats.pendingPreviews, ringMax: Math.max(stats.totalMedia, 5), sparkData: [2, 4, 3, 5, 2, 3, stats.pendingPreviews], trend: stats.pendingPreviews > 0 ? 'Pendente' : 'OK', trendUp: stats.pendingPreviews === 0 },
    { label: 'Posts Agendados', value: stats.scheduledPosts, ringColor: '#3b82f6', ringValue: stats.scheduledPosts, ringMax: Math.max(totalPosts, 10), sparkData: [1, 2, 3, 2, 4, 3, stats.scheduledPosts], trend: 'Ativo', trendUp: true },
    { label: 'Posts Publicados', value: stats.publishedPosts, ringColor: '#10b981', ringValue: stats.publishedPosts, ringMax: Math.max(totalPosts, 10), sparkData: [2, 3, 5, 4, 6, 7, stats.publishedPosts], trend: '+8%', trendUp: true },
  ];
  const chartData = [
    { label: 'Seg', value: 3 }, { label: 'Ter', value: 5 }, { label: 'Qua', value: 2 },
    { label: 'Qui', value: 7 }, { label: 'Sex', value: 4 }, { label: 'Sáb', value: 6 },
    { label: 'Dom', value: stats.publishedPosts > 0 ? stats.publishedPosts : 1 },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 animate-fade-slide-up" style={{ animationDelay: '0ms' }}>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] font-display">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Visão geral do sistema de publicações</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, index) => (
          <div key={card.label} className="animate-fade-slide-up" style={{ animationDelay: `${(index + 1) * 100}ms` }}>
            <AnimatedBorderCard>
              <div className="p-5 relative overflow-hidden group cursor-default">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ProgressRing value={card.ringValue} max={card.ringMax} size={42} strokeWidth={3} color={card.ringColor} delay={index * 100} />
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{card.label}</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)] font-display mt-0.5">
                        <AnimatedCounter target={card.value} />
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${card.trendUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {card.trendUp ? (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                    ) : (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01" /></svg>
                    )}
                    {card.trend}
                  </div>
                </div>
                <Sparkline data={card.sparkData} color={card.ringColor} delay={index * 100} width={100} height={24} />
              </div>
            </AnimatedBorderCard>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 animate-fade-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="glass-card rounded-[var(--radius-lg)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display">Canais Ativos</h2>
              <span className="text-[10px] font-semibold text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/[0.08] px-2.5 py-1 rounded-full border border-[var(--accent-cyan)]/20">{channels.length} canais</span>
            </div>
            {channels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {channels.map((channel) => (
                  <div key={channel.id} className={`group flex items-center gap-3 p-3.5 rounded-[var(--radius-md)] border transition-all duration-200 cursor-default ${selectedChannelId === channel.id ? 'border-[var(--border-glow)] bg-[var(--accent-cyan)]/[0.04] shadow-sm shadow-cyan-500/10' : 'border-[var(--border-subtle)] hover:border-[var(--border-glow)] hover:bg-white/[0.02]'}`}>
                    <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-sm font-bold transition-all duration-200 ${selectedChannelId === channel.id ? 'bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-blue)] text-white shadow-lg shadow-cyan-500/25' : 'bg-white/[0.04] text-[var(--text-secondary)] group-hover:bg-white/[0.08]'}`}>
                      {channel.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{channel.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{channel.chatId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedChannelId === channel.id && <span className="text-[9px] font-semibold text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-0.5 rounded-full border border-[var(--accent-cyan)]/20">Ativo</span>}
                      <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse-ring" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8"><p className="text-sm text-[var(--text-muted)]">Nenhum canal ativo</p></div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="animate-fade-slide-up" style={{ animationDelay: '600ms' }}>
            <div className="glass-card rounded-[var(--radius-lg)] p-6">
              <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display mb-5">Publicações (7 dias)</h2>
              <MiniBarChart data={chartData} height={100} />
            </div>
          </div>
          <div className="animate-fade-slide-up" style={{ animationDelay: '700ms' }}>
            <div className="glass-card rounded-[var(--radius-lg)] p-6">
              <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display mb-5">Atividade Recente</h2>
              <div className="space-y-3 relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-[var(--accent-cyan)]/20 via-[var(--border-subtle)] to-transparent" />
                {stats.publishedPosts > 0 && <TimelineItem icon="M9 12l2 2 4-4" color="emerald" title="Post publicado" subtitle="Enviado com sucesso" />}
                {stats.scheduledPosts > 0 && <TimelineItem icon="M8 7V3m8 4V3m-9 8h10" color="blue" title="Post agendado" subtitle={`${stats.scheduledPosts} na fila`} />}
                {stats.pendingPreviews > 0 && <TimelineItem icon="M12 8v4l3 3" color="amber" title="Prévias pendentes" subtitle={`${stats.pendingPreviews} para revisar`} />}
                {stats.totalMedia > 0 && <TimelineItem icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" color="cyan" title="Acervo atualizado" subtitle={`${stats.totalMedia} imagens`} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 animate-fade-slide-up" style={{ animationDelay: '800ms' }}>
        <div className="glass-card rounded-[var(--radius-lg)] p-6">
          <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-display mb-5">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <QuickAction href="/dashboard/media" icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" label="Gerenciar Imagens" description="Upload e organização" />
            <QuickAction href="/dashboard/previews" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" label="Ver Prévias" description="Revisar e aprovar" />
            <QuickAction href="/dashboard/posts" icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Publicações" description="Agendar e publicar" />
            <button onClick={handleImport} className="group flex flex-col items-start gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:border-emerald-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 bg-gradient-to-br from-emerald-500/[0.04] to-teal-500/[0.02] text-left">
              <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-200">
                <svg className="w-[18px] h-[18px] text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Importar Imagens</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Buscar novas imagens</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ icon, color, title, subtitle }: { icon: string; color: string; title: string; subtitle: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  };
  return (
    <div className="flex items-center gap-3 pl-1 relative">
      <div className={`w-[30px] h-[30px] rounded-full ${colors[color]} border flex items-center justify-center flex-shrink-0 relative z-10`}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-[10px] text-[var(--text-muted)]">{subtitle}</p>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, description }: { href: string; icon: string; label: string; description: string }) {
  return (
    <a href={href} className="group flex flex-col items-start gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:border-[var(--border-glow)] transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-1 bg-gradient-to-br from-[var(--accent-cyan)]/[0.03] to-[var(--accent-blue)]/[0.02]">
      <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-200">
        <svg className="w-[18px] h-[18px] text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} /></svg>
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
    </a>
  );
}
