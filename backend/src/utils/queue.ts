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

const connectionOptions = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  username: redisConfig.username,
  maxRetriesPerRequest: null,
} as const;

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 10000, // 10s, 20s, 40s
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

export const importQueue = new Queue('import', { connection: connectionOptions as any, defaultJobOptions });
export const analyzeQueue = new Queue('analyze', { connection: connectionOptions as any, defaultJobOptions });
export const generateQueue = new Queue('generate', { connection: connectionOptions as any, defaultJobOptions });
export const publishQueue = new Queue('publish', { connection: connectionOptions as any, defaultJobOptions });
export const scheduleQueue = new Queue('schedule', { connection: connectionOptions as any, defaultJobOptions });
export const ctaPresenteQueue = new Queue('cta-presente', { connection: connectionOptions as any, defaultJobOptions });
export const enqueteQueue = new Queue('enquete', { connection: connectionOptions as any, defaultJobOptions });

export { connection };
export { connectionOptions };
