'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(username, password);
      const { token, user } = response.data;
      login(token, user);
      toast.success('Login realizado com sucesso!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg">
      <div className="bg-dark-card border border-dark-border p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Telegram Preview Bot</h1>
          <p className="text-gray-400 mt-2">Dashboard de Gerenciamento</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-dark-border rounded-xl shadow-sm focus:outline-none focus:ring-accent-blue focus:border-accent-blue text-white bg-dark-bg"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-dark-border rounded-xl shadow-sm focus:outline-none focus:ring-accent-blue focus:border-accent-blue text-white bg-dark-bg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-accent-blue to-accent-cyan hover:shadow-lg hover:shadow-accent-blue/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Senha padrão: admin123</p>
        </div>
      </div>
    </div>
  );
}
