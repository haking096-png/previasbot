import { Telegraf } from 'telegraf';
import { telegramConfig } from '../config';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { PreviewContent } from './preview.service';
import previewService from './preview.service';

// Retry configuration for Telegram API errors
const RETRY_CONFIG = {
  maxAttempts: 3,
  delays: [2000, 4000, 8000], // 2s, 4s, 8s
  rateLimitCodes: [429, 500, 502, 503, 504],
};

export class TelegramService {
  private defaultBot: Telegraf | null = null;
  private defaultChatId: string;
  private botCache: Map<string, Telegraf> = new Map();
  private static readonly MAX_CACHE_SIZE = 50;

  constructor() {
    this.defaultChatId = telegramConfig.chatId;
    this.initDefaultBot();
  }

  private initDefaultBot() {
    if (!telegramConfig.botToken) {
      logger.warn('Telegram bot token not configured');
      return;
    }

    try {
      this.defaultBot = new Telegraf(telegramConfig.botToken);
      this.botCache.set(telegramConfig.botToken, this.defaultBot);
      logger.info('Telegram bot initialized');
    } catch (error: any) {
      logger.error('Failed to initialize Telegram bot', { error: error.message });
    }
  }

  private getBotInstance(botToken: string): Telegraf {
    if (this.botCache.has(botToken)) {
      // Move to end (most recently used)
      const bot = this.botCache.get(botToken)!;
      this.botCache.delete(botToken);
      this.botCache.set(botToken, bot);
      return bot;
    }

    // Evict oldest if at capacity
    if (this.botCache.size >= TelegramService.MAX_CACHE_SIZE) {
      const oldestKey = this.botCache.keys().next().value;
      if (oldestKey) {
        this.botCache.delete(oldestKey);
        logger.info('Evicted oldest bot from cache', { evictedToken: oldestKey.substring(0, 10) + '...' });
      }
    }

    const bot = new Telegraf(botToken);
    this.botCache.set(botToken, bot);
    return bot;
  }

  /**
   * Check if the source is a special inline reference (AI-generated content that has no real file)
   */
  private isInlineSource(source: string): boolean {
    return source.startsWith('inline://') || source.startsWith('video-preview-');
  }

  /**
   * Create a safe read stream with error handling
   */
  private createSafeReadStream(filePath: string): { stream: NodeJS.ReadableStream; exists: boolean } {
    const exists = fs.existsSync(filePath);
    if (!exists) {
      logger.warn('File does not exist', { filePath });
      return { stream: null as any, exists: false };
    }

    const stream = fs.createReadStream(filePath);

    // Attach error handler to prevent unhandled stream errors
    stream.on('error', (err) => {
      logger.error('Stream error', { filePath, error: err.message });
    });

    return { stream, exists: true };
  }

