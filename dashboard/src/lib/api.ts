import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (e) {
        console.error('Error parsing auth storage:', e);
      }
    }
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
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
  getAll: () => api.get('/api/media'),
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
  getAll: () => api.get('/api/previews'),
  getById: (id: string) => api.get(`/api/previews/${id}`),
  update: (id: string, data: any) => api.put(`/api/previews/${id}`, data),
  approve: (id: string) => api.post(`/api/previews/${id}/approve`),
  reject: (id: string) => api.post(`/api/previews/${id}/reject`),
  regenerate: (id: string) => api.post(`/api/previews/${id}/regenerate`),
};

export const scheduleApi = {
  getAll: () => api.get('/api/schedules'),
  create: (time: string, enabled: boolean) =>
    api.post('/api/schedules', { time, enabled }),
  update: (id: string, time: string, enabled: boolean) =>
    api.put(`/api/schedules/${id}`, { time, enabled }),
  delete: (id: string) => api.delete(`/api/schedules/${id}`),
};

export const postApi = {
  getAll: () => api.get('/api/posts'),
  getById: (id: string) => api.get(`/api/posts/${id}`),
  schedule: (mediaItemId: string, previewId: string, scheduledFor: string) =>
    api.post('/api/posts/schedule', { mediaItemId, previewId, scheduledFor }),
  publishNow: (id: string) => api.post(`/api/posts/${id}/publish-now`),
  cancel: (id: string) => api.post(`/api/posts/${id}/cancel`),
  reschedule: (id: string, scheduledFor: string) =>
    api.post(`/api/posts/${id}/reschedule`, { scheduledFor }),
};

export const channelApi = {
  getAll: () => api.get('/api/channels'),
  getById: (id: string) => api.get(`/api/channels/${id}`),
  create: (data: any) => api.post('/api/channels', data),
  update: (id: string, data: any) => api.put(`/api/channels/${id}`, data),
  delete: (id: string) => api.delete(`/api/channels/${id}`),
  testConnection: (id: string) => api.post(`/api/channels/${id}/test`),
};

export default api;
