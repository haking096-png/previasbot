'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import Logo from '@/components/ui/Logo';

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
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)] mesh-bg noise-overlay">
      <div className="w-full max-w-sm animate-fade-slide-up">
        <div className="flex justify-center mb-8">
          <Logo variant="full" size="lg" />
        </div>

        <div className="glass-card border border-[var(--border-subtle)] p-8 rounded-[var(--radius-lg)]">
          <div className="text-center mb-6">
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">Bem-vindo de volta</h1>
            <p className="text-[var(--text-muted)] text-xs mt-1">Entre para acessar o painel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-3 py-2.5 border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-primary)] bg-[var(--surface-base)] focus:border-[var(--accent-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-cyan)]/30 text-sm transition-all duration-200"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2.5 border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-primary)] bg-[var(--surface-base)] focus:border-[var(--accent-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-cyan)]/30 text-sm transition-all duration-200"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-[var(--radius-md)] text-sm font-medium text-white bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-blue)] hover:shadow-lg hover:shadow-violet-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 text-center text-[10px] text-[var(--text-muted)]">
            <p>Senha padrão: admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
