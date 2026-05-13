import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { generateQueue } from '../utils/queue';

export class PreviewController {
  async getAll(req: Request, res: Response) {
    try {
      const previews = await prisma.preview.findMany({
        include: {
          mediaItem: true,
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

      const preview = await prisma.preview.update({
        where: { id },
        data: {
          approved: true,
          status: 'APPROVED',
        },
      });

      await prisma.mediaItem.update({
        where: { id: preview.mediaItemId },
        data: { status: 'READY' },
      });

      logger.info('Preview approved', { id });
      res.json(preview);
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

      const preview = await prisma.preview.findUnique({
        where: { id },
        include: { mediaItem: true },
      });

      if (!preview) {
        return res.status(404).json({ error: 'Preview not found' });
      }

      await generateQueue.add('generate-preview', {
        mediaItemId: preview.mediaItemId,
      });

      logger.info('Preview regeneration triggered', { id });
      res.json({ message: 'Preview regeneration triggered' });
    } catch (error: any) {
      logger.error('Regenerate preview error', { error: error.message });
      res.status(500).json({ error: 'Failed to regenerate preview' });
    }
  }
}

export default new PreviewController();
