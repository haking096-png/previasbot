'use client';

import { useState, useEffect } from 'react';
import { postApi, mediaApi, previewApi, channelApi } from '@/lib/api';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsData {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  failedPosts: number;
  totalMedia: number;
  totalPreviews: number;
  pendingPreviews: number;
  approvedPreviews: number;
  postsByDay: { date: string; count: number }[];
  postsByChannel: { channel: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const { selectedChannelId } = useChannelStore();

  useEffect(() => {
    loadAnalytics();
  }, [selectedChannelId, period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [postsRes, mediaRes, previewsRes, channelsRes] = await Promise.all([
        postApi.getAll(selectedChannelId || undefined).catch(() => ({ data: [] })),
        mediaApi.getAll(selectedChannelId || undefined).catch(() => ({ data: [] })),
        previewApi.getAll(selectedChannelId || undefined).catch(() => ({ data: [] })),
        channelApi.getAll().catch(() => ({ data: [] })),
      ]);

      const posts = postsRes.data || [];
      const media = mediaRes.data || [];
      const previews = previewsRes.data || [];
      const channels = channelsRes.data || [];

      // Calculate stats
      const stats: AnalyticsData = {
        totalPosts: posts.length,
        publishedPosts: posts.filter((p: any) => p.status === 'PUBLISHED').length,
        scheduledPosts: posts.filter((p: any) => p.status === 'SCHEDULED').length,
        failedPosts: posts.filter((p: any) => p.status === 'FAILED').length,
        totalMedia: media.length,
        totalPreviews: previews.length,
        pendingPreviews: previews.filter((p: any) => !p.approved).length,
        approvedPreviews: previews.filter((p: any) => p.approved).length,
        postsByDay: calculatePostsByDay(posts, period),
        postsByChannel: calculatePostsByChannel(posts, channels),
      };

      setData(stats);
    } catch (error) {
      toast.error('Erro ao carregar analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculatePostsByDay = (posts: any[], period: string) => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const result: { date: string; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const count = posts.filter((p: any) => {
        const publishDate = p.publishedAt || p.scheduledFor;
        if (!publishDate) return false;
        const postDate = new Date(publishDate);
        return startOfDay(postDate).getTime() === startOfDay(date).getTime() && p.status === 'PUBLISHED';
      }).length;
      result.push({ date: format(date, 'dd/MM'), count });
    }

    return result;
  };

  const calculatePostsByChannel = (posts: any[], channels: any[]) => {
    const result: { channel: string; count: number }[] = [];
    const channelMap = new Map(channels.map((c: any) => [c.id, c.name]));

    posts.filter((p: any) => p.status === 'PUBLISHED').forEach((post: any) => {
      const channelName = channelMap.get(post.channelId) || 'Sem canal';
      const existing = result.find(r => r.channel === channelName);
      if (existing) {
        existing.count++;
      } else {
        result.push({ channel: channelName, count: 1 });
      }
    });

    return result.sort((a, b) => b.count - a.count);
  };

  const maxCount = data ? Math.max(...data.postsByDay.map(d => d.count), 1) : 1;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">Visão geral do desempenho</p>
        </div>

        <div className="flex items-center bg-[#111827] rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                period === p ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total de Posts"
          value={data?.totalPosts || 0}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          color="cyan"
        />
        <StatCard
          label="Posts Publicados"
          value={data?.publishedPosts || 0}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="emerald"
        />
        <StatCard
          label="Posts Agendados"
          value={data?.scheduledPosts || 0}
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="blue"
        />
        <StatCard
          label="Taxa de Aprovação"
          value={`${data ? Math.round((data.approvedPreviews / Math.max(data.totalPreviews, 1)) * 100) : 0}%`}
          icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts by Day Chart */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Posts por Dia</h3>
          <div className="h-48 flex items-end gap-1">
            {data?.postsByDay.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-cyan-500/20 rounded-t relative" style={{ height: `${(d.count / maxCount) * 100}%` }}>
                  <div
                    className="absolute inset-x-0 bottom-0 bg-cyan-500 rounded-t transition-all"
                    style={{ height: `${Math.max(d.count / maxCount, 0.05) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{d.date.split('/')[0]}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-3 h-3 rounded bg-cyan-500" />
            <span className="text-xs text-gray-500">Posts publicados</span>
          </div>
        </div>

        {/* Posts by Channel */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Posts por Canal</h3>
          <div className="space-y-3">
            {data?.postsByChannel.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-xs font-bold">
                  {item.channel.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">{item.channel}</span>
                    <span className="text-sm text-gray-400">{item.count}</span>
                  </div>
                  <div className="h-2 bg-[#0a0e1a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{ width: `${(item.count / Math.max(data?.publishedPosts || 1, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!data?.postsByChannel || data.postsByChannel.length === 0) && (
              <div className="text-center py-8 text-gray-500 text-sm">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        {/* Media Stats */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Estatísticas de Mídia</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0a0e1a] rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{data?.totalMedia || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total de Mídias</p>
            </div>
            <div className="bg-[#0a0e1a] rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{data?.totalPreviews || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total de Prévias</p>
            </div>
            <div className="bg-[#0a0e1a] rounded-lg p-4">
              <p className="text-2xl font-bold text-amber-400">{data?.pendingPreviews || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Prévias Pendentes</p>
            </div>
            <div className="bg-[#0a0e1a] rounded-lg p-4">
              <p className="text-2xl font-bold text-emerald-400">{data?.approvedPreviews || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Prévias Aprovadas</p>
            </div>
          </div>
        </div>

        {/* Failed Posts */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Posts com Falha</h3>
          {data && data.failedPosts > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{data.failedPosts} posts falharam</p>
                  <p className="text-xs text-gray-500">Verifique os logs para detalhes</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-emerald-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-500">Nenhum post com falha</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  const colors: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className={`bg-[#111827] border rounded-xl p-5 ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}