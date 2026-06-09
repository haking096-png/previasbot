'use client';

import { useState, useEffect } from 'react';
import { postApi, channelApi } from '@/lib/api';
import { Post, Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Agenda</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {stats.scheduled} agendados • {stats.published} publicados
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Hoje
              </Button>
              <span className="text-[var(--text-primary)] font-medium min-w-[180px] text-center capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'month' ? 'bg-violet-500/20 text-violet-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'week' ? 'bg-violet-500/20 text-violet-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-[var(--text-muted)] py-2">
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
                        min-h-[120px] rounded-xl p-2 border transition-all duration-150
                        ${isCurrentMonth ? 'bg-[var(--bg-secondary)] border-[var(--border-default)]' : 'bg-[var(--bg-primary)] border-[var(--border-default)]/50'}
                        ${isToday ? 'border-violet-500/50 ring-1 ring-violet-500/20' : ''}
                        hover:border-[var(--border-hover)]
                      `}
                    >
                      {/* Day Number */}
                      <div className={`text-xs font-medium mb-2 ${isToday ? 'text-violet-400' : isCurrentMonth ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                        {format(day, 'd')}
                      </div>

                      {/* Posts */}
                      <div className="space-y-1">
                        {dayPosts.slice(0, 3).map(post => (
                          <div
                            key={post.id}
                            onClick={() => setSelectedPost(post)}
                            className={`
                              px-2 py-1 rounded-lg text-xs cursor-pointer truncate transition-colors
                              ${post.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' :
                                post.status === 'SCHEDULED' ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' :
                                post.status === 'PUBLISHING' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' :
                                'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--border-hover)]'}
                            `}
                          >
                            {format(new Date(post.scheduledFor!), 'HH:mm')} {post.preview?.headline?.substring(0, 10) || ''}
                          </div>
                        ))}
                        {dayPosts.length > 3 && (
                          <div className="text-[10px] text-[var(--text-muted)] px-2">
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
          <Card padding="lg" className="max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Detalhes do Post</h2>
                <StatusBadge status={selectedPost.status} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPost(null)}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            {/* Image */}
            {selectedPost.mediaItem?.filePath && (
              <div className="rounded-xl overflow-hidden bg-[var(--bg-tertiary)] mb-4">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/media/${selectedPost.mediaItem.id}/image`}
                  alt=""
                  className="w-full h-48 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            {/* Content */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-1">Headline</p>
                <p className="text-[var(--text-primary)] font-medium">{selectedPost.preview?.headline || 'Sem headline'}</p>
              </div>

              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-1">Body</p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{selectedPost.preview?.body || ''}</p>
              </div>

              {/* Schedule Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-1">Agendado</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {selectedPost.scheduledFor ? format(new Date(selectedPost.scheduledFor), "dd/MM/yyyy HH:mm") : '-'}
                  </p>
                </div>
                {selectedPost.publishedAt && (
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-1">Publicado</p>
                    <p className="text-sm text-emerald-400">
                      {format(new Date(selectedPost.publishedAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                )}
              </div>

              {/* Channel */}
              {selectedPost.channel && (
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-1">Canal</p>
                  <p className="text-sm text-[var(--text-primary)]">{selectedPost.channel.name}</p>
                </div>
              )}

              {/* Actions */}
              {selectedPost.status === 'SCHEDULED' && (
                <div className="flex gap-3 pt-4 border-t border-[var(--border-default)]">
                  <Button
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
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  >
                    Publicar Agora
                  </Button>
                  <Button
                    variant="danger"
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
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
