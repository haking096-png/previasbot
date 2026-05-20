export interface MediaItem {
  id: string;
  filename: string;
  filePath: string;
  telegramFileId?: string;
  telegramMessageId?: string;
  mediaType: string;
  originalName: string;
  order: number;
  status: string;
  processed: boolean;
  createdAt: string;
  analysis?: MediaAnalysis;
  preview?: Preview;
}

export interface MediaAnalysis {
  id: string;
  scenario?: string;
  pose?: string;
  clothing?: string;
  emotion?: string;
  visualStyle?: string;
  mainFocus?: string;
  colors?: string;
  feeling?: string;
  description?: string;
  headline?: string;
  copy?: string;
  hashtags?: string;
  category?: string;
}

export interface Preview {
  id: string;
  headline: string;
  body: string;
  preCta: string;
  cta: string;
  buttonText: string;
  buttonUrl: string;
  status: string;
  approved: boolean;
}

export interface Post {
  id: string;
  scheduledFor?: string;
  publishedAt?: string;
  status: string;
  telegramMessageId?: string;
  error?: string;
  channelId?: string;
  channel?: Channel;
  mediaItem: MediaItem;
  preview: Preview;
}

export interface Schedule {
  id: string;
  time: string;
  enabled: boolean;
  channelId?: string;
  channel?: Channel;
}

export interface Settings {
  id: string;
  key: string;
  value: string;
  description?: string;
}

export interface Channel {
  id: string;
  name: string;
  botToken: string;
  chatId: string;
  ctaLink: string;
  mediaStorageChatId?: string;
  ctaPrompt?: string;
  enquetePrompt?: string;
  previewPrompt?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { posts: number };
}
