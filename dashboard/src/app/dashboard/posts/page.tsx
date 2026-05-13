'use client';

import { useEffect, useState } from 'react';
import { postApi, previewApi } from '@/lib/api';
import { Post } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import TelegramPreview from '@/components/TelegramPreview';

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await postApi.getAll();
      setPosts(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar publicações');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta publicação?')) return;

    try {
      await postApi.cancel(id);
      toast.success('Publicação cancelada!');
      loadPosts();
    } catch (error: any) {
      toast.error('Erro ao cancelar publicação');
    }
  };

  const handlePublishNow = async (id: string) => {
    if (!confirm('Deseja publicar esta prévia agora?')) return;

    try {
      await postApi.publishNow(id);
      toast.success('Publicação iniciada!');
      setTimeout(loadPosts, 2000);
    } catch (error: any) {
      toast.error('Erro ao publicar');
    }
  };

  const handleEdit = (post: Post) => {
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
      toast.success('Publicação atualizada!');
      setEditMode(false);
      setSelectedPost(null);
      loadPosts();
    } catch (error: any) {
      toast.error('Erro ao atualizar publicação');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-bg">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent-blue border-t-transparent"></div>
      </div>
    );
  }

  const upcomingPosts = posts.filter(p => p.status === 'SCHEDULED' || p.status === 'PUBLISHING');
  const publishedPosts = posts.filter(p => p.status === 'PUBLISHED');

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Publicações</h1>
        <p className="text-gray-400 text-lg">
          Próximas: {upcomingPosts.length} | Publicadas: {publishedPosts.length}
        </p>
      </div>

      {/* Próximas Publicações */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-cyan border-t-transparent"></div>
          <h2 className="text-2xl font-bold text-white">Próximas Publicações</h2>
          <span className="px-3 py-1 bg-accent-cyan/10 text-accent-cyan rounded-full text-sm font-semibold">
            {upcomingPosts.length}
          </span>
        </div>

        {upcomingPosts.length === 0 ? (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">Nenhuma publicação agendada</h3>
            <p className="text-gray-400">
              As publicações serão agendadas automaticamente após o upload de imagens
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {upcomingPosts.map((post) => (
              <div key={post.id} className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-accent-cyan transition-all duration-300">
                {/* Image Preview */}
                <div className="relative h-64 bg-dark-bg">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${post.mediaItem.filePath}`}
                    alt={post.mediaItem.originalName}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedPost(post)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem Imagem%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-cyan/20 backdrop-blur-sm border border-accent-cyan/30 rounded-full">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-accent-cyan border-t-transparent"></div>
                      <span className="text-xs font-semibold text-accent-cyan">Agendada</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white line-clamp-2">
                    {post.preview.headline}
                  </h3>

                  {post.scheduledFor && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <svg className="w-5 h-5 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{format(new Date(post.scheduledFor), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}

                  {post.error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <p className="text-sm text-red-400">Erro: {post.error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleEdit(post)}
                      className="flex-1 bg-dark-bg border border-accent-blue text-accent-blue px-4 py-2 rounded-xl font-medium hover:bg-accent-blue/10 transition-all duration-200"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handlePublishNow(post.id)}
                      className="flex-1 bg-gradient-to-r from-accent-blue to-accent-cyan text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg hover:shadow-accent-blue/50 transition-all duration-200"
                    >
                      Postar Agora
                    </button>
                    <button
                      onClick={() => handleCancel(post.id)}
                      className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl font-medium hover:bg-red-500/20 transition-all duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publicações Realizadas */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-white">Publicações Realizadas</h2>
          <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-semibold">
            {publishedPosts.length}
          </span>
        </div>

        {publishedPosts.length === 0 ? (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">Nenhuma publicação realizada</h3>
            <p className="text-gray-400">
              As publicações aparecerão aqui após serem enviadas ao Telegram
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {publishedPosts.map((post) => (
              <div key={post.id} className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-green-500 transition-all duration-300">
                {/* Image Preview */}
                <div className="relative h-64 bg-dark-bg">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${post.mediaItem.filePath}`}
                    alt={post.mediaItem.originalName}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedPost(post)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem Imagem%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-full">
                      <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-semibold text-green-400">Publicada</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white line-clamp-2">
                    {post.preview.headline}
                  </h3>

                  {post.publishedAt && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{format(new Date(post.publishedAt), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedPost(post)}
                    className="w-full bg-dark-bg border border-accent-blue text-accent-blue px-4 py-2 rounded-xl font-medium hover:bg-accent-blue/10 transition-all duration-200"
                  >
                    Ver Prévia
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editMode && selectedPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setEditMode(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-6">Editar Publicação</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Headline</label>
                <input
                  type="text"
                  value={editData.headline || ''}
                  onChange={(e) => setEditData({ ...editData, headline: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Corpo</label>
                <textarea
                  value={editData.body || ''}
                  onChange={(e) => setEditData({ ...editData, body: e.target.value })}
                  rows={4}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Pré-CTA</label>
                <input
                  type="text"
                  value={editData.preCta || ''}
                  onChange={(e) => setEditData({ ...editData, preCta: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">CTA</label>
                <textarea
                  value={editData.cta || ''}
                  onChange={(e) => setEditData({ ...editData, cta: e.target.value })}
                  rows={3}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-gradient-to-r from-accent-blue to-accent-cyan text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-accent-blue/50 transition-all duration-300"
              >
                Salvar
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex-1 bg-dark-bg border border-dark-border text-white px-6 py-3 rounded-xl font-semibold hover:bg-dark-border transition-all duration-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedPost && !editMode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setSelectedPost(null)}
                className="bg-dark-card border border-dark-border text-white px-4 py-2 rounded-xl hover:bg-dark-border transition-colors"
              >
                Fechar
              </button>
            </div>
            <TelegramPreview
              imageUrl={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${selectedPost.mediaItem.filePath}`}
              headline={selectedPost.preview.headline}
              body={selectedPost.preview.body}
              preCta={selectedPost.preview.preCta}
              cta={selectedPost.preview.cta}
              buttonText={selectedPost.preview.buttonText}
              buttonUrl={selectedPost.preview.buttonUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}
