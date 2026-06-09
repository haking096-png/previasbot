import { Worker, Job } from 'bullmq';
import { connectionOptions, publishQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import telegramService from '../services/telegram.service';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import os from 'os';

const TIMEZONE = process.env.TZ || 'America/Sao_Paulo';

/**
 * Faz download de uma imagem do Telegram storage para upload posterior
 */
async function downloadFromTelegramStorage(
  telegramFileId: string,
  botToken: string,
  originalName: string
): Promise<string> {
  try {
    const bot = new Telegraf(botToken);
    const fileLink = await bot.telegram.getFileLink(telegramFileId);

    const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    const ext = path.extname(originalName) || '.jpg';
    const tempFilePath = path.join(os.tmpdir(), `publish-${Date.now()}-${Math.random()}${ext}`);
    fs.writeFileSync(tempFilePath, buffer);

    logger.info('Downloaded image from Telegram storage', {
      fileId: telegramFileId.substring(0, 30) + '...',
      tempPath: tempFilePath,
      size: buffer.length
    });

    return tempFilePath;
  } catch (error: any) {
    logger.error('Failed to download from Telegram storage', {
      fileId: telegramFileId?.substring(0, 30),
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtém uma fonte de imagem válida para publicação.
 * Tenta: telegramFileId -> download do storage -> fallback texto
 */
async function getValidImageSource(
  mediaItem: any,
  botToken: string,
  channel: any
): Promise<{ source: string; isFileId: boolean; tempFile?: string }> {
  // 1. SEMPRE tentar usar telegramFileId primeiro (já foi validado quando foi feito upload pelo mesmo bot)
  if (mediaItem.telegramFileId && mediaItem.telegramFileId.length > 20) {
    logger.info('Using telegramFileId for publishing', {
      fileId: mediaItem.telegramFileId.substring(0, 30) + '...',
      mediaType: mediaItem.mediaType
    });
    return { source: mediaItem.telegramFileId, isFileId: true };
  }

  // 2. Se tiver storage chat ID e file_id, baixar do storage e fazer upload direto
  if (channel?.mediaStorageChatId && mediaItem.telegramFileId && mediaItem.telegramMessageId) {
    try {
      const tempPath = await downloadFromTelegramStorage(
        mediaItem.telegramFileId,
        botToken,
        mediaItem.originalName
      );
      return { source: tempPath, isFileId: false, tempFile: tempPath };
    } catch (e) {
      logger.warn('Failed to download from storage, will try fileId anyway');
    }
  }

  // 3. Tentar usar filePath local como fallback
  if (mediaItem.filePath && !mediaItem.filePath.startsWith('inline://')) {
    try {
      const localPath = path.join(process.cwd(), mediaItem.filePath);
      if (fs.existsSync(localPath)) {
        logger.info('Using local filePath for publishing', { path: localPath });
        return { source: localPath, isFileId: false };
      } else {
        logger.warn('Local filePath does not exist', { path: localPath });
      }
    } catch (e: any) {
      logger.warn('Error checking local filePath', { path: mediaItem.filePath, error: e.message });
    }
  }

  // 4. Fallback final: publicar como texto
  logger.info('No valid image source, will publish as text-only', {
    hasFileId: !!mediaItem.telegramFileId,
    hasFilePath: !!mediaItem.filePath,
    mediaType: mediaItem.mediaType
  });
  return { source: '', isFileId: false };
}

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

export const publishWorker = new Worker(
  'publish',
  async (job: Job) => {
    const { postId } = job.data;

    // DIAGNOSTIC LOG: Show job started
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📤 PUBLISH WORKER STARTED', { jobId: job.id, postId });

    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          mediaItem: true,
          preview: true,
          channel: true,
        },
      });

      if (!post) {
        throw new Error(`Post not found: ${postId}`);
      }

      // DIAGNOSTIC LOG: Show post details
      logger.info('Post details:', {
        postId: post.id,
        status: post.status,
        channelId: post.channelId,
        channelName: post.channel?.name || 'NO CHANNEL',
        chatId: post.channel?.chatId || 'NO CHAT ID',
        hasBotToken: !!post.channel?.botToken,
        mediaType: post.mediaItem?.mediaType,
        hasTelegramFileId: !!post.mediaItem?.telegramFileId,
        hasPreview: !!post.preview,
        headline: post.preview?.headline?.substring(0, 50),
      });

      // If post was already PUBLISHED, skip
      if ((post.status as string) === 'PUBLISHED') {
        logger.info('Post already published, skipping', { postId });
        return { postId, status: 'already_published' };
      }

      // If post is stuck in PUBLISHING for more than 15 minutes, mark as FAILED
      if (post.status === 'PUBLISHING') {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (post.updatedAt < fifteenMinutesAgo) {
          await prisma.post.update({
            where: { id: postId },
            data: {
              status: 'FAILED',
              error: 'Post stuck in PUBLISHING for more than 15 minutes',
            },
          });
          logger.error('Post was stuck in PUBLISHING, marked as FAILED', { postId });
          return { postId, status: 'stuck_resolved' };
        }
      }

      if (post.status === 'CANCELLED') {
        logger.info('Post was cancelled, skipping', { postId });
        return { postId, status: 'cancelled' };
      }

      // Use serializable transaction to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        // Re-fetch post status inside transaction
        const currentPost = await tx.post.findUnique({
          where: { id: postId },
          select: { status: true, channelId: true, mediaItemId: true },
        });

        if (!currentPost) {
          throw new Error(`Post not found: ${postId}`);
        }

        if (currentPost.status === 'PUBLISHED') {
          return { messageId: null, status: 'already_published' };
        }

        if (currentPost.status !== 'SCHEDULED' && currentPost.status !== 'PUBLISHING') {
          throw new Error(`Post in unexpected status: ${currentPost.status}`);
        }

        // Update to PUBLISHING atomically
        await tx.post.update({
          where: { id: postId, status: currentPost.status },
          data: { status: 'PUBLISHING' },
        });

        // Fetch full post data
        const fullPost = await tx.post.findUnique({
          where: { id: postId },
          include: { mediaItem: true, preview: true, channel: true },
        });

        if (!fullPost) {
          throw new Error(`Post not found after update: ${postId}`);
        }

        let resolvedChannel = fullPost.channel;
        if (!resolvedChannel) {
          const mediaWithChannel = await tx.mediaItem.findUnique({
            where: { id: fullPost.mediaItem.id },
            include: { channel: true },
          });
          if (!mediaWithChannel?.channel) {
            throw new Error(`No channel associated with post ${postId}`);
          }
          resolvedChannel = mediaWithChannel.channel;
        }

        logger.info('Resolved channel for publishing:', {
          channelId: resolvedChannel.id,
          channelName: resolvedChannel.name,
          chatId: resolvedChannel.chatId,
          hasBotToken: !!resolvedChannel.botToken,
          hasMediaStorageChatId: !!resolvedChannel.mediaStorageChatId,
        });

        let imageSource: string;
        let isFileId = false;
        let tempDownloadPath: string | null = null;

        // Handle text-only content (TEXT mediaType, or inline sources)
        // NOTE: Do NOT mark as text-only if filePath is empty - the image might be stored in Telegram (telegramFileId)
        const hasTelegramFileId = !!(fullPost.mediaItem.telegramFileId && fullPost.mediaItem.telegramFileId.length > 20);
        const hasLocalFile = fullPost.mediaItem.filePath && fullPost.mediaItem.filePath !== '' && !fullPost.mediaItem.filePath.startsWith('inline://');

        const isTextOnlyMedia =
          (fullPost.mediaItem.mediaType === 'TEXT' && !hasTelegramFileId) ||
          (!hasTelegramFileId && !hasLocalFile);

        logger.info('Media type detection', {
          postId,
          mediaType: fullPost.mediaItem.mediaType,
          filePath: fullPost.mediaItem.filePath,
          hasTelegramFileId,
          hasLocalFile,
          isTextOnlyMedia,
        });

        if (isTextOnlyMedia) {
          // Text-only content - use empty string as source, telegram service will handle it
          imageSource = '';
          logger.info('Publishing text-only content', { postId, mediaType: fullPost.mediaItem.mediaType });
        } else {
          // Usar a nova função getValidImageSource para obter fonte válida
          const imageResult = await getValidImageSource(fullPost.mediaItem, resolvedChannel.botToken, resolvedChannel);
          imageSource = imageResult.source;
          isFileId = imageResult.isFileId;
          tempDownloadPath = imageResult.tempFile || null;

          if (!imageSource && !isTextOnlyMedia) {
            logger.warn('Nenhuma imagem válida disponível, publicando como texto', { postId });
          }
        }

        // Validate file exists for non-text-only, non-fileId sources
        if (!isTextOnlyMedia && !isFileId && imageSource && !fs.existsSync(imageSource)) {
          logger.error('File not found for post, falling back to text-only', { postId, filePath: imageSource });
          imageSource = ''; // Fall back to text-only
        }

        // Função para limpar arquivo temporário
        const cleanupTempFile = () => {
          if (tempDownloadPath && fs.existsSync(tempDownloadPath)) {
            try {
              fs.unlinkSync(tempDownloadPath);
              logger.info('Cleaned up temp file', { path: tempDownloadPath });
            } catch (e) {
              logger.warn('Failed to cleanup temp file', { path: tempDownloadPath });
            }
          }
        };

        // Publicar com tratamento robusto de erros
        let publishResult;
        try {
          logger.info('Calling telegramService.publishPreview...', {
            postId,
            imageSource: imageSource ? (isFileId ? 'fileId (Telegram)' : imageSource.split('/').pop()) : 'text-only',
            isFileId,
            mediaType: fullPost.mediaItem.mediaType,
            chatId: resolvedChannel.chatId,
          });

          publishResult = await telegramService.publishPreview(
            imageSource,
            fullPost.preview,
            resolvedChannel.botToken,
            resolvedChannel.chatId,
            isFileId,
            fullPost.mediaItem.mediaType || 'IMAGE'
          );

          // Sucesso - limpar arquivo temporário
          cleanupTempFile();

        } catch (publishError: any) {
          const errorMsg = publishError.message || '';
          const isChatNotFound = errorMsg.includes('chat not found');
          const isFileIdError = errorMsg.includes('wrong remote file identifier') || errorMsg.includes('invalid file_id');

          logger.error('Erro na publicação do preview', {
            postId,
            error: errorMsg,
            isChatNotFound,
            isFileIdError,
            isFileId,
            hasImage: !!imageSource,
            channelId: resolvedChannel.id,
            chatId: resolvedChannel.chatId,
          });

          // Se o erro for "chat not found", marcar como FAILED permanentemente (não retry)
          if (isChatNotFound) {
            cleanupTempFile();
            logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger.error('❌ CHAT NÃO ENCONTRADO - O bot não consegue acessar o canal!');
            logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            logger.error('SOLUÇÃO:', {
              chatId: resolvedChannel.chatId,
              botTokenPrefix: resolvedChannel.botToken.substring(0, 10),
              suggestions: [
                '1. Verifique se o bot é admin do canal',
                '2. Verifique se o chatId está correto',
                '3. Tente obter o chatId novamente em @userinfobot ou @getidsbot',
              ],
            });

            // Marcar como FAILED permanentemente
            await tx.post.update({
              where: { id: postId },
              data: {
                status: 'FAILED',
                error: `CHAT_NOT_FOUND: O bot não consegue acessar o canal ${resolvedChannel.chatId}. Verifique se o bot é administrador do canal.`,
              },
            });

            return { messageId: null, status: 'chat_not_found', channelId: currentPost.channelId };
          }

          // Se o erro for "wrong remote file identifier" ou "invalid file_id", tentar re-upload do storage
          if (isFileIdError &&
              fullPost.mediaItem.telegramFileId &&
              fullPost.mediaItem.telegramMessageId &&
              resolvedChannel.mediaStorageChatId) {

            logger.info('FileId inválido, tentando re-upload do Telegram storage', { postId });

            try {
              // Baixar do storage e fazer upload direto
              const tempPath = await downloadFromTelegramStorage(
                fullPost.mediaItem.telegramFileId,
                resolvedChannel.botToken,
                fullPost.mediaItem.originalName
              );

              publishResult = await telegramService.publishPreview(
                tempPath,
                fullPost.preview,
                resolvedChannel.botToken,
                resolvedChannel.chatId,
                false, // não é fileId, é arquivo local
                fullPost.mediaItem.mediaType || 'IMAGE'
              );

              // Sucesso no re-upload - limpar arquivo temporário
              if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
              }

              logger.info('Re-upload bem-sucedido!', { postId, messageId: publishResult.messageId });

              await tx.post.update({
                where: { id: postId },
                data: {
                  status: 'PUBLISHED',
                  publishedAt: new Date(),
                  telegramMessageId: publishResult.messageId,
                },
              });

              return { messageId: publishResult.messageId, status: 'published', channelId: currentPost.channelId };
            } catch (reuploadError: any) {
              logger.error('Re-upload falhou', { postId, error: reuploadError.message });
              cleanupTempFile();
              // Continuar para marcar como FAILED
            }
          }

          // Para outros erros, deixar o worker retry
          cleanupTempFile();
          throw publishError;
        }

        await tx.post.update({
          where: { id: postId },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            telegramMessageId: publishResult.messageId,
          },
        });

        return { messageId: publishResult.messageId, status: 'published', channelId: currentPost.channelId };
      }, {
        isolationLevel: 'Serializable',
      });

      // Handle result
      if (result.status === 'already_published') {
        logger.info('Post already published, skipping', { postId });
        return { postId, status: 'already_published' };
      }

      if (result.status === 'stuck_resolved') {
        logger.info('Stuck post was resolved', { postId });
        return { postId, status: 'stuck_resolved' };
      }

      if (result.status === 'chat_not_found') {
        logger.info('Post marked as FAILED due to chat not found', { postId });
        return { postId, status: 'chat_not_found' };
      }

      // Log job completion
      await prisma.jobLog.create({
        data: {
          jobName: 'publish',
          jobId: job.id,
          status: 'completed',
          data: JSON.stringify({ postId, messageId: result.messageId }),
        },
      });

      // After successful publish, reschedule remaining posts for this channel
      const channelId = result.channelId;
      if (channelId) {
        await rescheduleRemainingPosts(channelId);
      }

      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info('✅ PUBLISH WORKER COMPLETED SUCCESSFULLY', { postId, messageId: result.messageId });
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { postId, messageId: result.messageId };
    } catch (error: any) {
      // CAPTURAR QUALQUER ERRO e garantir que o post seja marcado como FAILED
      const errorMessage = error?.message || 'Unknown error';
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.error('❌ PUBLISH WORKER ERROR', {
        error: errorMessage,
        postId,
      });
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      try {
        const existingPost = await prisma.post.findUnique({ where: { id: postId } });
        if (!existingPost) {
          logger.warn('Post was deleted from database', { postId });
          return { postId, status: 'post_deleted' };
        }

        const retryCount = existingPost.retryCount || 0;
        const newRetryCount = retryCount + 1;

        await prisma.jobLog.create({
          data: {
            jobName: 'publish',
            jobId: job.id,
            status: 'failed',
            error: errorMessage,
            data: JSON.stringify({ postId, retryCount: newRetryCount }),
          },
        });

        // If max retries reached (3), mark as FAILED permanently
        if (newRetryCount >= 3) {
          await prisma.post.update({
            where: { id: postId },
            data: {
              status: 'FAILED',
              error: `Max retries exceeded (3/3). Last error: ${errorMessage}`,
              retryCount: newRetryCount,
            },
          });
          logger.error('Post marked as FAILED after 3 retries', { postId, retryCount: newRetryCount });
          // Return success to prevent BullMQ from retrying - post is now FAILED
          return { postId, status: 'max_retries_reached', retryCount: newRetryCount, error: errorMessage };
        } else {
          // Still have retries left - keep status as PUBLISHING and let BullMQ retry
          await prisma.post.update({
            where: { id: postId },
            data: {
              error: `Retry ${newRetryCount}/3: ${errorMessage}`,
              retryCount: newRetryCount,
            },
          });
          logger.info('Post will be retried by BullMQ', { postId, retryCount: newRetryCount, nextAttempt: newRetryCount + 1 });
          // Throw to trigger BullMQ retry with backoff
          throw error;
        }
      } catch (updateError: any) {
        // If update fails (e.g., post was already deleted), just log and return
        logger.error('Failed to update post status', {
          postId,
          updateError: updateError?.message,
          originalError: errorMessage,
        });
        return { postId, status: 'update_failed', error: errorMessage };
      }
    }
  },
  {
    connection: connectionOptions as any,
    concurrency: 1,
    limiter: {
      max: 20,
      duration: 60000,
    },
  }
);

