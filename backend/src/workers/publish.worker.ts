import { Worker, Job } from 'bullmq';
import { connection } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import telegramService from '../services/telegram.service';
import path from 'path';

export const publishWorker = new Worker(
  'publish',
  async (job: Job) => {
    const { postId } = job.data;
    logger.info('Publish worker started', { jobId: job.id, postId });

    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          mediaItem: true,
          preview: true,
          channel: true,
        },
      });

      if (!post) {
        throw new Error(`Post not found: ${postId}`);
      }

      if (post.status === 'CANCELLED') {
        logger.info('Post was cancelled, skipping', { postId });
        return { postId, status: 'cancelled' };
      }

      if (post.status === 'PUBLISHED') {
        logger.info('Post already published, skipping', { postId });
        return { postId, status: 'already_published' };
      }

      await prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHING' },
      });

      const fullPath = path.join(process.cwd(), post.mediaItem.filePath);

      // Use channel-specific bot token and chat ID if available
      const botToken = post.channel?.botToken || undefined;
      const chatId = post.channel?.chatId || undefined;

      const result = await telegramService.publishPreview(
        fullPath,
        post.preview,
        botToken,
        chatId
      );

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          telegramMessageId: result.messageId,
        },
      });

      await prisma.jobLog.create({
        data: {
          jobName: 'publish',
          jobId: job.id,
          status: 'completed',
          data: JSON.stringify({ postId, messageId: result.messageId }),
        },
      });

      logger.info('Publish worker completed', { postId, messageId: result.messageId });
      return { postId, messageId: result.messageId };
    } catch (error: any) {
      logger.error('Publish worker error', {
        error: error.message,
        stack: error.stack,
        postId,
      });

      const retryCount = (await prisma.post.findUnique({ where: { id: postId } }))?.retryCount || 0;

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'FAILED',
          error: error.message,
          retryCount: retryCount + 1,
        },
      });

      await prisma.jobLog.create({
        data: {
          jobName: 'publish',
          jobId: job.id,
          status: 'failed',
          error: error.message,
          data: JSON.stringify({ postId }),
        },
      });

      if (retryCount < 3) {
        throw error;
      }

      logger.error('Max retries reached for post', { postId });
      return { postId, status: 'max_retries_reached' };
    }
  },
  {
    connection,
    concurrency: 1,
    limiter: {
      max: 20,
      duration: 60000,
    },
  }
);

publishWorker.on('completed', (job) => {
  logger.info('Publish job completed', { jobId: job.id });
});

publishWorker.on('failed', (job, err) => {
  logger.error('Publish job failed', { jobId: job?.id, error: err.message });
});
