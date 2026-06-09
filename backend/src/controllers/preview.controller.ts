import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { generateQueue } from '../utils/queue';
import previewService from '../services/preview.service';

export class PreviewController {
  async getAll(req: Request, res: Response) {
    try {
      const { channelId } = req.query;

      const where: any = {};
      if (channelId) {
        where.mediaItem = { channelId: channelId as string };
      }

      const previews = await prisma.preview.findMany({
        where,
        include: {
          mediaItem: true,
          posts: {
            include: {
              channel: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(previews);
    } catch (error: any) {
      logger.error('Get previews error', { error: error.message });
      res.status(500).json({ error: 'Failed to get previews' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const preview = await prisma.preview.findUnique({
        where: { id },
        include: {
          mediaItem: true,
        },
      });

      if (!preview) {
        return res.status(404).json({ error: 'Preview not found' });
      }

      res.json(preview);
    } catch (error: any) {
      logger.error('Get preview by id error', { error: error.message });
      res.status(500).json({ error: 'Failed to get preview' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { headline, body, preCta, cta, buttonText, buttonUrl } = req.body;

      const preview = await prisma.preview.update({
        where: { id },
        data: {
          headline,
          body,
          preCta,
          cta,
          buttonText,
          buttonUrl,
        },
      });

      logger.info('Preview updated', { id });
      res.json(preview);
    } catch (error: any) {
      logger.error('Update preview error', { error: error.message });
      res.status(500).json({ error: 'Failed to update preview' });
    }
  }

  async approve(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { channelId, scheduledFor } = req.body || {};

      const preview = await prisma.preview.update({
        where: { id },
        data: {
          approved: true,
          status: 'APPROVED',
        },
        include: { mediaItem: true },
      });

      await prisma.mediaItem.update({
        where: { id: preview.mediaItemId },
        data: { status: 'READY' },
      });

      // Automatically create a Post when preview is approved
      let post = null;
      try {
        // Determine channelId: from body, from mediaItem, or first available channel
        let effectiveChannelId = channelId || preview.mediaItem?.channelId;
        if (!effectiveChannelId) {
          const firstChannel = await prisma.channel.findFirst({
            where: { enabled: true },
            orderBy: { createdAt: 'asc' },
          });
          effectiveChannelId = firstChannel?.id;
        }

        if (effectiveChannelId) {
          // Determine scheduled time
          let effectiveScheduledFor = scheduledFor ? new Date(scheduledFor) : null;

          if (!effectiveScheduledFor) {
            // Use the next available schedule slot for the channel
            const schedules = await prisma.schedule.findMany({
              where: { channelId: effectiveChannelId, enabled: true },
              orderBy: { time: 'asc' },
            });

            if (schedules.length > 0) {
              const now = new Date();
              const today = new Date(now);
              today.setHours(0, 0, 0, 0);

              for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
                for (const schedule of schedules) {
                  const [hours, minutes] = schedule.time.split(':').map(Number);
                  const candidate = new Date(today);
                  candidate.setDate(candidate.getDate() + daysAhead);
                  candidate.setHours(hours, minutes, 0, 0);

                  if (candidate.getTime() > now.getTime() + 60000) {
                    effectiveScheduledFor = candidate;
                    break;
                  }
                }
                if (effectiveScheduledFor) break;
              }
            }

            // Fallback: schedule for 1 minute from now
            if (!effectiveScheduledFor) {
              effectiveScheduledFor = new Date(Date.now() + 60000);
            }
          }

          post = await prisma.post.create({
            data: {
              mediaItemId: preview.mediaItemId,
              previewId: preview.id,
              channelId: effectiveChannelId,
              scheduledFor: effectiveScheduledFor,
              status: 'SCHEDULED',
            },
          });

          const { publishQueue } = await import('../utils/queue');
          const delay = effectiveScheduledFor.getTime() - Date.now();
          await publishQueue.add(
            'publish-post',
            { postId: post.id },
            { delay: Math.max(0, delay) }
          );

          logger.info('Post automatically created from approved preview', {
            postId: post.id,
            previewId: id,
            channelId: effectiveChannelId,
            scheduledFor: effectiveScheduledFor,
          });
        }
      } catch (postError: any) {
        logger.error('Failed to auto-create post from approved preview', {
          previewId: id,
          error: postError.message,
        });
        // Don't fail the approve if post creation fails
      }

      logger.info('Preview approved', { id });
      res.json({ ...preview, post });
    } catch (error: any) {
      logger.error('Approve preview error', { error: error.message });
      res.status(500).json({ error: 'Failed to approve preview' });
    }
  }

  async reject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const preview = await prisma.preview.update({
        where: { id },
        data: {
          approved: false,
          status: 'REJECTED',
        },
      });

      logger.info('Preview rejected', { id });
      res.json(preview);
    } catch (error: any) {
      logger.error('Reject preview error', { error: error.message });
      res.status(500).json({ error: 'Failed to reject preview' });
    }
  }

  async regenerate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { channelId } = req.body || {};

      const preview = await prisma.preview.findUnique({
        where: { id },
        include: { mediaItem: true, posts: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });

      if (!preview) {
        return res.status(404).json({ error: 'Preview not found' });
      }

      // Use provided channelId, or get from the most recent post
      const effectiveChannelId = channelId || preview.posts?.[0]?.channelId || undefined;

      await generateQueue.add('generate-preview', {
        mediaItemId: preview.mediaItemId,
        channelId: effectiveChannelId,
      });

      logger.info('Preview regeneration triggered', { id, channelId: effectiveChannelId });
      res.json({ message: 'Preview regeneration triggered' });
    } catch (error: any) {
      logger.error('Regenerate preview error', { error: error.message });
      res.status(500).json({ error: 'Failed to regenerate preview' });
    }
  }

  // ━━━━━━━━━━━━━━━ Generate from Video Description ━━━━━━━━━━━━━━━

  async generateFromVideo(req: Request, res: Response) {
    try {
      const { description, channelId, ctaLink, autoApprove, prompt } = req.body;

      if (!description) {
        return res.status(400).json({ error: 'description é obrigatória' });
      }

      // Get CTA link from channel if not provided
      let effectiveCtaLink = ctaLink;
      if (!effectiveCtaLink && channelId) {
        const channel = await prisma.channel.findUnique({ where: { id: channelId } });
        if (channel?.ctaLink) {
          effectiveCtaLink = channel.ctaLink;
        }
      }

      const preview = await previewService.generateFromVideoDescription(
        description,
        effectiveCtaLink || '',
        channelId,
        prompt
      );

      // For video previews, we need to create a MediaItem + Preview + Post to make it appear in the list
      let post = null;
      try {
        if (channelId) {
          // Create a MediaItem for this video preview
          // Use TEXT mediaType to indicate this is text-only content (AI-generated, no actual file)
          const mediaItem = await prisma.mediaItem.create({
            data: {
              channelId,
              filename: `video-preview-${Date.now()}.txt`,
              originalName: `video-preview.txt`,
              filePath: '', // Empty path - text-only content
              mediaType: 'TEXT', // Explicitly mark as TEXT - no file needed
              order: 9999,
              status: 'READY',
              processed: true,
            },
          });

          // Create a Preview for this MediaItem
          const savedPreview = await prisma.preview.create({
            data: {
              mediaItemId: mediaItem.id,
              headline: preview.headline || '',
              body: preview.body || '',
              preCta: preview.preCta || '',
              cta: preview.cta || '',
              buttonText: preview.buttonText || '',
              buttonUrl: preview.buttonUrl || '',
              approved: true,
              status: 'APPROVED',
            },
          });

          // Determine scheduled time
          let effectiveScheduledFor: Date | null = null;
          const schedules = await prisma.schedule.findMany({
            where: { channelId, enabled: true },
            orderBy: { time: 'asc' },
          });

          if (schedules.length > 0) {
            const now = new Date();
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);

            for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
              for (const schedule of schedules) {
                const [hours, minutes] = schedule.time.split(':').map(Number);
                const candidate = new Date(today);
                candidate.setDate(candidate.getDate() + daysAhead);
                candidate.setHours(hours, minutes, 0, 0);

                if (candidate.getTime() > now.getTime() + 60000) {
                  effectiveScheduledFor = candidate;
                  break;
                }
              }
              if (effectiveScheduledFor) break;
            }
          }

          if (!effectiveScheduledFor) {
            effectiveScheduledFor = new Date(Date.now() + 60000);
          }

          // Create a Post
          post = await prisma.post.create({
            data: {
              mediaItemId: mediaItem.id,
              previewId: savedPreview.id,
              channelId,
              scheduledFor: effectiveScheduledFor,
              status: 'SCHEDULED',
            },
          });

          const { publishQueue } = await import('../utils/queue');
          const delay = effectiveScheduledFor.getTime() - Date.now();
          await publishQueue.add(
            'publish-post',
            { postId: post.id },
            { delay: Math.max(0, delay) }
          );

          logger.info('Post auto-created from video preview', { postId: post.id });
        }
      } catch (postError: any) {
        logger.error('Failed to auto-create post from video preview', {
          error: postError.message,
        });
      }

      logger.info('Video preview generated', { channelId });
      res.json({ ...preview, post });
    } catch (error: any) {
      logger.error('Generate from video error', { error: error.message });
      res.status(500).json({ error: 'Erro ao gerar prévia do vídeo' });
    }
  }
}

export default new PreviewController();
