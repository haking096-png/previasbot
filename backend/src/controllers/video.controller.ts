import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { publishQueue } from '../utils/queue';

export class VideoController {
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

      // Find the video media item if provided, or create a placeholder
      let videoMediaItem = null;
      if (mediaItemId) {
        videoMediaItem = await prisma.mediaItem.findUnique({ where: { id: mediaItemId } });
      }

      // Create a placeholder media item for video-only posts
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

      // Find the next available slot for video
      const videoSlot = await this.findNextAvailableSlot(new Date(scheduledFor || Date.now()), channelId, 'VIDEO');

      // Get effective CTA link
      const effectiveCtaLink = ctaLink || channel.ctaLink || '';

      // Create preview with the media item relation
      const previewRecord = await prisma.preview.create({
        data: {
          mediaItemId: placeholderMediaItem.id,
          headline: preview?.headline || 'VÍDEO EXCLUSIVO 🔥',
          body: preview?.body || description.substring(0, 300),
          preCta: preview?.preCta || 'Quer ver o vídeo completo? 👇',
          cta: preview?.cta || '🔥 VER VÍDEO 🔥\n🔥 VER VÍDEO 🔥\n🔥 VER VÍDEO 🔥',
          buttonText: preview?.buttonText || '',
          buttonUrl: effectiveCtaLink,
          approved: true,
          status: 'APPROVED',
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

      // If there's a video media item with an associated image, schedule the image for the NEXT slot
      if (videoMediaItem) {
        const imageSlot = await this.findNextAvailableSlot(videoSlot, channelId, 'IMAGE');
        logger.info('Video scheduled, thumbnail will be posted at next slot', {
          videoSlot: videoSlot.toISOString(),
          imageSlot: imageSlot.toISOString(),
        });
      }

      logger.info('Video scheduled successfully', { postId: videoPost.id, scheduledFor: videoSlot });
      res.status(201).json({
        message: 'Vídeo agendado com sucesso',
        post: videoPost,
        videoSlot: videoSlot.toISOString(),
      });
    } catch (error: any) {
      logger.error('Schedule video error', { error: error.message });
      res.status(500).json({ error: 'Erro ao agendar vídeo' });
    }
  }

  private async findNextAvailableSlot(startFrom: Date, channelId: string, mediaType: string): Promise<Date> {
    const schedules = await prisma.schedule.findMany({
      where: { channelId, enabled: true },
      orderBy: { time: 'asc' },
    });

    if (schedules.length === 0) {
      // Default: 1 hour after start
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

        // Skip if in the past
        if (candidateDate.getTime() <= now.getTime() + 60000) continue;

        // Check if slot is available (not occupied by any post within 30 min window)
        const slotStart = new Date(candidateDate.getTime() - 1800000);
        const slotEnd = new Date(candidateDate.getTime() + 1800000);

        const occupied = await prisma.post.findFirst({
          where: {
            channelId,
            scheduledFor: { gte: slotStart, lte: slotEnd },
            status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
          },
        });

        // Also check media type conflict - no two videos or two images at same slot
        if (!occupied) {
          const sameTypeOccupied = await prisma.post.findFirst({
            where: {
              channelId,
              scheduledFor: { gte: slotStart, lte: slotEnd },
              status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
              mediaItem: { mediaType },
            },
            include: { mediaItem: true },
          });

          if (!sameTypeOccupied) {
            slots.push(candidateDate);
          }
        }
      }
    }

    // Return the next available slot (at least 1 hour after requested start)
    const minSlot = new Date(startFrom);
    minSlot.setHours(minSlot.getHours() + 1);

    const validSlot = slots.find(s => s.getTime() >= minSlot.getTime());
    return validSlot || minSlot;
  }
}

export default new VideoController();