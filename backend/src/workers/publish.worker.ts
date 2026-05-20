import { Worker, Job } from 'bullmq';
import { connection, publishQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import telegramService from '../services/telegram.service';
import path from 'path';

const TIMEZONE = process.env.TZ || 'America/Sao_Paulo';

function getTimezoneOffset(date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

function createScheduleDate(daysAhead: number, hours: number, minutes: number): Date {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day + daysAhead, hours, minutes, 0, 0));
  const offset = getTimezoneOffset(targetDate);
  targetDate.setMinutes(targetDate.getMinutes() + offset);
  return targetDate;
}

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

      // Atomically set status to PUBLISHING only if SCHEDULED or already PUBLISHING (from publishNow)
      if (post.status === 'SCHEDULED') {
        const updated = await prisma.post.updateMany({
          where: { id: postId, status: 'SCHEDULED' },
          data: { status: 'PUBLISHING' },
        });

        if (updated.count === 0) {
          logger.info('Post status changed before publishing, skipping', { postId, currentStatus: post.status });
          return { postId, status: 'skipped' };
        }
      } else if (post.status !== 'PUBLISHING') {
        logger.info('Post in unexpected status, skipping', { postId, status: post.status });
        return { postId, status: 'skipped' };
      }

      // CRITICAL: Resolve channel — never fall back to global config
      let resolvedChannel = post.channel;

      if (!resolvedChannel) {
        // Try to get channel from mediaItem
        const mediaWithChannel = await prisma.mediaItem.findUnique({
          where: { id: post.mediaItem.id },
          include: { channel: true },
        });

        if (!mediaWithChannel?.channel) {
          throw new Error(`No channel associated with post ${postId} or its media item. Cannot publish without a channel.`);
        }

        resolvedChannel = mediaWithChannel.channel;
      }

      const botToken = resolvedChannel.botToken;
      const chatId = resolvedChannel.chatId;

      let imageSource: string;
      let isFileId = false;

      if (post.mediaItem.telegramFileId) {
        // Use Telegram file_id directly
        imageSource = post.mediaItem.telegramFileId;
        isFileId = true;
      } else if (post.mediaItem.filePath) {
        // Legacy: use local file path
        imageSource = path.join(process.cwd(), post.mediaItem.filePath);
      } else {
        throw new Error('No image source available for publishing');
      }

      const result = await telegramService.publishPreview(
        imageSource,
        post.preview,
        botToken,
        chatId,
        isFileId,
        post.mediaItem.mediaType || 'IMAGE'
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

      // After successful publish, reschedule remaining posts for this channel
      const channelId = post.channelId || post.mediaItem.channelId;
      if (channelId) {
        try {
          const schedules = await prisma.schedule.findMany({
            where: { channelId, enabled: true },
            orderBy: { time: 'asc' },
          });

          if (schedules.length > 0) {
            const scheduledPosts = await prisma.post.findMany({
              where: { channelId, status: 'SCHEDULED' },
              include: { mediaItem: true },
              orderBy: { mediaItem: { order: 'asc' } },
            });

            if (scheduledPosts.length > 0) {
              const now = new Date();

              const slots: Date[] = [];
              for (let daysAhead = 0; slots.length < scheduledPosts.length + 5; daysAhead++) {
                for (const schedule of schedules) {
                  const [hours, minutes] = schedule.time.split(':').map(Number);
                  const candidateDate = createScheduleDate(daysAhead, hours, minutes);

                  if (candidateDate.getTime() <= now.getTime() + 60000) continue;

                  const slotStart = new Date(candidateDate.getTime() - 30000);
                  const slotEnd = new Date(candidateDate.getTime() + 30000);

                  const occupied = await prisma.post.findFirst({
                    where: {
                      channelId,
                      scheduledFor: { gte: slotStart, lte: slotEnd },
                      status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
                    },
                  });

                  if (!occupied) slots.push(candidateDate);
                }
                if (daysAhead > 60) break;
              }

              for (let i = 0; i < scheduledPosts.length && i < slots.length; i++) {
                await prisma.post.update({
                  where: { id: scheduledPosts[i].id },
                  data: { scheduledFor: slots[i] },
                });

                const delay = slots[i].getTime() - Date.now();
                await publishQueue.add(
                  'publish-post',
                  { postId: scheduledPosts[i].id },
                  { delay: Math.max(0, delay), jobId: `publish-${scheduledPosts[i].id}` }
                );
              }

              logger.info('Remaining posts rescheduled after publish', { channelId, count: Math.min(scheduledPosts.length, slots.length) });
            }
          }
        } catch (rescheduleError: any) {
          logger.error('Failed to reschedule after publish', { error: rescheduleError.message });
        }
      }

      logger.info('Publish worker completed', { postId, messageId: result.messageId });
      return { postId, messageId: result.messageId };
    } catch (error: any) {
      logger.error('Publish worker error', {
        error: error.message,
        stack: error.stack,
        postId,
      });

      // Only try to update if the post exists
      try {
        const existingPost = await prisma.post.findUnique({ where: { id: postId } });
        if (existingPost) {
          const retryCount = existingPost.retryCount || 0;
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
        } else {
          // Post was deleted, just log and move on
          logger.warn('Post was deleted from database, removing from queue', { postId });
          return { postId, status: 'post_deleted' };
        }
      } catch (updateError: any) {
        // If even the findUnique fails, just return
        logger.error('Failed to handle publish error', { postId, error: updateError.message });
        return { postId, status: 'error_handling_failed' };
      }
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
