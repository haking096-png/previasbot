'use client';

import { useState, useEffect, useRef } from 'react';
import { postApi, previewApi, ctaPresenteScheduleApi, enqueteScheduleApi, mediaApi, channelApi } from '@/lib/api';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import GenerationLoader from '@/components/ui/GenerationLoader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

type ViewMode = 'kanban' | 'list';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string; border: string }> = {
  SCHEDULED: { label: 'Agendado', color: 'blue', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  PUBLISHING: { label: 'Publicando', color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  PUBLISHED: { label: 'Publicado', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  FAILED: { label: 'Falhou', color: 'red', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  CANCELLED: { label: 'Cancelado', color: 'gray', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
};

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { selectedChannelId, setSelectedChannelId } = useChannelStore();
  const [channels, setChannels] = useState<any[]>([]);
  const [actionStatus, setActionStatus] = useState<{
    type: 'cta' | 'enquete' | 'regenerate' | null;
    status: 'generating' | 'success' | 'error' | 'idle';
    message?: string;
  }>({ type: null, status: 'idle' });
  const dragItem = useRef<string | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [selectedChannelId]);

  const loadChannels = async () => {
    try {
      const res = await channelApi.getAll();
      setChannels(res.data || []);
      if (!selectedChannelId && res.data?.length > 0) {
        setSelectedChannelId(res.data[0].id);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await postApi.getAll(selectedChannelId || undefined);
      const sorted = (response.data || []).sort((a: any, b: any) => {
        if (a.status === 'SCHEDULED' && b.status === 'SCHEDULED') {
          return a.order - b.order;
        }
        if (a.scheduledFor && b.scheduledFor) {
          return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
        }
        return 0;
      });
      setPosts(sorted);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Erro ao carregar posts');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPosts.map(p => p.id)));
    }
  };

  const handleDragStart = (id: string) => {
    dragItem.current = id;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    if (!dragItem.current || dragItem.current === targetId) return;
    const sourceId = dragItem.current;
    dragItem.current = null;

    const newPosts = [...posts];
    const sourceIndex = newPosts.findIndex(p => p.id === sourceId);
    const targetIndex = newPosts.findIndex(p => p.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = newPosts.splice(sourceIndex, 1);
    newPosts.splice(targetIndex, 0, moved);

    newPosts.forEach((p, i) => { p.order = i; });
    setPosts(newPosts);

    try {
      await postApi.reorder(newPosts.map((p, i) => ({ id: p.id, order: i })));
      toast.success('Ordem atualizada');
    } catch (error) {
      toast.error('Erro ao reordenar');
      loadPosts();
    }
  };

  const handleClearSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos 1 post');
      return;
    }
    if (!confirm(`Excluir ${selectedIds.size} post(s) selecionado(s)?`)) return;

    try {
      await postApi.bulkDelete(Array.from(selectedIds));
      toast.success(`${selectedIds.size} post(s) excluido(s)`);
      loadPosts();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await postApi.publishNow(id);
      toast.success('Publicando agora!');
      loadPosts();
    } catch (error) {
      toast.error('Erro ao publicar');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este post?')) return;
    try {
      await postApi.cancel(id);
      toast.success('Post cancelado');
      loadPosts();
    } catch (error) {
      toast.error('Erro ao cancelar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir permanentemente este post?')) return;
    try {
      await postApi.bulkDelete([id]);
      toast.success('Post excluido!');
      loadPosts();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleQuickPost = async (type: 'CTA' | 'ENQUETE') => {
    if (!selectedChannelId) {
      toast.error('Selecione um canal primeiro');
      return;
    }

    setActionStatus({
      type: type === 'CTA' ? 'cta' : 'enquete',
      status: 'generating',
      message: type === 'CTA' ? 'Gerando CTA Presente...' : 'Gerando Enquete...',
    });

    try {
      const apiCall = type === 'CTA' ? ctaPresenteScheduleApi.testNow : enqueteScheduleApi.testNow;
      const res = await apiCall(selectedChannelId);
      const data = res.data;

      if (data?.success) {
        const successMessage = type === 'CTA'
          ? `CTA postado: "${data?.data?.headline}"`
          : `Enquete postada: "${data?.data?.question}"`;

        setActionStatus({
          type: type === 'CTA' ? 'cta' : 'enquete',
          status: 'success',
          message: successMessage,
        });

        setTimeout(() => {
          setActionStatus({ type: null, status: 'idle' });
        }, 4000);
      } else {
        setActionStatus({
          type: type === 'CTA' ? 'cta' : 'enquete',
          status: 'error',
          message: data?.message || `Erro ao postar ${type}`,
        });
        toast.error(data?.message || `Erro ao postar ${type}`);

        setTimeout(() => {
          setActionStatus({ type: null, status: 'idle' });
        }, 5000);
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || `Erro ao postar ${type}`;
      setActionStatus({
        type: type === 'CTA' ? 'cta' : 'enquete',
        status: 'error',
        message,
      });
      toast.error(message, { duration: 6000 });

      setTimeout(() => {
        setActionStatus({ type: null, status: 'idle' });
      }, 5000);
    }
  };

  const handleRegenerate = async (postId: string) => {
    if (!confirm('Regenerar a previa com IA? A versao atual sera substituda.')) return;

    setActionStatus({
      type: 'regenerate',
      status: 'generating',
      message: 'Regenerando previa com IA...',
    });

    try {
      await postApi.regenerate(postId);
      setActionStatus({
        type: 'regenerate',
        status: 'success',
        message: 'Regeneracao iniciada! Aguarde alguns segundos.',
      });
      toast.success('Regenerando! Aguarde alguns segundos...');

      setTimeout(async () => {
        await loadPosts();
        setActionStatus({ type: null, status: 'idle' });
      }, 5000);
    } catch (error: any) {
      setActionStatus({
        type: 'regenerate',
        status: 'error',
        message: 'Erro ao regenerar',
      });
      toast.error('Erro ao regenerar');

      setTimeout(() => {
        setActionStatus({ type: null, status: 'idle' });
      }, 4000);
    }
  };

  const filteredPosts = statusFilter === 'all'
    ? posts
    : posts.filter(p => p.status === statusFilter);

  const counts = {
    all: posts.length,
    scheduled: posts.filter(p => p.status === 'SCHEDULED').length,
    published: posts.filter(p => p.status === 'PUBLISHED').length,
    failed: posts.filter(p => p.status === 'FAILED').length,
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <GenerationLoader status="generating" message="Carregando posts..." size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Generation Status Banner */}
      {actionStatus.status !== 'idle' && actionStatus.type && (
        <div className={`fixed top-20 right-6 z-50 bg-[var(--bg-secondary)] border rounded-xl p-4 shadow-2xl ${
          actionStatus.status === 'generating' ? 'border-violet-500/30' :
          actionStatus.status === 'success' ? 'border-emerald-500/30' :
          'border-red-500/30'
        }`}>
          <GenerationLoader
            status={actionStatus.status}
            message={actionStatus.message}
            size="sm"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Posts</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {counts.all} posts • {counts.scheduled} agendados • {counts.published} publicados
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Post Buttons */}
            <Button
              onClick={() => handleQuickPost('CTA')}
              disabled={actionStatus.status === 'generating'}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              Postar CTA
            </Button>
            <Button
              onClick={() => handleQuickPost('ENQUETE')}
              disabled={actionStatus.status === 'generating'}
              size="sm"
              className="bg-violet-500 hover:bg-violet-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Postar Enquete
            </Button>

            {/* View Toggle */}
            <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg p-1 ml-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-violet-500/20 text-violet-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'kanban' ? 'bg-violet-500/20 text-violet-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg p-1">
            {[
              { id: 'all', label: `Todos (${counts.all})` },
              { id: 'SCHEDULED', label: `Agendados (${counts.scheduled})` },
              { id: 'PUBLISHED', label: `Publicados (${counts.published})` },
              { id: 'FAILED', label: `Falhas (${counts.failed})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === f.id ? 'bg-violet-500/20 text-violet-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-violet-400 font-medium">
                {selectedIds.size} selecionado(s)
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearSelected}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Channel selector banner if no channels */}
        {channels.length === 0 && (
          <Card padding="lg" className="mb-6 border-amber-500/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-300 mb-1">Nenhum canal configurado</h3>
                <p className="text-xs text-amber-400/80 mb-3">
                  Voce precisa criar pelo menos um canal para postar, gerar previas e gerenciar posts.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = '/dashboard/settings'}
                >
                  Criar canal agora
                </Button>
              </div>
            </div>
          </Card>
        )}

        {filteredPosts.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              illustration="posts"
              title="Nenhum post encontrado"
              description={channels.length > 0 ? "Faca upload de imagens para gerar posts automaticamente" : "Crie um canal primeiro"}
            />
          </Card>
        ) : viewMode === 'list' ? (
          <ListView
            posts={filteredPosts}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onSelect={setSelectedPost}
            onPublish={handlePublish}
            onCancel={handleCancel}
            onDelete={handleDelete}
            apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
          />
        ) : (
          <KanbanView
            posts={filteredPosts}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onSelect={setSelectedPost}
            onPublish={handlePublish}
            onCancel={handleCancel}
            apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onRefresh={loadPosts}
          onDelete={() => { handleDelete(selectedPost.id); setSelectedPost(null); }}
          onRegenerate={handleRegenerate}
          regenerating={actionStatus.type === 'regenerate' && actionStatus.status === 'generating'}
          apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
        />
      )}
    </div>
  );
}

function ListView({
  posts,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDragStart,
  onDragOver,
  onDrop,
  onSelect,
  onPublish,
  onCancel,
  onDelete,
  apiUrl,
}: any) {
  const allSelected = selectedIds.size === posts.length && posts.length > 0;

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-default)] text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <div className="col-span-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="w-3.5 h-3.5 rounded border-[var(--border-default)] bg-[var(--bg-tertiary)] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
          />
          <span>Ordem</span>
        </div>
        <div className="col-span-2">Midia</div>
        <div className="col-span-3">Preview</div>
        <div className="col-span-2">Horario</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2 text-right">Acoes</div>
      </div>

      {/* Table Body */}
      <div>
        {posts.map((post: any, index: number) => {
          const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.SCHEDULED;
          const isSelected = selectedIds.has(post.id);

          return (
            <div
              key={post.id}
              draggable
              onDragStart={() => onDragStart(post.id)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(post.id)}
              className={`grid grid-cols-12 gap-3 px-4 py-3 border-b border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-move group ${
                isSelected ? 'bg-violet-500/5' : ''
              }`}
            >
              {/* Order + Checkbox + Drag Handle */}
              <div className="col-span-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(post.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3.5 h-3.5 rounded border-[var(--border-default)] bg-[var(--bg-tertiary)] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                />
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
                    <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
                    <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
                  </svg>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">#{index + 1}</span>
                </div>
              </div>

              {/* Media Thumbnail */}
              <div className="col-span-2">
                {post.mediaItem?.id && (
                  <div
                    onClick={() => onSelect(post)}
                    className="w-16 h-12 rounded-lg bg-[var(--bg-tertiary)] overflow-hidden cursor-pointer hover:ring-2 hover:ring-violet-500/30 transition-all"
                  >
                    <img
                      src={`${apiUrl}/api/media/${post.mediaItem.id}/image`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              {/* Preview Text */}
              <div
                className="col-span-3 cursor-pointer"
                onClick={() => onSelect(post)}
              >
                <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                  {post.preview?.headline || 'Sem headline'}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {post.preview?.body?.replace(/\n/g, ' / ')}
                </p>
              </div>

              {/* Schedule Time */}
              <div className="col-span-2">
                {post.scheduledFor ? (
                  <div>
                    <p className="text-xs text-[var(--text-primary)] font-medium">
                      {format(new Date(post.scheduledFor), "dd MMM, HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {isToday(new Date(post.scheduledFor)) && 'Hoje'}
                      {isTomorrow(new Date(post.scheduledFor)) && 'Amanha'}
                      {isYesterday(new Date(post.scheduledFor)) && 'Ontem'}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </div>

              {/* Status */}
              <div className="col-span-2">
                <StatusBadge status={post.status} />
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-center justify-end gap-1">
                {post.status === 'SCHEDULED' && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onPublish(post.id); }}
                      className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
                      title="Publicar agora"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.651z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onCancel(post.id); }}
                      className="p-1.5 rounded-lg hover:bg-amber-500/10 text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                      title="Cancelar agendamento"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  title="Excluir"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function KanbanView({
  posts,
  selectedIds,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onSelect,
  onPublish,
  onCancel,
  apiUrl,
}: any) {
  const columns = ['SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map(col => {
        const config = STATUS_CONFIG[col];
        const colPosts = posts.filter((p: any) => p.status === col);
        return (
          <div key={col} className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl overflow-hidden">
            <div className={`flex items-center justify-between px-3 py-2.5 ${config.bg} ${config.border} border-b`}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full bg-${config.color}-400`} />
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">{config.label}</h3>
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)]">{colPosts.length}</span>
            </div>

            <div className="p-2 space-y-2 min-h-[200px]">
              {colPosts.map((post: any) => (
                <KanbanCard
                  key={post.id}
                  post={post}
                  isSelected={selectedIds.has(post.id)}
                  onToggleSelect={onToggleSelect}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onSelect={onSelect}
                  onPublish={onPublish}
                  onCancel={onCancel}
                  apiUrl={apiUrl}
                />
              ))}
              {colPosts.length === 0 && (
                <p className="text-[10px] text-[var(--text-muted)] text-center py-4">Nenhum post</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  post,
  isSelected,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onSelect,
  onPublish,
  onCancel,
  apiUrl,
}: any) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(post.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(post.id)}
      className={`bg-[var(--bg-tertiary)] border ${isSelected ? 'border-violet-500/50' : 'border-[var(--border-default)]'} rounded-xl p-3 cursor-move group hover:border-violet-500/30 transition-colors`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(post.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 mt-1 rounded border-[var(--border-default)] bg-[var(--bg-secondary)] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
        />
        {post.mediaItem?.id && (
          <div onClick={() => onSelect(post)} className="w-12 h-12 rounded-lg bg-[var(--bg-secondary)] overflow-hidden flex-shrink-0">
            <img
              src={`${apiUrl}/api/media/${post.mediaItem.id}/image`}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text-primary)] font-medium line-clamp-2 cursor-pointer" onClick={() => onSelect(post)}>
            {post.preview?.headline || 'Sem headline'}
          </p>
          {post.scheduledFor && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {format(new Date(post.scheduledFor), "dd MMM, HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>

      {post.status === 'SCHEDULED' && (
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPublish(post.id)}
            className="flex-1 px-2 py-1 text-[10px] rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
          >
            Publicar
          </button>
          <button
            onClick={() => onCancel(post.id)}
            className="flex-1 px-2 py-1 text-[10px] rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function PostDetailModal({
  post,
  onClose,
  onRefresh,
  onDelete,
  onRegenerate,
  regenerating,
  apiUrl,
}: {
  post: any;
  onClose: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  onRegenerate: (id: string) => void;
  regenerating: boolean;
  apiUrl: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({
    headline: post.preview?.headline || '',
    body: post.preview?.body || '',
    preCta: post.preview?.preCta || '',
    cta: post.preview?.cta || '',
    buttonText: post.preview?.buttonText || '',
    buttonUrl: post.preview?.buttonUrl || '',
  });

  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.SCHEDULED;

  const handleSaveEdit = async () => {
    try {
      await previewApi.update(post.preview.id, editData);
      toast.success('Preview atualizado!');
      setEditing(false);
      onRefresh();
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-secondary)] z-10 flex items-center justify-between p-5 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Detalhes do Post</h2>
            <StatusBadge status={post.status} />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
            <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
          {/* Left: Telegram Preview */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Como vai ficar no Telegram
            </h3>
            <div className="max-w-md mx-auto bg-[#0e1621] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
              {/* Telegram Header */}
              <div className="bg-[#212d3b] px-4 py-3 flex items-center space-x-3 border-b border-gray-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  P
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">Previass Bot</div>
                  <div className="text-gray-400 text-xs">online</div>
                </div>
              </div>

              {/* Message */}
              <div className="p-4">
                <div className="bg-[#182533] rounded-2xl overflow-hidden">
                  {/* Image */}
                  {post.mediaItem?.id && (
                    <img
                      src={`${apiUrl}/api/media/${post.mediaItem.id}/image`}
                      alt=""
                      className="w-full h-auto"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}

                  {/* Content */}
                  <div className="p-4">
                    {editing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editData.headline}
                          onChange={(e) => setEditData({ ...editData, headline: e.target.value })}
                          placeholder="Headline"
                          className="w-full bg-[#0e1621] border border-[var(--border-default)] rounded px-2 py-1.5 text-white text-sm font-bold"
                        />
                        <textarea
                          value={editData.body}
                          onChange={(e) => setEditData({ ...editData, body: e.target.value })}
                          rows={3}
                          placeholder="Body"
                          className="w-full bg-[#0e1621] border border-[var(--border-default)] rounded px-2 py-1.5 text-gray-300 text-sm"
                        />
                        <input
                          type="text"
                          value={editData.preCta}
                          onChange={(e) => setEditData({ ...editData, preCta: e.target.value })}
                          placeholder="Pre-CTA"
                          className="w-full bg-[#0e1621] border border-[var(--border-default)] rounded px-2 py-1.5 text-gray-400 text-sm"
                        />
                        <textarea
                          value={editData.cta}
                          onChange={(e) => setEditData({ ...editData, cta: e.target.value })}
                          rows={3}
                          placeholder="CTA (um por linha)"
                          className="w-full bg-[#0e1621] border border-[var(--border-default)] rounded px-2 py-1.5 text-white text-sm font-medium"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-white font-bold text-lg leading-tight mb-3">
                          {post.preview?.headline || 'Sem headline'}
                        </div>
                        {post.preview?.body && (
                          <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed mb-3">
                            {post.preview.body}
                          </div>
                        )}
                        {post.preview?.preCta && (
                          <div className="text-gray-400 text-sm whitespace-pre-line leading-relaxed mb-3">
                            {post.preview.preCta}
                          </div>
                        )}
                        {post.preview?.cta && (
                          <div className="text-white text-sm font-medium whitespace-pre-line leading-tight">
                            {post.preview.cta}
                          </div>
                        )}
                        {post.preview?.buttonUrl && (
                          <div className="pt-2">
                            <a
                              href={post.preview.buttonUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full text-center bg-[#2ea6ff] hover:bg-[#1e96ef] text-white font-medium py-3 rounded-lg transition-colors"
                            >
                              {post.preview.buttonText || 'VER AGORA'}
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="text-gray-500 text-xs mt-2 text-right">
                  {post.scheduledFor && format(new Date(post.scheduledFor), "dd/MM/yyyy HH:mm")}
                  {post.publishedAt && ` • Publicado: ${format(new Date(post.publishedAt), "dd/MM/yyyy HH:mm")}`}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions and Info */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Acoes</h3>

            {/* Status info */}
            {regenerating ? (
              <div className="mb-4 p-4 bg-[var(--bg-tertiary)] border border-violet-500/30 rounded-xl">
                <GenerationLoader status="generating" message="Regenerando com IA..." size="md" />
              </div>
            ) : (
              <div className="space-y-2">
                {!editing ? (
                  <>
                    <Button
                      onClick={() => setEditing(true)}
                      className="w-full"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar Preview
                    </Button>

                    <Button
                      onClick={() => onRegenerate(post.id)}
                      disabled={regenerating}
                      className="w-full bg-violet-500 hover:bg-violet-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerar com IA
                    </Button>

                    {post.status === 'SCHEDULED' && (
                      <Button
                        onClick={async () => {
                          try {
                            await postApi.publishNow(post.id);
                            toast.success('Publicando agora!');
                            onRefresh();
                            onClose();
                          } catch (error) {
                            toast.error('Erro ao publicar');
                          }
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.651z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Publicar Agora
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      onClick={onDelete}
                      className="w-full"
                    >
<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir Post
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleSaveEdit} className="w-full bg-emerald-500 hover:bg-emerald-600">
                      Salvar Alteracoes
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(false)} className="w-full">
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Info */}
            <div className="mt-6 space-y-3">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Agendado</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {post.scheduledFor ? format(new Date(post.scheduledFor), "dd/MM/yyyy 'as' HH:mm") : 'Nao agendado'}
                </p>
              </div>
              {post.channel && (
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Canal</p>
                  <p className="text-sm text-[var(--text-primary)]">{post.channel.name}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">ID</p>
                <p className="text-xs text-[var(--text-muted)] font-mono">{post.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
