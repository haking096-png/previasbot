import { Telegraf } from 'telegraf';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import grokService from './grok.service';
import { censorText } from '../utils/censor';

export class CtaEnqueteService {
  // ━━━━━━━━━━━━━━━ Post CTA Presente now ━━━━━━━━━━━━━━━

  async postCtaPresenteNow(channelId: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        return { success: false, message: 'Canal não encontrado' };
      }
      if (!channel.enabled) {
        return { success: false, message: 'Canal desativado' };
      }

      // Use the channel's CTA prompt (or fall back to preview prompt)
      if (!channel.ctaPrompt && !channel.previewPrompt) {
        return { success: false, message: 'Configure um prompt de CTA Presente nas configurações do canal' };
      }

      let headline = '';
      let body = '';
      let ctaText = '';

      try {
        const generated = await grokService.generateCtaPresente(
          channel.ctaPrompt || 'Siga o estilo geral do canal.',
          channel.ctaLink,
          channel.previewPrompt || ''
        );
        headline = generated.headline;
        body = generated.body;
        ctaText = generated.cta;
      } catch (genError: any) {
        logger.warn('CTA generation failed, using fallback', { error: genError.message });
        headline = 'PRESENTE PRA VOCÊ 🎁';
        body = 'Vim te dar um presentinho bem safado...';
        ctaText = '🎁 RESGATAR MEU PRESENTE';
      }

      // Apply censoring
      headline = censorText(headline);
      body = censorText(body);
      const ctaLines = ctaText.split('\n').filter((line: string) => line.trim());
      const ctaLine = ctaLines[0]?.trim() || ctaText.trim();
      const ctaCensored = censorText(ctaLine);

      const ctaLink = channel.ctaLink;
      const ctaLinks = `<a href="${ctaLink}"><b>${ctaCensored}</b></a>\n<a href="${ctaLink}"><b>${ctaCensored}</b></a>\n<a href="${ctaLink}"><b>${ctaCensored}</b></a>`;
      const message = `<b>${headline}</b>\n\n${body}\n\n${ctaLinks}`;

      // Send to Telegram
      const bot = new Telegraf(channel.botToken);
      await bot.telegram.sendMessage(channel.chatId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });

      // Log success
      await prisma.jobLog.create({
        data: {
          jobName: 'cta-presente-manual',
          jobId: `manual-${Date.now()}`,
          status: 'completed',
          data: JSON.stringify({
            channelId: channel.id,
            headline,
            body,
            cta: ctaCensored,
          }),
        },
      });

      logger.info('CTA Presente posted successfully', {
        channelId: channel.id,
        channelName: channel.name,
        headline,
      });

      return {
        success: true,
        message: 'CTA Presente postado com sucesso!',
        data: { headline, body, cta: ctaCensored },
      };
    } catch (error: any) {
      logger.error('Failed to post CTA Presente', { error: error.message, channelId });
      return { success: false, message: `Erro: ${error.message}` };
    }
  }

  // ━━━━━━━━━━━━━━━ Post Enquete now ━━━━━━━━━━━━━━━

  async postEnqueteNow(channelId: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        return { success: false, message: 'Canal não encontrado' };
      }
      if (!channel.enabled) {
        return { success: false, message: 'Canal desativado' };
      }

      // Use channel's enquete prompt (fallback to preview prompt)
      if (!channel.enquetePrompt && !channel.previewPrompt) {
        return { success: false, message: 'Configure um prompt de Enquete nas configurações do canal' };
      }

      let question = '';
      let options: string[] = [];

      try {
        const generated = await grokService.generateEnquete(
          channel.enquetePrompt || 'Siga o estilo do canal para criar enquetes.',
          channel.previewPrompt || ''
        );
        question = generated.question;
        options = generated.options;
      } catch (genError: any) {
        logger.warn('Enquete generation failed, using fallback', { error: genError.message });
        question = 'O QUE VOCÊ FARIA? 💦';
        options = ['Sim', 'Não'];
      }

      // Apply censoring
      question = censorText(question.substring(0, 300));
      const validOptions = options
        .filter((o: string) => o.trim().length > 0)
        .map((o: string) => censorText(o.substring(0, 100)))
        .slice(0, 10);

      if (validOptions.length < 2) {
        return { success: false, message: 'Enquete precisa de pelo menos 2 opções' };
      }

      // Send poll to Telegram
      const bot = new Telegraf(channel.botToken);
      await bot.telegram.sendPoll(
        channel.chatId,
        question,
        validOptions,
        {
          is_anonymous: true,
          allows_multiple_answers: false,
        }
      );

      // Log success
      await prisma.jobLog.create({
        data: {
          jobName: 'enquete-manual',
          jobId: `manual-${Date.now()}`,
          status: 'completed',
          data: JSON.stringify({
            channelId: channel.id,
            question,
            options: validOptions,
          }),
        },
      });

      logger.info('Enquete posted successfully', {
        channelId: channel.id,
        channelName: channel.name,
        question,
        optionsCount: validOptions.length,
      });

      return {
        success: true,
        message: 'Enquete postada com sucesso!',
        data: { question, options: validOptions },
      };
    } catch (error: any) {
      logger.error('Failed to post Enquete', { error: error.message, channelId });
      return { success: false, message: `Erro: ${error.message}` };
    }
  }
}

export default new CtaEnqueteService();