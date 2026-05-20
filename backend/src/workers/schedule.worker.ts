import { Worker, Job } from 'bullmq';
import { connection, publishQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

const TIMEZONE = process.env.TZ || 'America/Sao_Paulo';

function getNowInTimezone(): Date {
  return new Date();
}

function getTodayInTimezone(): Date {
  const now = new Date();
  // Get today's date in the configured timezone
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // YYYY-MM-DD format
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create a date at midnight in the timezone
  const tzOffset = getTimezoneOffset(now);
  const today = new Date(year, month - 1, day);
  today.setMinutes(today.getMinutes() + tzOffset);
  return today;
}

function getTimezoneOffset(date: Date): number {
  // Get the offset in minutes between UTC and the target timezone
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

function createScheduleDate(baseDate: Date, daysAhead: number, hours: number, minutes: number): Date {
  // Create a date for the given time in the configured timezone
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create date in local timezone
  const targetDate = new Date(Date.UTC(year, month - 1, day + daysAhead, hours, minutes, 0, 0));
  // Adjust for timezone offset
  const offset = getTimezoneOffset(targetDate);
  targetDate.setMinutes(targetDate.getMinutes() + offset);

  return targetDate;
}

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

      // Get all enabled channels
      const channels = await prisma.channel.findMany({
        where: { enabled: true },
      });

      const now = new Date();

      let scheduled = 0;

      // Process each channel independently — NEVER process without a channel
      if (channels.length === 0) {
        logger.info('No enabled channels found');
        return { status: 'no_channels' };
      }

      for (const channel of channels) {
        const channelId = channel.id;

        // Get channel-specific schedules only
        const channelSchedules = schedules.filter(s => s.channelId === channelId);

        if (channelSchedules.length === 0) continue;

        // Find unscheduled media for this channel — ALWAYS filter by channelId
        const mediaWhere: any = {
          status: 'READY',
          processed: true,
          preview: { approved: true },
          channelId: channelId,
        };

        const readyMedia = await prisma.mediaItem.findMany({
          where: mediaWhere,
          include: {
            preview: true,
            posts: {
              where: {
                status: { in: ['SCHEDULED', 'PUBLISHED', 'PUBLISHING'] },
                channelId: channelId,
              },
            },
          },
          orderBy: { order: 'asc' },
        });

        const unscheduledMedia = readyMedia.filter((media) => media.posts.length === 0);

        if (unscheduledMedia.length === 0) continue;

        for (const media of unscheduledMedia) {
          let nextSchedule: Date | null = null;

          // Try today and tomorrow to find an open slot
          for (let daysAhead = 0; daysAhead < 2; daysAhead++) {
            for (const schedule of channelSchedules) {
              const [hours, minutes] = schedule.time.split(':').map(Number);
              const candidateDate = createScheduleDate(now, daysAhead, hours, minutes);

              // Skip if in the past (with 1 minute buffer)
              if (candidateDate.getTime() <= now.getTime() + 60000) continue;

              // Check if this slot is already taken FOR THIS CHANNEL
              // Use a time window of ±30 seconds to prevent near-duplicate scheduling
              const slotStart = new Date(candidateDate.getTime() - 30000);
              const slotEnd = new Date(candidateDate.getTime() + 30000);

              const existingPost = await prisma.post.findFirst({
                where: {
                  scheduledFor: {
                    gte: slotStart,
                    lte: slotEnd,
                  },
                  channelId: channelId,
                  status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
                },
              });

              if (!existingPost) {
                nextSchedule = candidateDate;
                break;
              }
            }
            if (nextSchedule) break;
          }

          if (!nextSchedule) {
            logger.info('No available slot found for media', { mediaItemId: media.id, channelId });
            continue;
          }

          // Double-check with a transaction to prevent race conditions
          const post = await prisma.$transaction(async (tx) => {
            // Re-verify slot is still free inside transaction
            const slotStart = new Date(nextSchedule!.getTime() - 30000);
            const slotEnd = new Date(nextSchedule!.getTime() + 30000);

            const conflict = await tx.post.findFirst({
              where: {
                scheduledFor: {
                  gte: slotStart,
                  lte: slotEnd,
                },
                channelId: channelId,
                status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
              },
            });

            if (conflict) {
              return null; // Slot was taken between check and create
            }

            return tx.post.create({
              data: {
                mediaItemId: media.id,
                previewId: media.preview!.id,
                channelId: channelId,
                scheduledFor: nextSchedule!,
                status: 'SCHEDULED',
              },
            });
          });

          if (!post) {
            logger.info('Slot conflict detected, skipping', { mediaItemId: media.id, channelId });
            continue;
          }

          const delay = nextSchedule.getTime() - Date.now();
          await publishQueue.add(
            'publish-post',
            { postId: post.id },
            {
              delay: Math.max(0, delay),
              jobId: `publish-${post.id}`, // Unique job ID prevents duplicate queue entries
            }
          );
          scheduled++;
          logger.info('Post scheduled for channel', {
            postId: post.id,
            channelName: channel.name,
            scheduledFor: nextSchedule,
          });
        }
      }

      if (scheduled === 0) {
        logger.info('No unscheduled media available');
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
  {
    connection,
    concurrency: 1, // CRITICAL: only 1 concurrent schedule worker to prevent race conditions
  }
);

scheduleWorker.on('completed', (job) => {
  logger.info('Schedule job completed', { jobId: job.id });
});

scheduleWorker.on('failed', (job, err) => {
  logger.error('Schedule job failed', { jobId: job?.id, error: err.message });
});
