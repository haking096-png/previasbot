import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      let user = await prisma.user.findUnique({ where: { username } });

      if (!user) {
        if (username === 'admin' && password === appConfig.adminPassword) {
          const hashedPassword = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: { username, password: hashedPassword },
          });
        } else {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, appConfig.jwtSecret, {
        expiresIn: '7d',
      });

      logger.info('User logged in', { userId: user.id });

      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error: any) {
      logger.error('Login error', { error: error.message });
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.userId;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password required' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid current password' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      logger.info('Password changed', { userId });
      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      logger.error('Change password error', { error: error.message });
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
}

export default new AuthController();
