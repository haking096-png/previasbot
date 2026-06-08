import { Telegraf } from 'telegraf';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import grokService from '../services/grok.service';
import { censorText } from '../utils/censor';
import { distributedLock } from '../utils/distributedLock';

const INTERVAL_MS = 60 * 1000;

async function checkAndPublishCtaPresente() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const lockKey = `cta-presente:${currentTime}`;

  // Use distributed lock to prevent race conditions in multi-instance deployments
  const result = await distributedLock.withLock(lockKey, async () => {
    try {
      const matchingSchedules = await prisma.ctaPresenteSchedule.findMany({
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
            jobName: 'cta-presente',
            status: 'completed',
            data: {
              contains: `"channelId":"${channel.id}","time":"${currentTime}"`,
            },
            createdAt: { gte: todayStart },
          },
        });

        if (existingLog) {
          logger.info('CTA Presente already posted for this time today', { channelId: channel.id, time: currentTime });
          continue;
        }

        const mainStyle = channel.previewPrompt || '';

        if (!channel.ctaPrompt && !mainStyle) {
          logger.warn('No CTA prompt and no main style prompt configured for channel, skipping', { channelId: channel.id });
          continue;
        }

        try {
          const generated = await grokService.generateCtaPresente(
            channel.ctaPrompt || 'Siga o estilo geral do canal.',
            channel.ctaLink,
            mainStyle
          );

          // Apply censoring
          const headline = censorText(generated.headline);
          const body = censorText(generated.body);

          // Parse CTA lines - can be multiple lines or single repeated line
          const ctaLinesRaw = generated.cta.split('\n').filter((line: string) => line.trim());
          let ctaTextArray: string[];

          if (ctaLinesRaw.length >= 4) {
            // Use up to 4 different CTAs from the response
            ctaTextArray = ctaLinesRaw.slice(0, 4).map(line => censorText(line.trim()));
          } else if (ctaLinesRaw.length >= 1) {
            // Single CTA line - repeat 4 times
            const singleCta = censorText(ctaLinesRaw[0].trim());
            ctaTextArray = [singleCta, singleCta, singleCta, singleCta];
          } else {
            // No CTA in response - use default
            const defaultCta = censorText(generated.cta.trim() || '🎁 RESGATAR PRESENTE');
            ctaTextArray = [defaultCta, defaultCta, defaultCta, defaultCta];
          }

          // Format CTA links with proper HTML
          const ctaLinks = ctaTextArray
            .map(cta => `<a href="${channel.ctaLink}"><b>${cta}</b></a>`)
            .join('\n');
          const message = `<b>${headline}</b>\n\n${body}\n\n${ctaLinks}`;

          const bot = new Telegraf(channel.botToken);
          await bot.telegram.sendMessage(channel.chatId, message, {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
          });

          await prisma.jobLog.create({
            data: {
              jobName: 'cta-presente',
              jobId: `generated-${Date.now()}`,
              status: 'completed',
              data: JSON.stringify({
                channelId: channel.id,
                time: currentTime,
                generated: { headline, body, cta: ctaTextArray.join(' | ') },
              }),
            },
          });

          logger.info('CTA Presente generated and published', {
            channelId: channel.id,
            channelName: channel.name,
            headline,
          });
          publishedCount++;
        } catch (sendError: any) {
          logger.error('Failed to generate/send CTA Presente', {
            channelId: channel.id,
            error: sendError.message,
          });

          await prisma.jobLog.create({
            data: {
              jobName: 'cta-presente',
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
      logger.error('CTA Presente worker check error', { error: error.message });
      return { published: 0, error: error.message };
    }
  }, { ttl: 30000, retryCount: 0 }); // Don't retry - just skip if lock held

  if (!result) {
    logger.debug('CTA Presente lock held by another instance, skipping', { time: currentTime });
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startCtaPresenteWorker() {
  logger.info('CTA Presente worker started (AI generation mode)');
  intervalId = setInterval(checkAndPublishCtaPresente, INTERVAL_MS);
  checkAndPublishCtaPresente();
}

export function stopCtaPresenteWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  logger.info('CTA Presente worker stopped');
}
