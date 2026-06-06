import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { redisConfig } from '../config';
import logger from './logger';

const connection = new IORedis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  username: redisConfig.username,
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

connection.on('connect', () => {
  logger.info('Redis connected successfully');
});

export const importQueue = new Queue('import', { connection });
export const analyzeQueue = new Queue('analyze', { connection });
export const generateQueue = new Queue('generate', { connection });
export const publishQueue = new Queue('publish', { connection });
export const scheduleQueue = new Queue('schedule', { connection });
export const ctaPresenteQueue = new Queue('cta-presente', { connection });
export const enqueteQueue = new Queue('enquete', { connection });

export { connection };
