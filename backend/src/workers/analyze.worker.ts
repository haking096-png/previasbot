import { Worker, Job } from 'bullmq';
import { connection, generateQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import grokService from '../services/grok.service';
import path from 'path';

export const analyzeWorker = new Worker(
  'analyze',
  async (job: Job) => {
    const { mediaItemId } = job.data;
    logger.info('Analyze worker started', { jobId: job.id, mediaItemId });

    try {
      const mediaItem = await prisma.mediaItem.findUnique({
        where: { id: mediaItemId },
      });

      if (!mediaItem) {
        throw new Error(`Media item not found: ${mediaItemId}`);
      }

      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { status: 'ANALYZING' },
      });

      const fullPath = path.join(process.cwd(), mediaItem.filePath);
      const analysis = await grokService.analyzeImage(fullPath);

      await prisma.mediaAnalysis.create({
        data: {
          mediaItemId,
          scenario: analysis.scenario,
          pose: analysis.pose,
          clothing: analysis.clothing,
          emotion: analysis.emotion,
          visualStyle: analysis.visualStyle,
          mainFocus: analysis.mainFocus,
          colors: analysis.colors,
          feeling: analysis.feeling,
          description: analysis.description,
          headline: analysis.headline,
          copy: analysis.copy,
          hashtags: analysis.hashtags,
          category: analysis.category,
          rawData: analysis.rawData,
        },
      });

      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { status: 'ANALYZED' },
      });

      await generateQueue.add('generate-preview', { mediaItemId });

      await prisma.jobLog.create({
        data: {
          jobName: 'analyze',
          jobId: job.id,
          status: 'completed',
          data: JSON.stringify({ mediaItemId }),
        },
      });

      logger.info('Analyze worker completed', { mediaItemId });
      return { mediaItemId, analysis };
    } catch (error: any) {
      logger.error('Analyze worker error', {
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
          jobName: 'analyze',
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
    concurrency: 2,
  }
);

analyzeWorker.on('completed', (job) => {
  logger.info('Analyze job completed', { jobId: job.id });
});

analyzeWorker.on('failed', (job, err) => {
  logger.error('Analyze job failed', { jobId: job?.id, error: err.message });
});
