export interface MediaItemDTO {
  id: string;
  filename: string;
  originalName: string;
  order: number;
  status: string;
  processed: boolean;
  createdAt: Date;
  analysis?: MediaAnalysisDTO;
  preview?: PreviewDTO;
}

export interface MediaAnalysisDTO {
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
  rawData?: string;
}

export interface PreviewDTO {
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

export interface PostDTO {
  id: string;
  scheduledFor?: Date;
  publishedAt?: Date;
  status: string;
  telegramMessageId?: string;
  error?: string;
  mediaItem: MediaItemDTO;
  preview: PreviewDTO;
}

export interface ScheduleDTO {
  id: string;
  time: string;
  enabled: boolean;
}

export interface SettingsDTO {
  id: string;
  key: string;
  value: string;
  description?: string;
}

export interface JobLogDTO {
  id: string;
  jobName: string;
  jobId?: string;
  status: string;
  data?: string;
  error?: string;
  createdAt: Date;
}
