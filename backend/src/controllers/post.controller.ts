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

      // Update post to publishing status
      await prisma.post.update({
        where: { id },
        data: { status: 'PUBLISHING' },
      });

      // Add to queue for immediate publishing
      await publishQueue.add('publish-post', { postId: post.id });

      logger.info('Post queued for immediate publishing', { id: post.id });

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
}

export default new PostController();
