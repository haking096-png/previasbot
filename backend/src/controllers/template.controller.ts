import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import axios from 'axios';
import { grokConfig } from '../config';

export class TemplateController {
  // ━━━━━━━━━━━━━━━ Templates ━━━━━━━━━━━━━━━

  async getAll(req: Request, res: Response) {
    try {
      const { channelId, type } = req.query;
      const where: any = {};
      if (channelId) where.channelId = channelId as string;
      if (type) where.type = type as string;

      const templates = await prisma.template.findMany({
        where,
        orderBy: { order: 'asc' },
      });

      res.json(templates.map(t => ({
        ...t,
        data: t.data ? JSON.parse(t.data) : null,
      })));
    } catch (error: any) {
      logger.error('Get templates error', { error: error.message });
      res.status(500).json({ error: 'Erro ao listar templates' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { channelId, type, name, data, ctaLink } = req.body;

      if (!channelId || !type || !name) {
        return res.status(400).json({ error: 'channelId, type e name são obrigatórios' });
      }

      // Auto-order: append to end
      const last = await prisma.template.findFirst({
        where: { channelId, type },
        orderBy: { order: 'desc' },
      });
      const order = (last?.order ?? -1) + 1;

      const template = await prisma.template.create({
        data: {
          channelId,
          type,
          name,
          data: JSON.stringify(data || {}),
          ctaLink: ctaLink || null,
          order,
        },
      });

      res.status(201).json({
        ...template,
        data: JSON.parse(template.data || '{}'),
      });
    } catch (error: any) {
      logger.error('Create template error', { error: error.message });
      res.status(500).json({ error: 'Erro ao criar template' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, data, ctaLink, isActive, order } = req.body;

      const template = await prisma.template.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(data !== undefined && { data: JSON.stringify(data) }),
          ...(ctaLink !== undefined && { ctaLink }),
          ...(isActive !== undefined && { isActive }),
          ...(order !== undefined && { order }),
        },
      });

      res.json({
        ...template,
        data: JSON.parse(template.data || '{}'),
      });
    } catch (error: any) {
      logger.error('Update template error', { error: error.message });
      res.status(500).json({ error: 'Erro ao atualizar template' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.template.delete({ where: { id } });
      res.json({ message: 'Template excluído' });
    } catch (error: any) {
      logger.error('Delete template error', { error: error.message });
      res.status(500).json({ error: 'Erro ao excluir template' });
    }
  }

  // ━━━━━━━━━━━━━━━ Reorder ━━━━━━━━━━━━━━━

  async reorder(req: Request, res: Response) {
    try {
      const { items } = req.body; // [{ id, order }]

      await Promise.all(
        items.map((item: { id: string; order: number }) =>
          prisma.template.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );

      res.json({ message: 'Templates reordenados' });
    } catch (error: any) {
      logger.error('Reorder templates error', { error: error.message });
      res.status(500).json({ error: 'Erro ao reordenar templates' });
    }
  }

  // ━━━━━━━━━━━━━━━ Generate from Template + Context ━━━━━━━━━━━━━━━

  async generateFromTemplate(req: Request, res: Response) {
    try {
      const { templateId, context } = req.body;
      // context: { description, imageDescription, ... }

      if (!templateId || !context) {
        return res.status(400).json({ error: 'templateId e context são obrigatórios' });
      }

      const template = await prisma.template.findUnique({ where: { id: templateId } });
      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      const templateData = JSON.parse(template.data || '{}');

      // Build a prompt that asks Grok to mimic the structure of the template
      const structureDescription = describeTemplateStructure(templateData, template.type);

      const userPrompt = `Você deve criar uma copy ORIGINAL seguindo esta estrutura EXATA, mas adaptada ao contexto fornecido.

ESTRUTURA OBRIGATÓRIA:
${structureDescription}

TEMPLATE DE REFERÊNCIA (use como modelo de estilo e formação):
---
${JSON.stringify(templateData, null, 2)}
---

CONTEXTO ATUAL:
${JSON.stringify(context, null, 2)}

INSTRUÇÕES:
- Mantenha o mesmo número de linhas, emojis, nível de ousadia e estrutura do template
- Use os mesmos placeholders/formatação do template substituídos pelo contexto
- A copy deve ser única, mas com a "personalidade" exata do template
- Retorne APENAS JSON válido com a mesma estrutura do template.`;

      const response = await axios.post(
        `${grokConfig.apiUrl}/chat/completions`,
        {
          model: 'Claude-1-fast-non-reasoning',
          messages: [
            {
              role: 'system',
              content: 'Você é uma copywriter especializada em replicar estruturas e estilos com perfeição. Responda apenas com JSON válido.',
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.9,
          max_tokens: 800,
        },
        {
          headers: {
            'Authorization': `Bearer ${grokConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const text = response.data.choices[0]?.message?.content || '';
      let clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      const generated = jsonMatch ? JSON.parse(jsonMatch[0]) : templateData;

      // Merge: keep structure from template, fill with generated
      const finalResult = { ...templateData, ...generated };

      res.json({
        template: templateData,
        generated: finalResult,
      });
    } catch (error: any) {
      logger.error('Generate from template error', { error: error.message });
      res.status(500).json({ error: 'Erro ao gerar do template' });
    }
  }
}

function describeTemplateStructure(data: any, type: string): string {
  if (type === 'PREVIEW' || type === 'CTA_PRESENTE') {
    const lines: string[] = [];
    if (data.headline) lines.push(`1. headline: linha única, ${(data.headline as string).length} chars, ${countLines(data.headline)} linha(s)`);
    if (data.body) lines.push(`2. body: ${countLines(data.body)} linha(s), tom: ${data.body.substring(0, 50)}...`);
    if (data.preCta) lines.push(`3. preCta: 1 linha com pergunta provocante`);
    if (data.cta) {
      const ctas = (data.cta as string).split('\n').filter(Boolean);
      lines.push(`4. cta: ${ctas.length} linhas (repetidas se houver múltiplas)`);
    }
    return lines.join('\n');
  }
  if (type === 'ENQUETE') {
    const options = data.options || [];
    return `1. question: pergunta provocante\n2. options: ${options.length} opções`;
  }
  return JSON.stringify(data, null, 2);
}

function countLines(s: string): number {
  return s.split('\n').filter(Boolean).length;
}

export default new TemplateController();