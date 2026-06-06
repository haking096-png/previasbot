'use client';

import { useState, useEffect } from 'react';
import { previewApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface CustomPreviewEditorProps {
  channelId: string;
  initialDescription?: string;
  onGenerated?: (preview: GeneratedPreview) => void;
}

interface GeneratedPreview {
  headline: string;
  body: string;
  preCta: string;
  cta: string;
  buttonText: string;
  buttonUrl: string;
}

export default function CustomPreviewEditor({ channelId, initialDescription, onGenerated }: CustomPreviewEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState(initialDescription || '');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GeneratedPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (initialDescription) setDescription(initialDescription);
  }, [initialDescription]);

  const parseFormatting = (text: string): string => {
    // *text* -> uppercase bold
    let parsed = text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    // (url) -> link detection (handled separately in Telegram)
    return parsed;
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !description.trim()) {
      toast.error('Preencha o prompt e a descrição');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/previews/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, description }),
      });

      if (!response.ok) throw new Error('Erro na geração');

      const data = await response.json();
      const newPreview: GeneratedPreview = {
        headline: data.headline || '',
        body: data.body || '',
        preCta: data.preCta || '',
        cta: data.cta || '',
        buttonText: data.buttonText || '',
        buttonUrl: data.buttonUrl || '',
      };

      setPreview(newPreview);
      setShowPreview(true);
      if (onGenerated) onGenerated(newPreview);
      toast.success('Prévia gerada!');
    } catch (error: any) {
      toast.error('Erro ao gerar prévia');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Gerador de Prévia Personalizada</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">
              Prompt Mestre (estilo de escrita)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Cole aqui o prompt mestre com exemplos de copy..."
              rows={5}
              className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748b] mb-1.5">
              Descrição da mídia
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que acontece na imagem/vídeo..."
              rows={3}
              className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm resize-y"
            />
          </div>

          <div className="bg-[#0a0e1a] border border-[#1e293b] rounded-lg p-3">
            <p className="text-[10px] text-[#64748b] font-medium mb-2">FORMATAÇÃO SUPORTADA:</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="px-2 py-1 bg-[#1e293b] rounded text-[#f1f5f9]">
                *texto* → <strong>TEXTO</strong> (maiúsculas)
              </span>
              <span className="px-2 py-1 bg-[#1e293b] rounded text-[#f1f5f9]">
                (link) → botão clicável
              </span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full px-4 py-3 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gerando...
              </>
            ) : (
              'GERAR PRÉVIA'
            )}
          </button>
        </div>
      </div>

      {showPreview && preview && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#f1f5f9]">Prévia Gerada</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-[#64748b] hover:text-[#f1f5f9] text-xs"
            >
              Fechar
            </button>
          </div>

          <div className="bg-[#0e1621] rounded-xl overflow-hidden">
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
              <div className="bg-[#182533] rounded-2xl overflow-hidden">
                <div className="p-4">
                  <div
                    className="text-white font-bold text-lg leading-tight mb-3"
                    dangerouslySetInnerHTML={{ __html: parseFormatting(preview.headline) }}
                  />
                  <div
                    className="text-gray-300 text-sm whitespace-pre-line leading-relaxed mb-3"
                    dangerouslySetInnerHTML={{ __html: parseFormatting(preview.body) }}
                  />
                  {preview.preCta && (
                    <div
                      className="text-gray-400 text-sm whitespace-pre-line leading-relaxed mb-3"
                      dangerouslySetInnerHTML={{ __html: parseFormatting(preview.preCta) }}
                    />
                  )}
                  <div
                    className="text-white text-sm font-medium whitespace-pre-line leading-tight"
                    dangerouslySetInnerHTML={{ __html: parseFormatting(preview.cta) }}
                  />
                  {preview.buttonUrl && (
                    <div className="pt-2">
                      <a
                        href={preview.buttonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-[#2ea6ff] hover:bg-[#1e96ef] text-white font-medium py-3 rounded-lg transition-colors"
                      >
                        VER AGORA
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-gray-500 text-xs mt-2 text-right">
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="p-3 bg-[#0a0e1a] rounded-lg">
              <p className="text-[10px] text-[#64748b] font-medium mb-1">HEADLINE</p>
              <p className="text-sm text-[#f1f5f9]">{preview.headline}</p>
            </div>
            <div className="p-3 bg-[#0a0e1a] rounded-lg">
              <p className="text-[10px] text-[#64748b] font-medium mb-1">BODY</p>
              <p className="text-sm text-[#f1f5f9] whitespace-pre-line">{preview.body}</p>
            </div>
            <div className="p-3 bg-[#0a0e1a] rounded-lg">
              <p className="text-[10px] text-[#64748b] font-medium mb-1">CTA</p>
              <p className="text-sm text-[#f1f5f9] whitespace-pre-line">{preview.cta}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}