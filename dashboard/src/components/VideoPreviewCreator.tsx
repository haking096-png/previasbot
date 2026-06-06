'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface VideoPreviewCreatorProps {
  channelId: string;
  onScheduled?: () => void;
}

interface GeneratedPreview {
  headline: string;
  body: string;
  preCta: string;
  cta: string;
  buttonUrl: string;
}

export default function VideoPreviewCreator({ channelId, onScheduled }: VideoPreviewCreatorProps) {
  const [videoDescription, setVideoDescription] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [preview, setPreview] = useState<GeneratedPreview | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');

  const handleGeneratePreview = async () => {
    if (!videoDescription.trim()) {
      toast.error('Descreva o que acontece no vídeo');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/previews/from-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: videoDescription,
          channelId,
          ctaLink: ctaLink || undefined,
        }),
      });

      if (!response.ok) throw new Error('Erro na geração');

      const data = await response.json();
      setPreview(data);
      toast.success('Prévia gerada!');
    } catch (error: any) {
      toast.error('Erro ao gerar prévia de vídeo');
    } finally {
      setGenerating(false);
    }
  };

  const handleScheduleNow = async () => {
    if (!preview) {
      toast.error('Gere a prévia primeiro');
      return;
    }

    const scheduledFor = scheduleDate || new Date(Date.now() + 60000).toISOString();
    setScheduling(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/videos/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: videoDescription,
          preview,
          channelId,
          scheduledFor,
          ctaLink: ctaLink || undefined,
        }),
      });

      if (!response.ok) throw new Error('Erro ao agendar');

      toast.success('Vídeo agendado! A foto thumbnail será agendada para o próximo horário.');
      setPreview(null);
      setVideoDescription('');
      setScheduleDate('');
      if (onScheduled) onScheduled();
    } catch (error: any) {
      toast.error('Erro ao agendar vídeo');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1">Criar Prévia de Vídeo</h3>
        <p className="text-xs text-[#64748b] mb-4">Descreva o que acontece no vídeo e gere uma prévia personalizada.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">
              O que acontece no vídeo?
            </label>
            <textarea
              value={videoDescription}
              onChange={(e) => setVideoDescription(e.target.value)}
              placeholder="Ex: Loira de biquíni vermelho rebolando na praia, mostrando o bumbum empinado para a câmera..."
              rows={4}
              className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">
              Link do CTA (opcional)
            </label>
            <input
              type="url"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
              placeholder="https://seulink.com/vip"
              className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm"
            />
          </div>

          <button
            onClick={handleGeneratePreview}
            disabled={generating || !videoDescription.trim()}
            className="w-full px-4 py-3 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gerando Prévia...
              </>
            ) : (
              'GERAR PRÉVIA DO VÍDEO'
            )}
          </button>
        </div>
      </div>

      {preview && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Prévia Gerada</h3>

          <div className="bg-[#0e1621] rounded-xl overflow-hidden mb-4">
            <div className="bg-[#212d3b] px-4 py-3 flex items-center space-x-3 border-b border-gray-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                P
              </div>
              <div className="flex-1">
                <div className="text-white font-medium text-sm">Previass Bot</div>
                <div className="text-gray-400 text-xs">online</div>
              </div>
            </div>

            <div className="p-4">
              <div className="bg-[#182533] rounded-2xl overflow-hidden p-4">
                <div className="text-white font-bold text-lg leading-tight mb-3">{preview.headline}</div>
                <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed mb-3">{preview.body}</div>
                {preview.preCta && (
                  <div className="text-gray-400 text-sm whitespace-pre-line leading-relaxed mb-3">{preview.preCta}</div>
                )}
                <div className="text-white text-sm font-medium whitespace-pre-line leading-tight">{preview.cta}</div>
                {preview.buttonUrl && (
                  <div className="pt-2">
                    <a
                      href={preview.buttonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-[#2ea6ff] hover:bg-[#1e96ef] text-white font-medium py-3 rounded-lg transition-colors"
                    >
                      VER VÍDEO
                    </a>
                  </div>
                )}
              </div>
              <div className="text-gray-500 text-xs mt-2 text-right">
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Agendar para (opcional)</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm"
              />
              <p className="text-[10px] text-[#64748b] mt-1">Se vazio, será enviado em 1 minuto.</p>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-400">
                <strong>Nota:</strong> Quando este vídeo for agendado, a foto thumbnail associada será automaticamente agendada para o próximo horário disponível (evitando conflito).
              </p>
            </div>

            <button
              onClick={handleScheduleNow}
              disabled={scheduling}
              className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {scheduling ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Agendando...
                </>
              ) : (
                'AGENDAR VÍDEO'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}