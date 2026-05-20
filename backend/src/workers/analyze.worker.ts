import { Worker, Job } from 'bullmq';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import { connection, generateQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import grokService from '../services/grok.service';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export const analyzeWorker = new Worker(
  'analyze',
  async (job: Job) => {
    const { mediaItemId, channelId } = job.data;
    logger.info('Analyze worker started', { jobId: job.id, mediaItemId, channelId });

    let tempFilePath: string | null = null;

    try {
      const mediaItem = await prisma.mediaItem.findUnique({
        where: { id: mediaItemId },
        include: { channel: true },
      });

      if (!mediaItem) {
        throw new Error(`Media item not found: ${mediaItemId}`);
      }

      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { status: 'ANALYZING' },
      });

      let imagePath: string;

      if (mediaItem.telegramFileId && mediaItem.channel?.botToken) {
        // Download from Telegram
        const bot = new Telegraf(mediaItem.channel.botToken);
        const fileLink = await bot.telegram.getFileLink(mediaItem.telegramFileId);

        const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        const ext = path.extname(mediaItem.originalName) || (mediaItem.mediaType === 'VIDEO' ? '.mp4' : '.jpg');
        tempFilePath = path.join(os.tmpdir(), `tg-media-${mediaItemId}${ext}`);
        fs.writeFileSync(tempFilePath, buffer);

        if (mediaItem.mediaType === 'VIDEO') {
          // Extract a frame from the middle of the video using ffmpeg
          const framePath = path.join(os.tmpdir(), `tg-frame-${mediaItemId}.jpg`);
          try {
            // Get video duration
            const durationOutput = execSync(
              `ffprobe -v error -show_entries format=duration -of csv=p=0 "${tempFilePath}"`,
              { encoding: 'utf-8' }
            ).trim();
            const duration = parseFloat(durationOutput) || 2;
            const seekTime = Math.min(duration / 2, 5); // Middle of video, max 5s in

            execSync(
              `ffmpeg -y -ss ${seekTime} -i "${tempFilePath}" -vframes 1 -q:v 2 "${framePath}"`,
              { encoding: 'utf-8', stdio: 'pipe' }
            );

            // Use the extracted frame for analysis
            imagePath = framePath;
            // Clean up video file, keep frame (will be cleaned in finally)
            fs.unlinkSync(tempFilePath);
            tempFilePath = framePath;
          } catch (ffmpegError: any) {
            logger.warn('ffmpeg frame extraction failed, trying first frame', { error: ffmpegError.message });
            // Fallback: try to get first frame
            const framePath2 = path.join(os.tmpdir(), `tg-frame2-${mediaItemId}.jpg`);
            try {
              execSync(
                `ffmpeg -y -i "${tempFilePath}" -vframes 1 -q:v 2 "${framePath2}"`,
                { encoding: 'utf-8', stdio: 'pipe' }
              );
              imagePath = framePath2;
              fs.unlinkSync(tempFilePath);
              tempFilePath = framePath2;
            } catch {
              // If ffmpeg completely fails, use the video file directly (Grok might handle it)
              imagePath = tempFilePath;
            }
          }
        } else {
          imagePath = tempFilePath;
        }
      } else if (mediaItem.filePath) {
        // Legacy: read from local disk
        imagePath = path.join(process.cwd(), mediaItem.filePath);
      } else {
        throw new Error('No media source available (no telegramFileId and no filePath)');
      }

      const analysis = await grokService.analyzeImage(imagePath);

      await prisma.mediaAnalysis.upsert({
        where: { mediaItemId },
        update: {
          scenario: analysis.scenario,
          pose: analysis.pose,
          clothing: analysis.clothing,
          emotion: analysis.emotion,
          visualStyle: analysis.visualStyle,
          mainFocus: analysis.mainFocus,
          colors: analysis.colors,
          feeling: analysis.feeling,
          description: analysis.description,
          headline: analysis.headline,
          copy: analysis.copy,
          hashtags: analysis.hashtags,
          category: analysis.category,
          rawData: analysis.rawData,
        },
        create: {
          mediaItemId,
          scenario: analysis.scenario,
          pose: analysis.pose,
          clothing: analysis.clothing,
          emotion: analysis.emotion,
          visualStyle: analysis.visualStyle,
          mainFocus: analysis.mainFocus,
          colors: analysis.colors,
          feeling: analysis.feeling,
          description: analysis.description,
          headline: analysis.headline,
          copy: analysis.copy,
          hashtags: analysis.hashtags,
          category: analysis.category,
          rawData: analysis.rawData,
        },
      });

      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { status: 'ANALYZED' },
      });

      await generateQueue.add('generate-preview', { mediaItemId });

      await prisma.jobLog.create({
        data: {
          jobName: 'analyze',
          jobId: job.id,
          status: 'completed',
          data: JSON.stringify({ mediaItemId }),
        },
      });

      logger.info('Analyze worker completed', { mediaItemId });
      return { mediaItemId, analysis };
    } catch (error: any) {
      logger.error('Analyze worker error', {
        error: error.message,
        stack: error.stack,
        mediaItemId,
      });

      await prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { status: 'ERROR' },
      });

      await prisma.jobLog.create({
        data: {
          jobName: 'analyze',
          jobId: job.id,
          status: 'failed',
          error: error.message,
          data: JSON.stringify({ mediaItemId }),
        },
      });

      throw error;
    } finally {
      // Clean up temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

analyzeWorker.on('completed', (job) => {
  logger.info('Analyze job completed', { jobId: job.id });
});

analyzeWorker.on('failed', (job, err) => {
  logger.error('Analyze job failed', { jobId: job?.id, error: err.message });
});
