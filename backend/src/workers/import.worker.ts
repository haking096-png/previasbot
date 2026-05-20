import { Worker, Job } from 'bullmq';
import { connection } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

export const importWorker = new Worker(
  'import',
  async (job: Job) => {
    // Import from local filesystem is no longer used.
    // Media is now uploaded directly to Telegram via the dashboard.
    logger.info('Import worker triggered (no-op, media is stored in Telegram)', { jobId: job.id });

    await prisma.jobLog.create({
      data: {
        jobName: 'import',
        jobId: job.id,
        status: 'completed',
        data: JSON.stringify({ imported: 0, message: 'Local import disabled, use dashboard upload' }),
      },
    });

    return { imported: 0 };
  },
  { connection }
);

importWorker.on('completed', (job) => {
  logger.info('Import job completed', { jobId: job.id });
});

importWorker.on('failed', (job, err) => {
  logger.error('Import job failed', { jobId: job?.id, error: err.message });
});
