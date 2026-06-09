import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { publishQueue } from '../utils/queue';

/**
 * After publishing or cancelling a post, reschedule all remaining SCHEDULED posts
 * for the same channel to fill the next available time slots in order.
 */
async function rescheduleRemainingPosts(channelId: string) {
  try {
    // Get channel schedules
    const schedules = await prisma.schedule.findMany({
      where: { channelId, enabled: true },
      orderBy: { time: 'asc' },
    });

    if (schedules.length === 0) return;

    // Get all SCHEDULED posts for this channel, ordered by their media order
    const scheduledPosts = await prisma.post.findMany({
      where: { channelId, status: 'SCHEDULED' },
      include: { mediaItem: true },
      orderBy: { mediaItem: { order: 'asc' } },
    });

    if (scheduledPosts.length === 0) return;

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Build list of all available slots starting from now
    const slots: Date[] = [];
    for (let daysAhead = 0; slots.length < scheduledPosts.length + 5; daysAhead++) {
      for (const schedule of schedules) {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const candidateDate = new Date(today);
        candidateDate.setDate(candidateDate.getDate() + daysAhead);
        candidateDate.setHours(hours, minutes, 0, 0);

        // Skip if in the past (with 1 minute buffer)
        if (candidateDate.getTime() <= now.getTime() + 60000) continue;

        // Check if slot is taken by a PUBLISHING or PUBLISHED post
        const slotStart = new Date(candidateDate.getTime() - 30000);
        const slotEnd = new Date(candidateDate.getTime() + 30000);

        const occupied = await prisma.post.findFirst({
          where: {
            channelId,
            scheduledFor: { gte: slotStart, lte: slotEnd },
            status: { in: ['PUBLISHING', 'PUBLISHED'] },
          },
        });

        if (!occupied) {
          slots.push(candidateDate);
        }
      }

      // Safety: don't look more than 60 days ahead
      if (daysAhead > 60) break;
    }

    // Reassign each scheduled post to the next available slot
    for (let i = 0; i < scheduledPosts.length && i < slots.length; i++) {
      const post = scheduledPosts[i];
      const newScheduledFor = slots[i];

      await prisma.post.update({
        where: { id: post.id },
        data: { scheduledFor: newScheduledFor },
      });

      // Remove old job and add new one
      const delay = newScheduledFor.getTime() - Date.now();
      await publishQueue.add(
        'publish-post',
        { postId: post.id },
        {
          delay: Math.max(0, delay),
          jobId: `publish-${post.id}`,
        }
      );
    }

    logger.info('Remaining posts rescheduled', {
      channelId,
      count: Math.min(scheduledPosts.length, slots.length),
    });
  } catch (error: any) {
    logger.error('Reschedule remaining posts error', { error: error.message, channelId });
  }
}

