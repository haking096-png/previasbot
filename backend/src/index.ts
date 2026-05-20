import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { appConfig } from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

import authController from './controllers/auth.controller';
import settingsController from './controllers/settings.controller';
import mediaController from './controllers/media.controller';
import previewController from './controllers/preview.controller';
import scheduleController from './controllers/schedule.controller';
import postController from './controllers/post.controller';
import channelController from './controllers/channel.controller';
import ctaPresenteController from './controllers/ctaPresente.controller';
import enqueteController from './controllers/enquete.controller';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skip: (req) => req.path.startsWith('/api/media') && req.path.includes('/image'),
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

// Auth
app.post('/api/auth/login', authController.login.bind(authController));
app.post('/api/auth/change-password', authController.changePassword.bind(authController));

// Settings
app.get('/api/settings', settingsController.getAll.bind(settingsController));
app.get('/api/settings/:key', settingsController.get.bind(settingsController));
app.put('/api/settings/:key', settingsController.update.bind(settingsController));
app.post('/api/settings/test-telegram', settingsController.testTelegram.bind(settingsController));

// Media
app.get('/api/media', mediaController.getAll.bind(mediaController));
app.get('/api/media/:id', mediaController.getById.bind(mediaController));
app.get('/api/media/:id/image', mediaController.getImage.bind(mediaController));
app.post('/api/media/upload', mediaController.upload.array('images', 10), mediaController.uploadImages.bind(mediaController));
app.post('/api/media/:id/reprocess', mediaController.reprocess.bind(mediaController));
app.post('/api/media/reorder', mediaController.reorder.bind(mediaController));
app.delete('/api/media/:id', mediaController.delete.bind(mediaController));
app.post('/api/media/import', mediaController.triggerImport.bind(mediaController));

// Previews
app.get('/api/previews', previewController.getAll.bind(previewController));
app.get('/api/previews/:id', previewController.getById.bind(previewController));
app.put('/api/previews/:id', previewController.update.bind(previewController));
app.post('/api/previews/:id/approve', previewController.approve.bind(previewController));
app.post('/api/previews/:id/reject', previewController.reject.bind(previewController));
app.post('/api/previews/:id/regenerate', previewController.regenerate.bind(previewController));

// Schedules
app.get('/api/schedules', scheduleController.getAll.bind(scheduleController));
app.post('/api/schedules', scheduleController.create.bind(scheduleController));
app.put('/api/schedules/:id', scheduleController.update.bind(scheduleController));
app.delete('/api/schedules/:id', scheduleController.delete.bind(scheduleController));

// Posts
app.get('/api/posts', postController.getAll.bind(postController));
app.get('/api/posts/:id', postController.getById.bind(postController));
app.post('/api/posts/schedule', postController.schedule.bind(postController));
app.post('/api/posts/:id/publish-now', postController.publishNow.bind(postController));
app.post('/api/posts/:id/cancel', postController.cancel.bind(postController));
app.post('/api/posts/:id/reschedule', postController.reschedule.bind(postController));

// Channels
app.get('/api/channels', channelController.getAll.bind(channelController));
app.get('/api/channels/:id', channelController.getById.bind(channelController));
app.post('/api/channels', channelController.create.bind(channelController));
app.put('/api/channels/:id', channelController.update.bind(channelController));
app.delete('/api/channels/:id', channelController.delete.bind(channelController));
app.post('/api/channels/:id/test', channelController.testConnection.bind(channelController));

// CTA Presente Schedules
app.get('/api/cta-presente-schedules', ctaPresenteController.getSchedules.bind(ctaPresenteController));
app.post('/api/cta-presente-schedules', ctaPresenteController.createSchedule.bind(ctaPresenteController));
app.delete('/api/cta-presente-schedules/:id', ctaPresenteController.deleteSchedule.bind(ctaPresenteController));

// Enquete Schedules
app.get('/api/enquete-schedules', enqueteController.getSchedules.bind(enqueteController));
app.post('/api/enquete-schedules', enqueteController.createSchedule.bind(enqueteController));
app.delete('/api/enquete-schedules/:id', enqueteController.deleteSchedule.bind(enqueteController));

app.use(errorHandler);

app.listen(appConfig.port, () => {
  logger.info(`Backend server running on port ${appConfig.port}`);
  logger.info(`Environment: ${appConfig.nodeEnv}`);
});

export default app;
