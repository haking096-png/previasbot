import { Telegraf } from 'telegraf';
import { telegramConfig } from '../config';
import logger from '../utils/logger';
import fs from 'fs';
import { PreviewContent } from './preview.service';
import previewService from './preview.service';

export class TelegramService {
  private defaultBot: Telegraf | null = null;
  private defaultChatId: string;
  private botCache: Map<string, Telegraf> = new Map();

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
      return this.botCache.get(botToken)!;
    }

    const bot = new Telegraf(botToken);
    this.botCache.set(botToken, bot);
    return bot;
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

    try {
      logger.info('Publishing preview to Telegram', { chatId: targetChatId, isFileId, mediaType });

      const caption = previewService.formatForTelegram(preview);
      const source = isFileId ? imageSource : { source: fs.createReadStream(imageSource) };

      let message;

      if (mediaType === 'VIDEO') {
        message = await bot.telegram.sendVideo(
          targetChatId,
          source,
          {
            caption,
            parse_mode: 'HTML',
          }
        );
      } else {
        message = await bot.telegram.sendPhoto(
          targetChatId,
          source,
          {
            caption,
            parse_mode: 'HTML',
          }
        );
      }

      logger.info('Preview published successfully', { messageId: message.message_id, mediaType });

      return { messageId: message.message_id.toString() };
    } catch (error: any) {
      logger.error('Failed to publish preview', {
        error: error.message,
        response: error.response?.description,
      });
      throw new Error(`Failed to publish to Telegram: ${error.message}`);
    }
  }

  async testConnection(botToken?: string): Promise<boolean> {
    const token = botToken || telegramConfig.botToken;
    if (!token) return false;

    try {
      const bot = this.getBotInstance(token);
      const me = await bot.telegram.getMe();
      logger.info('Telegram bot connection test successful', { botUsername: me.username });
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
