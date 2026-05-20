import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

export class CtaPresenteController {
  // ━━━━━━━━━━━━━━━ CTA Presente Schedules ━━━━━━━━━━━━━━━

  async getSchedules(req: Request, res: Response) {
    try {
      const { channelId } = req.query;
      const where: any = {};
      if (channelId) where.channelId = channelId as string;

      const schedules = await prisma.ctaPresenteSchedule.findMany({
        where,
        orderBy: { time: 'asc' },
      });
      res.json(schedules);
    } catch (error: any) {
      logger.error('Get CTA presente schedules error', { error: error.message });
      res.status(500).json({ error: 'Erro ao listar horários de CTA presente' });
    }
  }

  async createSchedule(req: Request, res: Response) {
    try {
      const { time, channelId, enabled } = req.body;

      if (!time || !channelId) {
        return res.status(400).json({ error: 'time e channelId são obrigatórios' });
      }

      const schedule = await prisma.ctaPresenteSchedule.create({
        data: { time, channelId, enabled: enabled ?? true },
      });

      logger.info('CTA Presente schedule created', { id: schedule.id, time, channelId });
      res.status(201).json(schedule);
    } catch (error: any) {
      logger.error('Create CTA presente schedule error', { error: error.message });
      res.status(500).json({ error: 'Erro ao criar horário de CTA presente' });
    }
  }

  async deleteSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.ctaPresenteSchedule.delete({ where: { id } });
      logger.info('CTA Presente schedule deleted', { id });
      res.json({ message: 'Horário excluído' });
    } catch (error: any) {
      logger.error('Delete CTA presente schedule error', { error: error.message });
      res.status(500).json({ error: 'Erro ao excluir horário' });
    }
  }
}

export default new CtaPresenteController();
