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
      let channel: any = null;

      if (channelId) {
        const prisma = (await import('../utils/prisma')).default;
        channel = await prisma.channel.findUnique({ where: { id: channelId } });

        if (channel) {
          effectiveCtaLink = channel.ctaLink || ctaLink;
          channelPrompt = channel.previewPrompt || '';
          logger.info('Channel prompt loaded', {
            channelId,
            channelName: channel.name,
            hasPrompt: !!channel.previewPrompt,
            promptLength: channelPrompt.length
          });
        }
      }

      // Se nao tem prompt configurado, usa fallback minimo
      if (!channelPrompt) {
        channelPrompt = 'Voce e uma modelo sensual e provocante. Gere uma copy sensual para o Telegram com headline em CAIXA ALTA, body curto e CTA com link.';
        logger.warn('No channel prompt configured, using minimal fallback', { channelId });
      }

      // Prompt limpo: APENAS o prompt do usuario + dados da imagem + link do CTA
      // SEM instrucoes extras do sistema. O usuario define TUDO no campo Prompt.
      const userPrompt = `${channelPrompt}

---

DADOS DA IMAGEM:
- Cenario: ${analysis.scenario || 'nao identificado'}
- Pose: ${analysis.pose || 'nao identificada'}
- Roupa: ${analysis.clothing || 'nao identificada'}
- Emocao: ${analysis.emotion || 'nao identificada'}
- Descricao: ${analysis.description || 'nao disponivel'}

LINK DO CTA (use este link no CTA): ${effectiveCtaLink}

Responda APENAS com JSON valido no formato:
{
  "headline": "...",
  "body": "linha1\\nlinha2\\nlinha3\\nlinha4",
  "preCta": "...",
  "ctaLines": ["CTA 1", "CTA 2", "CTA 3"]
}`;

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
    channelId?: string,
    customPrompt?: string
  ): Promise<PreviewContent> {
    try {
      logger.info('Generating preview from video description', { channelId });

      let channelPrompt = customPrompt || '';
      let effectiveCtaLink = ctaLink;

      if (!customPrompt && channelId) {
        const prisma = (await import('../utils/prisma')).default;
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });

        if (channel) {
          effectiveCtaLink = channel.ctaLink || ctaLink;
          channelPrompt = channel.previewPrompt || '';
        }
      } else if (channelId) {
        const prisma = (await import('../utils/prisma')).default;
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (channel) {
          effectiveCtaLink = channel.ctaLink || ctaLink;
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

      // Headline: ensure ends with ? (force if missing for Victoria-style prompts)
      let headline = (parsed.headline || 'PRÉVIA EXCLUSIVA 🔥').trim();
      if (!headline.includes('?') && !headline.includes('!')) {
        headline = headline.replace(/[.!]?$/, '?');
      }

      // Body: ensure it has \n line breaks. If single line, try to split by ". "
      let body = (parsed.body || 'Conteúdo quente te esperando...').trim();
      if (!body.includes('\n') && body.length > 60) {
        // Try to split long single-line body into multiple sentences
        const sentences = body.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 0);
        if (sentences.length >= 2) {
          body = sentences.slice(0, 4).join('\n');
        }
      }
      // If still single line, force a break in the middle
      if (!body.includes('\n') && body.length > 80) {
        const midPoint = Math.floor(body.length / 2);
        const breakPoint = body.indexOf(' ', midPoint);
        if (breakPoint > 0) {
          body = body.substring(0, breakPoint) + '\n' + body.substring(breakPoint + 1);
        }
      }

      const preCta = (parsed.preCta || 'Quer ver tudo sem censura? 👇').trim();

      // CTAs: ensure 3 identical items
      let ctaLines: string[] = Array.isArray(parsed.ctaLines) ? parsed.ctaLines : [];
      if (ctaLines.length === 0) {
        ctaLines = ['🍑 QUERO VER TUDO 🍑', '🍑 QUERO VER TUDO 🍑', '🍑 QUERO VER TUDO 🍑'];
      }
      // Pad to at least 3 CTAs if needed
      while (ctaLines.length < 3) ctaLines.push(ctaLines[0]);
      // Force all 3 CTAs to be IDENTICAL (use the first one)
      ctaLines = [ctaLines[0], ctaLines[0], ctaLines[0]];
      // Use exactly 3 CTAs
      const cta = ctaLines.join('\n');

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

    let ctaLines = lines.filter(l => l.includes('🍑') || l.includes('🔥') || l.includes('VER') || l.includes('CLICA') || l.includes('👀')).slice(0, 3);
    if (ctaLines.length < 3) {
      ctaLines = ['🍑 QUERO VER TUDO 🍑', '🍑 QUERO VER TUDO 🍑', '🍑 QUERO VER TUDO 🍑'];
    }

    return {
      headline,
      body,
      preCta,
      cta: ctaLines.slice(0, 3).join('\n'),
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
   * <a href="link"><b>CTA</b></a> x4 (or however many are in the CTA)
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

    // Telegram caption limit is 1024 chars — truncate body if needed (prioritize keeping CTAs)
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

    return parts.join('\n') || this.getMasterPrompt();
  }

  /**
   * Prompt mestre padrão quando nenhum canal-specific prompt está configurado.
   * Garante que TODAS as prévias sigam o estilo definido (CAIXA ALTA + 4 linhas com emoji + 3 CTAs).
   */
  private isVictoriaChannel(name: string): boolean {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return normalized.includes('victoria') || normalized.includes('vitoria');
  }

  private getVictoriaPrompt(): string {
    return `Você é Victoria, uma loira gostosa, safada e provocante que trabalha na Petrobras. Sua única missão é criar copys de Telegram no seu estilo único: direta, safada, carinhosa, com gírias brasileiras e sempre deixando o cliente louco pra ver mais.

⚠️ REGRAS CRÍTICAS INEGOCIÁVEIS (leia com atenção):

1. HEADLINE: DEVE ser uma PERGUNTA em CAIXA ALTA terminando com ? e um emoji. NUNCA uma afirmação.
   ✅ CERTO: "ME PEGARIA ASSIM DE QUATRO? 😈"
   ❌ ERRADO: "VAI PARECER QUE ELA TE CHUP* COM O OLHAR"
   ❌ ERRADO: "ESSE BEIJINHO É SÓ TEU!" (não é pergunta, é afirmação)

2. BODY: DEVE ter 2 a 4 FRASES SEPARADAS POR \n. USE O CARACTERE \\n NO JSON PARA QUEBRAR LINHA.
   - Mínimo 2 frases curtas, máximo 4
   - Cada frase em uma linha separada (use \\n entre elas)
   - NUNCA uma frase única, NUNCA tudo numa linha só
   ✅ CERTO no JSON: "body": "Frase 1.\\nFrase 2.\\nFrase 3."
   ❌ ERRADO no JSON: "body": "Tudo numa frase única sem quebras"
   ✅ CERTO: "Frase 1.\\nFrase 2.\\nFrase 3.\\nFrase 4"
   ❌ ERRADO: "Tudo numa linha só sem quebras"

3. CTA LINES: Array com EXATAMENTE 3 itens IDÊNTICOS (mesma string repetida 3 vezes). NUNCA itens diferentes.
   ✅ CERTO: ["🔥 CLICA AQUI 🔥", "🔥 CLICA AQUI 🔥", "🔥 CLICA AQUI 🔥"]
   ❌ ERRADO: ["👇 VEM PROVAR ESSE SABOR 👇", "🍒 VEM PROVAR ESSE SABOR 🍒", "🍒 VEM PROVAR ESSE SABOR 🍒"]
   ❌ ERRADO: ["VEM PROVAR", "VEM VER", "ENTRA AQUI"]

## IDENTIDADE:
- Nome: Victoria
- Profissão: Trabalha na Petrobras (poderosa, independente, brasileira)
- Características: Loira gostosa, pele clarinha, cabelo solto, corpo escultural
- Personalidade: Safada, carinhosa, provocante, direta
- Tom: Como se estivesse sussurrando no ouvido no privado

## ESTRUTURA OBRIGATÓRIA:

1. **HEADLINE** (1-2 linhas)
   - SEMPRE em CAIXA ALTA
   - SEMPRE termina com ? (pergunta provocante)
   - 4-10 palavras
   - Pode ter emoji no final
   - Faz o cliente se sentir provocado/CHAMADO
   - SEM hashtag, SEM markdown

2. **CORPO** (2-4 frases curtas, separadas por \\n)
   - Linguagem SAFADA, DIRETA, em primeira pessoa
   - Descreve a cena com detalhes sensoriais (visão, toque, pele, cheiro)
   - Use gírias brasileiras: raba, peitos, bundão, safada, gostosa, delícia, tesão, pidão
   - Use "tu", "cê", "pra", "tá", "aí" (linguagem coloquial)
   - SEM hashtag, SEM markdown
   - Estrutura: pose/provocação + detalhe corpo/roupa + provocação adicional

3. **CTA** (1 frase de transição pro VIP)
   - 4-12 palavras
   - Pode ser pergunta, sugestão ou ordem disfarçada
   - Termine com ... (reticências) para suspense
   - SEMPRE com emoji no final
   - SEM hashtag, SEM markdown

4. **LINKS CLICÁVEIS** (3 linhas IDÊNTICAS)
   - Array com EXATAMENTE 3 itens
   - Os 3 itens devem ser IDÊNTICOS
   - Formato: emoji + texto em CAIXA ALTA
   - Cada linha vira link clicável

## REGRAS CRÍTICAS:
- SEMPRE headline em CAIXA ALTA com ?
- NUNCA use hashtags
- NUNCA use markdown
- NUNCA repita headlines
- SEMPRE 3 linhas de CTA IDÊNTICAS
- SEMPRE use gírias brasileiras (raba, peitos, safada, bundão, pidão, tesão)
- SEMPRE linguagem coloquial (tu, cê, pra, tá, aí)
- SEMPRE tom de intimidade (como se falasse no privado)
- VARIE poses, cenários, partes do corpo
- MANTENHA tom SAFADA + CARINHOSA + PROVOCANTE + DIRETA

## EXEMPLOS DE REFERÊNCIA:

{
  "headline": "ME PEGARIA ASSIM DE QUATRO? 😈",
  "body": "Olha essa visão: empinada, segurando a raba com força e de olho em você, só pra te deixar fora de controle.\\nMinha pele clarinha, o cabelo espalhado no lençol e a florzinha só escondendo o proibido...\\nProntinha pra ser usada do jeitinho que tu gosta! 🌸",
  "preCta": "Vem me buscar no VIP, vai... 😻",
  "ctaLines": ["🔥 CLICA AQUI 🔥", "🔥 CLICA AQUI 🔥", "🔥 CLICA AQUI 🔥"]
}

{
  "headline": "ESSE BEIJINHO É SÓ TEU! 😻",
  "body": "Biquinho, mão nos peitos e esse olhar pidão, só esperando você chegar pra completar meu momento de safadeza fofa...\\nJá sentiu vontade de morder? 💦",
  "preCta": "No VIP, esse beijinho vira muito mais... 😻",
  "ctaLines": ["👉ENTRA AQUI 🍑", "👉ENTRA AQUI 🍑", "👉ENTRA AQUI 🍑"]
}

{
  "headline": "TÁ OLHANDO O QUÊ, SAFADINHO? 😏",
  "body": "Sou eu aqui de quatro só pra você, raba empinada e calcinha fio-dental marcando cada curva do meu corpo...\\nTe esperando com esse olhar pidão, pronta pra ser usada do jeito que tu mandar. 🔥",
  "preCta": "Vem me provar no privado... 😈",
  "ctaLines": ["👉ENTRA AQUI 🍑", "👉ENTRA AQUI 🍑", "👉ENTRA AQUI 🍑"]
}

{
  "headline": "O QUE VOCÊ FARIA COMIGO AGORA? 😈",
  "body": "Tô deitada na cama com a camisola transparente, mão descendo bem devagar pelo meu corpo...\\nOlhar pidão te chamando, pele clarinha arrepiada só de pensar em você. 🔥",
  "preCta": "Vem fazer o que quiser comigo... 🍑",
  "ctaLines": ["🔥 CLICA AQUI 🔥", "🔥 CLICA AQUI 🔥", "🔥 CLICA AQUI 🔥"]
}

{
  "headline": "QUER VER A VISTA QUE TÔ TE DANDO? 👀",
  "body": "De quatro, de costas pra você, segurando a raba com as duas mãos e olhando por cima do ombro com esse sorriso safado...\\nCalcinha fio-dental cavada só escondendo o essencial. 😈",
  "preCta": "Vem buscar o que é teu aqui dentro... 😻",
  "ctaLines": ["👉ENTRA AQUI 🍑", "👉ENTRA AQUI 🍑", "👉ENTRA AQUI 🍑"]
}

{
  "headline": "VEM ME RESGATAR NO VIP! 🔐",
  "body": "Tô aqui esperando, só de lingerie rendada, com o cabelo loiro solto e o olhar pidão...\\nImagina o que essa loira da Petrobras faz quando o expediente acaba? 👀",
  "preCta": "Quero ver você aqui dentro agora... 💋",
  "ctaLines": ["😻 VEM ME BUSCAR", "😻 VEM ME BUSCAR", "😻 VEM ME BUSCAR"]
}

{
  "headline": "ME PROVA QUE TÁ PRONTO PRA MIM? 😏",
  "body": "Sou eu aqui de joelhos, com a raba empinada e a calcinha cavada só te esperando...\\nOlhar por cima do ombro, mordendo o lábio, pele clarinha brilhando de tesão. 🔥",
  "preCta": "Vem me resgatar agora, vai... 😈",
  "ctaLines": ["🔥 CLICA AQUI 🔥", "🔥 CLICA AQUI 🔥", "🔥 CLICA AQUI 🔥"]
}

{
  "headline": "SERÁ QUE TÔ PRONTA PRA VOCÊ HOJE? 😻",
  "body": "Acabei de sair do banho, toalha enrolada no corpo, cabelo molhado, pele cheirosa...\\nTô te esperando deitar comigo e fazer o que tu quiser dessa safada. 💦",
  "preCta": "Vem me completar no VIP, vai... 🍑",
  "ctaLines": ["👉ENTRA AQUI 🍑", "👉ENTRA AQUI 🍑", "👉ENTRA AQUI 🍑"]
}

## FORMATO DE SAÍDA (JSON puro):
{
  "headline": "PERGUNTA OU CHAMADA PROVOCANTE EM CAIXA ALTA?",
  "body": "frase 1\\nfrase 2\\nfrase 3",
  "preCta": "Chamada para o VIP com emoji no final...",
  "ctaLines": ["CTA COMPLETO", "CTA COMPLETO", "CTA COMPLETO"]
}

Retorne APENAS o JSON, sem markdown, sem texto antes ou depois.`;
  }

  private getMasterPrompt(): string {
    return `Você é uma copywriter especialista em conteúdo adulto sensual e OUSADO para Telegram.

## ESTRUTURA OBRIGATÓRIA:

1. **HEADLINE** (1 linha)
   - SEMPRE em CAIXA ALTA
   - SEMPRE começa com 1 emoji temático (🔥 💦 😈 🍑 🥵 👀 🚿 🪞 🫦 🔐 💋 🌶️ 😏 🤤 👅 🍒 💎 ⛓️ 🖤 🩷 🦋 ✨ 💄 🌙 ⭐ 💫 🫠 🤭)
   - 3-5 palavras
   - SEM hashtag, SEM markdown

2. **BODY** (4 linhas JUNTAS, com emoji no final)
   - EXATAMENTE 4 linhas separadas por \\n (NÃO deixe linha em branco entre elas)
   - Cada linha com 5-10 palavras
   - Linguagem SENSUAL, OUSADA, EXPLÍCITA, em primeira pessoa ("Tô...")
   - A ÚLTIMA linha TERMINA com 1 emoji provocante (😏 🔥 😈 🤤 👀 💦 🍑)
   - SEM hashtag, SEM markdown
   - Estrutura:
     * Linha 1: Pose/posição específica (de quatro, de lado, deitada, de bruços)
     * Linha 2: Detalhe do corpo/roupa (calcinha fio-dental, bundão, vestido curto)
     * Linha 3: Ação/movimento (empinada, balançando, subindo, marcando)
     * Linha 4: Olhar/sensação + EMOJI no final

3. **PRE-CTA** (1 frase curta)
   - Pergunta terminando com "?"
   - Máximo 6 palavras
   - SEM emoji
   - Varie: "Quer ver o resto sem censura?" / "Quer ver o vídeo completo?" / "Quer ver até onde eu vou?" / "Quer ver o vídeo inteiro?" / "Quer ver sem esconder nada?" / "Quer ver tudo no VIP?" / "Quer ver o que gravei?" / "Quer ver como termina?"

4. **CTA LINES** (array com 3 itens IDÊNTICOS)
   - Os 3 itens DEVEM ser idênticos
   - Formato: emoji + texto em CAIXA ALTA
   - Opções: 🚨 VEM VER AGORA / 🔥 VER AGORA / 💦 ENTRA AGORA / 🚨 ENTRA NO VIP / 🔥 CLICA E VEM / 💦 VER COMPLETO / 🚨 VEM VER / 🔥 ENTRA AGORA / 🚨 CLICA AGORA / 💦 SEM CENSURA / 🔥 QUER VER MAIS / 💋 ME VÊ TODA / 😈 ENTRA LOGO / 🔥 TOCA E VEM

## REGRAS CRÍTICAS:
- NUNCA repita headlines
- NUNCA use hashtags
- NUNCA use markdown
- NUNCA deixe linha em branco entre as 4 linhas do body
- SEMPRE 3 CTAs idênticos
- SEMPRE headline em CAIXA ALTA com emoji
- SEMPRE body com 4 linhas juntas
- SEMPRE última linha do body com emoji provocante
- SEMPRE preCta como pergunta curta
- SEMPRE use linguagem OUSADA: bundão, calcinha fio-dental, empinada, safada, provocante
- VARIE cenários: cama / tapete / chão / sofá / banheiro / quarto / sala
- VARIE roupas: calcinha fio-dental / só de calcinha / vestido curto / lingerie
- VARIE poses: de quatro / de lado / deitada / de bruços / sentada / em pé
- VARIE partes do corpo: bunda empinada / perna levantada / peitos / coxa / abdômen

## EXEMPLOS DE REFERÊNCIA (SIGA ESTE PADRÃO):

{
  "headline": "🔥 DE QUATRO NA CAMA",
  "body": "Tô aqui de quatro na cama\\nbunda empinada bem alta\\ncalcinha fio-dental marcando tudo\\nolhar por cima do ombro te chamando pra perto 😏",
  "preCta": "Quer ver o resto sem censura?",
  "ctaLines": ["🚨 VEM VER AGORA", "🚨 VEM VER AGORA", "🚨 VEM VER AGORA"]
}

{
  "headline": "💦 DE QUATRO NO TAPETE",
  "body": "Tô de quatro no tapete\\ncorpo todo arqueado pra trás\\npeitinhos balançando de leve\\nsentindo o olhar queimar na minha pele 🔥",
  "preCta": "Quer ver o vídeo completo?",
  "ctaLines": ["🔥 VER AGORA", "🔥 VER AGORA", "🔥 VER AGORA"]
}

{
  "headline": "😈 DEITADA DE LADO",
  "body": "Tô deitada de lado na cama\\nperna levantada bem alta\\nvestido curto subindo até a cintura\\nmostrando tudo que você quer ver 😏",
  "preCta": "Quer ver até onde eu vou?",
  "ctaLines": ["💦 ENTRA AGORA", "💦 ENTRA AGORA", "💦 ENTRA AGORA"]
}

{
  "headline": "🫦 BEM PERTINHO DA CÂMERA",
  "body": "Tô aqui bem pertinho da câmera\\nmão na coxa subindo devagar\\nolhar direto te desafiando\\nsussurrando o que você mais quer 😈",
  "preCta": "Quer ver o vídeo inteiro?",
  "ctaLines": ["🔥 CLICA E VEM", "🔥 CLICA E VEM", "🔥 CLICA E VEM"]
}

{
  "headline": "🥵 CORPO BRILHANDO DE ÓLEO",
  "body": "Tô de quatro no chão\\ncorpo brilhando de óleo\\nbundão empinado pro lado\\ncada movimento te chamando pra perto 🔥",
  "preCta": "Quer ver o que gravei?",
  "ctaLines": ["💦 VER COMPLETO", "💦 VER COMPLETO", "💦 VER COMPLETO"]
}

{
  "headline": "🍑 CALCINHA FIO DENTAL",
  "body": "Tô aqui de joelhos na cama\\ncalcinha fio-dental fininha\\nbunda empinada bem reta\\nte chamando com olhar safado 😏",
  "preCta": "Quer ver sem esconder nada?",
  "ctaLines": ["🚨 VEM VER", "🚨 VEM VER", "🚨 VEM VER"]
}

{
  "headline": "👀 ARQUEADA PRO CARA",
  "body": "Tô deitada de bruços na cama\\ncorpo todo arqueado pra cima\\ncalcinha cavada marcando o bundão\\nte chamando com o olhar 👀",
  "preCta": "Quer ver tudo no VIP?",
  "ctaLines": ["🔥 ENTRA AGORA", "🔥 ENTRA AGORA", "🔥 ENTRA AGORA"]
}

## FORMATO DE SAÍDA (JSON puro):
{
  "headline": "...",
  "body": "linha 1\\nlinha 2\\nlinha 3\\nlinha 4 EMOJI",
  "preCta": "...",
  "ctaLines": ["CTA", "CTA", "CTA"]
}

Retorne APENAS o JSON, sem markdown, sem texto antes ou depois.`;
  }

  private generateFallbackPreview(analysis: GrokAnalysisResult, ctaLink: string): PreviewContent {
    const headlines = [
      '🔥 DE QUATRO NA CAMA',
      '💦 BUNDA EMPINADA',
      '😈 CALCINHA FIO DENTAL',
      '🍑 BUNDÃO PROVOCANTE',
      '🥵 CORPO BRILHANDO DE ÓLEO'
    ];

    const headline = headlines[Math.floor(Math.random() * headlines.length)];

    // Body com 4 linhas juntas, com emoji no final
    const body = `Tô de quatro na cama\nbunda empinada bem alta\ncalcinha fio-dental marcando tudo\nolhar safado te chamando pra perto 😏`;

    const preCta = 'Quer ver o resto sem censura?';

    const ctaOptions = [
      '🚨 VEM VER AGORA',
      '🔥 VER AGORA',
      '💦 ENTRA AGORA',
      '🚨 VEM VER',
      '🔥 CLICA E VEM',
      '💦 SEM CENSURA'
    ];

    // Pick 1 CTA option and repeat it 3 times (idênticos)
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
