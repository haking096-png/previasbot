'use client';

import { useState, useEffect, useRef } from 'react';
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

// Parse formatting markers:
// *text* -> <strong>TEXT</strong> (uppercase bold)
// (text|url) -> <a> clickable button
// [text] -> standard text
function parseFormatting(text: string): { html: string; hasLinks: boolean } {
  if (!text) return { html: '', hasLinks: false };

  let hasLinks = false;

  // First, replace (text|url) format for buttons
  let html = text.replace(/\(([^|)]+)\|([^)]+)\)/g, (_, text, url) => {
    hasLinks = true;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="preview-btn">${text.trim().toUpperCase()}</a>`;
  });

  // Also support (link) - extract URL and use as text
  html = html.replace(/\((https?:\/\/[^)]+)\)/g, (_, url) => {
    hasLinks = true;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="preview-btn">${url}</a>`;
  });

  // Replace *text* with uppercase bold
  html = html.replace(/\*([^*]+)\*/g, '<strong class="preview-upper">$1</strong>');

  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br>');

  return { html, hasLinks };
}

export default function CustomPreviewEditor({ channelId, initialDescription, onGenerated }: CustomPreviewEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState(initialDescription || '');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedPreview | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (initialDescription) setDescription(initialDescription);
  }, [initialDescription]);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Preencha a descrição');
      return;
    }
    if (!channelId) {
      toast.error('Selecione um canal');
      return;
    }

    setGenerating(true);
    setGenerationStatus('generating');
    setGenerated(null);
    setErrorMessage('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log('[CustomPreview] Calling API:', { apiUrl, description, channelId, prompt: prompt?.substring(0, 50) });

      // Use the real preview endpoint that saves to DB and creates a post
      const response = await fetch(`${apiUrl}/api/previews/from-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          channelId,
          prompt: prompt || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error || `Erro ${response.status}`;
        console.error('[CustomPreview] API Error:', { status: response.status, errorData });
        throw new Error(errMsg);
      }

      const data = await response.json();
      console.log('[CustomPreview] API Response:', { headline: data.headline, hasPost: !!data.post, postId: data.post?.id });

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

      setTimeout(() => {
        setGenerationStatus('idle');
      }, 2000);

      if (data.post) {
        toast.success(`✅ Copy gerada e post criado! Vá em Posts para ver.`, { duration: 6000 });
      } else {
        toast.success('Copy gerada! (post não foi criado automaticamente)', { duration: 6000 });
        console.warn('[CustomPreview] Post não foi criado. Response:', data);
      }
    } catch (error: any) {
      console.error('[CustomPreview] Error:', error);
      setGenerationStatus('error');
      setErrorMessage(error.message || 'Erro ao gerar');
      toast.error(`Erro: ${error.message || 'Erro ao gerar'}`, { duration: 8000 });

      setTimeout(() => {
        setGenerationStatus('idle');
      }, 4000);
    } finally {
      setGenerating(false);
    }
  };

  // Render formatted text
  const renderFormattedText = (text: string) => {
    const { html } = parseFormatting(text);
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Gerador de Prévia Personalizada</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-violet-400 hover:text-violet-300"
          >
            {showHelp ? 'Ocultar ajuda' : 'Mostrar ajuda'}
          </button>
        </div>

        {showHelp && (
          <div className="mb-4 bg-[#0a0e1a] border border-violet-500/20 rounded-lg p-4 text-xs space-y-2">
            <p className="text-violet-400 font-semibold mb-2">📝 Como formatar sua copy:</p>
            <div className="space-y-1 text-gray-300">
              <p><code className="bg-[#1f2937] px-1.5 py-0.5 rounded">*texto*</code> → <strong className="text-emerald-400">TEXTO MAIÚSCULO</strong> (negrito)</p>
              <p><code className="bg-[#1f2937] px-1.5 py-0.5 rounded">(texto|https://link.com)</code> → Botão clicável</p>
              <p><code className="bg-[#1f2937] px-1.5 py-0.5 rounded">(https://link.com)</code> → Link clicável</p>
              <p className="text-gray-500 mt-2">Você pode misturar todos os formatos livremente!</p>
            </div>
          </div>
        )}

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
              className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-violet-500 focus:outline-none resize-y disabled:opacity-50"
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
              className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-violet-500 focus:outline-none resize-y disabled:opacity-50"
            />
          </div>

          {generationStatus === 'generating' ? (
            <div className="bg-gradient-to-r from-violet-500/10 to-violet-500/10 border border-violet-500/30 rounded-lg p-6">
              <GenerationLoader status="generating" message="Gerando copy com IA..." size="md" showProgress={true} />
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full px-4 py-3 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-lg">P</div>
              <div className="flex-1">
                <div className="text-white font-medium text-sm">Previass Bot</div>
                <div className="text-gray-400 text-xs">online</div>
              </div>
            </div>

            <div className="p-4">
              <div className="bg-[#182533] rounded-2xl overflow-hidden">
                <div className="p-4 space-y-3">
                  {/* Headline com formatação */}
                  {generated.headline && (
                    <div className="text-white font-bold text-lg leading-tight">
                      {renderFormattedText(generated.headline)}
                    </div>
                  )}

                  {/* Body com formatação */}
                  {generated.body && (
                    <div className="text-gray-300 text-sm leading-relaxed">
                      {renderFormattedText(generated.body)}
                    </div>
                  )}

                  {/* Pre-CTA com formatação */}
                  {generated.preCta && (
                    <div className="text-gray-400 text-sm leading-relaxed">
                      {renderFormattedText(generated.preCta)}
                    </div>
                  )}

                  {/* CTA com formatação (botões clicáveis) */}
                  {generated.cta && (
                    <div className="text-white text-sm font-medium leading-tight">
                      {renderFormattedText(generated.cta)}
                    </div>
                  )}

                  {/* Botão URL principal */}
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
              <p className="text-[10px] text-gray-500 font-medium mb-1">FORMATAÇÃO APLICADA</p>
              <p className="text-[10px] text-gray-400 font-mono">
                *texto* → MAIÚSCULA NEGRITO | (texto|url) → BOTÃO CLICÁVEL
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .preview-btn {
          display: inline-block;
          background: #2ea6ff;
          color: white;
          padding: 0.4rem 1rem;
          border-radius: 0.5rem;
          font-weight: 600;
          text-decoration: none;
          margin: 0.25rem 0.125rem;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .preview-btn:hover {
          background: #1e96ef;
        }
        .preview-upper {
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          color: white;
        }
      `}</style>
    </div>
  );
}