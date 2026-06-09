import { Telegraf } from 'telegraf';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import grokService from '../services/grok.service';
import { censorText } from '../utils/censor';
import { distributedLock } from '../utils/distributedLock';

const INTERVAL_MS = 60 * 1000;

async function checkAndPublishEnquete() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const lockKey = `enquete:${currentTime}`;

  // Use distributed lock to prevent race conditions in multi-instance deployments
  const result = await distributedLock.withLock(lockKey, async () => {
    try {
      const matchingSchedules = await prisma.enqueteSchedule.findMany({
        where: {
          time: currentTime,
          enabled: true,
        },
        include: {
          channel: true,
        },
      });

      if (matchingSchedules.length === 0) return { published: 0 };

      let publishedCount = 0;

      for (const schedule of matchingSchedules) {
        const channel = schedule.channel;
        if (!channel || !channel.enabled) continue;

        // Check if already posted today for this channel at this EXACT time
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const existingLog = await prisma.jobLog.findFirst({
          where: {
            jobName: 'enquete',
            status: 'completed',
            data: {
              contains: `"channelId":"${channel.id}","time":"${currentTime}"`,
            },
            createdAt: { gte: todayStart },
          },
        });

        if (existingLog) {
          logger.info('Enquete already posted for this time today', { channelId: channel.id, time: currentTime });
          continue;
        }

        const mainStyle = channel.previewPrompt || '';

        if (!channel.enquetePrompt && !mainStyle) {
          logger.warn('No enquete prompt and no main style prompt configured for channel, skipping', { channelId: channel.id });
          continue;
        }

        try {
          const generated = await grokService.generateEnquete(
            channel.enquetePrompt || 'Siga o estilo geral do canal para criar enquetes divertidas e provocantes.',
            mainStyle
          );

          // Apply censoring
          const question = censorText(generated.question.substring(0, 300));
          const validOptions = generated.options
            .filter((o: string) => o.trim().length > 0)
            .map((o: string) => censorText(o.substring(0, 100)))
            .slice(0, 10);

          if (validOptions.length < 2) {
            logger.warn('Generated enquete has less than 2 valid options, skipping', { channelId: channel.id });
            continue;
          }

          const bot = new Telegraf(channel.botToken);
          await bot.telegram.sendPoll(
            channel.chatId,
            question,
            validOptions,
            {
              is_anonymous: true,
              allows_multiple_answers: false,
            }
          );

          await prisma.jobLog.create({
            data: {
              jobName: 'enquete',
              jobId: `generated-${Date.now()}`,
              status: 'completed',
              data: JSON.stringify({
                channelId: channel.id,
                time: currentTime,
                generated: { question, options: validOptions },
              }),
            },
          });

          logger.info('Enquete generated and published', {
            channelId: channel.id,
            channelName: channel.name,
            question,
            optionsCount: validOptions.length,
          });
          publishedCount++;
        } catch (sendError: any) {
          logger.error('Failed to generate/send Enquete', {
            channelId: channel.id,
            error: sendError.message,
          });

          await prisma.jobLog.create({
            data: {
              jobName: 'enquete',
              jobId: `error-${Date.now()}`,
              status: 'failed',
              error: sendError.message,
              data: JSON.stringify({ channelId: channel.id, time: currentTime }),
            },
          });
        }
      }

      return { published: publishedCount };
    } catch (error: any) {
      logger.error('Enquete worker check error', { error: error.message });
      return { published: 0, error: error.message };
    }
  }, { ttl: 30000, retryCount: 0 }); // Don't retry - just skip if lock held

  if (!result) {
    logger.debug('Enquete lock held by another instance, skipping', { time: currentTime });
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startEnqueteWorker() {
  logger.info('Enquete worker started (AI generation mode)');
  intervalId = setInterval(checkAndPublishEnquete, INTERVAL_MS);
  checkAndPublishEnquete();
}

export function stopEnqueteWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  logger.info('Enquete worker stopped');
}
