import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

export class LogsController {
  // Get recent job logs with optional filtering
  async getAll(req: Request, res: Response) {
    try {
      const { channelId, jobName, status, limit = '100' } = req.query;
      const where: any = {};
      if (channelId) {
        // Filter logs that reference this channel
        where.data = { contains: `"channelId":"${channelId}"` };
      }
      if (jobName) where.jobName = jobName;
      if (status) where.status = status;

      const logs = await prisma.jobLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
      });

      res.json(logs);
    } catch (error: any) {
      logger.error('Get logs error', { error: error.message });
      res.status(500).json({ error: 'Failed to get logs' });
    }
  }

  // Get recent activity (last N logs formatted nicely)
  async getRecent(req: Request, res: Response) {
    try {
      const limit = parseInt((req.query.limit as string) || '50', 10);

      const logs = await prisma.jobLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Group by job name
      const grouped: any = {
        cta: [],
        enquete: [],
        publish: [],
        generate: [],
        schedule: [],
        import: [],
        analyze: [],
        other: [],
      };

      for (const log of logs) {
        const job = log.jobName?.toLowerCase() || 'other';
        const key = grouped[job] !== undefined ? job : 'other';
        const entry = {
          id: log.id,
          jobName: log.jobName,
          status: log.status,
          data: log.data,
          error: log.error,
          createdAt: log.createdAt,
        };
        grouped[key].push(entry);
      }

      res.json({
        total: logs.length,
        groups: grouped,
        all: logs,
      });
    } catch (error: any) {
      logger.error('Get recent logs error', { error: error.message });
      res.status(500).json({ error: 'Failed to get recent logs' });
    }
  }

  // Get system status (counts, health, etc)
  async getStatus(req: Request, res: Response) {
    try {
      const [
        totalChannels,
        activeChannels,
        totalMedia,
        readyMedia,
        totalPosts,
        scheduledPosts,
        publishedPosts,
        failedPosts,
        recentLogs,
      ] = await Promise.all([
        prisma.channel.count(),
        prisma.channel.count({ where: { enabled: true } }),
        prisma.mediaItem.count(),
        prisma.mediaItem.count({ where: { status: 'READY' } }),
        prisma.post.count(),
        prisma.post.count({ where: { status: 'SCHEDULED' } }),
        prisma.post.count({ where: { status: 'PUBLISHED' } }),
        prisma.post.count({ where: { status: 'FAILED' } }),
        prisma.jobLog.findMany({ orderBy: { createdAt: 'desc' } }),
      ]);

      res.json({
        channels: { total: totalChannels, active: activeChannels },
        media: { total: totalMedia, ready: readyMedia },
        posts: {
          total: totalPosts,
          scheduled: scheduledPosts,
          published: publishedPosts,
  failed: failedPosts,
        },
        recentLogs,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Get status error', { error: error.message });
      res.status(500).json({ error: 'Failed to get status' });
    }
  }

  // Test the bot - sends a test message to the channel
  async testBot(req: Request, res: Response) {
    try {
      const { channelId, type } = req.body;

      if (!channelId) {
        return res.status(400).json({ error: 'channelId é obrigatório' });
      }

      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        return res.status(404).json({ error: 'Canal não encontrado' });
      }

      const { Telegraf } = await import('telegraf');
      const bot = new Telegraf(channel.botToken);

      try {
        let message;
        if (type === 'simple') {
          message = await bot.telegram.sendMessage(channel.chatId, '✅ Bot está funcionando perfeitamente!\n\nEsta é uma mensagem de teste do dashboard.');
        } else {
          message = await bot.telegram.sendMessage(
            channel.chatId,
            '🧪 <b>TESTE DO BOT</b>\n\n✅ Bot conectado\n✅ Telegram API OK\n✅ Canal acessível\n\nTudo funcionando!',
            { parse_mode: 'HTML' }
          );
        }

        res.json({
          success: true,
          message: 'Mensagem de teste enviada com sucesso',
          data: {
            chatId: channel.chatId,
            messageId: message.message_id,
            type: type || 'formatted',
          },
        });
      } catch (telegramError: any) {
        res.status(400).json({
          success: false,
          message: `Erro do Telegram: ${telegramError.message }`,
          error: telegramError.message,
        });
      }
    } catch (error: any) {
      logger.error('Test bot error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  }
}

export default new LogsController();