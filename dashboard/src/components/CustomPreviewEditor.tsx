'use client';

import { useState, useEffect } from 'react';
import { previewApi } from '@/lib/api';
import toast from 'react-hot-toast';
import GenerationLoader from '@/components/ui/GenerationLoader';

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
  const [generated, setGenerated] = useState<GeneratedPreview | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (initialDescription) setDescription(initialDescription);
  }, [initialDescription]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !description.trim()) {
      toast.error('Preencha o prompt e a descrição');
      return;
    }

    setGenerating(true);
    setGenerationStatus('generating');
    setGenerated(null);
    setErrorMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/previews/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, description }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const data = await response.json();

      const newPreview: GeneratedPreview = {
        headline: data.headline || '',
        body: data.body || '',
        preCta: data.preCta || '',
        cta: data.cta || '',
        buttonText: data.buttonText || '',
        buttonUrl: data.buttonUrl || '',
      };

      setGenerated(newPreview);
      setGenerationStatus('success');

      if (onGenerated) onGenerated(newPreview);

      // Voltar para idle após 2s
      setTimeout(() => {
        setGenerationStatus('idle');
      }, 2000);

      toast.success('Copy gerada com sucesso!');
    } catch (error: any) {
      setGenerationStatus('error');
      setErrorMessage(error.message || 'Erro ao gerar');
      toast.error(error.message || 'Erro ao gerar prévia');

      setTimeout(() => {
        setGenerationStatus('idle');
      }, 4000);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Gerador de Prévia Personalizada</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Prompt Mestre (estilo de escrita)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Cole aqui o prompt mestre com exemplos de copy..."
              rows={5}
              disabled={generating}
              className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none resize-y disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Descrição da mídia
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que acontece na imagem/vídeo..."
              rows={3}
              disabled={generating}
              className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none resize-y disabled:opacity-50"
            />
          </div>

          <div className="bg-[#0a0e1a] border border-[#1f2937] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 font-medium mb-2">FORMATAÇÃO SUPORTADA:</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="px-2 py-1 bg-[#1f2937] rounded text-gray-300">
                *texto* → <strong>TEXTO</strong> (maiúsculas)
              </span>
              <span className="px-2 py-1 bg-[#1f2937] rounded text-gray-300">
                (link) → botão clicável
              </span>
            </div>
          </div>

          {/* Generate Button or Loader */}
          {generationStatus === 'generating' ? (
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-6">
              <GenerationLoader status="generating" message="Gerando copy com IA..." size="md" showProgress={true} />
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full px-4 py-3 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generationStatus === 'success' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Concluído!
                </>
              ) : generationStatus === 'error' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Tentar Novamente
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  GERAR PRÉVIA
                </>
              )}
            </button>
          )}

          {generationStatus === 'error' && errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {generated && (
        <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              Concluído! Prévia gerada
            </h3>
          </div>

          <div className="max-w-md mx-auto bg-[#0e1621] rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
            <div className="bg-[#212d3b] px-4 py-3 flex items-center space-x-3 border-b border-gray-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">P</div>
              <div className="flex-1">
                <div className="text-white font-medium text-sm">Previass Bot</div>
                <div className="text-gray-400 text-xs">online</div>
              </div>
            </div>

            <div className="p-4">
              <div className="bg-[#182533] rounded-2xl overflow-hidden">
                <div className="p-4">
                  <div className="text-white font-bold text-lg leading-tight mb-3">
                    {generated.headline || 'Sem headline'}
                  </div>
                  <div className="text-gray-300 text-sm whitespace-pre-line leading-relaxed mb-3">
                    {generated.body}
                  </div>
                  {generated.preCta && (
                    <div className="text-gray-400 text-sm whitespace-pre-line leading-relaxed mb-3">
                      {generated.preCta}
                    </div>
                  )}
                  <div className="text-white text-sm font-medium whitespace-pre-line leading-tight">
                    {generated.cta}
                  </div>
                  {generated.buttonUrl && (
                    <div className="pt-2">
                      <a
                        href={generated.buttonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-[#2ea6ff] hover:bg-[#1e96ef] text-white font-medium py-3 rounded-lg transition-colors"
                      >
                        {generated.buttonText || 'VER AGORA'}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="p-3 bg-[#0a0e1a] rounded-lg">
              <p className="text-[10px] text-gray-500 font-medium mb-1">HEADLINE</p>
              <p className="text-sm text-white">{generated.headline}</p>
            </div>
            <div className="p-3 bg-[#0a0e1a] rounded-lg">
              <p className="text-[10px] text-gray-500 font-medium mb-1">BODY</p>
              <p className="text-sm text-white whitespace-pre-line">{generated.body}</p>
            </div>
            <div className="p-3 bg-[#0a0e1a] rounded-lg">
              <p className="text-[10px] text-gray-500 font-medium mb-1">CTA</p>
              <p className="text-sm text-white whitespace-pre-line">{generated.cta}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}