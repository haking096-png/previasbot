-- Migration: Add Telegram storage fields

-- Add mediaStorageChatId to Channel
ALTER TABLE "Channel" ADD COLUMN "mediaStorageChatId" TEXT;

-- Add Telegram file fields to MediaItem
ALTER TABLE "MediaItem" ADD COLUMN "telegramFileId" TEXT;
ALTER TABLE "MediaItem" ADD COLUMN "telegramMessageId" TEXT;
