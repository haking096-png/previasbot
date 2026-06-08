import { Request, Response } from 'express';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { importQueue, analyzeQueue } from '../utils/queue';
import multer from 'multer';
import path from 'path';

// Use memory storage instead of disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (Telegram video limit)
  fileFilter: (req, file, cb) => {
    const imageTypes = /jpeg|jpg|png/;
    const videoTypes = /mp4|mov|avi|webm|video/;
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = imageTypes.test(ext) || imageTypes.test(file.mimetype);
    const isVideo = videoTypes.test(ext) || videoTypes.test(file.mimetype);

    if (isImage || isVideo) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens (JPG, PNG) e vídeos (MP4, MOV, AVI, WEBM) são permitidos!'));
    }
  }
});

export class MediaController {
  public upload = upload;

  async uploadImages(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      const { channelId } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
      }

      if (!channelId) {
        return res.status(400).json({ error: 'channelId é obrigatório' });
      }

      // Get channel to find bot token and storage chat ID
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        return res.status(404).json({ error: 'Canal não encontrado' });
      }

      if (!channel.mediaStorageChatId) {
        return res.status(400).json({ error: 'Canal de armazenamento de mídia não configurado. Configure o Media Storage Chat ID nas configurações do canal.' });
      }

      const bot = new Telegraf(channel.botToken);

      const maxOrder = await prisma.mediaItem.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true }
      });

      const startOrder = (maxOrder?.order || 0) + 1;

      const mediaItems = [];

      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const uniqueFilename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);

        // Determine media type
        const ext = path.extname(file.originalname).toLowerCase();
        const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
        const isVideo = videoExtensions.includes(ext) || file.mimetype.startsWith('video/');
        const mediaType = isVideo ? 'VIDEO' : 'IMAGE';

        try {
          let telegramFileId: string;
          let messageId: number;

          if (isVideo) {
            // Send video to Telegram storage channel
            const sentMessage = await bot.telegram.sendVideo(
              channel.mediaStorageChatId,
              { source: file.buffer, filename: file.originalname },
              { caption: `🎬 ${file.originalname}` }
            );
            telegramFileId = sentMessage.video!.file_id;
            messageId = sentMessage.message_id;
          } else {
            // Send photo to Telegram storage channel
            const sentMessage = await bot.telegram.sendPhoto(
              channel.mediaStorageChatId,
              { source: file.buffer, filename: file.originalname },
              { caption: `📁 ${file.originalname}` }
            );
            const photos = sentMessage.photo;
            telegramFileId = photos[photos.length - 1].file_id;
            messageId = sentMessage.message_id;
          }

          const mediaItem = await prisma.mediaItem.create({
            data: {
              filename: uniqueFilename,
              originalName: file.originalname,
              filePath: '', // No local path
              telegramFileId,
              telegramMessageId: String(messageId),
              mediaType,
              order: startOrder + index,
              status: 'PENDING',
              channelId,
            }
          });

          mediaItems.push(mediaItem);
        } catch (sendError: any) {
          logger.error('Failed to send media to Telegram storage', {
            filename: file.originalname,
            mediaType,
            error: sendError.message,
          });
          // Continue with other files
        }
      }

      if (mediaItems.length === 0) {
        return res.status(500).json({ error: 'Falha ao enviar imagens para o Telegram' });
      }

      // Trigger analysis for each uploaded image
      for (const item of mediaItems) {
        await analyzeQueue.add('analyze-media', { mediaItemId: item.id, channelId });
      }

      logger.info('Images uploaded to Telegram', { count: mediaItems.length, channelId });
      res.json({
        message: `${mediaItems.length} imagem(ns) enviada(s) com sucesso`,
        items: mediaItems
      });
    } catch (error: any) {
      logger.error('Upload images error', { error: error.message });
      res.status(500).json({ error: 'Erro ao enviar imagens' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const { channelId } = req.query;

      const where: any = {};
      if (channelId) {
        where.channelId = channelId as string;
      }

      const media = await prisma.mediaItem.findMany({
        where,
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

      const media = await prisma.mediaItem.findUnique({
        where: { id },
        include: { channel: true },
      });

      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }

      // Try to delete from Telegram storage channel
      if (media.telegramMessageId && media.channel?.botToken && media.channel?.mediaStorageChatId) {
        try {
          const bot = new Telegraf(media.channel.botToken);
          await bot.telegram.deleteMessage(
            media.channel.mediaStorageChatId,
            parseInt(media.telegramMessageId)
          );
        } catch (deleteError: any) {
          logger.warn('Failed to delete message from Telegram storage', {
            error: deleteError.message,
          });
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

  /**
   * Proxy endpoint to serve Telegram media to the dashboard.
   * Gets the file URL from Telegram and redirects to it.
   */
  async getImage(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const media = await prisma.mediaItem.findUnique({
        where: { id },
        include: { channel: true },
      });

      if (!media || !media.telegramFileId || !media.channel?.botToken) {
        return res.status(404).json({ error: 'Media not found' });
      }

      const bot = new Telegraf(media.channel.botToken);
      const fileLink = await bot.telegram.getFileLink(media.telegramFileId);

      res.redirect(fileLink.toString());
    } catch (error: any) {
      logger.error('Get media error', { error: error.message });
      res.status(500).json({ error: 'Failed to get media' });
    }
  }

  /**
   * Limpa todos os telegramFileIds inválidos do banco de dados.
   * Útil após problemas de publicação para resetar dados corrompidos.
   */
  async clearInvalidFileIds(req: Request, res: Response) {
    try {
      const result = await prisma.mediaItem.updateMany({
        where: { telegramFileId: { not: null } },
        data: { telegramFileId: null },
      });
      logger.info('Invalid fileIds cleared', { count: result.count });
      res.json({ message: `Cleared ${result.count} invalid fileIds`, count: result.count });
    } catch (error: any) {
      logger.error('Clear invalid fileIds error', { error: error.message });
      res.status(500).json({ error: 'Failed to clear fileIds' });
    }
  }

  /**
   * Re-upload de uma imagem específica para o Telegram storage.
   * Útil para corrigir fileIds inválidos que causaram falha na publicação.
   */
  async reupload(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const media = await prisma.mediaItem.findUnique({
        where: { id },
        include: { channel: true },
      });

      if (!media) {
        return res.status(404).json({ error: 'Media não encontrado' });
      }

      if (!media.channel) {
        return res.status(400).json({ error: 'Canal não associado a esta mídia' });
      }

      if (!media.channel.mediaStorageChatId) {
        return res.status(400).json({ error: 'Canal de armazenamento não configurado' });
      }

      // Se não tem file_id, não pode fazer re-upload diretamente
      // O usuário precisa fazer upload novamente pelo dashboard
      if (!media.telegramFileId) {
        return res.status(400).json({
          error: 'Esta mídia não tem file_id. Faça upload novamente pelo dashboard.',
          requiresNewUpload: true
        });
      }

      const bot = new Telegraf(media.channel.botToken);

      // Baixar a imagem do Telegram storage
      const fileLink = await bot.telegram.getFileLink(media.telegramFileId);
      const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // Re-enviar para o storage channel
      let newFileId: string;
      let newMessageId: number;

      if (media.mediaType === 'VIDEO') {
        const sentMessage = await bot.telegram.sendVideo(
          media.channel.mediaStorageChatId,
          { source: buffer, filename: media.originalName },
          { caption: `♻️ Re-upload: ${media.originalName}` }
        );
        newFileId = sentMessage.video!.file_id;
        newMessageId = sentMessage.message_id;
      } else {
        const sentMessage = await bot.telegram.sendPhoto(
          media.channel.mediaStorageChatId,
          { source: buffer, filename: media.originalName },
          { caption: `♻️ Re-upload: ${media.originalName}` }
        );
        const photos = sentMessage.photo;
        newFileId = photos[photos.length - 1].file_id;
        newMessageId = sentMessage.message_id;
      }

      // Atualizar o banco com o novo file_id
      await prisma.mediaItem.update({
        where: { id },
        data: {
          telegramFileId: newFileId,
          telegramMessageId: String(newMessageId),
        },
      });

      logger.info('Media re-uploaded successfully', {
        mediaId: id,
        oldFileId: media.telegramFileId?.substring(0, 30),
        newFileId: newFileId.substring(0, 30)
      });

      res.json({
        message: 'Mídia re-enviada com sucesso',
        fileId: newFileId,
        messageId: newMessageId
      });
    } catch (error: any) {
      logger.error('Re-upload error', { error: error.message, mediaId: req.params.id });
      res.status(500).json({ error: 'Erro ao re-enviar mídia: ' + error.message });
    }
  }
}

export default new MediaController();
