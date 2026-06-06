import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para retry em erros de rede
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Retry on network errors or 5xx (backend still starting)
    if (
      !config._retryCount &&
      (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' ||
       (error.response?.status >= 500 && error.response?.status < 600))
    ) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < 3) {
        config._retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1500 * config._retryCount));
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword }),
};

export const settingsApi = {
  getAll: () => api.get('/api/settings'),
  get: (key: string) => api.get(`/api/settings/${key}`),
  update: (key: string, value: string) => api.put(`/api/settings/${key}`, { value }),
  testTelegram: () => api.post('/api/settings/test-telegram'),
};

export const mediaApi = {
  getAll: (channelId?: string) => api.get('/api/media', { params: channelId ? { channelId } : {} }),
  getById: (id: string) => api.get(`/api/media/${id}`),
  upload: (formData: FormData) =>
    api.post('/api/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  reorder: (items: { id: string; order: number }[]) =>
    api.post('/api/media/reorder', { items }),
  delete: (id: string) => api.delete(`/api/media/${id}`),
  triggerImport: () => api.post('/api/media/import'),
};

export const previewApi = {
  getAll: (channelId?: string) => api.get('/api/previews', { params: channelId ? { channelId } : {} }),
  getById: (id: string) => api.get(`/api/previews/${id}`),
  update: (id: string, data: any) => api.put(`/api/previews/${id}`, data),
  approve: (id: string) => api.post(`/api/previews/${id}/approve`),
  reject: (id: string) => api.post(`/api/previews/${id}/reject`),
  regenerate: (id: string) => api.post(`/api/previews/${id}/regenerate`),
};

export const scheduleApi = {
  getAll: (channelId?: string) => api.get('/api/schedules', { params: channelId ? { channelId } : {} }),
  create: (time: string, enabled: boolean, channelId?: string) =>
    api.post('/api/schedules', { time, enabled, channelId }),
  update: (id: string, time: string, enabled: boolean) =>
    api.put(`/api/schedules/${id}`, { time, enabled }),
  delete: (id: string) => api.delete(`/api/schedules/${id}`),
};

export const postApi = {
  getAll: (channelId?: string) => api.get('/api/posts', { params: channelId ? { channelId } : {} }),
  getById: (id: string) => api.get(`/api/posts/${id}`),
  schedule: (mediaItemId: string, previewId: string, scheduledFor: string, channelId?: string) =>
    api.post('/api/posts/schedule', { mediaItemId, previewId, scheduledFor, channelId }),
  publishNow: (id: string) => api.post(`/api/posts/${id}/publish-now`),
  cancel: (id: string) => api.post(`/api/posts/${id}/cancel`),
  reschedule: (id: string, scheduledFor: string) =>
    api.post(`/api/posts/${id}/reschedule`, { scheduledFor }),
  reorder: (items: { id: string; order: number }[]) =>
    api.post('/api/posts/reorder', { items }),
  bulkDelete: (ids: string[]) =>
    api.post('/api/posts/bulk-delete', { ids }),
  regenerate: (id: string) =>
    api.post(`/api/posts/${id}/regenerate`),
};

export const channelApi = {
  getAll: () => api.get('/api/channels'),
  getById: (id: string) => api.get(`/api/channels/${id}`),
  create: (data: any) => api.post('/api/channels', data),
  update: (id: string, data: any) => api.put(`/api/channels/${id}`, data),
  delete: (id: string) => api.delete(`/api/channels/${id}`),
  testConnection: (id: string) => api.post(`/api/channels/${id}/test`),
};

export const ctaPresenteScheduleApi = {
  getAll: (channelId: string) => api.get('/api/cta-presente-schedules', { params: { channelId } }),
  create: (time: string, channelId: string) => api.post('/api/cta-presente-schedules', { time, enabled: true, channelId }),
  delete: (id: string) => api.delete(`/api/cta-presente-schedules/${id}`),
  testNow: (channelId: string) => api.post('/api/cta-presente/test', { channelId }),
};

export const enqueteScheduleApi = {
  getAll: (channelId: string) => api.get('/api/enquete-schedules', { params: { channelId } }),
  create: (time: string, channelId: string) => api.post('/api/enquete-schedules', { time, enabled: true, channelId }),
  delete: (id: string) => api.delete(`/api/enquete-schedules/${id}`),
  testNow: (channelId: string) => api.post('/api/enquete/test', { channelId }),
};

export const templateApi = {
  getAll: (channelId: string, type?: string) =>
    api.get('/api/templates', { params: { channelId, type } }),
  create: (data: any) => api.post('/api/templates', data),
  update: (id: string, data: any) => api.put(`/api/templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/templates/${id}`),
  reorder: (items: { id: string; order: number }[]) =>
    api.post('/api/templates/reorder', { items }),
  generate: (templateId: string, context: any) =>
    api.post('/api/templates/generate', { templateId, context }),
};

export default api;
