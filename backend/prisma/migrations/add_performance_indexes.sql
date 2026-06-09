-- Migration: Add performance indexes
-- This migration adds indexes to improve query performance

-- MediaItem indexes
CREATE INDEX IF NOT EXISTS "MediaItem_status_idx" ON "MediaItem"("status");
CREATE INDEX IF NOT EXISTS "MediaItem_channelId_status_idx" ON "MediaItem"("channelId", "status");
CREATE INDEX IF NOT EXISTS "MediaItem_order_idx" ON "MediaItem"("order");

-- Preview indexes
CREATE INDEX IF NOT EXISTS "Preview_channelId_idx" ON "Preview"("channelId");
CREATE INDEX IF NOT EXISTS "Preview_mediaItemId_idx" ON "Preview"("mediaItemId");
CREATE INDEX IF NOT EXISTS "Preview_approved_idx" ON "Preview"("approved");

-- Post indexes
CREATE INDEX IF NOT EXISTS "Post_channelId_status_idx" ON "Post"("channelId", "status");
CREATE INDEX IF NOT EXISTS "Post_scheduledFor_idx" ON "Post"("scheduledFor");
CREATE INDEX IF NOT EXISTS "Post_status_idx" ON "Post"("status");
CREATE INDEX IF NOT EXISTS "Post_mediaItemId_idx" ON "Post"("mediaItemId");

-- Schedule indexes
CREATE INDEX IF NOT EXISTS "Schedule_channelId_enabled_idx" ON "Schedule"("channelId", "enabled");

-- CTA Presente Schedule indexes
CREATE INDEX IF NOT EXISTS "CtaPresenteSchedule_channelId_enabled_time_idx" ON "CtaPresenteSchedule"("channelId", "enabled", "time");

-- Enquete Schedule indexes
CREATE INDEX IF NOT EXISTS "EnqueteSchedule_channelId_enabled_time_idx" ON "EnqueteSchedule"("channelId", "enabled", "time");

-- JobLog indexes (for worker monitoring)
CREATE INDEX IF NOT EXISTS "JobLog_jobName_status_createdAt_idx" ON "JobLog"("jobName", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "JobLog_createdAt_idx" ON "JobLog"("createdAt");

-- Template indexes
CREATE INDEX IF NOT EXISTS "Template_channelId_type_idx" ON "Template"("channelId", "type");
CREATE INDEX IF NOT EXISTS "Template_isActive_idx" ON "Template"("isActive");

-- Analyze notes for future migrations:
-- - Consider partitioning JobLog by date if it grows large
-- - Consider adding partial indexes for active records (WHERE enabled = true)
-- - Consider composite index on Post for (channelId, status, scheduledFor) if common query
