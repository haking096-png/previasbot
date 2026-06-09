import { Request, Response } from 'express';
import { Telegraf } from 'telegraf';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

// Validation regex patterns - Telegram bot tokens are typically30-40 chars after the colon
const BOT_TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{30,40}$/;
const CHAT_ID_REGEX = /^-?\d+$/;

export class ChannelController {
  validateBotToken(token: string): boolean {
    return BOT_TOKEN_REGEX.test(token);
  }

  validateChatId(chatId: string): boolean {
    return CHAT_ID_REGEX.test(chatId);
  }

  async create(req: Request, res: Response) {
    try {
      const { name, botToken, chatId, ctaLink, mediaStorageChatId, ctaPrompt, enquetePrompt, previewPrompt } = req.body;

      // Basic required field validation
      if (!name || !botToken || !chatId || !ctaLink) {
        return res.status(400).json({ error: 'name, botToken, chatId e ctaLink são obrigatórios' });
      }

      // Validate bot token format
      if (!this.validateBotToken(botToken)) {
        return res.status(400).json({ error: 'Formato de botToken inválido. Use o formato: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz' });
      }

      // Validate chat ID format
      if (!this.validateChatId(chatId)) {
        return res.status(400).json({ error: 'Formato de chatId inválido. Use apenas números, opcionalmente com - no início (ex: -1001234567890)' });
      }

      // Validate media storage chat ID if provided
      if (mediaStorageChatId && !this.validateChatId(mediaStorageChatId)) {
        return res.status(400).json({ error: 'Formato de mediaStorageChatId inválido' });
      }

      const channel = await prisma.channel.create({
        data: {
          name,
          botToken,
          chatId,
          ctaLink,
          mediaStorageChatId: mediaStorageChatId || null,
          ctaPrompt: ctaPrompt || null,
          enquetePrompt: enquetePrompt || null,
          previewPrompt: previewPrompt || null,
        },
      });

      logger.info('Channel created', { id: channel.id, name: channel.name });
      res.status(201).json(channel);
    } catch (error: any) {
      logger.error('Create channel error', { error: error.message });
      res.status(500).json({ error: 'Erro ao criar canal' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const channels = await prisma.channel.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { posts: true } },
        },
      });
      res.json(channels);
    } catch (error: any) {
      logger.error('Get channels error', { error: error.message });
      res.status(500).json({ error: 'Erro ao listar canais' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const channel = await prisma.channel.findUnique({
        where: { id },
        include: {
          _count: { select: { posts: true } },
        },
      });

      if (!channel) {
        return res.status(404).json({ error: 'Canal não encontrado' });
      }

      res.json(channel);
    } catch (error: any) {
      logger.error('Get channel error', { error: error.message });
      res.status(500).json({ error: 'Erro ao buscar canal' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, botToken, chatId, ctaLink, mediaStorageChatId, ctaPrompt, enquetePrompt, previewPrompt, enabled } = req.body;

      // Validate bot token format if provided
      if (botToken !== undefined && !this.validateBotToken(botToken)) {
        return res.status(400).json({ error: 'Formato de botToken inválido' });
      }

      // Validate chat ID format if provided
      if (chatId !== undefined && !this.validateChatId(chatId)) {
        return res.status(400).json({ error: 'Formato de chatId inválido' });
      }

      // Validate media storage chat ID if provided
      if (mediaStorageChatId !== undefined && mediaStorageChatId && !this.validateChatId(mediaStorageChatId)) {
        return res.status(400).json({ error: 'Formato de mediaStorageChatId inválido' });
      }

      const channel = await prisma.channel.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(botToken !== undefined && { botToken }),
          ...(chatId !== undefined && { chatId }),
          ...(ctaLink !== undefined && { ctaLink }),
          ...(mediaStorageChatId !== undefined && { mediaStorageChatId: mediaStorageChatId || null }),
          ...(ctaPrompt !== undefined && { ctaPrompt: ctaPrompt || null }),
          ...(enquetePrompt !== undefined && { enquetePrompt: enquetePrompt || null }),
          ...(previewPrompt !== undefined && { previewPrompt: previewPrompt || null }),
          ...(enabled !== undefined && { enabled }),
        },
      });

      logger.info('Channel updated', { id: channel.id, name: channel.name });
      res.json(channel);
    } catch (error: any) {
      logger.error('Update channel error', { error: error.message });
      res.status(500).json({ error: 'Erro ao atualizar canal' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.channel.delete({ where: { id } });

      logger.info('Channel deleted', { id });
      res.json({ message: 'Canal excluído com sucesso' });
    } catch (error: any) {
      logger.error('Delete channel error', { error: error.message });
      res.status(500).json({ error: 'Erro ao excluir canal' });
    }
  }

  async testConnection(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const channel = await prisma.channel.findUnique({ where: { id } });
      if (!channel) {
        return res.status(404).json({ error: 'Canal não encontrado' });
      }

      const bot = new Telegraf(channel.botToken);
      const me = await bot.telegram.getMe();

      logger.info('Channel connection test successful', { id, botUsername: me.username });
      res.json({ connected: true, botUsername: me.username });
    } catch (error: any) {
      logger.error('Channel connection test failed', { error: error.message });
      res.json({ connected: false, error: error.message });
    }
  }
}

export default new ChannelController();
