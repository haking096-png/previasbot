import { Worker, Job } from 'bullmq';
import { connection, analyzeQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { appConfig } from '../config';

export const importWorker = new Worker(
  'import',
  async (job: Job) => {
    logger.info('Import worker started', { jobId: job.id });

    try {
      const uploadsPath = path.resolve(appConfig.uploadsPath);

      if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath, { recursive: true });
        logger.info('Uploads directory created', { path: uploadsPath });
      }

      const files = fs.readdirSync(uploadsPath);
      const imageFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
      });

      logger.info('Found image files', { count: imageFiles.length });

      const sortedFiles = imageFiles.sort((a, b) => {
        const numA = parseInt(path.basename(a, path.extname(a)));
        const numB = parseInt(path.basename(b, path.extname(b)));
        return numA - numB;
      });

      let imported = 0;

      // Get the max order from existing items
      const maxOrderItem = await prisma.mediaItem.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      let nextOrder = (maxOrderItem?.order || 0) + 1;

      for (const file of sortedFiles) {
        const filename = file;
        const filePath = path.join(uploadsPath, file);

        const existing = await prisma.mediaItem.findUnique({
          where: { filename },
        });

        if (existing) {
          logger.debug('File already imported', { filename });
          continue;
        }

        const mediaItem = await prisma.mediaItem.create({
          data: {
            filename,
            originalName: file,
            filePath: `/uploads/${file}`,
            order: nextOrder,
            status: 'PENDING',
            processed: false,
          },
        });

        await analyzeQueue.add('analyze-image', { mediaItemId: mediaItem.id });

        imported++;
        nextOrder++;
        logger.info('Media item imported and queued for analysis', { filename, order: nextOrder - 1 });
      }

      await prisma.jobLog.create({
        data: {
          jobName: 'import',
          jobId: job.id,
          status: 'completed',
          data: JSON.stringify({ imported, total: sortedFiles.length }),
        },
      });

      logger.info('Import worker completed', { imported });
      return { imported, total: sortedFiles.length };
    } catch (error: any) {
      logger.error('Import worker error', { error: error.message, stack: error.stack });

      await prisma.jobLog.create({
        data: {
          jobName: 'import',
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

importWorker.on('completed', (job) => {
  logger.info('Import job completed', { jobId: job.id });
});

importWorker.on('failed', (job, err) => {
  logger.error('Import job failed', { jobId: job?.id, error: err.message });
});
