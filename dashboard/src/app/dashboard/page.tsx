'use client';

import { useEffect, useState } from 'react';
import { mediaApi, postApi, previewApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalMedia: 0,
    pendingPreviews: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [mediaRes, previewsRes, postsRes] = await Promise.all([
        mediaApi.getAll().catch(() => ({ data: [] })),
        previewApi.getAll().catch(() => ({ data: [] })),
        postApi.getAll().catch(() => ({ data: [] })),
      ]);

      const media = mediaRes.data || [];
      const previews = previewsRes.data || [];
      const posts = postsRes.data || [];

      setStats({
        totalMedia: media.length,
        pendingPreviews: previews.filter((p: any) => !p.approved).length,
        scheduledPosts: posts.filter((p: any) => p.status === 'SCHEDULED').length,
        publishedPosts: posts.filter((p: any) => p.status === 'PUBLISHED').length,
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
      setStats({
        totalMedia: 0,
        pendingPreviews: 0,
        scheduledPosts: 0,
        publishedPosts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      await mediaApi.triggerImport();
      toast.success('Importação iniciada!');
      setTimeout(loadStats, 2000);
    } catch (error: any) {
      toast.error('Erro ao iniciar importação');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-bg">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent-blue border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400 text-lg">Visão geral do sistema de prévias</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Media Card */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 hover:border-accent-blue transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent-blue/10 rounded-xl">
              <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total de Imagens</h3>
          <p className="text-4xl font-bold text-white">{stats.totalMedia}</p>
        </div>

        {/* Pending Previews Card */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 hover:border-yellow-500 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Prévias Pendentes</h3>
          <p className="text-4xl font-bold text-white">{stats.pendingPreviews}</p>
        </div>

        {/* Scheduled Posts Card */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 hover:border-accent-cyan transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent-cyan/10 rounded-xl">
              <svg className="w-8 h-8 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Posts Agendados</h3>
          <p className="text-4xl font-bold text-white">{stats.scheduledPosts}</p>
        </div>

        {/* Published Posts Card */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Posts Publicados</h3>
          <p className="text-4xl font-bold text-white">{stats.publishedPosts}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/dashboard/media"
            className="group bg-dark-bg border-2 border-accent-blue text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-accent-blue/10 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Gerenciar Imagens
          </a>

          <a
            href="/dashboard/posts"
            className="group bg-dark-bg border-2 border-accent-cyan text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-accent-cyan/10 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Ver Publicações
          </a>
        </div>
      </div>
    </div>
  );
}
