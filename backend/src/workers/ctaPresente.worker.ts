import { Telegraf } from 'telegraf';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import grokService from '../services/grok.service';
import { censorText } from '../utils/censor';

const INTERVAL_MS = 60 * 1000;
let lastCheckedMinute = '';

async function checkAndPublishCtaPresente() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (currentTime === lastCheckedMinute) return;
  lastCheckedMinute = currentTime;

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

    if (matchingSchedules.length === 0) return;

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
        const ctaText = censorText(generated.cta.split('\n').filter((line: string) => line.trim())[0]?.trim() || generated.cta.trim());

        const ctaLinks = `<a href="${channel.ctaLink}"><b>${ctaText}</b></a>\n<a href="${channel.ctaLink}"><b>${ctaText}</b></a>\n<a href="${channel.ctaLink}"><b>${ctaText}</b></a>`;
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
              generated: { headline, body, cta: ctaText },
            }),
          },
        });

        logger.info('CTA Presente generated and published', {
          channelId: channel.id,
          channelName: channel.name,
          headline,
        });
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
  } catch (error: any) {
    logger.error('CTA Presente worker check error', { error: error.message });
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
