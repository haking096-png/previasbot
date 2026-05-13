'use client';

import { useEffect, useState } from 'react';
import { previewApi } from '@/lib/api';
import { Preview, MediaItem } from '@/types';
import toast from 'react-hot-toast';
import TelegramPreview from '@/components/TelegramPreview';

interface PreviewWithMedia extends Preview {
  mediaItem: MediaItem;
}

export default function PreviewsPage() {
  const [previews, setPreviews] = useState<PreviewWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<PreviewWithMedia | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Preview>>({});

  useEffect(() => {
    loadPreviews();
  }, []);

  const loadPreviews = async () => {
    try {
      const response = await previewApi.getAll();
      setPreviews(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar prévias');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await previewApi.approve(id);
      toast.success('Prévia aprovada!');
      loadPreviews();
    } catch (error: any) {
      toast.error('Erro ao aprovar prévia');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await previewApi.reject(id);
      toast.success('Prévia rejeitada!');
      loadPreviews();
    } catch (error: any) {
      toast.error('Erro ao rejeitar prévia');
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      await previewApi.regenerate(id);
      toast.success('Regeneração iniciada!');
      setTimeout(loadPreviews, 3000);
    } catch (error: any) {
      toast.error('Erro ao regenerar prévia');
    }
  };

  const handleEdit = (preview: PreviewWithMedia) => {
    setSelectedPreview(preview);
    setEditData({
      headline: preview.headline,
      body: preview.body,
      preCta: preview.preCta,
      cta: preview.cta,
      buttonText: preview.buttonText,
      buttonUrl: preview.buttonUrl,
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPreview) return;

    try {
      await previewApi.update(selectedPreview.id, editData);
      toast.success('Prévia atualizada!');
      setEditMode(false);
      setSelectedPreview(null);
      loadPreviews();
    } catch (error: any) {
      toast.error('Erro ao atualizar prévia');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-bg">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent-blue border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Gerenciar Prévias</h1>
        <p className="text-gray-400 text-lg">
          Total: {previews.length} prévias | Pendentes: {previews.filter(p => !p.approved).length}
        </p>
      </div>

      {previews.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-xl font-medium text-white mb-2">Nenhuma prévia</h3>
          <p className="text-gray-400">
            As prévias serão geradas automaticamente após o upload de imagens
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {previews.map((preview) => (
            <div key={preview.id} className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
              <div className="p-6">
                {/* Header Info */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {preview.mediaItem?.originalName || 'Sem nome'}
                    </h3>
                    <p className="text-sm text-gray-400">Ordem: {preview.mediaItem?.order || 0}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {preview.approved ? (
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                        ✓ Aprovada
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                        ⏳ Pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Telegram Preview */}
                <div className="mb-6">
                  <TelegramPreview
                    imageUrl={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${preview.mediaItem?.filePath || ''}`}
                    headline={preview.headline}
                    body={preview.body}
                    preCta={preview.preCta}
                    cta={preview.cta}
                    buttonText={preview.buttonText}
                    buttonUrl={preview.buttonUrl}
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {!preview.approved && (
                    <>
                      <button
                        onClick={() => handleApprove(preview.id)}
                        className="px-4 py-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl font-medium hover:bg-green-500/20 transition-all duration-200"
                      >
                        ✓ Aprovar
                      </button>
                      <button
                        onClick={() => handleReject(preview.id)}
                        className="px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition-all duration-200"
                      >
                        ✗ Rejeitar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleEdit(preview)}
                    className="px-4 py-3 bg-dark-bg border border-accent-blue text-accent-blue rounded-xl font-medium hover:bg-accent-blue/10 transition-all duration-200"
                  >
                    ✎ Editar
                  </button>
                  <button
                    onClick={() => handleRegenerate(preview.id)}
                    className="px-4 py-3 bg-dark-bg border border-accent-cyan text-accent-cyan rounded-xl font-medium hover:bg-accent-cyan/10 transition-all duration-200"
                  >
                    ↻ Regenerar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editMode && selectedPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setEditMode(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-6">Editar Prévia</h3>
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Texto do Botão</label>
                <input
                  type="text"
                  value={editData.buttonText || ''}
                  onChange={(e) => setEditData({ ...editData, buttonText: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL do Botão</label>
                <input
                  type="text"
                  value={editData.buttonUrl || ''}
                  onChange={(e) => setEditData({ ...editData, buttonUrl: e.target.value })}
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

      {/* View Modal */}
      {selectedPreview && !editMode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPreview(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setSelectedPreview(null)}
                className="bg-dark-card border border-dark-border text-white px-4 py-2 rounded-xl hover:bg-dark-border transition-colors"
              >
                Fechar
              </button>
            </div>
            <TelegramPreview
              imageUrl={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${selectedPreview.mediaItem?.filePath || ''}`}
              headline={selectedPreview.headline}
              body={selectedPreview.body}
              preCta={selectedPreview.preCta}
              cta={selectedPreview.cta}
              buttonText={selectedPreview.buttonText}
              buttonUrl={selectedPreview.buttonUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}
