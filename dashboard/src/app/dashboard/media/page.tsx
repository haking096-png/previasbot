'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { mediaApi, channelApi } from '@/lib/api';
import { MediaItem, Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { FileDropzone, formatFileSize } from '@/components/ui/FileDropzone';
import { FilePreviewList } from '@/components/ui/FilePreview';
import { UploadProgress } from '@/components/ui/UploadProgress';
import { FileWithPreview, UploadProgressItem } from '@/components/ui/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const { selectedChannelId } = useChannelStore();

  const loadMedia = useCallback(async () => {
    if (!selectedChannelId) {
      setMedia([]);
      setLoading(false);
      return;
    }
    try {
      const response = await mediaApi.getAll(selectedChannelId);
      setMedia(response.data || []);
      setRetryCount(0); // Reset retry counter on success
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Nao autorizado, nao retentar
        setLoading(false);
        return;
      }
      console.warn('Failed to load media, attempt', retryCount + 1);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(c => c + 1);
        }, 3000);
      } else {
        // Esgotou tentativas, parar loading
        console.error('Max retries reached, giving up');
        toast.error('Erro ao carregar imagens. Tente recarregar a pagina.');
        setLoading(false);
      }
    } finally {
      // So marcar como nao-loading apos primeira tentativa bem-sucedida ou fim das retentativas
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  }, [selectedChannelId, retryCount]);

  useEffect(() => {
    // Reset retry counter quando muda de canal
    setRetryCount(0);
    setLoading(true);

    // Sempre carregar a lista de canais disponiveis
    loadChannels();

    // So carrega midia se tiver canal selecionado E ele existir na lista
    if (selectedChannelId && channels.find(c => c.id === selectedChannelId)) {
      loadMedia();
    } else {
      setMedia([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannelId, channels.length]);

  // Filtrar apenas imagens que ainda nao viraram posts publicados
  const visibleMedia = media.filter((item) => {
    if (!item.posts || item.posts.length === 0) return true;
    return !item.posts.some((p) => p.status === 'PUBLISHED');
  });
  const hiddenCount = media.length - visibleMedia.length;

  const loadChannels = async () => {
    try {
      const response = await channelApi.getAll();
      setChannels(response.data.filter((c: Channel) => c.enabled));
    } catch (error) {
      console.warn('Failed to load channels');
    }
  };

  // Handle file selection from dropzone
  const handleFilesSelected = useCallback((files: FileWithPreview[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  // Remove file from selection
  const handleRemoveFile = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // Clear all files
  const handleClearFiles = useCallback(() => {
    selectedFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
  }, [selectedFiles]);

  // Cancel upload
  const handleCancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress([]);
    toast.error('Upload cancelado');
  }, []);

  // Main upload handler
  const handleUpload = async () => {
    const validFiles = selectedFiles.filter(f => f.validation.valid);

    if (validFiles.length === 0) {
      toast.error('Selecione pelo menos uma imagem valida');
      return;
    }

    if (!selectedChannelId) {
      toast.error('Selecione um canal no topo da pagina antes de enviar');
      return;
    }

    // Initialize progress tracking
    const progressItems: UploadProgressItem[] = validFiles.map(f => ({
      id: f.id,
      name: f.file.name,
      size: f.file.size,
      progress: 0,
      status: 'pending' as const,
    }));
    setUploadProgress(progressItems);
    setIsUploading(true);

    // Loading toast
    const loadingToast = toast.loading(`Enviando 0/${validFiles.length}...`, {
      id: 'upload-progress',
    });

    let successCount = 0;
    let errorCount = 0;

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      for (let i = 0; i < validFiles.length; i++) {
        // Check for abort
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        const fileWithPreview = validFiles[i];
        const file = fileWithPreview.file;

        // Update progress to uploading
        setUploadProgress(prev => prev.map(item =>
          item.id === fileWithPreview.id
            ? { ...item, status: 'uploading' as const, progress: 0 }
            : item
        ));

        // Create form data for single file
        const formData = new FormData();
        formData.append('images', file);
        formData.append('channelId', selectedChannelId);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => prev.map(item => {
            if (item.id === fileWithPreview.id && item.status === 'uploading') {
              return { ...item, progress: Math.min(item.progress + 10, 90) };
            }
            return item;
          }));
        }, 200);

        try {
          await mediaApi.upload(formData);
          clearInterval(progressInterval);

          // Mark as completed
          setUploadProgress(prev => prev.map(item =>
            item.id === fileWithPreview.id
              ? { ...item, status: 'completed' as const, progress: 100 }
              : item
          ));

          successCount++;

          // Update loading toast
          toast.loading(`Enviando ${i + 1}/${validFiles.length}...`, {
            id: 'upload-progress',
          });

        } catch (error: any) {
          clearInterval(progressInterval);

          // Check if aborted
          if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
            setUploadProgress(prev => prev.map(item =>
              item.id === fileWithPreview.id
                ? { ...item, status: 'pending' as const, progress: 0 }
                : item
            ));
            break;
          }

          const errorMsg = error.response?.data?.error || 'Erro no envio';

          // Mark as error
          setUploadProgress(prev => prev.map(item =>
            item.id === fileWithPreview.id
              ? { ...item, status: 'error' as const, error: errorMsg }
              : item
          ));

          errorCount++;
        }
      }

      // Final toast
      toast.dismiss(loadingToast);

      if (successCount > 0) {
        const channelName = channels.find(c => c.id === selectedChannelId)?.name || 'canal';
        toast.success(`${successCount} imagem(ns) enviada(s) para ${channelName}!`);
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} arquivo(s) falharam no envio`);
      }

      // Clear selection after successful uploads
      if (successCount > 0) {
        handleClearFiles();
        toast.loading('Gerando previas automaticamente...', { duration: 2000 });
        setTimeout(() => loadMedia(), 3000);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagens');
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
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

  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const validFiles = selectedFiles.filter(f => f.validation.valid);
  const totalSize = validFiles.reduce((acc, f) => acc + f.file.size, 0);

  // Se nao tem canal selecionado OU o canal persistido nao existe mais OU esta desabilitado
  const hasNoValidChannel = !selectedChannelId || !selectedChannel;

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 w-48 skeleton rounded-lg mb-2" />
          <div className="h-4 w-64 skeleton rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state se nao tiver canal
  if (hasNoValidChannel) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gerenciar Imagens</h1>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-8 text-center max-w-2xl mx-auto mt-12">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {channels.length === 0 ? 'Nenhum canal disponivel' : 'Selecione um canal'}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {channels.length === 0
              ? 'Crie um canal no Telegram e conecte o bot para comecar a enviar imagens.'
              : 'Voce tem canais cadastrados, mas nenhum foi selecionado. Escolha um abaixo ou crie um novo.'}
          </p>

          {/* Lista de canais existentes para selecao rapida */}
          {channels.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 text-left">
                Canais disponiveis
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => useChannelStore.getState().setSelectedChannelId(channel.id)}
                    className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] hover:bg-violet-500/10 border border-[var(--border-default)] hover:border-violet-500/40 rounded-lg text-left transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-500/20">
                      {channel.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {channel.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {channel.chatId}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          <a
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {channels.length === 0 ? 'Criar Canal' : 'Gerenciar Canais'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gerenciar Imagens</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {visibleMedia.length} visiveis
          {hiddenCount > 0 && (
            <span className="text-[var(--text-muted)]"> • {hiddenCount} ja postada(s)</span>
          )}
        </p>
      </div>

      {/* Upload Section */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Adicionar Novas Imagens</h3>
          {selectedChannel && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/5 border border-[var(--border-default)] rounded-xl">
              <div className="w-5 h-5 rounded-md bg-[var(--accent-primary)] flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">{selectedChannel.name.charAt(0)}</span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                Enviando para: <span className="text-[var(--text-primary)] font-medium">{selectedChannel.name}</span>
              </span>
            </div>
          )}
        </div>

        {!selectedChannelId && (
          <div className="mb-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-xs text-amber-400">Selecione um canal no topo da pagina antes de enviar imagens.</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Dropzone */}
          <FileDropzone
            files={selectedFiles}
            onFilesSelected={handleFilesSelected}
            disabled={isUploading}
          />

          {/* File preview list */}
          <FilePreviewList
            files={selectedFiles}
            onRemove={handleRemoveFile}
          />

          {/* Upload progress */}
          {isUploading && uploadProgress.length > 0 && (
            <UploadProgress
              items={uploadProgress}
              currentIndex={uploadProgress.findIndex(i => i.status === 'uploading')}
              isUploading={isUploading}
              onCancel={handleCancelUpload}
            />
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleUpload}
              disabled={validFiles.length === 0 || isUploading || !selectedChannelId}
              loading={isUploading}
            >
              {validFiles.length > 0
                ? `Enviar ${validFiles.length} imagem${validFiles.length > 1 ? 'ns' : ''}`
                : 'Enviar Imagens'
              }
            </Button>

            {validFiles.length > 0 && !isUploading && (
              <div className="text-xs text-[var(--text-muted)]">
                {validFiles.length} arquivo(s) • {formatFileSize(totalSize)}
              </div>
            )}

            <Button variant="secondary" onClick={handleImport} disabled={isUploading}>
              Importar da Pasta
            </Button>
          </div>
        </div>
      </Card>

      {/* Media Grid */}
      {visibleMedia.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            illustration="media"
            title="Nenhuma imagem"
            description="Faca upload de imagens usando o formulario acima"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleMedia.map((item) => (
            <Card key={item.id} padding="none" hover className="overflow-hidden group">
              {/* Image */}
              <div className="relative h-48 bg-[var(--bg-tertiary)] overflow-hidden">
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
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Evitar loop infinito: so troca se nao for o placeholder
                        if (!target.src.startsWith('data:')) {
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%2318181b" width="400" height="300"/%3E%3Ctext fill="%2371717a" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem Imagem%3C/text%3E%3C/svg%3E';
                        }
                      }}
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-lg font-bold">
                    #{item.order}
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={item.status} />
                </div>

                {/* Preview Badge */}
                {item.preview && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="success" size="sm">Previa Gerada</Badge>
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 space-y-2">
                <h3 className="text-[var(--text-primary)] text-sm font-medium truncate">{item.originalName}</h3>
                <p className="text-xs text-[var(--text-muted)]">Ordem: {item.order}</p>
                {item.analysis && (
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                    {item.analysis.scenario}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
