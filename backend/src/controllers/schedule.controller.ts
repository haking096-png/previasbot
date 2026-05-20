import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

export class ScheduleController {
  async getAll(req: Request, res: Response) {
    try {
      const { channelId } = req.query;

      const where: any = {};
      if (channelId) {
        where.channelId = channelId as string;
      }

      const schedules = await prisma.schedule.findMany({
        where,
        include: {
          channel: true,
        },
        orderBy: { time: 'asc' },
      });
      res.json(schedules);
    } catch (error: any) {
      logger.error('Get schedules error', { error: error.message });
      res.status(500).json({ error: 'Failed to get schedules' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { time, enabled, channelId } = req.body;

      if (!time) {
        return res.status(400).json({ error: 'Time is required' });
      }

      const schedule = await prisma.schedule.create({
        data: {
          time,
          enabled: enabled ?? true,
          channelId: channelId || null,
        },
        include: {
          channel: true,
        },
      });

      logger.info('Schedule created', { id: schedule.id, time, channelId });
      res.json(schedule);
    } catch (error: any) {
      logger.error('Create schedule error', { error: error.message });
      res.status(500).json({ error: 'Failed to create schedule' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { time, enabled, channelId } = req.body;

      const data: any = {};
      if (time !== undefined) data.time = time;
      if (enabled !== undefined) data.enabled = enabled;
      if (channelId !== undefined) data.channelId = channelId || null;

      const schedule = await prisma.schedule.update({
        where: { id },
        data,
        include: {
          channel: true,
        },
      });

      logger.info('Schedule updated', { id });
      res.json(schedule);
    } catch (error: any) {
      logger.error('Update schedule error', { error: error.message });
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.schedule.delete({ where: { id } });

      logger.info('Schedule deleted', { id });
      res.json({ message: 'Schedule deleted successfully' });
    } catch (error: any) {
      logger.error('Delete schedule error', { error: error.message });
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  }
}

export default new ScheduleController();
