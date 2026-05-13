'use client';

import { useEffect, useState } from 'react';
import { settingsApi, scheduleApi } from '@/lib/api';
import { Settings, Schedule } from '@/types';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newScheduleTime, setNewScheduleTime] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, schedulesRes] = await Promise.all([
        settingsApi.getAll(),
        scheduleApi.getAll(),
      ]);

      const settingsMap: Record<string, string> = {};
      settingsRes.data.forEach((s: Settings) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
      setSchedules(schedulesRes.data);
    } catch (error: any) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await settingsApi.update(key, value);
      toast.success('Configuração atualizada!');
      setSettings({ ...settings, [key]: value });
    } catch (error: any) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleTestTelegram = async () => {
    try {
      const response = await settingsApi.testTelegram();
      if (response.data.connected) {
        toast.success('Conexão com Telegram OK!');
      } else {
        toast.error('Falha na conexão com Telegram');
      }
    } catch (error: any) {
      toast.error('Erro ao testar conexão');
    }
  };

  const handleAddSchedule = async () => {
    if (!newScheduleTime) {
      toast.error('Informe um horário');
      return;
    }

    try {
      await scheduleApi.create(newScheduleTime, true);
      toast.success('Horário adicionado!');
      setNewScheduleTime('');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao adicionar horário');
    }
  };

  const handleToggleSchedule = async (id: string, enabled: boolean, time: string) => {
    try {
      await scheduleApi.update(id, time, !enabled);
      toast.success('Horário atualizado!');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao atualizar horário');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este horário?')) return;

    try {
      await scheduleApi.delete(id);
      toast.success('Horário excluído!');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao excluir horário');
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Configurações</h1>
        <p className="text-gray-400 text-lg">Configure o sistema de prévias automatizadas</p>
      </div>

      <div className="space-y-6">
        {/* Telegram Settings */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-white mb-6">Telegram</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bot Token</label>
              <input
                type="text"
                value={settings.telegram_bot_token || ''}
                onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                onBlur={(e) => handleUpdateSetting('telegram_bot_token', e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Chat ID</label>
              <input
                type="text"
                value={settings.telegram_chat_id || ''}
                onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                onBlur={(e) => handleUpdateSetting('telegram_chat_id', e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                placeholder="-1001234567890"
              />
            </div>
            <button
              onClick={handleTestTelegram}
              className="bg-gradient-to-r from-accent-blue to-accent-cyan text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-accent-blue/50 transition-all duration-300"
            >
              Testar Conexão
            </button>
          </div>
        </div>

        {/* Grok API */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-white mb-6">Grok API</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
              <input
                type="password"
                value={settings.grok_api_key || ''}
                onChange={(e) => setSettings({ ...settings, grok_api_key: e.target.value })}
                onBlur={(e) => handleUpdateSetting('grok_api_key', e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                placeholder="xai-..."
              />
            </div>
          </div>
        </div>

        {/* Model Profile */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-white mb-6">Perfil da Modelo</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
              <input
                type="text"
                value={settings.model_name || ''}
                onChange={(e) => setSettings({ ...settings, model_name: e.target.value })}
                onBlur={(e) => handleUpdateSetting('model_name', e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                placeholder="Ex: Jéssica"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Profissão</label>
              <input
                type="text"
                value={settings.model_profession || ''}
                onChange={(e) => setSettings({ ...settings, model_profession: e.target.value })}
                onBlur={(e) => handleUpdateSetting('model_profession', e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                placeholder="Ex: Engenheira da Petrobras, Médica, Advogada"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Características</label>
              <textarea
                value={settings.model_characteristics || ''}
                onChange={(e) => setSettings({ ...settings, model_characteristics: e.target.value })}
                onBlur={(e) => handleUpdateSetting('model_characteristics', e.target.value)}
                rows={3}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                placeholder="Ex: Loira, corpo fitness, tatuada, olhos claros, estilo sensual"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Personalidade</label>
              <textarea
                value={settings.model_personality || ''}
                onChange={(e) => setSettings({ ...settings, model_personality: e.target.value })}
                onBlur={(e) => handleUpdateSetting('model_personality', e.target.value)}
                rows={3}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                placeholder="Ex: Safada, provocante, carinhosa, divertida, misteriosa"
              />
            </div>
          </div>
        </div>

        {/* Copy Examples */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-white mb-6">Exemplos de Copys</h3>
          <p className="text-gray-400 mb-4">Adicione 5 exemplos de copys para variar o estilo das prévias</p>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num}>
                <label className="block text-sm font-medium text-gray-300 mb-2">Copy Exemplo {num}</label>
                <textarea
                  value={settings[`copy_example_${num}`] || ''}
                  onChange={(e) => setSettings({ ...settings, [`copy_example_${num}`]: e.target.value })}
                  onBlur={(e) => handleUpdateSetting(`copy_example_${num}`, e.target.value)}
                  rows={4}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                  placeholder={`Exemplo ${num}: Escreva uma copy completa com headline, corpo e CTA`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* CTA Link */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-white mb-6">CTA Link</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Link Principal</label>
              <input
                type="text"
                value={settings.cta_link || ''}
                onChange={(e) => setSettings({ ...settings, cta_link: e.target.value })}
                onBlur={(e) => handleUpdateSetting('cta_link', e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none transition-colors"
                placeholder="https://t.me/yourbot"
              />
            </div>
          </div>
        </div>

        {/* Schedule Times */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-white mb-6">Horários de Publicação</h3>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="time"
                value={newScheduleTime}
                onChange={(e) => setNewScheduleTime(e.target.value)}
                className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:border-accent-blue focus:outline-none transition-colors"
              />
              <button
                onClick={handleAddSchedule}
                className="bg-gradient-to-r from-accent-blue to-accent-cyan text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-accent-blue/50 transition-all duration-300"
              >
                Adicionar
              </button>
            </div>

            <div className="space-y-2">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 bg-dark-bg border border-dark-border rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={() =>
                        handleToggleSchedule(schedule.id, schedule.enabled, schedule.time)
                      }
                      className="h-5 w-5 text-accent-blue focus:ring-accent-blue border-dark-border rounded"
                    />
                    <span className="text-lg font-medium text-white">{schedule.time}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>

            {schedules.length === 0 && (
              <p className="text-gray-400 text-center py-4">
                Nenhum horário configurado
              </p>
            )}
          </div>
        </div>

        {/* Automation Toggle */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-white mb-6">Automação</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium text-white">Automação Ativa</p>
              <p className="text-gray-400">
                Ativar/desativar o agendamento automático de posts
              </p>
            </div>
            <button
              onClick={() =>
                handleUpdateSetting(
                  'automation_enabled',
                  settings.automation_enabled === 'true' ? 'false' : 'true'
                )
              }
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-dark-bg ${
                settings.automation_enabled === 'true' ? 'bg-accent-blue' : 'bg-gray-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.automation_enabled === 'true' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
