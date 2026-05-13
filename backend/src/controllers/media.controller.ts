import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { importQueue, analyzeQueue } from '../utils/queue';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { appConfig } from '../config';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = appConfig.uploadsPath;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: appConfig.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens JPG e PNG são permitidas!'));
    }
  }
});

export class MediaController {
  public upload = upload;

  async uploadImages(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
      }

      const maxOrder = await prisma.mediaItem.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true }
      });

      const startOrder = (maxOrder?.order || 0) + 1;

      const mediaItems = await Promise.all(
        files.map(async (file, index) => {
          return prisma.mediaItem.create({
            data: {
              filename: file.filename,
              originalName: file.originalname,
              filePath: `/uploads/${file.filename}`,
              order: startOrder + index,
              status: 'PENDING',
            }
          });
        })
      );

      // Trigger analysis for each uploaded image
      for (const item of mediaItems) {
        await analyzeQueue.add('analyze-media', { mediaItemId: item.id });
      }

      logger.info('Images uploaded', { count: files.length });
      res.json({
        message: `${files.length} imagem(ns) enviada(s) com sucesso`,
        items: mediaItems
      });
    } catch (error: any) {
      logger.error('Upload images error', { error: error.message });
      res.status(500).json({ error: 'Erro ao enviar imagens' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const media = await prisma.mediaItem.findMany({
        include: {
          analysis: true,
          preview: true,
        },
        orderBy: { order: 'asc' },
      });
      res.json(media);
    } catch (error: any) {
      logger.error('Get media error', { error: error.message });
      res.status(500).json({ error: 'Failed to get media' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const media = await prisma.mediaItem.findUnique({
        where: { id },
        include: {
          analysis: true,
          preview: true,
          posts: true,
        },
      });

      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }

      res.json(media);
    } catch (error: any) {
      logger.error('Get media by id error', { error: error.message });
      res.status(500).json({ error: 'Failed to get media' });
    }
  }

  async reorder(req: Request, res: Response) {
    try {
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items must be an array' });
      }

      await prisma.$transaction(
        items.map((item: { id: string; order: number }) =>
          prisma.mediaItem.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );

      logger.info('Media reordered', { count: items.length });
      res.json({ message: 'Media reordered successfully' });
    } catch (error: any) {
      logger.error('Reorder media error', { error: error.message });
      res.status(500).json({ error: 'Failed to reorder media' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const media = await prisma.mediaItem.findUnique({ where: { id } });

      if (media && media.filePath) {
        const fullPath = path.join(process.cwd(), media.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      await prisma.mediaItem.delete({ where: { id } });

      logger.info('Media deleted', { id });
      res.json({ message: 'Media deleted successfully' });
    } catch (error: any) {
      logger.error('Delete media error', { error: error.message });
      res.status(500).json({ error: 'Failed to delete media' });
    }
  }

  async triggerImport(req: Request, res: Response) {
    try {
      await importQueue.add('import-media', {});
      logger.info('Import job triggered');
      res.json({ message: 'Import job triggered' });
    } catch (error: any) {
      logger.error('Trigger import error', { error: error.message });
      res.status(500).json({ error: 'Failed to trigger import' });
    }
  }

  async reprocess(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const media = await prisma.mediaItem.findUnique({ where: { id } });

      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }

      await prisma.mediaItem.update({
        where: { id },
        data: { status: 'PENDING' },
      });

      await analyzeQueue.add('analyze-media', { mediaItemId: id });

      logger.info('Reprocess job triggered', { id });
      res.json({ message: 'Reprocess job triggered' });
    } catch (error: any) {
      logger.error('Reprocess error', { error: error.message });
      res.status(500).json({ error: 'Failed to reprocess media' });
    }
  }
}

export default new MediaController();
