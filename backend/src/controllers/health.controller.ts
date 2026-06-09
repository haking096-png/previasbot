import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { connection } from '../utils/queue';
import logger from '../utils/logger';
import { Telegraf } from 'telegraf';
import prismaDb from '../utils/prisma';

const router = Router();

/**
 * GET /api/health/db
 * Database health check
 */
router.get('/db', async (req: Request, res: Response) => {
  try {
    const start = Date.now();

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    // Get table counts
    const [userCount, channelCount, mediaCount, postCount, jobLogCount] = await Promise.all([
      prisma.user.count(),
      prisma.channel.count(),
      prisma.mediaItem.count(),
      prisma.post.count(),
      prisma.jobLog.count(),
    ]);

    const latency = Date.now() - start;

    res.json({
      status: 'healthy',
      latency,
      tables: {
        users: userCount,
        channels: channelCount,
        mediaItems: mediaCount,
        posts: postCount,
        jobLogs: jobLogCount,
      },
    });
  } catch (error: any) {
    logger.error('Database health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /api/health/redis
 * Redis/Queue health check
 */
router.get('/redis', async (req: Request, res: Response) => {
  try {
    const start = Date.now();

    // Test Redis connection
    await connection.ping();

    // Get queue counts
    const [importQueue, analyzeQueue, generateQueue, publishQueue, scheduleQueue] = await Promise.all([
      import('../utils/queue').then(m => m.importQueue.getJobCounts()),
      import('../utils/queue').then(m => m.analyzeQueue.getJobCounts()),
      import('../utils/queue').then(m => m.generateQueue.getJobCounts()),
      import('../utils/queue').then(m => m.publishQueue.getJobCounts()),
      import('../utils/queue').then(m => m.scheduleQueue.getJobCounts()),
    ]);

    const latency = Date.now() - start;

    res.json({
      status: 'healthy',
      latency,
      connected: true,
      queues: {
        import: importQueue,
        analyze: analyzeQueue,
        generate: generateQueue,
        publish: publishQueue,
        schedule: scheduleQueue,
      },
    });
  } catch (error: any) {
    logger.error('Redis health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      connected: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/health/workers
 * Workers status check
 */
router.get('/workers', async (req: Request, res: Response) => {
  try {
    // Check recent job logs to determine worker activity
    const recentLogs = await prisma.jobLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const completedLast30min = recentLogs.filter(l => l.status === 'completed').length;
    const failedLast30min = recentLogs.filter(l => l.status === 'failed').length;

    // Get current job statuses
    const jobTypes = ['import', 'analyze', 'generate', 'publish', 'schedule'];
    const jobStats: Record<string, { completed: number; failed: number; lastRun?: Date }> = {};

    for (const jobType of jobTypes) {
      const jobLogs = recentLogs.filter(l => l.jobName.includes(jobType));
      jobStats[jobType] = {
        completed: jobLogs.filter(l => l.status === 'completed').length,
        failed: jobLogs.filter(l => l.status === 'failed').length,
        lastRun: jobLogs[0]?.createdAt,
      };
    }

    res.json({
      status: 'healthy',
      active: completedLast30min > 0 || failedLast30min > 0,
      jobsRunning: 0, // Would need actual worker status from BullMQ
      last30min: {
        completed: completedLast30min,
        failed: failedLast30min,
      },
      byJobType: jobStats,
    });
  } catch (error: any) {
    logger.error('Workers health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
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
    logger.error('Queue health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /api/health/telegram
 * Telegram API health check
 */
router.get('/telegram', async (req: Request, res: Response) => {
  try {
    const channels = await prisma.channel.findMany({
      where: { enabled: true },
      take: 5,
    });

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
      details: results.map((r, i) => ({
        index: i,
        status: r.status,
        ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message }),
      })),
    });
  } catch (error: any) {
    logger.error('Telegram health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /api/health/full
 * Full system health check (combines all checks)
 */
router.get('/full', async (req: Request, res: Response) => {
  const start = Date.now();
  const checks: Record<string, any> = {};
  let overallStatus = 'healthy';

  // DB Check
  try {
    await prismaDb.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latency: Date.now() - start };
  } catch (e: any) {
    checks.database = { status: 'unhealthy', error: e.message };
    overallStatus = 'unhealthy';
  }

  // Redis Check
  try {
    await connection.ping();
    checks.redis = { status: 'healthy' };
  } catch (e: any) {
    checks.redis = { status: 'unhealthy', error: e.message };
    overallStatus = 'unhealthy';
  }

  // Stats
  try {
    const [channels, media, posts] = await Promise.all([
      prismaDb.channel.count(),
      prismaDb.mediaItem.count(),
      prismaDb.post.count(),
    ]);
    checks.stats = { channels, media, posts };
  } catch (e: any) {
    checks.stats = { error: e.message };
  }

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    totalLatency: Date.now() - start,
    checks,
  });
});

export default router;
