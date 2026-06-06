'use client';

import { useEffect, useState } from 'react';
import { mediaApi, channelApi } from '@/lib/api';
import { MediaItem, Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const { selectedChannelId } = useChannelStore();

  useEffect(() => {
    loadMedia();
    loadChannels();
  }, [selectedChannelId]);

  const loadMedia = async () => {
    try {
      const response = await mediaApi.getAll(selectedChannelId || undefined);
      setMedia(response.data);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.warn('Failed to load media, retrying...');
        setTimeout(loadMedia, 3000);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Selecione pelo menos uma imagem');
      return;
    }

    if (!selectedChannelId) {
      toast.error('Selecione um canal no topo da pagina antes de enviar');
      return;
    }

    setUploading(true);
    const formData = new FormData();

    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }
    formData.append('channelId', selectedChannelId);

    try {
      await mediaApi.upload(formData);

      const channelName = channels.find(c => c.id === selectedChannelId)?.name || 'canal';
      toast.success(`${selectedFiles.length} imagem(ns) enviada(s) para ${channelName}!`);
      setSelectedFiles(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast.loading('Gerando previas automaticamente...', { duration: 2000 });

      setTimeout(() => {
        loadMedia();
      }, 3000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Erro ao enviar imagens';
      toast.error(errorMsg);
      console.error('Upload error:', error.response?.data);
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    try {
      await mediaApi.triggerImport();
      toast.success('Importacao iniciada!');
      setTimeout(() => {
        loadMedia();
      }, 3000);
    } catch (error: any) {
      toast.error('Erro ao iniciar importacao');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      await mediaApi.delete(id);
      toast.success('Imagem excluida!');
      loadMedia();
    } catch (error: any) {
      toast.error('Erro ao excluir imagem');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-[#1e293b] text-[#64748b]',
      ANALYZING: 'bg-blue-500/10 text-blue-400',
      ANALYZED: 'bg-emerald-500/10 text-emerald-400',
      GENERATING_PREVIEW: 'bg-amber-500/10 text-amber-400',
      READY: 'bg-emerald-500/10 text-emerald-400',
      ERROR: 'bg-red-500/10 text-red-400',
    };
    return colors[status] || 'bg-[#1e293b] text-[#64748b]';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'Pendente',
      ANALYZING: 'Analisando',
      ANALYZED: 'Analisada',
      GENERATING_PREVIEW: 'Gerando Previa',
      READY: 'Pronta',
      ERROR: 'Erro',
    };
    return texts[status] || status;
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

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
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Gerenciar Imagens</h1>
        <p className="text-sm text-[#64748b] mt-1">Total: {media.length} imagens</p>
      </div>

      {/* Upload Section */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#f1f5f9]">Adicionar Novas Imagens</h3>
          {selectedChannel && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/5 border border-[#1e293b] rounded-lg">
              <div className="w-5 h-5 rounded-md bg-[#3b82f6] flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">{selectedChannel.name.charAt(0)}</span>
              </div>
              <span className="text-xs text-[#64748b]">
                Enviando para: <span className="text-[#f1f5f9] font-medium">{selectedChannel.name}</span>
              </span>
            </div>
          )}
        </div>

        {!selectedChannelId && (
          <div className="mb-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-xs text-amber-400">Selecione um canal no topo da pagina antes de enviar imagens.</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="file-upload" className="block text-xs font-medium text-[#64748b] mb-1.5">
              Selecione as imagens (JPG, PNG)
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              multiple
              onChange={handleFileSelect}
              className="block w-full text-sm text-[#f1f5f9] border border-[#1e293b] rounded-lg cursor-pointer bg-[#0a0e1a] focus:outline-none focus:border-[#3b82f6] file:mr-4 file:py-2.5 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-medium file:bg-[#3b82f6] file:text-white hover:file:bg-[#2563eb]"
            />
            {selectedFiles && selectedFiles.length > 0 && (
              <p className="mt-1.5 text-xs text-[#64748b]">
                {selectedFiles.length} arquivo(s) selecionado(s)
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFiles || uploading || !selectedChannelId}
              className="inline-flex items-center px-4 py-2.5 bg-[#3b82f6] text-white text-sm font-medium rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </>
              ) : (
                'Enviar Imagens'
              )}
            </button>
            <button
              onClick={handleImport}
              className="inline-flex items-center px-4 py-2.5 border border-[#1e293b] text-[#64748b] text-sm font-medium rounded-lg hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
            >
              Importar da Pasta
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {media.length === 0 ? (
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-10 text-center">
          <svg className="mx-auto h-12 w-12 text-[#1e293b] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-sm font-medium text-[#f1f5f9] mb-1">Nenhuma imagem</h3>
          <p className="text-xs text-[#64748b]">Faca upload de imagens usando o formulario acima</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {media.map((item) => (
            <div key={item.id} className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden hover:border-[#334155] transition-colors">
              {/* Image */}
              <div className="relative h-48 bg-[#0a0e1a] overflow-hidden">
                {(item.filePath || item.telegramFileId) ? (
                  item.mediaType === 'VIDEO' ? (
                    <video
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/media/${item.id}/image`}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseOut={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                  ) : (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/media/${item.id}/image`}
                      alt={item.originalName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23111827" width="400" height="300"/%3E%3Ctext fill="%2364748b" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem Imagem%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#64748b] text-lg font-bold">
                    #{item.order}
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-[10px] font-medium rounded-md ${getStatusColor(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                </div>
                {item.preview && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-emerald-500/10 text-emerald-400">
                      Previa Gerada
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3 space-y-2">
                <h3 className="text-[#f1f5f9] text-sm font-medium truncate">{item.originalName}</h3>
                <p className="text-xs text-[#64748b]">Ordem: {item.order}</p>
                {item.analysis && (
                  <p className="text-xs text-[#475569] line-clamp-2">
                    {item.analysis.scenario}
                  </p>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="w-full text-xs font-medium text-[#64748b] hover:text-red-400 py-2 border border-[#1e293b] rounded-lg hover:border-red-500/30 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
