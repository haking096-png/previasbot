import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, appConfig.jwtSecret) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error });
    return res.status(401).json({ error: 'Invalid token' });
  }
};
