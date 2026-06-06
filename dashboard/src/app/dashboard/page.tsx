'use client';

import { useEffect, useState } from 'react';
import { mediaApi, postApi, previewApi, channelApi } from '@/lib/api';
import { Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';

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
        <div className="mb-8"><div className="h-8 w-48 bg-[#1e293b] rounded mb-2" /><div className="h-4 w-64 bg-[#1e293b] rounded" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (<div key={i} className="h-40 bg-[#111827] rounded-xl border border-[#1e293b]" />))}
        </div>
      </div>
    );
  }

  // Onboarding
  if (channels.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-3">Bem-vindo ao Telegram Preview Bot</h1>
          <p className="text-gray-400 text-lg">Vamos configurar seu primeiro canal em poucos minutos.</p>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-8 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Passo a passo para começar</h2>

          <div className="space-y-6">
            <div className="flex gap-5">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/20">1</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Crie seu primeiro Canal</h3>
                <p className="text-sm text-gray-400 mb-2">Vá até a página de <strong>Canais</strong> e crie um novo canal. Você vai precisar do Token do Bot e do Chat ID.</p>
                <a href="/dashboard/channels" className="inline-flex items-center text-sm font-medium text-cyan-400 hover:underline">Ir para Canais →</a>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/20">2</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Configure o Prompt Mestre</h3>
                <p className="text-sm text-gray-400 mb-2">Depois de criar o canal, edite ele e cole seu <strong>Prompt Mestre</strong> (o estilo de escrita que o Grok deve seguir).</p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/20">3</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Importe suas imagens</h3>
                <p className="text-sm text-gray-400 mb-2">Coloque as fotos na pasta <code className="bg-white/5 px-1 rounded">uploads/</code> ou use a função de importação.</p>
                <a href="/dashboard/media" className="inline-flex items-center text-sm font-medium text-cyan-400 hover:underline">Ir para Imagens →</a>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/20">4</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Revise e aprove as prévias</h3>
                <p className="text-sm text-gray-400 mb-2">O Grok vai gerar as cópias automaticamente. Você revisa, edita se quiser, e aprova.</p>
                <a href="/dashboard/previews" className="inline-flex items-center text-sm font-medium text-cyan-400 hover:underline">Ver Prévias →</a>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <a href="/dashboard/channels" className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition-colors">
            Começar agora — Criar meu primeiro canal
          </a>
          <p className="text-[11px] text-gray-500 mt-4">Leva menos de 10 minutos para configurar tudo.</p>
        </div>
      </div>
    );
  }

  const totalPosts = stats.scheduledPosts + stats.publishedPosts;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Visão geral do sistema de publicações</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Total de Imagens" value={stats.totalMedia} color="cyan" />
        <StatCard label="Prévias Pendentes" value={stats.pendingPreviews} color="amber" />
        <StatCard label="Posts Agendados" value={stats.scheduledPosts} color="blue" />
        <StatCard label="Posts Publicados" value={stats.publishedPosts} color="emerald" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channels */}
        <div className="lg:col-span-2">
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Canais Ativos</h2>
              <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full border border-cyan-400/20">{channels.length} canais</span>
            </div>
            {channels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {channels.map((channel) => (
                  <div key={channel.id} className={`flex items-center gap-3 p-3.5 rounded-lg border transition-colors ${selectedChannelId === channel.id ? 'border-cyan-500/50 bg-cyan-400/5' : 'border-[#1e293b] hover:border-gray-600'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${selectedChannelId === channel.id ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white' : 'bg-[#1e293b] text-gray-400'}`}>
                      {channel.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{channel.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{channel.chatId}</p>
                    </div>
                    {selectedChannelId === channel.id && <span className="text-[9px] font-semibold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">Ativo</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8"><p className="text-sm text-gray-500">Nenhum canal ativo</p></div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-5">Atividade Recente</h2>
            <div className="space-y-3">
              {stats.publishedPosts > 0 && <TimelineItem icon="check" color="emerald" title="Post publicado" subtitle="Enviado com sucesso" />}
              {stats.scheduledPosts > 0 && <TimelineItem icon="clock" color="blue" title="Post agendado" subtitle={`${stats.scheduledPosts} na fila`} />}
              {stats.pendingPreviews > 0 && <TimelineItem icon="alert" color="amber" title="Prévias pendentes" subtitle={`${stats.pendingPreviews} para revisar`} />}
              {stats.totalMedia > 0 && <TimelineItem icon="image" color="cyan" title="Acervo atualizado" subtitle={`${stats.totalMedia} imagens`} />}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="mt-6">
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-5">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <QuickAction href="/dashboard/media" icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" label="Gerenciar Imagens" description="Upload e organização" />
            <QuickAction href="/dashboard/previews" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" label="Ver Prévias" description="Revisar e aprovar" />
            <QuickAction href="/dashboard/posts" icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Publicações" description="Agendar e publicar" />
            <button onClick={handleImport} className="flex flex-col items-start gap-3 p-4 rounded-lg border border-[#1e293b] hover:border-emerald-500/30 transition-colors bg-gradient-to-br from-emerald-500/5 to-teal-500/5 text-left">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Importar Imagens</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Buscar novas imagens</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  };

  const c = colors[color] || colors.cyan;

  return (
    <div className={`bg-[#111827] border ${c.border} rounded-xl p-5`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function TimelineItem({ icon, color, title, subtitle }: { icon: string; color: string; title: string; subtitle: string }) {
  const icons: Record<string, string> = {
    check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  };

  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-[30px] h-[30px] rounded-full ${colors[color]} border flex items-center justify-center`}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[icon]} /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-white">{title}</p>
        <p className="text-[10px] text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, description }: { href: string; icon: string; label: string; description: string }) {
  return (
    <a href={href} className="flex flex-col items-start gap-3 p-4 rounded-lg border border-[#1e293b] hover:border-cyan-500/30 transition-colors bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
        <svg className="w-[18px] h-[18px] text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} /></svg>
      </div>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
      </div>
    </a>
  );
}