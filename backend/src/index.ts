import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { appConfig } from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

import authController from './controllers/auth.controller';
import settingsController from './controllers/settings.controller';
import mediaController from './controllers/media.controller';
import previewController from './controllers/preview.controller';
import scheduleController from './controllers/schedule.controller';
import postController from './controllers/post.controller';
import channelController from './controllers/channel.controller';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory (before rate limiter)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.path.startsWith('/uploads'),
});
app.use(limiter);

app.get('/', (req, res) => {
  res.json({
    message: 'Telegram Preview Bot API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', authController.login.bind(authController));
app.post('/api/auth/change-password', authMiddleware, authController.changePassword.bind(authController));

app.get('/api/settings', authMiddleware, settingsController.getAll.bind(settingsController));
app.get('/api/settings/:key', authMiddleware, settingsController.get.bind(settingsController));
app.put('/api/settings/:key', authMiddleware, settingsController.update.bind(settingsController));
app.post('/api/settings/test-telegram', authMiddleware, settingsController.testTelegram.bind(settingsController));

app.get('/api/media', authMiddleware, mediaController.getAll.bind(mediaController));
app.get('/api/media/:id', authMiddleware, mediaController.getById.bind(mediaController));
app.post('/api/media/upload', authMiddleware, mediaController.upload.array('images', 10), mediaController.uploadImages.bind(mediaController));
app.post('/api/media/:id/reprocess', authMiddleware, mediaController.reprocess.bind(mediaController));
app.post('/api/media/reorder', authMiddleware, mediaController.reorder.bind(mediaController));
app.delete('/api/media/:id', authMiddleware, mediaController.delete.bind(mediaController));
app.post('/api/media/import', authMiddleware, mediaController.triggerImport.bind(mediaController));

app.get('/api/previews', authMiddleware, previewController.getAll.bind(previewController));
app.get('/api/previews/:id', authMiddleware, previewController.getById.bind(previewController));
app.put('/api/previews/:id', authMiddleware, previewController.update.bind(previewController));
app.post('/api/previews/:id/approve', authMiddleware, previewController.approve.bind(previewController));
app.post('/api/previews/:id/reject', authMiddleware, previewController.reject.bind(previewController));
app.post('/api/previews/:id/regenerate', authMiddleware, previewController.regenerate.bind(previewController));

app.get('/api/schedules', authMiddleware, scheduleController.getAll.bind(scheduleController));
app.post('/api/schedules', authMiddleware, scheduleController.create.bind(scheduleController));
app.put('/api/schedules/:id', authMiddleware, scheduleController.update.bind(scheduleController));
app.delete('/api/schedules/:id', authMiddleware, scheduleController.delete.bind(scheduleController));

app.get('/api/posts', authMiddleware, postController.getAll.bind(postController));
app.get('/api/posts/:id', authMiddleware, postController.getById.bind(postController));
app.post('/api/posts/schedule', authMiddleware, postController.schedule.bind(postController));
app.post('/api/posts/:id/publish-now', authMiddleware, postController.publishNow.bind(postController));
app.post('/api/posts/:id/cancel', authMiddleware, postController.cancel.bind(postController));
app.post('/api/posts/:id/reschedule', authMiddleware, postController.reschedule.bind(postController));

app.get('/api/channels', authMiddleware, channelController.getAll.bind(channelController));
app.get('/api/channels/:id', authMiddleware, channelController.getById.bind(channelController));
app.post('/api/channels', authMiddleware, channelController.create.bind(channelController));
app.put('/api/channels/:id', authMiddleware, channelController.update.bind(channelController));
app.delete('/api/channels/:id', authMiddleware, channelController.delete.bind(channelController));
app.post('/api/channels/:id/test', authMiddleware, channelController.testConnection.bind(channelController));

app.use(errorHandler);

app.listen(appConfig.port, () => {
  logger.info(`Backend server running on port ${appConfig.port}`);
  logger.info(`Environment: ${appConfig.nodeEnv}`);
});

export default app;
