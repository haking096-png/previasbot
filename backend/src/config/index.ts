import dotenv from 'dotenv';
import { AppConfig, DatabaseConfig, RedisConfig, TelegramConfig, GrokConfig, CTAConfig } from '../types/config';

dotenv.config();

// ━━━━━━━━━━━━━━━━━━━ VALIDATION ━━━━━━━━━━━━━━━━━━━

interface ValidationError {
  key: string;
  message: string;
}

const errors: ValidationError[] = [];

// Validate critical environment variables
if (!process.env.DATABASE_URL) {
  errors.push({ key: 'DATABASE_URL', message: 'Banco de dados não configurado' });
}

if (!process.env.JWT_SECRET) {
  errors.push({ key: 'JWT_SECRET', message: 'JWT_SECRET não configurado' });
}

if (!process.env.ADMIN_PASSWORD) {
  errors.push({ key: 'ADMIN_PASSWORD', message: 'ADMIN_PASSWORD não configurado' });
}

// Warn about Telegram configuration
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN não configurado - publicações falharão');
}

if (!process.env.TELEGRAM_CHAT_ID) {
  console.warn('⚠️ TELEGRAM_CHAT_ID não configurado - publicações falharão');
}

// Warn about Grok API
if (!process.env.GROK_API_KEY) {
  console.warn('⚠️ GROK_API_KEY não configurado - análise de imagens falhará');
}

// If critical errors, don't start the server
if (errors.length > 0) {
  console.error('\n❌ ERROS DE CONFIGURAÇÃO CRÍTICOS:\n');
  errors.forEach(e => console.error(`  - ${e.key}: ${e.message}`));
  console.error('\nCorrija as variáveis de ambiente antes de iniciar.\n');
  process.exit(1);
}

// ━━━━━━━━━━━━━━━━━━━ CONFIG EXPORTS ━━━━━━━━━━━━━━━━━━━

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

// Log startup configuration
console.log('\n📋 CONFIGURAÇÃO DO SISTEMA:');
console.log(` PORT: ${appConfig.port}`);
console.log(`   NODE_ENV: ${appConfig.nodeEnv}`);
console.log(`   REDIS: ${redisConfig.host}:${redisConfig.port}`);
console.log(`   TELEGRAM_BOT: ${telegramConfig.botToken ? '✅ Configurado' : '❌ NÃO CONFIGURADO'}`);
console.log(`   TELEGRAM_CHAT: ${telegramConfig.chatId ? '✅ Configurado' : '❌ NÃO CONFIGURADO'}`);
console.log(`   GROK_API: ${grokConfig.apiKey ? '✅ Configurado' : '❌ NÃO CONFIGURADO'}`);
console.log('');
