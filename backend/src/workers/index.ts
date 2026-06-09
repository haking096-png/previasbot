import logger from '../utils/logger';
logger.info('[WORKER] Starting workers...');
logger.info('[WORKER] REDIS_HOST:', { host: process.env.REDIS_HOST });
logger.info('[WORKER] REDIS_PORT:', { port: process.env.REDIS_PORT });

import { importQueue, analyzeQueue, scheduleQueue } from '../utils/queue';

import './import.worker';
import './analyze.worker';
import './generate.worker';
import './publish.worker';
import './schedule.worker';

import { startCtaPresenteWorker, stopCtaPresenteWorker } from './ctaPresente.worker';
import { startEnqueteWorker, stopEnqueteWorker } from './enquete.worker';

logger.info('Workers initialized');

// Start CTA Presente and Enquete workers
startCtaPresenteWorker();
startEnqueteWorker();

async function setupRecurringJobs() {
  await importQueue.add(
    'import-media',
    {},
    {
      repeat: {
        pattern: '*/5 * * * *',
      },
    }
  );
  logger.info('Import job scheduled (every 5 minutes)');

  await scheduleQueue.add(
    'schedule-posts',
    {},
    {
      repeat: {
        pattern: '*/2 * * * *',
      },
    }
  );
  logger.info('Schedule job scheduled (every 2 minutes)');

  const pendingMedia = await import('../utils/prisma').then((m) =>
    m.default.mediaItem.findMany({
      where: {
        status: 'PENDING',
        processed: false,
      },
    })
  );

  for (const media of pendingMedia) {
    await analyzeQueue.add('analyze-image', { mediaItemId: media.id });
    logger.info('Queued pending media for analysis', { mediaItemId: media.id });
  }
}

setupRecurringJobs().catch((error) => {
  logger.error('Failed to setup recurring jobs', { error: error.message });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down workers');
  stopCtaPresenteWorker();
  stopEnqueteWorker();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down workers');
  stopCtaPresenteWorker();
  stopEnqueteWorker();
  process.exit(0);
});
