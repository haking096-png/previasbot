import { Worker, Job } from 'bullmq';
import { connectionOptions, publishQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import previewService from '../services/preview.service';
import { ctaConfig } from '../config';
import { censorText } from '../utils/censor';

// Auto-schedule function
async function autoSchedulePost(mediaItemId: string, previewId: string, channelId?: string) {
  try {
    // Get enabled schedules for this channel (or global if no channel)
    const whereClause: any = { enabled: true };
    if (channelId) {
      whereClause.channelId = channelId;
    } else {
      whereClause.channelId = null;
    }

    let schedules = await prisma.schedule.findMany({
      where: whereClause,
      orderBy: { time: 'asc' },
    });

    // Fallback: if no channel-specific schedules, try global ones
    if (schedules.length === 0 && channelId) {
      schedules = await prisma.schedule.findMany({
        where: { enabled: true, channelId: null },
        orderBy: { time: 'asc' },
      });
    }

    if (schedules.length === 0) {
      logger.warn('No enabled schedules found for auto-scheduling', { channelId });
      return;
    }

    // Find next available schedule slot
    const now = new Date();
    let scheduledFor: Date | null = null;

    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      for (const schedule of schedules) {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const candidateDate = new Date(now);
        candidateDate.setDate(candidateDate.getDate() + daysAhead);
        candidateDate.setHours(hours, minutes, 0, 0);

        // Skip if in the past (with 1 minute buffer)
        if (candidateDate.getTime() <= now.getTime() + 60000) continue;

        // Check if this slot is already taken (±30 second window)
        const slotStart = new Date(candidateDate.getTime() - 30000);
        const slotEnd = new Date(candidateDate.getTime() + 30000);

        const existingPost = await prisma.post.findFirst({
          where: {
            scheduledFor: { gte: slotStart, lte: slotEnd },
            channelId: channelId || null,
            status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
          },
        });

        if (!existingPost) {
          scheduledFor = candidateDate;
          break;
        }
      }
      if (scheduledFor) break;
    }

    if (!scheduledFor) {
      logger.warn('Could not find available schedule slot', { channelId });
      return;
    }

    // Use transaction to prevent race conditions
    const post = await prisma.$transaction(async (tx) => {
      const slotStart = new Date(scheduledFor!.getTime() - 30000);
      const slotEnd = new Date(scheduledFor!.getTime() + 30000);

      const conflict = await tx.post.findFirst({
        where: {
          scheduledFor: { gte: slotStart, lte: slotEnd },
          channelId: channelId || null,
          status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
        },
      });

      if (conflict) return null;

      return tx.post.create({
        data: {
          mediaItemId,
          previewId,
          channelId: channelId || null,
          scheduledFor: scheduledFor!,
          status: 'SCHEDULED',
        },
      });
    });

    if (!post) {
      logger.info('Slot conflict in autoSchedulePost, skipping', { mediaItemId, channelId });
      return;
    }

    // Add to publish queue
    const delay = scheduledFor.getTime() - Date.now();
    await publishQueue.add(
      'publish-post',
      { postId: post.id },
      {
        delay: Math.max(0, delay),
        jobId: `publish-${post.id}`,
      }
    );

    logger.info('Post auto-scheduled', {
      postId: post.id,
      channelId,
      scheduledFor: scheduledFor.toISOString(),
    });
  } catch (error: any) {
    logger.error('Auto-schedule error', { error: error.message });
  }
}

