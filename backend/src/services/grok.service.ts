import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import { grokConfig } from '../config';
import logger from '../utils/logger';
import { grokCircuitBreaker } from '../utils/circuitBreaker';

// ━━━━━━━━━━━━━━━━━━━ Types ━━━━━━━━━━━━━━━━━━━

export interface GrokAnalysisResult {
  scenario?: string;
  pose?: string;
  clothing?: string;
  emotion?: string;
  visualStyle?: string;
  mainFocus?: string;
  colors?: string;
  feeling?: string;
  description?: string;
  headline?: string;
  copy?: string;
  hashtags?: string;
  category?: string;
  rawData?: string;
}

interface GrokRequestOptions {
  maxRetries?: number;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_OPTIONS: Required<GrokRequestOptions> = {
  maxRetries: 3,
  timeoutMs: 60000,
  temperature: 0.7,
  maxTokens: 1500,
};

// ━━━━━━━━━━━━━━━━━━━ Service ━━━━━━━━━━━━━━━━━━━

export class GrokService {
  private apiKey: string;
  private apiUrl: string;

  // Default fallback model
  private readonly DEFAULT_MODEL = 'grok-4-1-fast-non-reasoning';

  constructor() {
    this.apiKey = grokConfig.apiKey;
    this.apiUrl = grokConfig.apiUrl;
  }

  // ━━━━━━━━━━━━━━━━━━━ Public Methods ━━━━━━━━━━━━━━━━━━━

  async analyzeImage(imagePath: string, options?: GrokRequestOptions): Promise<GrokAnalysisResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    this.validateApiKey();
    this.validateImageFile(imagePath);

    const { base64Image, mimeType } = this.readImageAsBase64(imagePath);
    const fileName = path.basename(imagePath);

    logger.info('Starting image analysis', { fileName, model: this.DEFAULT_MODEL });

