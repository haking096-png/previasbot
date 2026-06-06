import axios from 'axios';
import { grokConfig } from '../config';
import logger from '../utils/logger';
import { GrokAnalysisResult } from './grok.service';

export interface PreviewContent {
  headline: string;
  body: string;
  preCta: string;
  cta: string;
  buttonText: string;
  buttonUrl: string;
}

export class PreviewService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = grokConfig.apiKey;
    this.apiUrl = grokConfig.apiUrl;
  }

  async generateFromAnalysis(analysis: GrokAnalysisResult, ctaLink: string, channelId?: string): Promise<PreviewContent> {
    try {
      logger.info('Generating preview from analysis', { channelId });

      let channelPrompt = '';
      let effectiveCtaLink = ctaLink;

      if (channelId) {
        const prisma = (await import('../utils/prisma')).default;
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });

        if (channel) {
          effectiveCtaLink = channel.ctaLink || ctaLink;
          channelPrompt = channel.previewPrompt || '';
        }
      }

      if (!channelPrompt) {
        const settings = await this.getSettings();
        channelPrompt = this.buildLegacyPromptFromSettings(settings);
      }

      // Strong instruction to follow the user's rich prompt + return structured JSON
      const userPrompt = `${channelPrompt}

---

**TAREFA ATUAL:**
Analise as informações abaixo da imagem/vídeo e gere UMA copy de prévia ORIGINAL seguindo **EXATAMENTE** o estilo, estrutura, tom, emojis, nível de ousadia, repetições e regras de formatação dos exemplos que você acabou de receber.

**Informações da mídia:**
- Cenário: ${analysis.scenario || 'não identificado'}
- Pose / Ação: ${analysis.pose || 'não identificada'}
- Roupa / Estado: ${analysis.clothing || 'não identificada'}
- Emoção / Expressão: ${analysis.emotion || 'não identificada'}
- Foco principal: ${analysis.mainFocus || 'não identificado'}
- Sensação geral: ${analysis.feeling || 'não identificada'}
- Descrição: ${analysis.description || 'não disponível'}

**INSTRUÇÕES OBRIGATÓRIAS DE SAÍDA (retorne APENAS JSON válido):**

{
  "headline": "HEADLINE no estilo exato dos seus exemplos (pode ter maiúsculas, emojis dos dois lados, etc)",
  "body": "Corpo da copy em 2-4 linhas, respeitando o estilo, gírias, forma de descrever o corpo e ações dos exemplos",
  "preCta": "Frase provocante curta que vem antes dos CTAs (com emoji se for o padrão dos exemplos)",
  "ctaLines": ["CTA 1 (exatamente como deve aparecer)", "CTA 2", "CTA 3"],
  "notes": "opcional - qualquer observação curta"
}

**REGRAS CRÍTICAS:**
- Siga fielmente os exemplos que você recebeu (incluindo onde usa MAIÚSCULAS, onde repete o CTA 3 vezes, onde coloca os links).
- O array "ctaLines" deve ter exatamente 3 itens (os três botões clicáveis).
- Mantenha o mesmo nível de ousadia e vocabulário dos exemplos.
- Cada geração deve ser fresca, mas com a mesma "personalidade" do prompt.
- Retorne **APENAS o JSON**, sem texto antes ou depois.`;

      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: await this.getGrokModel('preview'),
          messages: [
            {
              role: 'system',
              content: 'Você é uma copywriter especialista em conteúdo adulto para Telegram. Sua única missão é reproduzir com perfeição o estilo, estrutura e personalidade dos exemplos que o usuário fornece. Sempre responda com JSON estruturado quando pedido.'
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.85,
          max_tokens: 800
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000
        }
      );

      const generatedText = response.data.choices[0]?.message?.content || '';
      const preview = this.parseStructuredPreview(generatedText, effectiveCtaLink);

      logger.info('Preview generated successfully (structured)', { headline: preview.headline });
      return preview;

    } catch (error: any) {
      logger.error('Preview generation error', {
        error: error.message,
        response: error.response?.data
      });

      return this.generateFallbackPreview(analysis, ctaLink);
    }
  }

  /**
   * New method: Generate preview directly from a video description (no image analysis needed)
   */
  async generateFromVideoDescription(
    videoDescription: string,
    ctaLink: string,
    channelId?: string
  ): Promise<PreviewContent> {
    try {
      logger.info('Generating preview from video description', { channelId });

      let channelPrompt = '';
      let effectiveCtaLink = ctaLink;

      if (channelId) {
        const prisma = (await import('../utils/prisma')).default;
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });

        if (channel) {
          effectiveCtaLink = channel.ctaLink || ctaLink;
          channelPrompt = channel.previewPrompt || '';
        }
      }

      if (!channelPrompt) {
        const settings = await this.getSettings();
        channelPrompt = this.buildLegacyPromptFromSettings(settings);
      }

      const userPrompt = `${channelPrompt}

---

**TAREFA:**
O usuário descreveu o que acontece em um vídeo. Gere uma prévia no **exato mesmo estilo** dos exemplos acima, adaptando para o conteúdo do vídeo.

Descrição do vídeo:
${videoDescription}

Retorne APENAS um JSON válido com esta estrutura:
{
  "headline": "HEADLINE no estilo dos exemplos",
  "body": "Corpo adaptado para o que acontece no vídeo",
  "preCta": "Frase provocante antes do CTA",
  "ctaLines": ["CTA repetido 1", "CTA repetido 2", "CTA repetido 3"]
}`;

      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: await this.getGrokModel('preview'),
          messages: [
            {
              role: 'system',
              content: 'Você é uma copywriter especialista em conteúdo adulto para Telegram. Reproduza com perfeição o estilo dos exemplos fornecidos pelo usuário.'
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.85,
          max_tokens: 600
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const generatedText = response.data.choices[0]?.message?.content || '';
      return this.parseStructuredPreview(generatedText, effectiveCtaLink);

    } catch (error: any) {
      logger.error('Video preview generation error', { error: error.message });
      // Simple fallback
      return {
        headline: 'VÍDEO NOVO CHEGANDO 🔥',
        body: videoDescription.substring(0, 180),
        preCta: 'Quer ver o vídeo completo sem censura? 👇',
        cta: '🔥 VER AGORA 🔥\n🔥 VER AGORA 🔥\n🔥 VER AGORA 🔥',
        buttonText: '',
        buttonUrl: ctaLink
      };
    }
  }

  private parseStructuredPreview(rawText: string, buttonUrl: string): PreviewContent {
    try {
      // Clean common issues
      let clean = rawText.trim();
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      const parsed = JSON.parse(jsonMatch[0]);

      const headline = (parsed.headline || 'PRÉVIA EXCLUSIVA 🔥').trim();
      const body = (parsed.body || 'Conteúdo quente te esperando...').trim();
      const preCta = (parsed.preCta || 'Quer ver tudo sem censura? 👇').trim();

      let ctaLines: string[] = Array.isArray(parsed.ctaLines) ? parsed.ctaLines : [];
      if (ctaLines.length === 0) {
        ctaLines = ['🍑 QUERO VER TUDO 🍑', '🍑 QUERO VER TUDO 🍑', '🍑 QUERO VER TUDO 🍑'];
      }
      while (ctaLines.length < 3) ctaLines.push(ctaLines[0]);
      const cta = ctaLines.slice(0, 3).join('\n');

      return {
        headline,
        body,
        preCta,
        cta,
        buttonText: '',
        buttonUrl
      };
    } catch (e) {
      logger.warn('Failed to parse structured preview JSON, using fallback parser');
      // Fallback to old logic if JSON fails
      return this.fallbackTextParse(rawText, buttonUrl);
    }
  }

  private fallbackTextParse(text: string, buttonUrl: string): PreviewContent {
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    const lines = cleanText.split('\n').filter(l => l.trim());

    const headline = lines[0] || 'LOIRA GOSTOSA 🔥';
    const body = lines.slice(1, 4).join('\n') || 'Corpo perfeito te esperando...';
    const preCta = lines.find(l => l.includes('?') || l.includes('👇')) || 'Quer ver tudo? 👇';

    let ctaLines = lines.filter(l => l.includes('🍑') || l.includes('🔥') || l.includes('VER') || l.includes('CLICA')).slice(0, 3);
    if (ctaLines.length < 3) {
      ctaLines = ['🍑 QUERO VER TUDO 🍑', '🍑 QUERO VER TUDO 🍑', '🍑 QUERO VER TUDO 🍑'];
    }

    return {
      headline,
      body,
      preCta,
      cta: ctaLines.join('\n'),
      buttonText: '',
      buttonUrl
    };
  }

  /**
   * Formats the preview as HTML caption for Telegram.
   * Structure:
   * <b>HEADLINE</b>
   * body text (plain)
   * <b>preCta question 👇</b>
   * <a href="link"><b>CTA</b></a> x3
   *
   * CTAs are clickable text links, not inline keyboard buttons.
   */
  formatForTelegram(preview: PreviewContent): string {
    const ctaLines = preview.cta.split('\n').filter(line => line.trim());
    const ctaLinks = ctaLines
      .map(cta => `<a href="${preview.buttonUrl}"><b>${cta.trim()}</b></a>`)
      .join('\n');

    const headline = `<b>${preview.headline}</b>`;
    const preCta = `<b>${preview.preCta}</b>`;

    let caption = `${headline}\n\n${preview.body}\n\n${preCta}\n\n${ctaLinks}`;

    // Telegram caption limit is 1024 chars — truncate body if needed
    if (caption.length > 1024) {
      const overhead = headline.length + preCta.length + ctaLinks.length + 8; // 8 = newlines
      const maxBody = 1024 - overhead;
      const truncatedBody = preview.body.substring(0, Math.max(maxBody - 3, 0)) + '...';
      caption = `${headline}\n\n${truncatedBody}\n\n${preCta}\n\n${ctaLinks}`;
    }

    return caption;
  }

  /**
   * Builds inline keyboard buttons from the preview CTA lines.
   * Each CTA line becomes a clickable button pointing to buttonUrl.
   */
  buildInlineKeyboard(preview: PreviewContent): { inline_keyboard: Array<Array<{ text: string; url: string }>> } {
    const ctaLines = preview.cta.split('\n').filter(line => line.trim());
    const buttons = ctaLines.map(cta => [{ text: cta.trim(), url: preview.buttonUrl }]);
    return { inline_keyboard: buttons };
  }

  // ━━━━━━━━━━━━━━━━━━━ Private Methods ━━━━━━━━━━━━━━━━━━━

  private async getSettings(): Promise<Record<string, string>> {
    try {
      const prisma = (await import('../utils/prisma')).default;
      const settings = await prisma.settings.findMany();
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      return settingsMap;
    } catch (error) {
      logger.error('Failed to get settings', { error });
      return {};
    }
  }

  private async getGrokModel(action: 'preview' | 'analysis' = 'preview'): Promise<string> {
    try {
      const prisma = (await import('../utils/prisma')).default;
      const key = action === 'preview' ? 'grok_model_preview' : 'grok_model_analysis';
      const defaultKey = 'grok_model_default';

      const specific = await prisma.settings.findUnique({ where: { key } });
      if (specific?.value?.trim()) return specific.value.trim();

      const fallback = await prisma.settings.findUnique({ where: { key: defaultKey } });
      if (fallback?.value?.trim()) return fallback.value.trim();

      return 'grok-4-1-fast-non-reasoning';
    } catch {
      return 'grok-4-1-fast-non-reasoning';
    }
  }

  private buildLegacyPromptFromSettings(settings: Record<string, string>): string {
    const parts: string[] = [];
    const name = settings.model_name || '';
    const profession = settings.model_profession || '';
    const characteristics = settings.model_characteristics || '';
    const personality = settings.model_personality || '';

    if (name) parts.push(`Nome da modelo: ${name}`);
    if (profession) parts.push(`Profissão: ${profession}`);
    if (characteristics) parts.push(`Características: ${characteristics}`);
    if (personality) parts.push(`Personalidade: ${personality}`);

    // Legacy copy examples
    const examples: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const example = settings[`copy_example_${i}`];
      if (example && example.trim()) {
        examples.push(example.trim());
      }
    }

    if (examples.length > 0) {
      parts.push('\n--- Exemplos de Copy ---');
      examples.forEach((ex, i) => parts.push(`Exemplo ${i + 1}:\n${ex}`));
    }

    return parts.join('\n') || 'Você é uma modelo sensual e provocante.';
  }

  private generateFallbackPreview(analysis: GrokAnalysisResult, ctaLink: string): PreviewContent {
    const headlines = [
      'LOIRINHA SAFADA DE QUATRO 🍑🔥',
      'BUNDÃO EMPINADO PRA VOCÊ 💦😈',
      'PELADINHA E PROVOCANTE 🔥🍑',
      'CORPO PERFEITO SEM CENSURA 😈💦',
      'LOIRA GOSTOSA REBOLANDO 🍑🔥'
    ];

    const headline = headlines[Math.floor(Math.random() * headlines.length)];
    const body = `Loira safada aqui provocando, ${analysis.pose || 'posando sensual'}...\nCorpo todo à mostra, ${analysis.clothing || 'sem roupa'} e pronta pra você.\nEssa madura adora deixar você louco.`;
    const preCta = 'Quer ver tudo sem censura? 👇';

    const ctaOptions = ['🍑 VER A SAFADA 🍑', '🔥 CLICA PRA VER 🔥', '💦 VEM VER TUDO 💦', '😈 ENTRA NO VIP 😈'];
    const selectedCta = ctaOptions[Math.floor(Math.random() * ctaOptions.length)];
    const cta = `${selectedCta}\n${selectedCta}\n${selectedCta}`;

    return {
      headline,
      body,
      preCta,
      cta,
      buttonText: '',
      buttonUrl: ctaLink
    };
  }
}

export default new PreviewService();
