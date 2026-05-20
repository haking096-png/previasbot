'use client';

import { useEffect, useState } from 'react';
import { settingsApi, scheduleApi, channelApi } from '@/lib/api';
import { Settings, Schedule, Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import CtaPresenteSection from '@/components/CtaPresenteSection';
import EnqueteSection from '@/components/EnqueteSection';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [activeTab, setActiveTab] = useState<'channel' | 'global'>('channel');
  const { selectedChannelId, setSelectedChannelId } = useChannelStore();

  const [channelForm, setChannelForm] = useState({
    name: '',
    botToken: '',
    chatId: '',
    ctaLink: '',
    mediaStorageChatId: '',
    ctaPrompt: '',
    enquetePrompt: '',
    previewPrompt: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedChannelId) {
      loadChannelSchedules();
      loadChannelForm();
    }
  }, [selectedChannelId, channels]);

  const loadData = async () => {
    try {
      const [settingsRes, channelsRes] = await Promise.all([
        settingsApi.getAll().catch(() => ({ data: [] })),
        channelApi.getAll().catch(() => ({ data: [] })),
      ]);

      const settingsMap: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: Settings) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
      setChannels(channelsRes.data || []);
    } catch (error: any) {
      console.warn('Failed to load settings data, retrying...');
      setTimeout(loadData, 3000);
    } finally {
      setLoading(false);
    }
  };

  const loadChannelSchedules = async () => {
    if (!selectedChannelId) return;
    try {
      const res = await scheduleApi.getAll(selectedChannelId);
      setSchedules(res.data);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadChannelForm = () => {
    const channel = channels.find(c => c.id === selectedChannelId);
    if (!channel) return;

    setChannelForm({
      name: channel.name,
      botToken: channel.botToken,
      chatId: channel.chatId,
      ctaLink: channel.ctaLink,
      mediaStorageChatId: channel.mediaStorageChatId || '',
      ctaPrompt: channel.ctaPrompt || '',
      enquetePrompt: channel.enquetePrompt || '',
      previewPrompt: channel.previewPrompt || '',
    });
  };

  const handleSaveChannel = async () => {
    if (!selectedChannelId) return;

    try {
      await channelApi.update(selectedChannelId, channelForm);
      toast.success('Canal atualizado!');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao salvar canal');
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await settingsApi.update(key, value);
      toast.success('Configuracao atualizada!');
      setSettings({ ...settings, [key]: value });
    } catch (error: any) {
      toast.error('Erro ao atualizar configuracao');
    }
  };

  const handleAddSchedule = async () => {
    if (!newScheduleTime) {
      toast.error('Informe um horario');
      return;
    }
    if (!selectedChannelId) {
      toast.error('Selecione um canal primeiro');
      return;
    }

    try {
      await scheduleApi.create(newScheduleTime, true, selectedChannelId);
      toast.success('Horario adicionado!');
      setNewScheduleTime('');
      loadChannelSchedules();
    } catch (error: any) {
      toast.error('Erro ao adicionar horario');
    }
  };

  const handleToggleSchedule = async (id: string, enabled: boolean, time: string) => {
    try {
      await scheduleApi.update(id, time, !enabled);
      toast.success('Horario atualizado!');
      loadChannelSchedules();
    } catch (error: any) {
      toast.error('Erro ao atualizar horario');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este horario?')) return;

    try {
      await scheduleApi.delete(id);
      toast.success('Horario excluido!');
      loadChannelSchedules();
    } catch (error: any) {
      toast.error('Erro ao excluir horario');
    }
  };

  const handleTestConnection = async () => {
    if (!selectedChannelId) return;
    try {
      const response = await channelApi.testConnection(selectedChannelId);
      if (response.data.connected) {
        toast.success(`Conectado! Bot: @${response.data.botUsername}`);
      } else {
        toast.error(`Falha: ${response.data.error}`);
      }
    } catch (error: any) {
      toast.error('Erro ao testar conexao');
    }
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0e1a]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#3b82f6] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Configuracoes</h1>
        <p className="text-sm text-[#64748b] mt-1">Configure canais e sistema de previas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#111827] border border-[#1e293b] rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('channel')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'channel'
              ? 'bg-[#3b82f6] text-white'
              : 'text-[#64748b] hover:text-[#f1f5f9]'
          }`}
        >
          Configurar Canal
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'global'
              ? 'bg-[#3b82f6] text-white'
              : 'text-[#64748b] hover:text-[#f1f5f9]'
          }`}
        >
          Configuracoes Globais
        </button>
      </div>

      {/* Channel Config Tab */}
      {activeTab === 'channel' && (
        <div className="space-y-5">
          {/* Channel Selector */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">Selecionar Canal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedChannelId === channel.id
                      ? 'border-[#3b82f6] bg-blue-500/5'
                      : 'border-[#1e293b] hover:border-[#334155]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold ${
                    selectedChannelId === channel.id
                      ? 'bg-[#3b82f6] text-white'
                      : 'bg-[#1e293b] text-[#64748b]'
                  }`}>
                    {channel.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${selectedChannelId === channel.id ? 'text-[#f1f5f9]' : 'text-[#64748b]'}`}>
                      {channel.name}
                    </p>
                    <p className="text-xs text-[#475569]">{channel.chatId}</p>
                  </div>
                  {selectedChannelId === channel.id && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-[#3b82f6]" />
                  )}
                </button>
              ))}
            </div>
            {channels.length === 0 && (
              <div className="text-center py-6">
                <p className="text-[#64748b] text-sm mb-3">Nenhum canal criado ainda</p>
                <a href="/dashboard/channels" className="text-[#3b82f6] hover:text-[#2563eb] text-sm font-medium">
                  Criar primeiro canal
                </a>
              </div>
            )}
          </div>

          {selectedChannel && (
            <>
              {/* Bot Config */}
              <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#f1f5f9]">Telegram Bot</h3>
                  <button
                    onClick={handleTestConnection}
                    className="px-3 py-1.5 border border-[#1e293b] text-[#64748b] rounded-lg text-xs font-medium hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                  >
                    Testar Conexao
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Bot Token</label>
                    <input
                      type="password"
                      value={channelForm.botToken}
                      onChange={(e) => setChannelForm({ ...channelForm, botToken: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                      placeholder="123456:ABC-DEF..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Chat ID</label>
                    <input
                      type="text"
                      value={channelForm.chatId}
                      onChange={(e) => setChannelForm({ ...channelForm, chatId: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                      placeholder="-1001234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Nome do Canal</label>
                    <input
                      type="text"
                      value={channelForm.name}
                      onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                      placeholder="Ex: Victoria VIP"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">CTA Link</label>
                    <input
                      type="text"
                      value={channelForm.ctaLink}
                      onChange={(e) => setChannelForm({ ...channelForm, ctaLink: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                      placeholder="https://t.me/seubot?start=start"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Media Storage Chat ID</label>
                  <input
                    type="text"
                    value={channelForm.mediaStorageChatId}
                    onChange={(e) => setChannelForm({ ...channelForm, mediaStorageChatId: e.target.value })}
                    className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                    placeholder="-1001234567890 (canal para armazenar midias)"
                  />
                  <p className="mt-1 text-xs text-[#475569]">Chat ID de um canal/grupo privado onde as imagens serao armazenadas pelo bot</p>
                </div>
              </div>

              {/* Preview Prompt */}
              <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1">Prompt de Preview (Copy da foto)</h3>
                <p className="text-xs text-[#64748b] mb-3">Defina o perfil da modelo, estilo de escrita, exemplos de copy. Este prompt sera usado para gerar as previas das fotos.</p>
                <textarea
                  value={channelForm.previewPrompt}
                  onChange={(e) => setChannelForm({ ...channelForm, previewPrompt: e.target.value })}
                  rows={8}
                  className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                  placeholder={`Ex:\nNome: Victoria\nCaracteristicas: Loira, corpo fitness, tatuada, madura\nPersonalidade: Safada, provocante, carinhosa\n\n--- Exemplos de Copy ---\nBUNDÃO EMPINADO 🍑🔥\n\nLoira gostosa de quatro...\nCorpo perfeito rebolando.\n\nQuer ver tudo? 👇\n\n🍑 VER A SAFADA 🍑`}
                />
              </div>

              {/* CTA Prompt */}
              <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1">Prompt de CTA Presente</h3>
                <p className="text-xs text-[#64748b] mb-3">Defina como a IA deve gerar as mensagens de CTA presente. Inclua nome, personalidade e exemplos.</p>
                <textarea
                  value={channelForm.ctaPrompt}
                  onChange={(e) => setChannelForm({ ...channelForm, ctaPrompt: e.target.value })}
                  rows={8}
                  className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                  placeholder={`Ex:\nNome: Victoria\nPersonalidade: Safada e carinhosa\n\n--- Exemplos ---\nEU AINDA TO AQUI 🎁\n\nVim te dar um presentinho...\nAbre antes que eu mude de ideia 😈\n\n🎁 RESGATAR PRESENTE`}
                />
              </div>

              {/* Enquete Prompt */}
              <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1">Prompt de Enquete</h3>
                <p className="text-xs text-[#64748b] mb-3">Defina como a IA deve gerar as enquetes. Inclua nome, personalidade e exemplos.</p>
                <textarea
                  value={channelForm.enquetePrompt}
                  onChange={(e) => setChannelForm({ ...channelForm, enquetePrompt: e.target.value })}
                  rows={8}
                  className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                  placeholder={`Ex:\nNome: Victoria\nPersonalidade: Provocante e interativa\n\n--- Exemplos ---\nONDE VC GOZARIA EM MIM? 💦\n- Na boca 👄\n- No corpo 🍑\n- Dentro 😈`}
                />
              </div>

              {/* Schedule Times */}
              <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
                <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">
                  Horarios de Publicacao — {selectedChannel.name}
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newScheduleTime}
                      onChange={(e) => setNewScheduleTime(e.target.value)}
                      className="flex-1 bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm"
                    />
                    <button
                      onClick={handleAddSchedule}
                      className="px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-3 bg-[#0a0e1a] border border-[#1e293b] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleSchedule(schedule.id, schedule.enabled, schedule.time)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                              schedule.enabled ? 'bg-[#3b82f6]' : 'bg-[#1e293b]'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              schedule.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                          <span className={`text-sm font-medium ${schedule.enabled ? 'text-[#f1f5f9]' : 'text-[#475569]'}`}>
                            {schedule.time}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-[#64748b] hover:text-red-400 text-xs font-medium transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>

                  {schedules.length === 0 && (
                    <p className="text-[#64748b] text-center text-sm py-3">
                      Nenhum horario configurado para este canal
                    </p>
                  )}
                </div>
              </div>

              {/* CTA Presente Section */}
              <CtaPresenteSection channelId={selectedChannelId!} channelName={selectedChannel.name} />

              {/* Enquetes Section */}
              <EnqueteSection channelId={selectedChannelId!} channelName={selectedChannel.name} />

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveChannel}
                  className="px-5 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
                >
                  Salvar Configuracoes do Canal
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Global Config Tab */}
      {activeTab === 'global' && (
        <div className="space-y-5">
          {/* Grok API */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Grok API (xAI)</h3>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">API Key</label>
              <input
                type="password"
                value={settings.grok_api_key || ''}
                onChange={(e) => setSettings({ ...settings, grok_api_key: e.target.value })}
                onBlur={(e) => handleUpdateSetting('grok_api_key', e.target.value)}
                className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                placeholder="xai-..."
              />
              <p className="mt-1.5 text-xs text-[#475569]">Usada para analise de imagens e geracao de previas em todos os canais</p>
            </div>
          </div>

          {/* Automation */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Automacao</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#f1f5f9]">Agendamento Automatico</p>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Quando ativado, previas aprovadas sao agendadas automaticamente
                </p>
              </div>
              <button
                onClick={() =>
                  handleUpdateSetting(
                    'automation_enabled',
                    settings.automation_enabled === 'true' ? 'false' : 'true'
                  )
                }
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  settings.automation_enabled === 'true' ? 'bg-[#3b82f6]' : 'bg-[#1e293b]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    settings.automation_enabled === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Admin Password */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Seguranca</h3>
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">Alterar Senha Admin</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  id="new-password"
                  className="flex-1 bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                  placeholder="Nova senha..."
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('new-password') as HTMLInputElement;
                    if (input.value) {
                      handleUpdateSetting('admin_password', input.value);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2.5 border border-[#1e293b] text-[#64748b] rounded-lg text-sm font-medium hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                >
                  Alterar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
