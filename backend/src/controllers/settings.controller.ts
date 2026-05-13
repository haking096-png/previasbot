import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import telegramService from '../services/telegram.service';
import { ctaConfig } from '../config';

export class SettingsController {
  async getAll(req: Request, res: Response) {
    try {
      const settings = await prisma.settings.findMany();
      res.json(settings);
    } catch (error: any) {
      logger.error('Get settings error', { error: error.message });
      res.status(500).json({ error: 'Failed to get settings' });
    }
  }

  async get(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const setting = await prisma.settings.findUnique({ where: { key } });

      if (!setting) {
        return res.status(404).json({ error: 'Setting not found' });
      }

      res.json(setting);
    } catch (error: any) {
      logger.error('Get setting error', { error: error.message });
      res.status(500).json({ error: 'Failed to get setting' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined || value === null) {
        return res.status(400).json({ error: 'Value is required' });
      }

      const setting = await prisma.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });

      if (key === 'telegram_bot_token') {
        telegramService.updateConfig(value, undefined);
      } else if (key === 'telegram_chat_id') {
        telegramService.updateConfig(undefined, value);
      } else if (key === 'cta_link') {
        ctaConfig.link = value;
      }

      logger.info('Setting updated', { key });
      res.json(setting);
    } catch (error: any) {
      logger.error('Update setting error', { error: error.message });
      res.status(500).json({ error: 'Failed to update setting' });
    }
  }

  async testTelegram(req: Request, res: Response) {
    try {
      const isConnected = await telegramService.testConnection();
      res.json({ connected: isConnected });
    } catch (error: any) {
      logger.error('Test Telegram error', { error: error.message });
      res.status(500).json({ error: 'Failed to test Telegram connection' });
    }
  }
}

export default new SettingsController();