export const generateWorker = new Worker(
  'generate',
  async (job: Job) => {
    const { mediaItemId, channelId: jobChannelId } = job.data;
    logger.info('Generate worker started', { jobId: job.id, mediaItemId, jobChannelId });

    try {
      const mediaItem = await prisma.mediaItem.findUnique({
        where: { id: mediaItemId },
        include: { analysis: true },
      });

      if (!mediaItem) {
        throw new Error(`Media item not found: ${mediaItemId}`);
      }

      // Use channelId from MediaItem, fallback to job data if not set
      const channelId = mediaItem.channelId || jobChannelId || undefined;
      logger.info('Using channelId', { mediaItemId, channelId, mediaItemChannelId: mediaItem.channelId, jobChannelId });

      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { status: 'GENERATING_PREVIEW' },
      });

      // Convert null to undefined for GrokAnalysisResult compatibility
      // If no analysis exists yet, create a minimal one to allow generation
      const analysisData = {
        scenario: mediaItem.analysis?.scenario ?? undefined,
        pose: mediaItem.analysis?.pose ?? undefined,
        clothing: mediaItem.analysis?.clothing ?? undefined,
        emotion: mediaItem.analysis?.emotion ?? undefined,
        visualStyle: mediaItem.analysis?.visualStyle ?? undefined,
        mainFocus: mediaItem.analysis?.mainFocus ?? undefined,
        colors: mediaItem.analysis?.colors ?? undefined,
        feeling: mediaItem.analysis?.feeling ?? undefined,
        description: mediaItem.analysis?.description ?? (mediaItem.originalName || 'Conteúdo novo'),
        headline: mediaItem.analysis?.headline ?? undefined,
        copy: mediaItem.analysis?.copy ?? undefined,
        hashtags: mediaItem.analysis?.hashtags ?? undefined,
        category: mediaItem.analysis?.category ?? undefined,
        rawData: mediaItem.analysis?.rawData ?? undefined,
      };

      logger.info('Calling generateFromAnalysis', { mediaItemId, channelId });
      let previewContent;
      try {
        previewContent = await previewService.generateFromAnalysis(analysisData, ctaConfig.link, channelId);
      } catch (genError: any) {
        logger.error('Generation failed, using fallback', { error: genError.message, mediaItemId });
        // Use fallback if available
        try {
          previewContent = (previewService as any).generateFallbackPreview
            ? (previewService as any).generateFallbackPreview(analysisData, ctaConfig.link)
            : null;
        } catch (fbError: any) {
          logger.error('Fallback also failed', { error: fbError.message });
        }

        if (!previewContent) {
          // Last resort: create minimal preview
          previewContent = {
            headline: 'CONTEÚDO EXCLUSIVO 🔥',
            body: 'Conteúdo novo disponível agora no nosso canal.',
            preCta: 'Quer conferir?',
            cta: 'VER AGORA 🔥\nVER AGORA 🔥\nVER AGORA 🔥',
            buttonText: '',
            buttonUrl: ctaConfig.link,
          };
        }
      }

      // Apply censoring to all text fields
      previewContent.headline = censorText(previewContent.headline);
      previewContent.body = censorText(previewContent.body);
      previewContent.preCta = censorText(previewContent.preCta);
      previewContent.cta = censorText(previewContent.cta);
      previewContent.buttonText = censorText(previewContent.buttonText);

      const existingPreview = await prisma.preview.findUnique({
        where: { mediaItemId },
      });

      let preview;
      if (existingPreview) {
        preview = await prisma.preview.update({
          where: { id: existingPreview.id },
          data: {
            headline: previewContent.headline,
            body: previewContent.body,
            preCta: previewContent.preCta,
            cta: previewContent.cta,
            buttonText: previewContent.buttonText,
            buttonUrl: previewContent.buttonUrl,
            status: 'APPROVED',
            approved: true,
          },
        });
      } else {
        preview = await prisma.preview.create({
          data: {
            mediaItemId,
            headline: previewContent.headline,
            body: previewContent.body,
            preCta: previewContent.preCta,
            cta: previewContent.cta,
            buttonText: previewContent.buttonText,
            buttonUrl: previewContent.buttonUrl,
            status: 'APPROVED',
            approved: true,
          },
        });
      }

      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { status: 'READY', processed: true },
      });

      // Auto-schedule the post (only if not already scheduled)
      const existingPost = await prisma.post.findFirst({
        where: {
          mediaItemId: mediaItem.id,
          previewId: preview.id,
          status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
        },
      });

      if (!existingPost) {
        if (channelId) {
          await autoSchedulePost(mediaItem.id, preview.id, channelId);
        } else {
          logger.warn('Cannot auto-schedule: no channelId on media item', { mediaItemId });
        }
      } else {
        logger.info('Post already scheduled for this preview, skipping auto-schedule', { mediaItemId, previewId: preview.id });
      }

      await prisma.jobLog.create({
        data: {
          jobName: 'generate',
          jobId: job.id,
          status: 'completed',
          data: JSON.stringify({ mediaItemId }),
        },
      });

      logger.info('Generate worker completed and auto-scheduled', { mediaItemId });
      return { mediaItemId, preview: previewContent };
    } catch (error: any) {
      logger.error('Generate worker error', {
        error: error.message,
        stack: error.stack,
        mediaItemId,
      });

      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { status: 'ERROR' },
      });

      await prisma.jobLog.create({
        data: {
          jobName: 'generate',
          jobId: job.id,
          status: 'failed',
          error: error.message,
          data: JSON.stringify({ mediaItemId }),
        },
      });

      throw error;
    }
  },
  {
    connection: connectionOptions as any,
    concurrency: 1, // CRITICAL: prevent race conditions in autoSchedulePost
  }
);

generateWorker.on('completed', (job) => {
  logger.info('Generate job completed', { jobId: job.id });
});

generateWorker.on('failed', (job, err) => {
  logger.error('Generate job failed', { jobId: job?.id, error: err.message });
});
