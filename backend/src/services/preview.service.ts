import axios from 'axios';
import { grokConfig, ctaConfig } from '../config';
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

      let modelProfile: string;
      let copyExamples: string;
      let effectiveCtaLink = ctaLink;

      if (channelId) {
        // Use channel-specific settings
        const prisma = (await import('../utils/prisma')).default;
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });

        if (channel) {
          effectiveCtaLink = channel.ctaLink || ctaLink;
          const channelSettings: Record<string, string> = {
            model_name: channel.modelName || '',
            model_profession: channel.modelProfession || '',
            model_characteristics: channel.modelCharacteristics || '',
            model_personality: channel.modelPersonality || '',
          };
          modelProfile = this.buildModelProfile(channelSettings);

          // Parse channel copy examples from JSON
          let examples: string[] = [];
          if (channel.copyExamples) {
            try {
              examples = JSON.parse(channel.copyExamples);
            } catch { examples = []; }
          }
          copyExamples = this.buildCopyExamplesFromArray(examples);
        } else {
          const settings = await this.getSettings();
          modelProfile = this.buildModelProfile(settings);
          copyExamples = this.getCopyExamples(settings);
        }
      } else {
        // Fallback to global settings
        const settings = await this.getSettings();
        modelProfile = this.buildModelProfile(settings);
        copyExamples = this.getCopyExamples(settings);
      }

      const prompt = `Você é uma influenciadora loira criando prévias sensuais para seu canal do Telegram. Seja natural, criativa e provocante como uma pessoa real.

${modelProfile}

Baseado nesta análise da foto:
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
- Sugestão de headline: ${analysis.headline || 'nenhuma'}

${copyExamples}

FORMATO EXATO (siga RIGOROSAMENTE, retorne APENAS texto puro SEM HTML):

HEADLINE COM EMOJIS EM CAPS

[Linha 1: descrição safada da cena]
[Linha 2: mais detalhes sensuais]
[Linha 3 (opcional): complemento provocante]

[Pergunta provocante com emoji no final? 👇]

[EMOJI TEXTO DO CTA EMOJI]
[EMOJI TEXTO DO CTA EMOJI]
[EMOJI TEXTO DO CTA EMOJI]

EXEMPLO:
BUNDÃO EMPINADO COM PLUG 🍑🔥

Coroa loira de quatro, bundão pra cima e plugzão roxo enfiado fundo...
Corpo perfeito rebolando pra você ver cada detalhe.
Essa madura safada adora provocar assim.

Quer ver ela gemendo e levando gostoso? 👇

🍑 VER A SAFADA DE QUATRO 🍑
🍑 VER A SAFADA DE QUATRO 🍑
🍑 VER A SAFADA DE QUATRO 🍑

REGRAS CRÍTICAS:
- HEADLINE: TEXTO EM CAPS com emojis (sem emoji no início, emojis no final)
- CORPO: 2-3 linhas descritivas, safadas e explícitas
- PRÉ-CTA: 1 pergunta provocante terminando com emoji 👇
- CTA: Mesma frase repetida 3x com emojis envolvendo o texto
- SEJA ÚNICA E CRIATIVA - NUNCA repita as mesmas palavras ou frases
- Use linguagem SENSUAL com censura parcial nas palavras explícitas (buc*tinha, cuz*nho, bund*o, peit*es). Outras palavras como safada, gostoso, peladinha, gemendo, rebolando podem ser escritas normalmente.
- Sempre mencione que é LOIRA
- Varie os CTAs: VER A SAFADA, CLICA PRA VER, VEM VER TUDO, ASSISTE AGORA, ENTRA NO VIP, VER PELADINHA
- NÃO use HTML, NÃO use <b>, <a>, <i> ou qualquer tag
- Retorne APENAS texto puro

IMPORTANTE: Cada copy deve ser COMPLETAMENTE DIFERENTE. Use sinônimos, varie estruturas, seja criativa!`;

      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: 'grok-4-1-fast-non-reasoning',
          messages: [
            {
              role: 'system',
              content: 'Você gera textos sensuais para prévias de Telegram. Retorne APENAS texto puro sem formatação HTML. Seja extremamente safada e provocante.'
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
   */
  formatForTelegram(preview: PreviewContent): string {
    const ctaLines = preview.cta.split('\n').filter(line => line.trim());
    const ctaLinks = ctaLines
      .map(cta => `<a href="${preview.buttonUrl}"><b>${cta.trim()}</b></a>`)
      .join('\n');

    return `<b>${preview.headline}</b>

${preview.body}

<b>${preview.preCta}</b>

${ctaLinks}`;
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

  private buildModelProfile(settings: Record<string, string>): string {
    const name = settings.model_name || '';
    const profession = settings.model_profession || '';
    const characteristics = settings.model_characteristics || '';
    const personality = settings.model_personality || '';

    if (!name && !profession && !characteristics && !personality) {
      return 'Você é uma modelo loira, madura, sensual e provocante.';
    }

    let profile = 'SOBRE VOCÊ:\n';
    if (name) profile += `- Nome: ${name}\n`;
    if (profession) profile += `- Profissão: ${profession}\n`;
    if (characteristics) profile += `- Características: ${characteristics}\n`;
    if (personality) profile += `- Personalidade: ${personality}\n`;

    return profile;
  }

  private getCopyExamples(settings: Record<string, string>): string {
    const examples: string[] = [];

    for (let i = 1; i <= 5; i++) {
      const example = settings[`copy_example_${i}`];
      if (example && example.trim()) {
        examples.push(example.trim());
      }
    }

    return this.buildCopyExamplesFromArray(examples);
  }

  private buildCopyExamplesFromArray(examples: string[]): string {
    if (examples.length === 0) {
      return '';
    }

    const formatted = examples.map((ex, i) => `EXEMPLO ${i + 1}:\n${ex}`).join('\n\n');

    return `COPIE EXATAMENTE a estrutura, tom, estilo de emojis e padrão de quebras de linha destes exemplos.
Apenas VARIE o conteúdo baseado na análise da imagem. A ESTRUTURA deve ser IDÊNTICA aos exemplos.

${formatted}`;
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
