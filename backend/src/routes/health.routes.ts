import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { connection } from '../utils/queue';
import logger from '../utils/logger';
import { Telegraf } from 'telegraf';

const router = Router();

/**
 * GET /api/health/db
 * Database health check
 */
router.get('/db', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const [userCount, channelCount, mediaCount, postCount] = await Promise.all([
      prisma.user.count(),
      prisma.channel.count(),
      prisma.mediaItem.count(),
      prisma.post.count(),
    ]);
    res.json({
      status: 'healthy',
      latency: Date.now() - start,
      tables: { users: userCount, channels: channelCount, mediaItems: mediaCount, posts: postCount },
    });
  } catch (error: any) {
    logger.error('DB health check failed', { error: error.message });
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

/**
 * GET /api/health/redis
 * Redis/Queue health check
 */
router.get('/redis', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    await connection.ping();
    const { importQueue, analyzeQueue, generateQueue, publishQueue } = await import('../utils/queue');
    const [importCounts, analyzeCounts, generateCounts, publishCounts] = await Promise.all([
      importQueue.getJobCounts(),
      analyzeQueue.getJobCounts(),
      generateQueue.getJobCounts(),
      publishQueue.getJobCounts(),
    ]);
    res.json({
      status: 'healthy',
      latency: Date.now() - start,
      connected: true,
      queues: { import: importCounts, analyze: analyzeCounts, generate: generateCounts, publish: publishCounts },
    });
  } catch (error: any) {
    logger.error('Redis health check failed', { error: error.message });
    res.status(503).json({ status: 'unhealthy', connected: false, error: error.message });
  }
});

/**
 * GET /api/health/workers
 * Workers status check
 */
router.get('/workers', async (req: Request, res: Response) => {
  try {
    const recentLogs = await prisma.jobLog.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const completedLast30min = recentLogs.filter(l => l.status === 'completed').length;
    const failedLast30min = recentLogs.filter(l => l.status === 'failed').length;
    res.json({
      status: 'healthy',
      active: completedLast30min > 0 || failedLast30min > 0,
      jobsRunning: 0,
      last30min: { completed: completedLast30min, failed: failedLast30min },
    });
  } catch (error: any) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

/**
 * GET /api/health/queues
 * Queue status check
 */
router.get('/queues', async (req: Request, res: Response) => {
  try {
    const { importQueue, analyzeQueue, generateQueue, publishQueue, scheduleQueue } = await import('../utils/queue');
    const [importCounts, analyzeCounts, generateCounts, publishCounts, scheduleCounts] = await Promise.all([
      importQueue.getJobCounts(),
      analyzeQueue.getJobCounts(),
      generateQueue.getJobCounts(),
      publishQueue.getJobCounts(),
      scheduleQueue.getJobCounts(),
    ]);
    res.json({
      status: 'healthy',
      import: importCounts,
      analyze: analyzeCounts,
      generate: generateCounts,
      publish: publishCounts,
      schedule: scheduleCounts,
    });
  } catch (error: any) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

/**
 * GET /api/health/telegram
 * Telegram API health check
 */
router.get('/telegram', async (req: Request, res: Response) => {
  try {
    const channels = await prisma.channel.findMany({ where: { enabled: true }, take: 5 });

    // No channels configured
    if (channels.length === 0) {
      return res.json({
        status: 'no_channels',
        channelsChecked: 0,
        successfulConnections: 0,
        failedConnections: 0,
      });
    }

    const results = await Promise.allSettled(
      channels.slice(0, 3).map(async (channel) => {
        const bot = new Telegraf(channel.botToken);
        const me = await bot.telegram.getMe();
        return { channelId: channel.id, botUsername: me.username, connected: true };
      })
    );
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      status: failed === 0 ? 'healthy' : 'degraded',
      channelsChecked: channels.length,
      successfulConnections: successful,
      failedConnections: failed,
    });
  } catch (error: any) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

export default router;
