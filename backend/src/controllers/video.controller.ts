import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { publishQueue } from '../utils/queue';

const TIMEZONE = process.env.TZ || 'America/Sao_Paulo';

function getTimezoneOffset(date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

function createScheduleDate(daysAhead: number, hours: number, minutes: number): Date {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day + daysAhead, hours, minutes, 0, 0));
  const offset = getTimezoneOffset(targetDate);
  targetDate.setMinutes(targetDate.getMinutes() + offset);
  return targetDate;
}

export class VideoController {
  // Schedule a video with conflict resolution
  async scheduleVideo(req: Request, res: Response) {
    try {
      const { description, preview, channelId, scheduledFor, ctaLink, mediaItemId } = req.body;

      if (!description || !channelId) {
        return res.status(400).json({ error: 'description e channelId são obrigatórios' });
      }

      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        return res.status(404).json({ error: 'Canal não encontrado' });
      }

      const effectiveCtaLink = ctaLink || channel.ctaLink || '';

      // Create a placeholder media item for the video (required by Preview model)
      let videoMediaItem = null;
      if (mediaItemId) {
        videoMediaItem = await prisma.mediaItem.findUnique({ where: { id: mediaItemId } });
      }

      let placeholderMediaItem = videoMediaItem;
      if (!placeholderMediaItem) {
        const timestamp = Date.now();
        placeholderMediaItem = await prisma.mediaItem.create({
          data: {
            filename: `video-placeholder-${timestamp}`,
            originalName: `Video Preview ${timestamp}`,
            filePath: '',
            mediaType: 'VIDEO',
            order: 999,
            status: 'READY',
            channelId,
          },
        });
      }

      // Find the next available slot for the VIDEO (keeps its time)
      const videoSlot = await this.findNextAvailableSlot(
        new Date(scheduledFor || Date.now() + 60000),
        channelId,
        'VIDEO'
      );

      // Create preview
      const previewRecord = await prisma.preview.create({
        data: {
          mediaItemId: placeholderMediaItem.id,
          headline: preview?.headline || 'VÍDEO EXCLUSIVO 🔥',
          body: preview?.body || description.substring(0, 300),
          preCta: preview?.preCta || 'Quer ver o vídeo completo? 👇',
          cta: preview?.cta || '🔥 VER VÍDEO 🔥\n🔥 VER VÍDEO 🔥\n🔥 VER VÍDEO 🔥',
          buttonText: preview?.buttonText || '',
          buttonUrl: effectiveCtaLink,
          status: 'APPROVED',
          approved: true,
        },
      });

      // Create video post
      const videoPost = await prisma.post.create({
        data: {
          mediaItemId: placeholderMediaItem.id,
          previewId: previewRecord.id,
          channelId,
          scheduledFor: videoSlot,
          status: 'SCHEDULED',
        },
      });

      // Schedule video post
      const videoDelay = videoSlot.getTime() - Date.now();
      await publishQueue.add(
        'publish-post',
        { postId: videoPost.id },
        { delay: Math.max(0, videoDelay), jobId: `publish-video-${videoPost.id}` }
      );

      // CRITICAL: Find and reschedule any PHOTO posts in the same slot to the next available
      const conflictingPhotos = await prisma.post.findMany({
        where: {
          channelId,
          scheduledFor: {
            gte: new Date(videoSlot.getTime() - 60000),
            lte: new Date(videoSlot.getTime() + 60000),
          },
          status: { in: ['SCHEDULED', 'PUBLISHING'] },
          mediaItem: { mediaType: { not: 'VIDEO' } },
        },
      });

      const rescheduledPhotos: any[] = [];
      for (const photoPost of conflictingPhotos) {
        if (!photoPost.scheduledFor) continue;

        // Find next available slot for this photo (VIDEO keeps its slot)
        const photoSlot = await this.findNextAvailableSlot(
          new Date(photoPost.scheduledFor.getTime() + 60000),
          channelId,
          'IMAGE'
        );

        await prisma.post.update({
          where: { id: photoPost.id },
          data: { scheduledFor: photoSlot },
        });

        // Reschedule in queue
        const photoDelay = photoSlot.getTime() - Date.now();
        await publishQueue.add(
          'publish-post',
          { postId: photoPost.id },
          { delay: Math.max(0, photoDelay), jobId: `publish-${photoPost.id}` }
        );

        rescheduledPhotos.push({
          id: photoPost.id,
          newSlot: photoSlot.toISOString(),
        });

        logger.info('Photo rescheduled due to video conflict', {
          postId: photoPost.id,
          oldSlot: photoPost.scheduledFor,
          newSlot: photoSlot,
        });
      }

      logger.info('Video scheduled successfully', {
        postId: videoPost.id,
        scheduledFor: videoSlot,
        rescheduledPhotos: rescheduledPhotos.length,
      });

      res.status(201).json({
        message: 'Vídeo agendado com sucesso',
        post: videoPost,
        videoSlot: videoSlot.toISOString(),
        rescheduledPhotos,
      });
    } catch (error: any) {
      logger.error('Schedule video error', { error: error.message });
      res.status(500).json({ error: 'Erro ao agendar vídeo' });
    }
  }

  // Find next available slot - VIDEO and IMAGE cannot be at same time
  private async findNextAvailableSlot(
    startFrom: Date,
    channelId: string,
    mediaType: string
  ): Promise<Date> {
    const schedules = await prisma.schedule.findMany({
      where: { channelId, enabled: true },
      orderBy: { time: 'asc' },
    });

    if (schedules.length === 0) {
      // No schedule, default to 1 hour after startFrom
      const defaultSlot = new Date(startFrom);
      defaultSlot.setHours(defaultSlot.getHours() + 1);
      return defaultSlot;
    }

    const now = new Date();
    const slots: Date[] = [];

    // Generate candidate slots for the next 7 days
    for (let daysAhead = 0; daysAhead < 7 && slots.length < 20; daysAhead++) {
      for (const schedule of schedules) {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const candidateDate = new Date(startFrom);
        candidateDate.setDate(candidateDate.getDate() + daysAhead);
        candidateDate.setHours(hours, minutes, 0, 0);

        if (candidateDate.getTime() <= now.getTime() + 60000) continue;

        // Check 60-minute window (video takes longer than photo)
        const slotStart = new Date(candidateDate.getTime() - 60000);
        const slotEnd = new Date(candidateDate.getTime() + 60000);

        // CRITICAL: Check no other post (any type) is in this slot
        const occupied = await prisma.post.findFirst({
          where: {
            channelId,
            scheduledFor: { gte: slotStart, lte: slotEnd },
            status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
          },
        });

        if (!occupied) {
          slots.push(candidateDate);
        }
      }
    }

    // Return first available slot at least 1 hour after start
    const minSlot = new Date(startFrom);
    minSlot.setHours(minSlot.getHours() + 1);

    const validSlot = slots.find(s => s.getTime() >= minSlot.getTime());
    return validSlot || minSlot;
  }
}

export default new VideoController();