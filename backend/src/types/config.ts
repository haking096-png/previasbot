export interface AppConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  adminPassword: string;
  uploadsPath: string;
  maxFileSize: number;
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  username?: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface GrokConfig {
  apiKey: string;
  apiUrl: string;
}

export interface CTAConfig {
  link: string;
}
