import dotenv from 'dotenv';
import { AppConfig, DatabaseConfig, RedisConfig, TelegramConfig, GrokConfig, CTAConfig } from '../types/config';

dotenv.config();

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  uploadsPath: process.env.UPLOADS_PATH || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
};

export const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || '',
};

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDIS_USERNAME || 'default',
};

export const telegramConfig: TelegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
};

export const grokConfig: GrokConfig = {
  apiKey: process.env.GROK_API_KEY || '',
  apiUrl: process.env.GROK_API_URL || 'https://api.x.ai/v1',
};

export const ctaConfig: CTAConfig = {
  link: process.env.CTA_LINK || 'https://t.me/yourbot',
};
