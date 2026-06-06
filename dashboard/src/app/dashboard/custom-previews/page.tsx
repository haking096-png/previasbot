'use client';

import { useEffect, useState } from 'react';
import { useChannelStore } from '@/lib/store';
import { channelApi } from '@/lib/api';
import CustomPreviewEditor from '@/components/CustomPreviewEditor';
import toast from 'react-hot-toast';

type Tab = 'preview' | 'video';

export default function CustomPreviewsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [channels, setChannels] = useState<any[]>([]);
  const { selectedChannelId, setSelectedChannelId } = useChannelStore();
  const [videoDescription, setVideoDescription] = useState('');
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoResult, setVideoResult] = useState<any>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const res = await channelApi.getAll();
      setChannels(res.data || []);
      if (!selectedChannelId && res.data?.length > 0) {
        setSelectedChannelId(res.data[0].id);
      }
    } catch (error) {
      toast.error('Erro ao carregar canais');
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoDescription.trim()) {
      toast.error('Digite a descrição do vídeo');
      return;
    }
    if (!selectedChannelId) {
      toast.error('Selecione um canal');
      return;
    }

    setVideoGenerating(true);
    setVideoResult(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/previews/from-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: videoDescription,
          channelId: selectedChannelId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      setVideoResult(data);
      toast.success('Preview de vídeo gerada!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar preview de vídeo');
    } finally {
      setVideoGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Prévia Personalizada</h1>
        <p className="text-sm text-gray-400 mt-1">
          Crie prévias com formatação customizada para fotos e vídeos
        </p>
      </div>

      {/* Channel selector */}
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 font-medium">Canal:</label>
          <select
            value={selectedChannelId || ''}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="flex-1 bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none max-w-xs"
          >
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {channels.length === 0 && <option value="">Nenhum canal - crie em Configurações</option>}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-3 mb-6 max-w-2xl">
        <button
          onClick={() => setActiveTab('preview')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'preview'
              ? 'bg-cyan-500/10 border-cyan-500/30'
              : 'bg-[#0d1117] border-[#1f2937] hover:border-[#374151]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              activeTab === 'preview' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#1f2937] text-gray-400'
            }`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm font-semibold ${activeTab === 'preview' ? 'text-white' : 'text-gray-300'}`}>Prévia de Foto</p>
              <p className="text-[10px] text-gray-500">Use prompt + descrição</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('video')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'video'
              ? 'bg-purple-500/10 border-purple-500/30'
              : 'bg-[#0d1117] border-[#1f2937] hover:border-[#374151]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              activeTab === 'video' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#1f2937] text-gray-400'
            }`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm font-semibold ${activeTab === 'video' ? 'text-white' : 'text-gray-300'}`}>Prévia de Vídeo</p>
              <p className="text-[10px] text-gray-500">Descreva o que acontece</p>
            </div>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'preview' ? (
        <CustomPreviewEditor
          channelId={selectedChannelId || ''}
          onGenerated={(preview) => {
            toast.success('Preview gerada com sucesso!');
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Gerar Preview de Vídeo</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Descrição do que acontece no vídeo
                </label>
                <textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Ex: Loira de biquíni vermelho rebolando na praia, mostrando o bumbum empinado para a câmera..."
                  rows={4}
                  disabled={videoGenerating}
                  className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none resize-y disabled:opacity-50"
                />
              </div>

              <button
                onClick={handleGenerateVideo}
                disabled={videoGenerating || !videoDescription.trim() || !selectedChannelId}
                className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {videoGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gerando Preview de Vídeo...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.651z" />
                    </svg>
                    GERAR PREVIEW DE VÍDEO
                  </>
                )}
              </button>
            </div>
          </div>

          {videoResult && (
            <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Concluído! Preview de vídeo gerada
              </h3>

              <div className="max-w-md mx-auto bg-[#0e1621] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                <div className="bg-[#212d3b] px-4 py-3 flex items-center space-x-3 border-b border-gray-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg">P</div>
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">Previass Bot</div>
                    <div className="text-gray-400 text-xs">online</div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="bg-[#182533] rounded-2xl overflow-hidden">
                    <div className="p-4 space-y-3">
                      {videoResult.headline && (
                        <div className="text-white font-bold text-lg leading-tight">{videoResult.headline}</div>
                      )}
                      {videoResult.body && (
                        <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">{videoResult.body}</div>
                      )}
                      {videoResult.preCta && (
                        <div className="text-gray-400 text-sm whitespace-pre-line leading-relaxed">{videoResult.preCta}</div>
                      )}
                      {videoResult.cta && (
                        <div className="text-white text-sm font-medium whitespace-pre-line leading-tight">{videoResult.cta}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="p-3 bg-[#0a0e1a] rounded-lg">
                  <p className="text-[10px] text-gray-500 font-medium mb-1">HEADLINE</p>
                  <p className="text-sm text-white">{videoResult.headline}</p>
                </div>
                <div className="p-3 bg-[#0a0e1a] rounded-lg">
                  <p className="text-[10px] text-gray-500 font-medium mb-1">BODY</p>
                  <p className="text-sm text-white whitespace-pre-line">{videoResult.body}</p>
                </div>
                <div className="p-3 bg-[#0a0e1a] rounded-lg">
                  <p className="text-[10px] text-gray-500 font-medium mb-1">CTA</p>
                  <p className="text-sm text-white whitespace-pre-line">{videoResult.cta}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}