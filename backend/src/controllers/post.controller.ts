import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { publishQueue } from '../utils/queue';

export class PostController {
  async getAll(req: Request, res: Response) {
    try {
      const posts = await prisma.post.findMany({
        include: {
          mediaItem: true,
          preview: true,
          schedule: true,
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
      const { mediaItemId, previewId, scheduledFor } = req.body;

      if (!mediaItemId || !previewId || !scheduledFor) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const post = await prisma.post.create({
        data: {
          mediaItemId,
          previewId,
          scheduledFor: new Date(scheduledFor),
          status: 'SCHEDULED',
        },
      });

      await publishQueue.add(
        'publish-post',
        { postId: post.id },
        { delay: new Date(scheduledFor).getTime() - Date.now() }
      );

      logger.info('Post scheduled', { id: post.id, scheduledFor });
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

      if (post.status !== 'SCHEDULED') {
        return res.status(400).json({ error: 'Post is not scheduled' });
      }

      // Update post to publishing status
      await prisma.post.update({
        where: { id },
        data: { status: 'PUBLISHING' },
      });

      // Add to queue for immediate publishing
      await publishQueue.add('publish-post', { postId: post.id });

      logger.info('Post queued for immediate publishing', { id: post.id });
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
      });

      logger.info('Post cancelled', { id });
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
