'use client';

import { useEffect, useState } from 'react';
import { previewApi, channelApi, postApi } from '@/lib/api';
import { Preview, MediaItem, Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import TelegramPreview from '@/components/TelegramPreview';

interface PreviewWithMedia extends Preview {
  mediaItem: MediaItem;
  posts?: Array<{ id: string; channelId?: string; channel?: Channel; status: string; scheduledFor?: string }>;
}

export default function PreviewsPage() {
  const [previews, setPreviews] = useState<PreviewWithMedia[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<PreviewWithMedia | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Preview>>({});
  const [scheduleModal, setScheduleModal] = useState<PreviewWithMedia | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleChannelId, setScheduleChannelId] = useState<string>('');
  const { selectedChannelId } = useChannelStore();

  useEffect(() => {
    loadPreviews();
    loadChannels();
  }, [selectedChannelId]);

  const loadPreviews = async () => {
    try {
      const response = await previewApi.getAll(selectedChannelId || undefined);
      setPreviews(response.data);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.warn('Failed to load previews, retrying...');
        setTimeout(loadPreviews, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await channelApi.getAll();
      setChannels(response.data.filter((c: Channel) => c.enabled));
    } catch (error) {
      console.warn('Failed to load channels');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await previewApi.approve(id);
      toast.success('Previa aprovada!');
      loadPreviews();
    } catch (error: any) {
      toast.error('Erro ao aprovar previa');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await previewApi.reject(id);
      toast.success('Previa rejeitada!');
      loadPreviews();
    } catch (error: any) {
      toast.error('Erro ao rejeitar previa');
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      await previewApi.regenerate(id);
      toast.success('Regeneracao iniciada!');
      setTimeout(loadPreviews, 3000);
    } catch (error: any) {
      toast.error('Erro ao regenerar previa');
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
      toast.success('Previa atualizada!');
      setEditMode(false);
      setSelectedPreview(null);
      loadPreviews();
    } catch (error: any) {
      toast.error('Erro ao atualizar previa');
    }
  };

  const handleOpenSchedule = (preview: PreviewWithMedia) => {
    setScheduleModal(preview);
    setScheduleChannelId(selectedChannelId || '');
    setScheduleDate('');
  };

  const handleSchedulePost = async () => {
    if (!scheduleModal || !scheduleDate || !scheduleChannelId) {
      toast.error('Preencha a data e selecione um canal');
      return;
    }

    try {
      await postApi.schedule(
        scheduleModal.mediaItem.id,
        scheduleModal.id,
        scheduleDate,
        scheduleChannelId
      );
      const channelName = channels.find(c => c.id === scheduleChannelId)?.name || '';
      toast.success(`Agendado para ${channelName}!`);
      setScheduleModal(null);
      loadPreviews();
    } catch (error: any) {
      toast.error('Erro ao agendar publicacao');
    }
  };

  const getPostChannelName = (preview: PreviewWithMedia): string | null => {
    if (preview.posts && preview.posts.length > 0) {
      const lastPost = preview.posts[preview.posts.length - 1];
      if (lastPost.channel) return lastPost.channel.name;
      const ch = channels.find(c => c.id === lastPost.channelId);
      return ch?.name || null;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0e1a]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#3b82f6] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Gerenciar Previas</h1>
        <p className="text-sm text-[#64748b] mt-1">
          Total: {previews.length} previas | Pendentes: {previews.filter(p => !p.approved).length}
        </p>
      </div>

      {previews.length === 0 ? (
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-8 text-center">
          <h3 className="text-sm font-medium text-[#f1f5f9] mb-1">Nenhuma previa</h3>
          <p className="text-xs text-[#64748b]">As previas serao geradas automaticamente apos o upload de imagens</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {previews.map((preview) => {
            const channelName = getPostChannelName(preview);
            return (
              <div key={preview.id} className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden hover:border-[#334155] transition-colors">
                <div className="p-5">
                  {/* Header Info */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-[#f1f5f9]">
                        {preview.mediaItem?.originalName || 'Sem nome'}
                      </h3>
                      <p className="text-xs text-[#64748b]">Ordem: {preview.mediaItem?.order || 0}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {channelName && (
                        <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-blue-500/10 text-blue-400">
                          {channelName}
                        </span>
                      )}
                      {preview.approved ? (
                        <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-emerald-500/10 text-emerald-400">
                          Aprovada
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-amber-500/10 text-amber-400">
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Telegram Preview */}
                  <div className="mb-4">
                    <TelegramPreview
                      imageUrl={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/media/${preview.mediaItem?.id || ''}/image`}
                      headline={preview.headline}
                      body={preview.body}
                      preCta={preview.preCta}
                      cta={preview.cta}
                      buttonText={preview.buttonText}
                      buttonUrl={preview.buttonUrl}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {!preview.approved && (
                      <>
                        <button
                          onClick={() => handleApprove(preview.id)}
                          className="px-3 py-2 text-xs font-medium text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/5 transition-colors"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleReject(preview.id)}
                          className="px-3 py-2 text-xs font-medium text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/5 transition-colors"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEdit(preview)}
                      className="px-3 py-2 text-xs font-medium text-[#64748b] border border-[#1e293b] rounded-lg hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleRegenerate(preview.id)}
                      className="px-3 py-2 text-xs font-medium text-[#64748b] border border-[#1e293b] rounded-lg hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                    >
                      Regenerar
                    </button>
                    {preview.approved && (
                      <button
                        onClick={() => handleOpenSchedule(preview)}
                        className="col-span-2 px-3 py-2 text-xs font-medium text-white bg-[#3b82f6] rounded-lg hover:bg-[#2563eb] transition-colors"
                      >
                        Agendar para Canal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editMode && selectedPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setEditMode(false)}>
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg max-w-2xl w-full p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#f1f5f9] mb-4">Editar Previa</h3>
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
                <textarea value={editData.cta || ''} onChange={(e) => setEditData({ ...editData, cta: e.target.value })} rows={3} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">URL do Botao</label>
                <input type="text" value={editData.buttonUrl || ''} onChange={(e) => setEditData({ ...editData, buttonUrl: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSaveEdit} className="flex-1 px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors">Salvar</button>
              <button onClick={() => setEditMode(false)} className="flex-1 px-4 py-2.5 border border-[#1e293b] text-[#64748b] rounded-lg text-sm font-medium hover:border-[#334155] transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setScheduleModal(null)}>
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#f1f5f9] mb-1">Agendar Publicacao</h3>
            <p className="text-xs text-[#64748b] mb-4">Escolha o canal e a data/hora para publicar</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Canal de Destino</label>
                <div className="space-y-1.5">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setScheduleChannelId(channel.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${
                        scheduleChannelId === channel.id
                          ? 'border-[#3b82f6] bg-blue-500/5'
                          : 'border-[#1e293b] hover:border-[#334155]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                        scheduleChannelId === channel.id
                          ? 'bg-[#3b82f6] text-white'
                          : 'bg-[#1e293b] text-[#64748b]'
                      }`}>
                        {channel.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm font-medium ${scheduleChannelId === channel.id ? 'text-[#f1f5f9]' : 'text-[#64748b]'}`}>
                        {channel.name}
                      </span>
                      {scheduleChannelId === channel.id && (
                        <svg className="w-4 h-4 text-[#3b82f6] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Data e Hora</label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={handleSchedulePost} className="flex-1 px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors">Agendar</button>
              <button onClick={() => setScheduleModal(null)} className="flex-1 px-4 py-2.5 border border-[#1e293b] text-[#64748b] rounded-lg text-sm font-medium hover:border-[#334155] transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
