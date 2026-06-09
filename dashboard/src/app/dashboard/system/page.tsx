'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

type HealthStatus = 'HEALTHY' | 'WARNING' | 'ERROR' | 'UNKNOWN' | 'INFO';

interface ServiceHealth {
  name: string;
  status: HealthStatus;
  message: string;
  lastCheck: Date;
  latency?: number;
  details?: any;
}

const STATUS_CONFIG = {
  HEALTHY: {
    color: 'emerald',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'check',
    label: 'Online',
  },
  INFO: {
    color: 'blue',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    icon: 'info',
    label: 'Info',
  },
  WARNING: {
    color: 'yellow',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: 'warning',
    label: 'Atencao',
  },
  ERROR: {
    color: 'red',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'error',
    label: 'Erro',
  },
  UNKNOWN: {
    color: 'gray',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    icon: 'unknown',
    label: 'Desconhecido',
  },
};

export default function HealthCenterPage() {
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: 'Database', status: 'UNKNOWN', message: 'Verificando conexao...', lastCheck: new Date() },
    { name: 'Redis', status: 'UNKNOWN', message: 'Verificando conexao...', lastCheck: new Date() },
    { name: 'Telegram API', status: 'UNKNOWN', message: 'Verificando conexao...', lastCheck: new Date() },
    { name: 'Grok AI', status: 'UNKNOWN', message: 'Verificando conexao...', lastCheck: new Date() },
    { name: 'Railway', status: 'UNKNOWN', message: 'Verificando...', lastCheck: new Date() },
    { name: 'Workers', status: 'UNKNOWN', message: 'Verificando...', lastCheck: new Date() },
    { name: 'Queues', status: 'UNKNOWN', message: 'Verificando...', lastCheck: new Date() },
    { name: 'Storage', status: 'UNKNOWN', message: 'Verificando...', lastCheck: new Date() },
  ]);

  const [overallStatus, setOverallStatus] = useState<HealthStatus>('UNKNOWN');
  const [isChecking, setIsChecking] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);

  const updateService = useCallback((name: string, update: Partial<ServiceHealth>) => {
    setServices(prev =>
      prev.map(s => (s.name === name ? { ...s, ...update, lastCheck: new Date() } : s))
    );
  }, []);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);

    // Check Database
    try {
      const start = Date.now();
      const response = await fetch('/api/health/db', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).catch(() => null);

      if (response?.ok) {
        const data = await response.json();
        const tableCount = data.tables ? Object.keys(data.tables).length : 0;
        updateService('Database', {
          status: 'HEALTHY',
          message: `Conectado • ${tableCount} tabelas (${data.tables?.users || 0} users, ${data.tables?.channels || 0} channels)`,
          latency: Date.now() - start,
          details: data,
        });
      } else {
        updateService('Database', { status: 'ERROR', message: 'Falha na conexao' });
      }
    } catch {
      updateService('Database', { status: 'ERROR', message: 'Erro de conexao' });
    }

    // Check Redis
    try {
      const start = Date.now();
      const response = await fetch('/api/health/redis', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).catch(() => null);

      if (response?.ok) {
        const data = await response.json();
        const queueCount = data.queues ? Object.keys(data.queues).length : 0;
        updateService('Redis', {
          status: data.connected ? 'HEALTHY' : 'ERROR',
          message: data.connected ? `Conectado • ${queueCount} filas` : 'Desconectado',
          latency: Date.now() - start,
          details: data,
        });
      } else {
        updateService('Redis', { status: 'WARNING', message: 'Status nao disponivel' });
      }
    } catch {
      updateService('Redis', { status: 'WARNING', message: 'Verificacao falhou' });
    }

    // Check Telegram
    try {
      const start = Date.now();
      const response = await fetch('/api/channels', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        const channels = await response.json();
        const enabledChannels = channels.filter((c: any) => c.enabled);

        if (enabledChannels.length > 0) {
          const testResponse = await fetch(`/api/channels/${enabledChannels[0].id}/test`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          });

          if (testResponse.ok) {
            const data = await testResponse.json();
            updateService('Telegram API', {
              status: data.connected ? 'HEALTHY' : 'ERROR',
              message: data.connected ? `Bot @${data.botUsername} conectado` : 'Falha na conexao',
              latency: Date.now() - start,
            });
          } else {
            updateService('Telegram API', {
              status: 'WARNING',
              message: `${enabledChannels.length} canal(is) configurado(s)`,
              latency: Date.now() - start,
            });
          }
        } else {
          updateService('Telegram API', { status: 'INFO', message: 'Nenhum canal habilitado' });
        }
      } else {
        updateService('Telegram API', { status: 'ERROR', message: 'Erro ao acessar API' });
      }
    } catch {
      updateService('Telegram API', { status: 'ERROR', message: 'Erro de conexao' });
    }

    // Check Grok AI
    try {
      const start = Date.now();
      const response = await fetch('/api/previews/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ prompt: 'Test', description: 'Test' }),
      });

      if (response.ok) {
        updateService('Grok AI', { status: 'HEALTHY', message: 'API respondendo', latency: Date.now() - start });
      } else if (response.status === 500) {
        updateService('Grok AI', { status: 'WARNING', message: 'API retornou erro interno', latency: Date.now() - start });
      } else {
        updateService('Grok AI', { status: 'WARNING', message: 'Resposta inesperada', latency: Date.now() - start });
      }
    } catch (err: any) {
      updateService('Grok AI', { status: 'ERROR', message: err.message || 'Erro de conexao' });
    }

    // Railway Status
    try {
      const start = Date.now();
      const response = await fetch('/api/health/db');
      if (response.ok) {
        updateService('Railway', { status: 'HEALTHY', message: 'Backend online', latency: Date.now() - start });
      } else {
        updateService('Railway', { status: 'WARNING', message: `Status ${response.status}`, latency: Date.now() - start });
      }
    } catch {
      updateService('Railway', { status: 'ERROR', message: 'Backend offline' });
    }

    // Workers Status
    try {
      const response = await fetch('/api/health/workers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        const data = await response.json();
        updateService('Workers', {
          status: data.active ? 'HEALTHY' : 'WARNING',
          message: data.active ? `${data.jobsRunning} job(s) rodando` : 'Sem jobs ativos',
          details: data,
        });
      } else {
        updateService('Workers', { status: 'WARNING', message: 'Status nao disponivel' });
      }
    } catch {
      updateService('Workers', { status: 'WARNING', message: 'Verificacao falhou' });
    }

    // Queues Status
    try {
      const response = await fetch('/api/health/queues', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        const data = await response.json();
        const totalJobs = (data.import?.waiting || 0) + (data.analyze?.waiting || 0) +
                          (data.publish?.waiting || 0) + (data.generate?.waiting || 0);
        updateService('Queues', { status: 'HEALTHY', message: `${totalJobs} job(s) na fila`, details: data });
      } else {
        updateService('Queues', { status: 'WARNING', message: 'Status nao disponivel' });
      }
    } catch {
      updateService('Queues', { status: 'WARNING', message: 'Verificacao falhou' });
    }

    // Storage Status
    try {
      const response = await fetch('/api/media', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.ok) {
        const media = await response.json();
        updateService('Storage', { status: 'HEALTHY', message: `${media.length} midia(s) encontrada(s)` });
      } else {
        updateService('Storage', { status: 'WARNING', message: 'Erro ao acessar storage' });
      }
    } catch {
      updateService('Storage', { status: 'ERROR', message: 'Erro de conexao' });
    }

    setLastFullCheck(new Date());
    setIsChecking(false);
  }, [updateService]);

  useEffect(() => {
    const statuses = services.map(s => s.status);
    if (statuses.every(s => s === 'HEALTHY')) {
      setOverallStatus('HEALTHY');
    } else if (statuses.includes('ERROR')) {
      setOverallStatus('ERROR');
    } else if (statuses.includes('WARNING')) {
      setOverallStatus('WARNING');
    } else {
      setOverallStatus('UNKNOWN');
    }
  }, [services]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const overallConfig = STATUS_CONFIG[overallStatus];
  const healthyCount = services.filter(s => s.status === 'HEALTHY').length;
  const warningCount = services.filter(s => s.status === 'WARNING').length;
  const errorCount = services.filter(s => s.status === 'ERROR').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Health Center</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Status de todos os servicos do sistema
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastFullCheck && (
            <span className="text-xs text-[var(--text-muted)]">
              Ultima verificacao: {format(lastFullCheck, 'HH:mm:ss')}
            </span>
          )}
          <Button
            onClick={checkHealth}
            disabled={isChecking}
            loading={isChecking}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Verificar Agora
          </Button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <Card padding="lg" className={`mb-6 ${overallConfig.bg} ${overallConfig.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${overallConfig.bg}`}>
              {overallStatus === 'HEALTHY' && (
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {overallStatus === 'WARNING' && (
                <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              {overallStatus === 'ERROR' && (
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {overallStatus === 'UNKNOWN' && (
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className={`text-xl font-bold text-${overallConfig.color}-400`}>
                Sistema {overallConfig.label}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {healthyCount} online • {warningCount} atencao • {errorCount} erro(s)
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold text-${overallConfig.color}-400`}>
              {healthyCount}/{services.length}
            </div>
            <div className="text-xs text-[var(--text-muted)]">servicos operacionais</div>
          </div>
        </div>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services.map((service) => {
          const config = STATUS_CONFIG[service.status];

          return (
            <Card key={service.name} padding="md" hover className={`${config.bg} ${config.border}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                    {config.icon === 'check' && (
                      <svg className={`w-5 h-5 text-${config.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {config.icon === 'warning' && (
                      <svg className={`w-5 h-5 text-${config.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                    {config.icon === 'error' && (
                      <svg className={`w-5 h-5 text-${config.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {config.icon === 'info' && (
                      <svg className={`w-5 h-5 text-${config.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {config.icon === 'unknown' && (
                      <svg className={`w-5 h-5 text-${config.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{service.name}</h3>
                </div>
                <Badge variant={config.color as any} size="sm">
                  {config.label}
                </Badge>
              </div>

              <p className="text-sm text-[var(--text-muted)] mb-3">{service.message}</p>

              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>{service.latency ? `${service.latency}ms` : '—'}</span>
                <span>{format(service.lastCheck, 'HH:mm:ss')}</span>
              </div>

              {service.details && (
                <details className="mt-2">
                  <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
                    Ver detalhes
                  </summary>
                  <pre className="mt-1 p-2 bg-[var(--bg-primary)] rounded-lg text-[10px] text-[var(--text-muted)] overflow-x-auto">
                    {JSON.stringify(service.details, null, 2)}
                  </pre>
                </details>
              )}
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card padding="md" className="mt-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Acoes Rapidas</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={checkHealth}>
            Reiniciar Verificacao
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.open('/dashboard/logs', '_blank')}>
            Ver Logs
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.open('/api/health', '_blank')}>
            API Health
          </Button>
        </div>
      </Card>
    </div>
  );
}