  /**
   * Wait for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle Telegram API errors with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Record<string, any> = {}
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if this is a retriable error
        const isRetriable =
          error.code && RETRY_CONFIG.rateLimitCodes.includes(error.code) ||
          error.response?.error_code && RETRY_CONFIG.rateLimitCodes.includes(error.response.error_code);

        // Handle rate limit with retry_after
        if (error.response?.parameters?.retry_after) {
          const retryAfter = error.response.parameters.retry_after * 1000;
          logger.warn(`Rate limited by Telegram, waiting ${retryAfter}ms`, {
            attempt,
            retryAfter,
            ...context,
          });
          await this.sleep(retryAfter);
          continue;
        }

        // For retriable errors, wait with backoff
        if (isRetriable && attempt < RETRY_CONFIG.maxAttempts) {
          const delay = RETRY_CONFIG.delays[attempt - 1] || 2000;
          logger.warn(`Retriable Telegram error, retrying in ${delay}ms`, {
            attempt,
            delay,
            error: error.message,
            ...context,
          });
          await this.sleep(delay);
          continue;
        }

        // Non-retriable error or last attempt - throw immediately
        logger.error(`${operationName} failed`, {
          attempt,
          error: error.message,
          ...context,
        });
        throw error;
      }
    }

    // All retries exhausted
    throw lastError;
  }

  async publishPreview(
    imageSource: string,
    preview: PreviewContent,
    botToken?: string,
    chatId?: string,
    isFileId: boolean = false,
    mediaType: string = 'IMAGE'
  ): Promise<{ messageId: string }> {
    const token = botToken || telegramConfig.botToken;
    const targetChatId = chatId || this.defaultChatId;
    const TIMEOUT_MS = 30000; // 30 second timeout

    // DIAGNOSTIC LOG: Show what's being published
    logger.info('=== PUBLISH PREVIEW START ===', {
      hasBotToken: !!token,
      chatId: targetChatId,
      isFileId,
      mediaType,
      hasImageSource: !!imageSource,
      imageSourcePreview: imageSource ? (isFileId ? imageSource.substring(0, 20) + '...' : imageSource.split('/').pop()) : 'NONE',
      headline: preview?.headline,
 });

    if (!botToken || !chatId) {
      logger.warn('publishPreview called without explicit botToken/chatId, using global fallback', {
        hasBotToken: !!botToken,
        hasChatId: !!chatId,
        targetChatId,
      });
    }

    if (!token) {
      throw new Error('Telegram bot token not configured');
    }

    if (!targetChatId) {
      throw new Error('Telegram chat ID not configured');
    }

    const bot = this.getBotInstance(token);
    const caption = previewService.formatForTelegram(preview);

    logger.info('Caption prepared for Telegram', {
      captionLength: caption.length,
      captionPreview: caption.substring(0, 100),
    });

    // Handle text-only content (AI-generated previews), inline sources, or empty source
    const isEmptySource = !imageSource || imageSource.trim() === '';
    if (mediaType === 'TEXT' || isEmptySource || this.isInlineSource(imageSource) || this.isInlineSource(imageSource.split('/').pop() || '')) {
      logger.info('Publishing as text-only', { mediaType, imageSource, isEmptySource });

      // If source is empty but we have preview content, build message from headline + body + cta
      let messageText = caption;
      if (isEmptySource && preview) {
        const parts = [];
        if (preview.headline) parts.push(`<b>${preview.headline}</b>`);
        if (preview.body) parts.push(preview.body);
        if (preview.cta) parts.push(preview.cta);
        if (preview.buttonText && preview.buttonUrl) parts.push(`\n<a href="${preview.buttonUrl}">${preview.buttonText}</a>`);
        messageText = parts.join('\n\n') || caption;
      }

      return this.withRetry(async () => {
        const message = await Promise.race([
          bot.telegram.sendMessage(targetChatId, messageText, {
            parse_mode: 'HTML',
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Telegram API timeout after 30s')), TIMEOUT_MS)
          ),
        ]);

        logger.info('Text-only message published successfully', { messageId: message.message_id });
        return { messageId: message.message_id.toString() };
      }, 'sendMessage', { chatId: targetChatId });
    }

    try {
      logger.info('Publishing preview to Telegram', { chatId: targetChatId, isFileId, mediaType });

      let source: any;

      if (isFileId) {
        source = imageSource;
      } else {
        // Validate file exists before creating stream
        const resolvedPath = path.join(process.cwd(), imageSource);

        if (!fs.existsSync(resolvedPath)) {
          logger.error('File not found, falling back to text-only publish', { path: resolvedPath });

          return this.withRetry(async () => {
            const message = await Promise.race([
              bot.telegram.sendMessage(targetChatId, caption, {
                parse_mode: 'HTML',
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Telegram API timeout after 30s')), TIMEOUT_MS)
              ),
            ]);

            logger.info('Fallback text-only message published', { messageId: message.message_id });
            return { messageId: message.message_id.toString() };
          }, 'sendMessage (fallback)', { chatId: targetChatId });
        }

        const { stream } = this.createSafeReadStream(resolvedPath);
        source = stream;
      }

      let message;

      if (mediaType === 'VIDEO') {
        message = await this.withRetry(async () => {
          return Promise.race([
            bot.telegram.sendVideo(targetChatId, source, {
              caption,
              parse_mode: 'HTML',
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Telegram API timeout after 30s')), TIMEOUT_MS)
            ),
          ]);
        }, 'sendVideo', { chatId: targetChatId, mediaType });
      } else {
        message = await this.withRetry(async () => {
          return Promise.race([
            bot.telegram.sendPhoto(targetChatId, source, {
              caption,
              parse_mode: 'HTML',
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Telegram API timeout after 30s')), TIMEOUT_MS)
            ),
          ]);
        }, 'sendPhoto', { chatId: targetChatId, mediaType });
      }

      logger.info('=== PUBLISH PREVIEW SUCCESS ===', { messageId: message.message_id, mediaType });

      return { messageId: message.message_id.toString() };
    } catch (error: any) {
      logger.error('=== PUBLISH PREVIEW FAILED ===', {
        error: error.message,
        response: error.response?.description,
        errorCode: error.response?.error_code,
      });
      throw new Error(`Failed to publish to Telegram: ${error.message}`);
    }
  }

  /**
   * Verify bot has access to the target chat
   */
  async verifyChatAccess(botToken: string, chatId: string): Promise<{ accessible: boolean; error?: string }> {
    try {
      const bot = new Telegraf(botToken);
      const TIMEOUT_MS = 10000;

      await Promise.race([
        bot.telegram.getChat(chatId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Telegram API timeout after 10s')), TIMEOUT_MS)
        ),
      ]);

      return { accessible: true };
    } catch (error: any) {
      const errorMsg = error.response?.description || error.message;
      logger.error('Chat access verification failed', { chatId, error: errorMsg });
      return { accessible: false, error: errorMsg };
    }
  }

  async testConnection(botToken?: string): Promise<boolean> {
    const token = botToken || telegramConfig.botToken;
    if (!token) return false;

    const TIMEOUT_MS = 10000; // 10 second timeout

    try {
      const bot = this.getBotInstance(token);
      const result = await Promise.race([
        bot.telegram.getMe(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Telegram API timeout after 10s')), TIMEOUT_MS)
        ),
      ]);
      logger.info('Telegram bot connection test successful', { botUsername: result.username });
      return true;
    } catch (error: any) {
      logger.error('Telegram bot connection test failed', { error: error.message });
      return false;
    }
  }

  updateConfig(botToken?: string, chatId?: string) {
    if (botToken) {
      telegramConfig.botToken = botToken;
      this.initDefaultBot();
    }
    if (chatId) {
      this.defaultChatId = chatId;
      telegramConfig.chatId = chatId;
    }
  }
}

export default new TelegramService();
