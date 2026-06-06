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

      // 1. Try to use a template (if any active templates exist)
      const templates = await prisma.template.findMany({
        where: { channelId, type: 'CTA_PRESENTE', isActive: true },
        orderBy: { order: 'asc' },
      });

      let headline = '';
      let body = '';
      let ctaText = '';

      if (templates.length > 0) {
        // Pick a random template (or first if only one)
        const template = templates[Math.floor(Math.random() * templates.length)];
        const templateData = template.data ? (typeof template.data === 'string' ? JSON.parse(template.data) : template.data) : {};
        logger.info('Using CTA template', { templateId: template.id, templateName: template.name });

        try {
          // Generate from template + channel style
          const generated = await grokService.generateCtaPresente(
            `Baseie-se neste template:\n${JSON.stringify(templateData, null, 2)}`,
            template.ctaLink || channel.ctaLink,
            channel.previewPrompt || ''
          );
          headline = generated.headline;
          body = generated.body;
          ctaText = generated.cta;
        } catch (genError: any) {
          // Fallback to template data directly
          logger.warn('Generation failed, using template data directly', { error: genError.message });
          headline = templateData?.headline || 'PRESENTE PRA VOCÊ 🎁';
          body = templateData?.body || 'Vim te dar um presentinho bem safado...';
          ctaText = templateData?.cta || '🎁 RESGATAR MEU PRESENTE';
        }
      } else {
        // 2. Fallback: use channel's CTA prompt
        if (!channel.ctaPrompt && !channel.previewPrompt) {
          return { success: false, message: 'Configure prompts de CTA ou crie templates' };
        }

        const generated = await grokService.generateCtaPresente(
          channel.ctaPrompt || 'Siga o estilo geral do canal.',
          channel.ctaLink,
          channel.previewPrompt || ''
        );
        headline = generated.headline;
        body = generated.body;
        ctaText = generated.cta;
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

      // 1. Try templates
      const templates = await prisma.template.findMany({
        where: { channelId, type: 'ENQUETE', isActive: true },
        orderBy: { order: 'asc' },
      });

      let question = '';
      let options: string[] = [];

      if (templates.length > 0) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const templateData = template.data ? (typeof template.data === 'string' ? JSON.parse(template.data) : template.data) : {};
        logger.info('Using Enquete template', { templateId: template.id, templateName: template.name });

        try {
          const generated = await grokService.generateEnquete(
            `Baseie-se neste template:\n${JSON.stringify(templateData, null, 2)}`,
            channel.previewPrompt || ''
          );
          question = generated.question;
          options = generated.options;
        } catch (genError: any) {
          logger.warn('Generation failed, using template data directly', { error: genError.message });
          question = templateData?.question || 'O QUE VOCÊ FARIA? 💦';
          options = templateData?.options || ['Sim', 'Não'];
        }
      } else {
        if (!channel.enquetePrompt && !channel.previewPrompt) {
          return { success: false, message: 'Configure prompts de enquete ou crie templates' };
        }

        const generated = await grokService.generateEnquete(
          channel.enquetePrompt || 'Siga o estilo do canal para criar enquetes.',
          channel.previewPrompt || ''
        );
        question = generated.question;
        options = generated.options;
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