async function rescheduleRemainingPosts(channelId: string) {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { channelId, enabled: true },
      orderBy: { time: 'asc' },
    });

    if (schedules.length === 0) return;

    const scheduledPosts = await prisma.post.findMany({
      where: { channelId, status: 'SCHEDULED' },
      include: { mediaItem: true },
      orderBy: { mediaItem: { order: 'asc' } },
    });

    if (scheduledPosts.length === 0) return;

    const now = new Date();
    const slots: Date[] = [];

    for (let daysAhead = 0; slots.length < scheduledPosts.length + 5; daysAhead++) {
      for (const schedule of schedules) {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const candidateDate = createScheduleDate(daysAhead, hours, minutes);

        if (candidateDate.getTime() <= now.getTime() + 60000) continue;

        const slotStart = new Date(candidateDate.getTime() - 30000);
        const slotEnd = new Date(candidateDate.getTime() + 30000);

        const occupied = await prisma.post.findFirst({
          where: {
            channelId,
            scheduledFor: { gte: slotStart, lte: slotEnd },
            status: { in: ['SCHEDULED', 'PUBLISHING', 'PUBLISHED'] },
          },
        });

        if (!occupied) slots.push(candidateDate);
      }
      if (daysAhead > 60) break;
    }

    for (let i = 0; i < scheduledPosts.length && i < slots.length; i++) {
      await prisma.post.update({
        where: { id: scheduledPosts[i].id },
        data: { scheduledFor: slots[i] },
      });

      const delay = slots[i].getTime() - Date.now();
      await publishQueue.add(
        'publish-post',
        { postId: scheduledPosts[i].id },
        { delay: Math.max(0, delay), jobId: `publish-${scheduledPosts[i].id}` }
      );
    }

    logger.info('Remaining posts rescheduled after publish', { channelId, count: Math.min(scheduledPosts.length, slots.length) });
  } catch (rescheduleError: any) {
    logger.error('Failed to reschedule after publish', { error: rescheduleError.message });
  }
}

publishWorker.on('completed', (job) => {
  logger.info('Publish job completed', { jobId: job.id });
});

publishWorker.on('failed', (job, err) => {
  logger.error('Publish job failed', { jobId: job?.id, error: err.message });
});
