import { Worker, Job } from 'bullmq';
import { connection, publishQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

export const scheduleWorker = new Worker(
  'schedule',
  async (job: Job) => {
    logger.info('Schedule worker started', { jobId: job.id });

    try {
      const automationEnabled = await prisma.settings.findUnique({
        where: { key: 'automation_enabled' },
      });

      if (automationEnabled?.value !== 'true') {
        logger.info('Automation is disabled, skipping scheduling');
        return { status: 'automation_disabled' };
      }

      const schedules = await prisma.schedule.findMany({
        where: { enabled: true },
        orderBy: { time: 'asc' },
      });

      if (schedules.length === 0) {
        logger.info('No schedules configured');
        return { status: 'no_schedules' };
      }

      const readyMedia = await prisma.mediaItem.findMany({
        where: {
          status: 'READY',
          processed: true,
          preview: {
            approved: true,
          },
        },
        include: {
          preview: true,
          posts: {
            where: {
              status: {
                in: ['SCHEDULED', 'PUBLISHED'],
              },
            },
          },
        },
        orderBy: { order: 'asc' },
      });

      const unscheduledMedia = readyMedia.filter((media) => media.posts.length === 0);

      if (unscheduledMedia.length === 0) {
        logger.info('No unscheduled media available');
        return { status: 'no_unscheduled_media' };
      }

      // Get all enabled channels (or use default if none configured)
      const channels = await prisma.channel.findMany({
        where: { enabled: true },
      });

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      let scheduled = 0;

      for (const media of unscheduledMedia) {
        let nextSchedule: Date | null = null;

        for (const schedule of schedules) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          const scheduledTime = new Date(today);
          scheduledTime.setHours(hours, minutes, 0, 0);

          if (scheduledTime > now) {
            const existingPost = await prisma.post.findFirst({
              where: {
                scheduledFor: scheduledTime,
                status: {
                  in: ['SCHEDULED', 'PUBLISHING'],
                },
              },
            });

            if (!existingPost) {
              nextSchedule = scheduledTime;
              break;
            }
          }
        }

        if (!nextSchedule) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const firstSchedule = schedules[0];
          const [hours, minutes] = firstSchedule.time.split(':').map(Number);
          tomorrow.setHours(hours, minutes, 0, 0);
          nextSchedule = tomorrow;
        }

        // Schedule a post for each enabled channel (or one post with no channel if none configured)
        if (channels.length > 0) {
          for (const channel of channels) {
            const post = await prisma.post.create({
              data: {
                mediaItemId: media.id,
                previewId: media.preview!.id,
                channelId: channel.id,
                scheduledFor: nextSchedule,
                status: 'SCHEDULED',
              },
            });

            const delay = nextSchedule.getTime() - Date.now();
            await publishQueue.add('publish-post', { postId: post.id }, { delay: Math.max(0, delay) });
            scheduled++;
            logger.info('Post scheduled for channel', { postId: post.id, channelName: channel.name, scheduledFor: nextSchedule });
          }
        } else {
          // Fallback: no channels configured, use default bot from .env
          const post = await prisma.post.create({
            data: {
              mediaItemId: media.id,
              previewId: media.preview!.id,
              scheduledFor: nextSchedule,
              status: 'SCHEDULED',
            },
          });

          const delay = nextSchedule.getTime() - Date.now();
          await publishQueue.add('publish-post', { postId: post.id }, { delay: Math.max(0, delay) });
          scheduled++;
          logger.info('Post scheduled (default channel)', { postId: post.id, scheduledFor: nextSchedule });
        }
      }

      await prisma.jobLog.create({
        data: {
          jobName: 'schedule',
          jobId: job.id,
          status: 'completed',
          data: JSON.stringify({ scheduled }),
        },
      });

      logger.info('Schedule worker completed', { scheduled });
      return { scheduled };
    } catch (error: any) {
      logger.error('Schedule worker error', {
        error: error.message,
        stack: error.stack,
      });

      await prisma.jobLog.create({
        data: {
          jobName: 'schedule',
          jobId: job.id,
          status: 'failed',
          error: error.message,
        },
      });

      throw error;
    }
  },
  { connection }
);

scheduleWorker.on('completed', (job) => {
  logger.info('Schedule job completed', { jobId: job.id });
});

scheduleWorker.on('failed', (job, err) => {
  logger.error('Schedule job failed', { jobId: job?.id, error: err.message });
});
