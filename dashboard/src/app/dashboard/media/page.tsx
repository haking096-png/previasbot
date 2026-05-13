'use client';

import { useEffect, useState } from 'react';
import { mediaApi } from '@/lib/api';
import { MediaItem } from '@/types';
import toast from 'react-hot-toast';

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      const response = await mediaApi.getAll();
      setMedia(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar imagens');
    } finally {
      setLoading(false);
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

    setUploading(true);
    const formData = new FormData();

    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }

    try {
      await mediaApi.upload(formData);

      toast.success(`${selectedFiles.length} imagem(ns) enviada(s) com sucesso!`);
      setSelectedFiles(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast.loading('Gerando prévias automaticamente...', { duration: 2000 });

      setTimeout(() => {
        loadMedia();
      }, 3000);
    } catch (error: any) {
      toast.error('Erro ao enviar imagens');
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    try {
      await mediaApi.triggerImport();
      toast.success('Importação iniciada!');
      setTimeout(() => {
        loadMedia();
      }, 3000);
    } catch (error: any) {
      toast.error('Erro ao iniciar importação');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      await mediaApi.delete(id);
      toast.success('Imagem excluída!');
      loadMedia();
    } catch (error: any) {
      toast.error('Erro ao excluir imagem');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
      ANALYZING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      ANALYZED: 'bg-green-500/10 text-green-400 border-green-500/30',
      GENERATING_PREVIEW: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      READY: 'bg-green-500/10 text-green-400 border-green-500/30',
      ERROR: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'Pendente',
      ANALYZING: 'Analisando',
      ANALYZED: 'Analisada',
      GENERATING_PREVIEW: 'Gerando Prévia',
      READY: 'Pronta',
      ERROR: 'Erro',
    };
    return texts[status] || status;
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
        <h1 className="text-4xl font-bold text-white mb-2">Gerenciar Imagens</h1>
        <p className="text-gray-400 text-lg">Total: {media.length} imagens</p>
      </div>

      {/* Upload Section */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 mb-8">
        <h3 className="text-2xl font-bold text-white mb-6">Adicionar Novas Imagens</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">
              Selecione as imagens (JPG, PNG)
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              multiple
              onChange={handleFileSelect}
              className="block w-full text-sm text-white border border-dark-border rounded-xl cursor-pointer bg-dark-bg focus:outline-none focus:border-accent-blue file:mr-4 file:py-3 file:px-4 file:rounded-l-xl file:border-0 file:text-sm file:font-semibold file:bg-accent-blue file:text-white hover:file:bg-accent-cyan transition-colors"
            />
            {selectedFiles && selectedFiles.length > 0 && (
              <p className="mt-2 text-sm text-gray-400">
                {selectedFiles.length} arquivo(s) selecionado(s)
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleUpload}
              disabled={!selectedFiles || uploading}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-accent-blue to-accent-cyan text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-blue/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Enviar Imagens
                </>
              )}
            </button>
            <button
              onClick={handleImport}
              className="inline-flex items-center px-6 py-3 bg-dark-bg border border-accent-blue text-accent-blue font-semibold rounded-xl hover:bg-accent-blue/10 transition-all duration-300"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importar da Pasta
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {media.length === 0 ? (
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-xl font-medium text-white mb-2">Nenhuma imagem</h3>
          <p className="text-gray-400">
            Faça upload de imagens usando o formulário acima
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {media.map((item) => (
            <div key={item.id} className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-accent-blue transition-all duration-300">
              {/* Image */}
              <div className="relative h-64 bg-dark-bg">
                {item.filePath ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${item.filePath}`}
                    alt={item.originalName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESem Imagem%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl font-bold">
                    #{item.order}
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                </div>
                {item.preview && (
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                      ✓ Prévia Gerada
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <h3 className="text-white font-medium truncate">{item.originalName}</h3>
                <p className="text-sm text-gray-400">Ordem: {item.order}</p>
                {item.analysis && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {item.analysis.scenario}
                  </p>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="w-full bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl font-medium hover:bg-red-500/20 transition-all duration-200"
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
