'use client';

import { useState, useEffect } from 'react';
import { postApi, channelApi } from '@/lib/api';
import { Post, Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PostWithChannel extends Post {
  channel?: Channel;
}

type ViewMode = 'month' | 'week';

export default function AgendaPage() {
  const [posts, setPosts] = useState<PostWithChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedPost, setSelectedPost] = useState<PostWithChannel | null>(null);
  const { selectedChannelId } = useChannelStore();

  useEffect(() => {
    loadPosts();
  }, [selectedChannelId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await postApi.getAll(selectedChannelId || undefined);
      setPosts(response.data || []);
    } catch (error) {
      toast.error('Erro ao carregar posts');
    } finally {
      setLoading(false);
    }
  };

  const getPostsForDay = (day: Date) => {
    return posts.filter(post => {
      if (!post.scheduledFor) return false;
      return isSameDay(new Date(post.scheduledFor), day);
    });
  };

  const getDaysInView = () => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  };

  const weeks = [];
  const days = getDaysInView();
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const stats = {
    total: posts.length,
    scheduled: posts.filter(p => p.status === 'SCHEDULED').length,
    published: posts.filter(p => p.status === 'PUBLISHED').length,
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[#1e293b] bg-[#0a0e1a]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Agenda</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {stats.scheduled} agendados • {stats.published} publicados
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button onClick={handleToday} className="px-3 py-1.5 text-sm font-medium text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors">
                Hoje
              </button>
              <span className="text-white font-medium min-w-[180px] text-center">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-[#111827] rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'month' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'week' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Semana
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="min-w-[800px]">
          {/* Week Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Weeks */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  const dayPosts = getPostsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, currentDate);

                  return (
                    <div
                      key={dayIndex}
                      className={`
                        min-h-[120px] rounded-lg p-2 border transition-colors
                        ${isCurrentMonth ? 'bg-[#111827] border-[#1e293b]' : 'bg-[#0a0e1a] border-[#1e293b]/50'}
                        ${isToday ? 'border-cyan-500/50' : ''}
                      `}
                    >
                      {/* Day Number */}
                      <div className={`text-xs font-medium mb-2 ${isToday ? 'text-cyan-400' : isCurrentMonth ? 'text-gray-400' : 'text-gray-600'}`}>
                        {format(day, 'd')}
                      </div>

                      {/* Posts */}
                      <div className="space-y-1">
                        {dayPosts.slice(0, 3).map(post => (
                          <div
                            key={post.id}
                            onClick={() => setSelectedPost(post)}
                            className={`
                              px-2 py-1 rounded text-xs cursor-pointer truncate
                              ${post.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400' :
                                post.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400' :
                                post.status === 'PUBLISHING' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-gray-500/20 text-gray-400'}
                            `}
                          >
                            {format(new Date(post.scheduledFor!), 'HH:mm')} {post.preview?.headline?.substring(0, 10) || ''}
                          </div>
                        ))}
                        {dayPosts.length > 3 && (
                          <div className="text-[10px] text-gray-500 px-2">
                            +{dayPosts.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPost(null)}>
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#1e293b] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Detalhes do Post</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedPost.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400' :
                  selectedPost.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {selectedPost.status}
                </span>
              </div>
              <button onClick={() => setSelectedPost(null)} className="p-2 hover:bg-white/5 rounded-lg">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Image */}
              {selectedPost.mediaItem?.filePath && (
                <div className="rounded-lg overflow-hidden bg-[#0a0e1a]">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/media/${selectedPost.mediaItem.id}/image`}
                    alt=""
                    className="w-full h-48 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Content */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Headline</p>
                <p className="text-white font-medium">{selectedPost.preview?.headline || 'Sem headline'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Body</p>
                <p className="text-sm text-gray-300 whitespace-pre-line">{selectedPost.preview?.body || ''}</p>
              </div>

              {/* Schedule Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Agendado</p>
                  <p className="text-sm text-white">
                    {selectedPost.scheduledFor ? format(new Date(selectedPost.scheduledFor), "dd/MM/yyyy HH:mm") : '-'}
                  </p>
                </div>
                {selectedPost.publishedAt && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Publicado</p>
                    <p className="text-sm text-emerald-400">
                      {format(new Date(selectedPost.publishedAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                )}
              </div>

              {/* Channel */}
              {selectedPost.channel && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Canal</p>
                  <p className="text-sm text-white">{selectedPost.channel.name}</p>
                </div>
              )}

              {/* Actions */}
              {selectedPost.status === 'SCHEDULED' && (
                <div className="flex gap-3 pt-4 border-t border-[#1e293b]">
                  <button
                    onClick={async () => {
                      try {
                        await postApi.publishNow(selectedPost.id);
                        toast.success('Post sendo publicado!');
                        setSelectedPost(null);
                        loadPosts();
                      } catch {
                        toast.error('Erro ao publicar');
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    Publicar Agora
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Cancelar post?')) return;
                      try {
                        await postApi.cancel(selectedPost.id);
                        toast.success('Post cancelado!');
                        setSelectedPost(null);
                        loadPosts();
                      } catch {
                        toast.error('Erro ao cancelar');
                      }
                    }}
                    className="px-4 py-2.5 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}