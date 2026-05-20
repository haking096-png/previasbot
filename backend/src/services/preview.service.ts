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

      const prompt = `${channelPrompt}

---

Baseado nesta análise da foto, crie UMA copy original seguindo EXATAMENTE o estilo, tom, vocabulário e estrutura dos exemplos acima:

- Cenário: ${analysis.scenario || 'não identificado'}
- Pose: ${analysis.pose || 'não identificada'}
- Roupa: ${analysis.clothing || 'não identificada'}
- Emoção: ${analysis.emotion || 'não identificada'}
- Estilo visual: ${analysis.visualStyle || 'não identificado'}
- Foco principal: ${analysis.mainFocus || 'não identificado'}
- Cores: ${analysis.colors || 'não identificadas'}
- Sensação: ${analysis.feeling || 'não identificada'}
- Descrição completa: ${analysis.description || 'não disponível'}
- Categoria: ${analysis.category || 'não categorizada'}

FORMATO DE SAÍDA (retorne APENAS texto puro, SEM HTML, SEM markdown):

HEADLINE EM CAPS COM EMOJIS

[corpo: 2-3 linhas no estilo dos exemplos]

[pergunta provocante com emoji 👇]

[EMOJI TEXTO DO CTA EMOJI]
[EMOJI TEXTO DO CTA EMOJI]
[EMOJI TEXTO DO CTA EMOJI]

REGRAS:
- COPIE o tom, estilo de emojis, vocabulário e nível de ousadia dos exemplos acima
- Varie o conteúdo baseado na análise da foto, mas MANTENHA o estilo idêntico aos exemplos
- Cada copy deve ser DIFERENTE das anteriores
- NÃO use HTML ou tags
- Retorne APENAS texto puro`;

      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: 'grok-4-1-fast-non-reasoning',
          messages: [
            {
              role: 'system',
              content: 'Você é uma copywriter. Sua tarefa é gerar textos seguindo EXATAMENTE o estilo e tom dos exemplos fornecidos pelo usuário. Retorne APENAS texto puro sem formatação.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.9,
          max_tokens: 500
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

      // Strip any HTML tags the AI might have included
      const cleanText = generatedText.replace(/<[^>]*>/g, '').trim();

      // Parse the generated text
      const lines = cleanText.split('\n');

      // Extract headline (first non-empty line)
      let headline = '';
      let startIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) {
          headline = lines[i].trim();
          startIdx = i + 1;
          break;
        }
      }
      if (!headline) headline = 'LOIRINHA SAFADA 🔥🍑';

      // Find body lines, preCta, and CTA
      const bodyLines: string[] = [];
      let preCta = '';
      let ctaLines: string[] = [];
      let currentSection = 'body';

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) {
          if (currentSection === 'body' && bodyLines.length > 0) currentSection = 'preCta';
          else if (currentSection === 'preCta' && preCta) currentSection = 'cta';
          continue;
        }

        if (currentSection === 'body') {
          bodyLines.push(line);
        } else if (currentSection === 'preCta' && !preCta) {
          preCta = line;
        } else if (currentSection === 'preCta' && preCta) {
          // If we hit another line after preCta without empty line, it's CTA
          currentSection = 'cta';
          ctaLines.push(line);
        } else if (currentSection === 'cta') {
          ctaLines.push(line);
        }
      }

      // Defaults
      const body = bodyLines.join('\n') || 'Loira gostosa aqui provocando pra você...\nCorpo todo à mostra, bem safadinha e pronta.';
      if (!preCta) preCta = 'Quer ver tudo sem censura? 👇';

      // CTA: ensure we have exactly 3 lines
      if (ctaLines.length === 0) {
        const ctaOptions = ['🍑 VER A SAFADA 🍑', '🔥 CLICA PRA VER 🔥', '💦 VEM VER TUDO 💦', '😈 ENTRA NO VIP 😈'];
        const selectedCta = ctaOptions[Math.floor(Math.random() * ctaOptions.length)];
        ctaLines = [selectedCta, selectedCta, selectedCta];
      } else if (ctaLines.length < 3) {
        // Repeat the first CTA to fill 3 lines
        while (ctaLines.length < 3) {
          ctaLines.push(ctaLines[0]);
        }
      }
      const cta = ctaLines.slice(0, 3).join('\n');

      const preview: PreviewContent = {
        headline,
        body,
        preCta,
        cta,
        buttonText: '',
        buttonUrl: effectiveCtaLink
      };

      logger.info('Preview generated successfully', { headline, preCta });
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
