'use client';

import { useEffect, useState } from 'react';
import { postApi, previewApi } from '@/lib/api';
import { Post, Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import TelegramPreview from '@/components/TelegramPreview';

interface PostWithChannel extends Post {
  channel?: Channel;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<PostWithChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PostWithChannel | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const { selectedChannelId } = useChannelStore();

  useEffect(() => {
    loadPosts();
  }, [selectedChannelId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await postApi.getAll(selectedChannelId || undefined);
      setPosts(response.data);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.warn('Failed to load posts, retrying...');
        setTimeout(loadPosts, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta publicacao?')) return;

    try {
      await postApi.cancel(id);
      toast.success('Publicacao cancelada!');
      loadPosts();
    } catch (error: any) {
      toast.error('Erro ao cancelar publicacao');
    }
  };

  const handlePublishNow = async (id: string) => {
    if (!confirm('Deseja publicar esta previa agora?')) return;

    try {
      await postApi.publishNow(id);
      toast.success('Publicacao iniciada!');
      setTimeout(loadPosts, 2000);
    } catch (error: any) {
      toast.error('Erro ao publicar');
    }
  };

  const handleEdit = (post: PostWithChannel) => {
    setSelectedPost(post);
    setEditData({
      headline: post.preview.headline,
      body: post.preview.body,
      preCta: post.preview.preCta,
      cta: post.preview.cta,
      buttonText: post.preview.buttonText,
      buttonUrl: post.preview.buttonUrl,
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPost) return;

    try {
      await previewApi.update(selectedPost.preview.id, editData);
      toast.success('Publicacao atualizada!');
      setEditMode(false);
      setSelectedPost(null);
      loadPosts();
    } catch (error: any) {
      toast.error('Erro ao atualizar publicacao');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0e1a]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#3b82f6] border-t-transparent"></div>
      </div>
    );
  }

  const upcomingPosts = posts.filter(p => p.status === 'SCHEDULED' || p.status === 'PUBLISHING');
  const publishedPosts = posts.filter(p => p.status === 'PUBLISHED');
  const failedPosts = posts.filter(p => p.status === 'FAILED');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Publicacoes</h1>
        <p className="text-sm text-[#64748b] mt-1">
          Agendadas: {upcomingPosts.length} | Publicadas: {publishedPosts.length}
          {failedPosts.length > 0 && ` | Falhas: ${failedPosts.length}`}
        </p>
      </div>

      {/* Proximas Publicacoes */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-[#f1f5f9]">Proximas Publicacoes</h2>
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-xs font-medium">
            {upcomingPosts.length}
          </span>
        </div>

        {upcomingPosts.length === 0 ? (
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-8 text-center">
            <h3 className="text-sm font-medium text-[#f1f5f9] mb-1">Nenhuma publicacao agendada</h3>
            <p className="text-xs text-[#64748b]">As publicacoes serao agendadas automaticamente apos o upload de imagens</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingPosts.map((post) => (
              <div key={post.id} className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden hover:border-[#334155] transition-colors">
                <div className="relative h-44 bg-[#0a0e1a] overflow-hidden">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/media/${post.mediaItem.id}/image`}
                    alt={post.mediaItem.originalName}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedPost(post)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23111827" width="400" height="300"/%3E%3Ctext fill="%2364748b" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem Imagem%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-blue-500/10 text-blue-400">Agendada</span>
                  </div>
                  {post.channel && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-[#1e293b] text-[#64748b]">{post.channel.name}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-medium text-[#f1f5f9] line-clamp-2">{post.preview.headline}</h3>

                  {post.scheduledFor && (
                    <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{format(new Date(post.scheduledFor), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleEdit(post)}
                      className="flex-1 text-xs font-medium text-[#64748b] py-2 border border-[#1e293b] rounded-lg hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handlePublishNow(post.id)}
                      className="flex-1 text-xs font-medium text-white py-2 bg-[#3b82f6] rounded-lg hover:bg-[#2563eb] transition-colors"
                    >
                      Postar Agora
                    </button>
                    <button
                      onClick={() => handleCancel(post.id)}
                      className="text-xs font-medium text-[#64748b] py-2 px-3 border border-[#1e293b] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
                    >
                      X
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publicacoes Realizadas */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-[#f1f5f9]">Publicacoes Realizadas</h2>
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-xs font-medium">
            {publishedPosts.length}
          </span>
        </div>

        {publishedPosts.length === 0 ? (
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-8 text-center">
            <h3 className="text-sm font-medium text-[#f1f5f9] mb-1">Nenhuma publicacao realizada</h3>
            <p className="text-xs text-[#64748b]">As publicacoes aparecerao aqui apos serem enviadas ao Telegram</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {publishedPosts.map((post) => (
              <div key={post.id} className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden hover:border-[#334155] transition-colors">
                <div className="relative h-44 bg-[#0a0e1a] overflow-hidden">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/media/${post.mediaItem.id}/image`}
                    alt={post.mediaItem.originalName}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedPost(post)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23111827" width="400" height="300"/%3E%3Ctext fill="%2364748b" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem Imagem%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-emerald-500/10 text-emerald-400">Publicada</span>
                  </div>
                  {post.channel && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-[#1e293b] text-[#64748b]">{post.channel.name}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-medium text-[#f1f5f9] line-clamp-2">{post.preview.headline}</h3>
                  {post.publishedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{format(new Date(post.publishedAt), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="w-full text-xs font-medium text-[#64748b] py-2 border border-[#1e293b] rounded-lg hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                  >
                    Ver Previa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editMode && selectedPost && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setEditMode(false)}>
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg max-w-2xl w-full p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#f1f5f9] mb-4">Editar Publicacao</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Headline</label>
                <input type="text" value={editData.headline || ''} onChange={(e) => setEditData({ ...editData, headline: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Corpo</label>
                <textarea value={editData.body || ''} onChange={(e) => setEditData({ ...editData, body: e.target.value })} rows={4} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Pre-CTA</label>
                <input type="text" value={editData.preCta || ''} onChange={(e) => setEditData({ ...editData, preCta: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">CTA</label>
                <input type="text" value={editData.cta || ''} onChange={(e) => setEditData({ ...editData, cta: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Texto do Botao</label>
                  <input type="text" value={editData.buttonText || ''} onChange={(e) => setEditData({ ...editData, buttonText: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">URL do Botao</label>
                  <input type="text" value={editData.buttonUrl || ''} onChange={(e) => setEditData({ ...editData, buttonUrl: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSaveEdit} className="flex-1 px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors">Salvar</button>
              <button onClick={() => setEditMode(false)} className="flex-1 px-4 py-2.5 border border-[#1e293b] text-[#64748b] rounded-lg text-sm font-medium hover:border-[#334155] transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedPost && !editMode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPost(null)}>
          <div className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <TelegramPreview
              headline={selectedPost.preview.headline}
              body={selectedPost.preview.body}
              preCta={selectedPost.preview.preCta}
              cta={selectedPost.preview.cta}
              buttonText={selectedPost.preview.buttonText}
              buttonUrl={selectedPost.preview.buttonUrl}
              imageUrl={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/media/${selectedPost.mediaItem.id}/image`}
            />
            <button
              onClick={() => setSelectedPost(null)}
              className="w-full mt-3 px-4 py-2.5 border border-[#1e293b] text-[#64748b] rounded-lg text-sm font-medium hover:border-[#334155] transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
