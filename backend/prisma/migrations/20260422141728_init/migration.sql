-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'ANALYZING', 'ANALYZED', 'GENERATING_PREVIEW', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "PreviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAnalysis" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "scenario" TEXT,
    "pose" TEXT,
    "clothing" TEXT,
    "emotion" TEXT,
    "visualStyle" TEXT,
    "mainFocus" TEXT,
    "colors" TEXT,
    "feeling" TEXT,
    "rawData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preview" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "preCta" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "buttonUrl" TEXT NOT NULL,
    "status" "PreviewStatus" NOT NULL DEFAULT 'PENDING',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "previewId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "telegramMessageId" TEXT,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobId" TEXT,
    "status" TEXT NOT NULL,
    "data" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MediaItem_filename_key" ON "MediaItem"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "MediaItem_order_key" ON "MediaItem"("order");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAnalysis_mediaItemId_key" ON "MediaAnalysis"("mediaItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Preview_mediaItemId_key" ON "Preview"("mediaItemId");

-- AddForeignKey
ALTER TABLE "MediaAnalysis" ADD CONSTRAINT "MediaAnalysis_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preview" ADD CONSTRAINT "Preview_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_previewId_fkey" FOREIGN KEY ("previewId") REFERENCES "Preview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
