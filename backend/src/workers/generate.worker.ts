import { Worker, Job } from 'bullmq';
import { connection, publishQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import previewService from '../services/preview.service';
import { ctaConfig } from '../config';

// Auto-schedule function
async function autoSchedulePost(mediaItemId: string, previewId: string) {
  try {
    // Get enabled schedules
    const schedules = await prisma.schedule.findMany({
      where: { enabled: true },
      orderBy: { time: 'asc' },
    });

    if (schedules.length === 0) {
      logger.warn('No enabled schedules found for auto-scheduling');
      return;
    }

    // Get existing scheduled posts
    const existingPosts = await prisma.post.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PUBLISHING'] },
      },
      orderBy: { scheduledFor: 'desc' },
    });

    // Find next available schedule slot
    const now = new Date();
    let scheduledFor: Date | null = null;

    // Try to find a slot today or in the future
    for (let daysAhead = 0; daysAhead < 30; daysAhead++) {
      for (const schedule of schedules) {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const candidateDate = new Date(now);
        candidateDate.setDate(candidateDate.getDate() + daysAhead);
        candidateDate.setHours(hours, minutes, 0, 0);

        // Skip if in the past
        if (candidateDate <= now) continue;

        // Check if this slot is already taken
        const isSlotTaken = existingPosts.some(post => {
          if (!post.scheduledFor) return false;
          const postDate = new Date(post.scheduledFor);
          return Math.abs(postDate.getTime() - candidateDate.getTime()) < 60000; // Within 1 minute
        });

        if (!isSlotTaken) {
          scheduledFor = candidateDate;
          break;
        }
      }
      if (scheduledFor) break;
    }

    if (!scheduledFor) {
      logger.warn('Could not find available schedule slot');
      return;
    }

    // Create scheduled post
    const post = await prisma.post.create({
      data: {
        mediaItemId,
        previewId,
        scheduledFor,
        status: 'SCHEDULED',
      },
    });

    // Add to publish queue
    const delay = scheduledFor.getTime() - Date.now();
    await publishQueue.add(
      'publish-post',
      { postId: post.id },
      { delay: Math.max(0, delay) }
    );

    logger.info('Post auto-scheduled', {
      postId: post.id,
      scheduledFor: scheduledFor.toISOString(),
    });
  } catch (error: any) {
    logger.error('Auto-schedule error', { error: error.message });
  }
}

export const generateWorker = new Worker(
  'generate',
  async (job: Job) => {
    const { mediaItemId } = job.data;
    logger.info('Generate worker started', { jobId: job.id, mediaItemId });

    try {
      const mediaItem = await prisma.mediaItem.findUnique({
        where: { id: mediaItemId },
        include: { analysis: true },
      });

      if (!mediaItem) {
        throw new Error(`Media item not found: ${mediaItemId}`);
      }

      if (!mediaItem.analysis) {
        throw new Error(`Media analysis not found for: ${mediaItemId}`);
      }

      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { status: 'GENERATING_PREVIEW' },
      });

      // Convert null to undefined for GrokAnalysisResult compatibility
      const analysisData = {
        scenario: mediaItem.analysis.scenario ?? undefined,
        pose: mediaItem.analysis.pose ?? undefined,
        clothing: mediaItem.analysis.clothing ?? undefined,
        emotion: mediaItem.analysis.emotion ?? undefined,
        visualStyle: mediaItem.analysis.visualStyle ?? undefined,
        mainFocus: mediaItem.analysis.mainFocus ?? undefined,
        colors: mediaItem.analysis.colors ?? undefined,
        feeling: mediaItem.analysis.feeling ?? undefined,
        description: mediaItem.analysis.description ?? undefined,
        headline: mediaItem.analysis.headline ?? undefined,
        copy: mediaItem.analysis.copy ?? undefined,
        hashtags: mediaItem.analysis.hashtags ?? undefined,
        category: mediaItem.analysis.category ?? undefined,
        rawData: mediaItem.analysis.rawData ?? undefined,
      };

      const previewContent = await previewService.generateFromAnalysis(analysisData, ctaConfig.link, job.data.channelId);

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

      // Auto-schedule the post
      await autoSchedulePost(mediaItem.id, preview.id);

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
    connection,
    concurrency: 3,
  }
);

generateWorker.on('completed', (job) => {
  logger.info('Generate job completed', { jobId: job.id });
});

generateWorker.on('failed', (job, err) => {
  logger.error('Generate job failed', { jobId: job?.id, error: err.message });
});