export class PostController {
  // Delete a single post
  async deleteOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const post = await prisma.post.findUnique({ where: { id } });
      if (!post) {
        return res.status(404).json({ error: 'Post não encontrado' });
      }
      await prisma.post.delete({ where: { id } });
      logger.info('Post deleted', { id });
      res.json({ message: 'Post excluído com sucesso', id });
    } catch (error: any) {
      logger.error('Delete post error', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Erro ao excluir post' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const { channelId } = req.query;
      const where = channelId ? { channelId: channelId as string } : {};

      const posts = await prisma.post.findMany({
        where,
        include: {
          mediaItem: true,
          preview: true,
          schedule: true,
          channel: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(posts);
    } catch (error: any) {
      logger.error('Get posts error', { error: error.message });
      res.status(500).json({ error: 'Failed to get posts' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          mediaItem: true,
          preview: true,
          schedule: true,
        },
      });

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.json(post);
    } catch (error: any) {
      logger.error('Get post by id error', { error: error.message });
      res.status(500).json({ error: 'Failed to get post' });
    }
  }

  async schedule(req: Request, res: Response) {
    try {
      const { mediaItemId, previewId, scheduledFor, channelId } = req.body;

      if (!mediaItemId || !previewId || !scheduledFor) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const post = await prisma.post.create({
        data: {
          mediaItemId,
          previewId,
          channelId: channelId || null,
          scheduledFor: new Date(scheduledFor),
          status: 'SCHEDULED',
        },
      });

      await publishQueue.add(
        'publish-post',
        { postId: post.id },
        { delay: new Date(scheduledFor).getTime() - Date.now() }
      );

      logger.info('Post scheduled', { id: post.id, scheduledFor, channelId });
      res.json(post);
    } catch (error: any) {
      logger.error('Schedule post error', { error: error.message });
      res.status(500).json({ error: 'Failed to schedule post' });
    }
  }

  async publishNow(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          mediaItem: true,
          preview: true,
        },
      });

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (!['SCHEDULED', 'FAILED', 'PUBLISHING'].includes(post.status)) {
        return res.status(400).json({ error: `Post cannot be published (status: ${post.status})` });
      }

      // DO NOT update status here - let the worker handle status transitions to avoid race conditions
      // The worker will update to PUBLISHING inside a transaction

      // Add to queue for immediate publishing with unique jobId to prevent duplicates
      await publishQueue.add(
        'publish-post',
        { postId: post.id },
        { jobId: `publish-now-${post.id}-${Date.now()}` }
      );

      logger.info('Post queued for immediate publishing', { id: post.id, jobId: `publish-now-${post.id}` });

      // Reschedule remaining posts for this channel
      const channelId = post.mediaItem.channelId;
      if (channelId) {
        await rescheduleRemainingPosts(channelId);
      }

      res.json({ message: 'Post queued for publishing' });
    } catch (error: any) {
      logger.error('Publish now error', { error: error.message });
      res.status(500).json({ error: 'Failed to publish post' });
    }
  }

  // Reset ALL stuck posts (PUBLISHING for more than 15 minutes) back to SCHEDULED
  async resetAllStuck(req: Request, res: Response) {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Find all posts stuck in PUBLISHING for more than 15 minutes
      const stuckPosts = await prisma.post.findMany({
        where: {
          status: 'PUBLISHING',
          updatedAt: { lt: fifteenMinutesAgo },
        },
      });

      if (stuckPosts.length === 0) {
        return res.json({ message: 'No stuck posts found', count: 0 });
      }

      // Reset all stuck posts to SCHEDULED
      await prisma.post.updateMany({
        where: {
          status: 'PUBLISHING',
          updatedAt: { lt: fifteenMinutesAgo },
        },
        data: {
          status: 'SCHEDULED',
          retryCount: 0,
          error: null,
        },
      });

      // Re-add all to queue
      const { publishQueue } = await import('../utils/queue');
      for (const post of stuckPosts) {
        const delay = post.scheduledFor ? Math.max(0, post.scheduledFor.getTime() - Date.now()) : 0;
        await publishQueue.add(
          'publish-post',
          { postId: post.id },
          { delay }
        );
      }

      logger.info('All stuck posts reset to SCHEDULED and re-queued', { count: stuckPosts.length });
      res.json({ message: `${stuckPosts.length} post(s) reset to SCHEDULED`, count: stuckPosts.length });
    } catch (error: any) {
      logger.error('Reset all stuck posts error', { error: error.message });
      res.status(500).json({ error: 'Failed to reset stuck posts' });
    }
  }

  // Mark ALL stuck posts (PUBLISHING for more than 15 minutes) as FAILED
  async failStuck(req: Request, res: Response) {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Find all posts stuck in PUBLISHING for more than 15 minutes
      const stuckPosts = await prisma.post.findMany({
        where: {
          status: 'PUBLISHING',
          updatedAt: { lt: fifteenMinutesAgo },
        },
      });

      if (stuckPosts.length === 0) {
        return res.json({ message: 'No stuck posts found', count: 0 });
      }

      // Mark all stuck posts as FAILED
      await prisma.post.updateMany({
        where: {
          status: 'PUBLISHING',
          updatedAt: { lt: fifteenMinutesAgo },
        },
        data: {
          status: 'FAILED',
          error: 'Post was stuck in PUBLISHING for more than 15 minutes - marked as FAILED',
        },
      });

      logger.info('All stuck posts marked as FAILED', { count: stuckPosts.length });
      res.json({ message: `${stuckPosts.length} post(s) marked as FAILED`, count: stuckPosts.length });
    } catch (error: any) {
      logger.error('Fail stuck posts error', { error: error.message });
      res.status(500).json({ error: 'Failed to mark stuck posts as FAILED' });
    }
  }

  async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const post = await prisma.post.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { mediaItem: true },
      });

      logger.info('Post cancelled', { id });

      // Reschedule remaining posts for this channel
      if (post.channelId) {
        await rescheduleRemainingPosts(post.channelId);
      }

      res.json(post);
    } catch (error: any) {
      logger.error('Cancel post error', { error: error.message });
      res.status(500).json({ error: 'Failed to cancel post' });
    }
  }

  async reschedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { scheduledFor } = req.body;

      if (!scheduledFor) {
        return res.status(400).json({ error: 'scheduledFor is required' });
      }

      const post = await prisma.post.update({
        where: { id },
        data: {
          scheduledFor: new Date(scheduledFor),
          status: 'SCHEDULED',
        },
      });

      await publishQueue.add(
        'publish-post',
        { postId: post.id },
        { delay: new Date(scheduledFor).getTime() - Date.now() }
      );

      logger.info('Post rescheduled', { id, scheduledFor });
      res.json(post);
    } catch (error: any) {
      logger.error('Reschedule post error', { error: error.message });
      res.status(500).json({ error: 'Failed to reschedule post' });
    }
  }

  // Reset a stuck post (PUBLISHING for too long) back to SCHEDULED
  async resetStuckPost(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const post = await prisma.post.findUnique({ where: { id } });
      if (!post) {
        return res.status(404).json({ error: 'Post não encontrado' });
      }

      if (post.status !== 'PUBLISHING') {
        return res.status(400).json({ error: `Post is not in PUBLISHING status (current: ${post.status})` });
      }

      // Reset to SCHEDULED so it can be retried
      await prisma.post.update({
        where: { id },
        data: {
          status: 'SCHEDULED',
          retryCount: 0,
          error: null,
        },
      });

      // Re-add to queue
      const { publishQueue } = await import('../utils/queue');
      const delay = post.scheduledFor ? Math.max(0, post.scheduledFor.getTime() - Date.now()) : 0;
      await publishQueue.add(
        'publish-post',
        { postId: post.id },
        { delay }
      );

      logger.info('Stuck post reset to SCHEDULED and re-queued', { postId: id });
      res.json({ message: 'Post reset to SCHEDULED', id });
    } catch (error: any) {
      logger.error('Reset stuck post error', { error: error.message, id: req.params.id });
      res.status(500).json({ error: 'Failed to reset post' });
    }
  }

  // Reorder posts (for drag and drop)
  async reorder(req: Request, res: Response) {
    try {
      const { items } = req.body; // [{ id, order }]

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items array is required' });
      }

      await Promise.all(
        items.map((item: { id: string; order: number }) =>
          prisma.post.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );

      res.json({ message: 'Posts reordered successfully' });
    } catch (error: any) {
      logger.error('Reorder posts error', { error: error.message });
      res.status(500).json({ error: 'Failed to reorder posts' });
    }
  }

  // Bulk delete
  async bulkDelete(req: Request, res: Response) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      await prisma.post.deleteMany({
        where: { id: { in: ids } },
      });

      logger.info('Posts bulk deleted', { count: ids.length });
      res.json({ message: `${ids.length} post(s) deleted`, count: ids.length });
    } catch (error: any) {
      logger.error('Bulk delete posts error', { error: error.message });
      res.status(500).json({ error: 'Failed to delete posts' });
    }
  }

  // Regenerate preview
  async regeneratePreview(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const post = await prisma.post.findUnique({
        where: { id },
        include: { mediaItem: true, preview: true },
      });

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Add to generate queue
      const { generateQueue } = await import('../utils/queue');
      await generateQueue.add('generate-preview', {
        mediaItemId: post.mediaItemId,
        channelId: post.channelId,
        postId: post.id,
      });

      logger.info('Preview regeneration triggered', { postId: post.id });
      res.json({ message: 'Preview regeneration triggered' });
    } catch (error: any) {
      logger.error('Regenerate preview error', { error: error.message });
      res.status(500).json({ error: 'Failed to regenerate preview' });
    }
  }

  /**
   * Marca todos os posts que falharam com "wrong remote file identifier" como FAILED permanente.
   * Isso impede retries infinitos para posts com fileIds corrompidos.
   */
  async resetFileIdErrors(req: Request, res: Response) {
    try {
      // Marcar todos os posts que falharam com "wrong remote file identifier" como FAILED permanentemente
      const result = await prisma.post.updateMany({
        where: {
          error: { contains: 'wrong remote file identifier' }
        },
        data: {
          error: 'File ID inválido - faça re-upload da imagem para continuar',
          retryCount: 99, // Marca como permanente
        },
      });
      logger.info('Posts com erro de fileId marcados como permanentes', { count: result.count });
      res.json({ message: `Marcados ${result.count} posts com erro permanente`, count: result.count });
    } catch (error: any) {
      logger.error('Reset fileId errors error', { error: error.message });
      res.status(500).json({ error: 'Failed to reset fileId errors' });
    }
  }
}

export default new PostController();
