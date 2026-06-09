'use client';

import { useState, useEffect } from 'react';
import { channelApi, enqueteScheduleApi } from '@/lib/api';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import GenerationLoader from '@/components/ui/GenerationLoader';
import Card, { CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface Schedule {
  id: string;
  time: string;
  enabled: boolean;
}

export default function EnquetesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [newTime, setNewTime] = useState('');
  const { selectedChannelId, setSelectedChannelId } = useChannelStore();

  useEffect(() => { loadChannels(); }, []);
  useEffect(() => {
    if (selectedChannelId) loadSchedules();
  }, [selectedChannelId]);

  const loadChannels = async () => {
    try {
      const res = await channelApi.getAll();
      setChannels(res.data.filter((c: any) => c.enabled));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!selectedChannelId) return;
    try {
      const res = await enqueteScheduleApi.getAll(selectedChannelId);
      setSchedules(res.data || []);
    } catch {
      // silent
    }
  };

  const handleTest = async () => {
    if (!selectedChannelId) {
      toast.error('Selecione um canal');
      return;
    }
    setTesting(true);
    setTestStatus('generating');
    setTestMessage('Gerando Enquete com IA...');
    try {
      const res = await enqueteScheduleApi.testNow(selectedChannelId);
      const data = res.data;
      if (data?.success) {
        setTestStatus('success');
        const msg = data?.data?.question ? `Enquete postada: "${data.data.question}"` : 'Enquete postada!';
        setTestMessage(msg);
        toast.success(msg);
        setTimeout(() => setTestStatus('idle'), 4000);
      } else {
        setTestStatus('error');
        setTestMessage(data?.message || 'Erro ao postar enquete');
        toast.error(data?.message || 'Erro ao postar enquete');
        setTimeout(() => setTestStatus('idle'), 5000);
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Erro ao postar enquete';
      setTestStatus('error');
      setTestMessage(message);
      toast.error(message, { duration: 6000 });
      setTimeout(() => setTestStatus('idle'), 5000);
    } finally {
      setTesting(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!newTime || !selectedChannelId) return;
    try {
      await enqueteScheduleApi.create(newTime, selectedChannelId);
      toast.success('Horario adicionado');
      setNewTime('');
      loadSchedules();
    } catch {
      toast.error('Erro ao adicionar');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await enqueteScheduleApi.delete(id);
      toast.success('Horario removido');
      loadSchedules();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      {testStatus !== 'idle' && (
        <div className="mb-4 bg-[var(--bg-secondary)] border border-violet-500/30 rounded-xl p-4">
          <GenerationLoader status={testStatus} message={testMessage} size="sm" />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Enquetes</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            As enquetes sao geradas automaticamente usando o prompt do canal
          </p>
        </div>
        <Button
          onClick={handleTest}
          disabled={testing || !selectedChannelId}
          loading={testing}
          className="bg-violet-500 hover:bg-violet-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Testar Agora
        </Button>
      </div>

      {/* Channel Selector */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center gap-3">
          <label className="text-xs text-[var(--text-secondary)] font-medium">Canal:</label>
          <select
            value={selectedChannelId || ''}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/10 max-w-xs"
          >
            <option value="">— selecione —</option>
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Info Banner */}
      <Card padding="lg" className="mb-6 border-violet-500/20 bg-violet-500/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-violet-300">
              A enquete e gerada pelo Grok usando o <strong>Prompt Mestre</strong> e o campo <strong>Enquetes</strong> configurados em <a href="/dashboard/settings" className="underline">Configuracoes</a>.
            </p>
          </div>
        </div>
      </Card>

      {/* Schedules */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-[var(--border-default)]">
          <CardTitle>Horarios de Publicacao</CardTitle>
          <CardDescription>O bot vai postar uma enquete automaticamente em cada horario</CardDescription>
        </div>

        <div className="p-4 border-b border-[var(--border-default)] flex gap-2">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/10"
          />
          <Button
            onClick={handleAddSchedule}
            disabled={!newTime}
            className="bg-violet-500 hover:bg-violet-600"
          >
            Adicionar
          </Button>
        </div>

        <div className="divide-y divide-[var(--border-default)]">
          {schedules.length === 0 ? (
            <EmptyState
              illustration="calendar"
              title="Nenhum horario configurado"
              description="Adicione horarios para o bot postar automaticamente"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-xl hover:border-[var(--border-hover)] border border-transparent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{s.time}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSchedule(s.id)}
                    className="text-[var(--text-muted)] hover:text-red-400"
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