    const prompt = `Você é uma especialista em análise de imagens para conteúdo de redes sociais.

Analise esta imagem detalhadamente e retorne APENAS um JSON válido com os seguintes campos (em português brasileiro):

{
  "scenario": "descrição detalhada do cenário/ambiente/locação",
  "pose": "descrição da pose, posição corporal e linguagem corporal",
  "clothing": "descrição detalhada da roupa/vestimenta/acessórios",
  "emotion": "emoção/expressão facial e corporal transmitida",
  "visualStyle": "estilo visual da foto (iluminação, ângulo, qualidade, filtros)",
  "mainFocus": "elemento principal que chama atenção na imagem",
  "colors": "paleta de cores predominantes e tons",
  "feeling": "sensação/atmosfera geral que a imagem transmite",
  "description": "descrição completa da imagem em 2-3 frases",
  "headline": "sugestão de headline curta e impactante (2-4 palavras)",
  "copy": "sugestão de copy persuasiva curta para redes sociais (1-2 frases)",
  "hashtags": "5-8 hashtags relevantes separadas por espaço",
  "category": "categoria da imagem (ex: lifestyle, sensual, fashion, fitness, casual, profissional)"
}

Seja descritiva, específica e criativa. Retorne APENAS o JSON, sem texto adicional, sem markdown.`;

    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'image_url' as const,
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
          {
            type: 'text' as const,
            text: prompt,
          },
        ],
      },
    ];

    const model = await this.getModelForAction('analysis');
    const responseContent = await this.callGrokAPI(messages, opts, model);
    const result = this.parseAnalysisResponse(responseContent);

    logger.info('Image analysis completed successfully', {
      fileName,
      category: result.category,
      hasDescription: !!result.description,
    });

    return result;
  }

  async generateCtaPresente(
    ctaPrompt: string,
    ctaLink: string,
    styleGuide?: string   // main channel prompt (user's big style examples)
  ): Promise<{ headline: string; body: string; cta: string }> {
    this.validateApiKey();

    const styleSection = styleGuide
      ? `ESTILO GERAL DO CANAL (use como referência principal de tom, emojis, estrutura e ousadia):\n\n${styleGuide}\n\n`
      : '';

    const prompt = `${styleSection}${ctaPrompt}

---

TAREFA: Baseado nas instruções e exemplos acima (priorize o ESTILO GERAL DO CANAL se existir), crie UM NOVO CTA presente ORIGINAL e DIFERENTE dos exemplos, mas seguindo EXATAMENTE o mesmo tom, estilo, vocabulário, emojis, repetições e nível de ousadia.

O link do CTA é: ${ctaLink}

Retorne APENAS um JSON válido com esta estrutura:
{
  "headline": "HEADLINE NO ESTILO DOS EXEMPLOS",
  "body": "corpo no estilo dos exemplos (pode ter 2-3 linhas)",
  "cta": "CTAs no estilo dos exemplos - pode ser múltiplas linhas separadas por nova linha (ex: 'CTA 1\\nCTA 2\\nCTA 3\\nCTA 4') ou uma linha única que será repetida"
}

Retorne APENAS o JSON, sem markdown, sem texto extra.`;

    const messages = [{ role: 'user' as const, content: prompt }];
    const model = await this.getModelForAction('cta');
    const responseContent = await this.callGrokAPI(messages, { ...DEFAULT_OPTIONS, temperature: 0.9, maxTokens: 500 }, model);

    try {
      let clean = responseContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      clean = clean.replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '');
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const sanitized = jsonMatch[0].replace(/[\n\r\t]/g, ' ');
      const parsed = JSON.parse(sanitized);
      return {
        headline: parsed.headline || 'PRESENTE PRA VOCÊ 🎁',
        body: parsed.body || 'Vim te dar um presentinho...',
        cta: parsed.cta || '🎁 RESGATAR PRESENTE',
      };
    } catch (error: any) {
      logger.warn('Failed to parse CTA response, using fallback', { error: error.message });
      return {
        headline: 'PRESENTE PRA VOCÊ 🎁',
        body: 'Vim te dar um presentinho especial...',
        cta: '🎁 RESGATAR PRESENTE',
      };
    }
  }

  async generateEnquete(
    enquetePrompt: string,
    styleGuide?: string   // main channel prompt for consistent style
  ): Promise<{ question: string; options: string[] }> {
    this.validateApiKey();

    const styleSection = styleGuide
      ? `ESTILO GERAL DO CANAL (use como referência principal de tom, emojis, estrutura e ousadia):\n\n${styleGuide}\n\n`
      : '';

    const prompt = `${styleSection}${enquetePrompt}

---

TAREFA: Baseado nas instruções e exemplos acima (priorize o ESTILO GERAL DO CANAL se existir), crie UMA NOVA enquete ORIGINAL e DIFERENTE dos exemplos, mas seguindo EXATAMENTE o mesmo tom, estilo, vocabulário, emojis e nível de interação.

Retorne APENAS um JSON válido com esta estrutura:
{
  "question": "PERGUNTA NO ESTILO DOS EXEMPLOS",
  "options": ["opção 1", "opção 2", "opção 3"]
}

Retorne APENAS o JSON, sem markdown, sem texto extra.`;

    const messages = [{ role: 'user' as const, content: prompt }];
    const model = await this.getModelForAction('enquete');
    const responseContent = await this.callGrokAPI(messages, { ...DEFAULT_OPTIONS, temperature: 0.9, maxTokens: 300 }, model);

    try {
      let clean = responseContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      // Remove control characters that break JSON parsing
      clean = clean.replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '');
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      // Sanitize the JSON string: replace unescaped newlines inside string values
      const sanitized = jsonMatch[0].replace(/[\n\r\t]/g, ' ');
      const parsed = JSON.parse(sanitized);

      if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length < 2) {
        throw new Error('Invalid enquete format');
      }

      return {
        question: parsed.question,
        options: parsed.options.slice(0, 4), // Max 4 options for Telegram
      };
    } catch (error: any) {
      logger.warn('Failed to parse enquete response, using fallback', { error: error.message });
      return {
        question: 'O que vocês preferem? 🔥',
        options: ['Opção 1 😈', 'Opção 2 🤤', 'Opção 3 🔥'],
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━ Private Methods ━━━━━━━━━━━━━━━━━━━

  private validateApiKey(): void {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('GROK_API_KEY não configurada. Verifique o arquivo .env');
    }
  }

  private validateImageFile(imagePath: string): void {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Arquivo de imagem não encontrado: ${imagePath}`);
    }

    const stats = fs.statSync(imagePath);
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (stats.size > maxSize) {
      throw new Error(`Imagem muito grande (${(stats.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB`);
    }

    const ext = path.extname(imagePath).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExts.includes(ext)) {
      throw new Error(`Formato de imagem não suportado: ${ext}. Use: ${allowedExts.join(', ')}`);
    }
  }

  private readImageAsBase64(imagePath: string): { base64Image: string; mimeType: string } {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const ext = path.extname(imagePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mimeType = mimeMap[ext] || 'image/jpeg';

    logger.info('Image loaded', {
      size: `${(imageBuffer.length / 1024).toFixed(1)}KB`,
      mimeType,
    });

    return { base64Image, mimeType };
  }

  private async callGrokAPI(messages: any[], opts: Required<GrokRequestOptions>, modelOverride?: string): Promise<string> {
    const model = modelOverride || this.DEFAULT_MODEL;

    // Use circuit breaker to prevent cascade failures
    return await grokCircuitBreaker.execute(async () => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
          logger.info('Calling xAI API', {
            attempt,
            maxRetries: opts.maxRetries,
            model,
            circuitBreakerState: grokCircuitBreaker.getState(),
          });

          const response = await axios.post(
            `${this.apiUrl}/chat/completions`,
            {
              model,
              messages,
              temperature: opts.temperature,
              max_tokens: opts.maxTokens,
            },
            {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: opts.timeoutMs,
            }
          );

          const content = response.data?.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error('Resposta vazia da API xAI');
          }

          logger.info('xAI API response received', {
            attempt,
            contentLength: content.length,
            usage: response.data?.usage,
          });

          return content;
        } catch (error: any) {
          lastError = error;
          const isAxiosError = error instanceof AxiosError;
          const status = isAxiosError ? error.response?.status : undefined;
          const errorData = isAxiosError ? error.response?.data : undefined;

          logger.warn('xAI API call failed', {
            attempt,
            maxRetries: opts.maxRetries,
            status,
            error: error.message,
            errorData,
          });

          // Don't retry on client errors (except 429 rate limit)
          if (status && status >= 400 && status < 500 && status !== 429) {
            const errorMsg = errorData?.error?.message || errorData?.error || error.message;
            if (status === 401) {
              logger.error('━━━ API KEY INVÁLIDA ━━━ Verifique GROK_API_KEY no .env. Acesse https://console.x.ai para gerar uma nova key.');
            }
            throw new Error(`Erro da API xAI (${status}): ${errorMsg}`);
          }

          // Wait before retry with exponential backoff + jitter
          if (attempt < opts.maxRetries) {
            const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) + jitter;
            logger.info('Retrying after delay', { delay: Math.round(delay), nextAttempt: attempt + 1 });
            await this.sleep(delay);
          }
        }
      }

      throw lastError || new Error('Max retries reached for Grok API');
    });
  }

  private parseAnalysisResponse(content: string): GrokAnalysisResult {
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

      // Try to extract JSON object
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Nenhum JSON encontrado na resposta');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        scenario: parsed.scenario || undefined,
        pose: parsed.pose || undefined,
        clothing: parsed.clothing || undefined,
        emotion: parsed.emotion || undefined,
        visualStyle: parsed.visualStyle || undefined,
        mainFocus: parsed.mainFocus || undefined,
        colors: parsed.colors || undefined,
        feeling: parsed.feeling || undefined,
        description: parsed.description || undefined,
        headline: parsed.headline || undefined,
        copy: parsed.copy || undefined,
        hashtags: parsed.hashtags || undefined,
        category: parsed.category || undefined,
        rawData: content,
      };
    } catch (parseError: any) {
      logger.warn('Failed to parse API response as JSON', {
        error: parseError.message,
        contentPreview: content.substring(0, 200),
      });

      // Fallback: use raw content as description
      return {
        description: content.substring(0, 500),
        rawData: content,
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Returns the appropriate model for a given action.
   * Falls back to default if no specific model is configured.
   */
  private async getModelForAction(action: 'analysis' | 'preview' | 'enquete' | 'cta'): Promise<string> {
    try {
      const prisma = (await import('../utils/prisma')).default;

      const keyMap = {
        analysis: 'grok_model_analysis',
        preview: 'grok_model_preview',
        enquete: 'grok_model_enquete',
        cta: 'grok_model_cta',
      };

      const specificKey = keyMap[action];
      const defaultKey = 'grok_model_default';

      // Try specific model first
      const specific = await prisma.settings.findUnique({ where: { key: specificKey } });
      if (specific?.value && specific.value.trim() !== '') {
        return specific.value.trim();
      }

      // Fallback to default
      const fallback = await prisma.settings.findUnique({ where: { key: defaultKey } });
      if (fallback?.value && fallback.value.trim() !== '') {
        return fallback.value.trim();
      }

      // Hardcoded default
      return this.DEFAULT_MODEL;
    } catch (error) {
      logger.warn(`Failed to load model for action ${action}, using default`);
      return this.DEFAULT_MODEL;
    }
  }
}

export default new GrokService();
