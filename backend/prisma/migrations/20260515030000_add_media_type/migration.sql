-- Add mediaType field to MediaItem
ALTER TABLE "MediaItem" ADD COLUMN "mediaType" TEXT NOT NULL DEFAULT 'IMAGE';
