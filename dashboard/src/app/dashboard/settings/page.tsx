'use client';

import { useEffect, useState } from 'react';
import { settingsApi, scheduleApi, channelApi } from '@/lib/api';
import { Settings, Schedule, Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';

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

  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

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

  const handleCreateChannel = async () => {
    if (!channelForm.name || !channelForm.botToken || !channelForm.chatId || !channelForm.ctaLink || !channelForm.mediaStorageChatId) {
      toast.error('Preencha Nome, Bot Token, Chat ID, CTA Link e Media Storage Chat ID');
      return;
    }

    try {
      const response = await channelApi.create(channelForm);
      toast.success('Canal criado com sucesso!');
      
      // Refresh channels and select the new one
      await loadData();
      
      // Find the newly created channel (assuming API returns it)
      const newChannelId = response.data?.id;
      if (newChannelId) {
        setSelectedChannelId(newChannelId);
      }
      
      setIsCreatingChannel(false);
    } catch (error: any) {
      toast.error('Erro ao criar canal');
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
        <h1 className="text-2xl font-bold text-[#f1f5f9]">Configurações</h1>
        <p className="text-sm text-[#64748b] mt-1">Gerencie seus canais, prompts e configurações do sistema em um só lugar</p>
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
          Canais
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'global'
              ? 'bg-[#3b82f6] text-white'
              : 'text-[#64748b] hover:text-[#f1f5f9]'
          }`}
        >
          Avançado
        </button>
      </div>

      {/* Channel Config Tab */}
      {activeTab === 'channel' && (
        <div className="space-y-5">
          {/* Channel Selector + Create */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#f1f5f9]">Meus Canais</h3>
              <button
                onClick={() => {
                  setIsCreatingChannel(true);
                  setSelectedChannelId(null);
                  setChannelForm({
                    name: '',
                    botToken: '',
                    chatId: '',
                    ctaLink: '',
                    mediaStorageChatId: '',
                    ctaPrompt: '',
                    enquetePrompt: '',
                    previewPrompt: '',
                  });
                }}
                className="px-4 py-1.5 text-xs font-medium bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors"
              >
                + Novo Canal
              </button>
            </div>
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
            {channels.length === 0 && !isCreatingChannel && (
              <div className="text-center py-6">
                <p className="text-[#64748b] text-sm mb-3">Nenhum canal criado ainda</p>
                <button 
                  onClick={() => {
                    setIsCreatingChannel(true);
                    setSelectedChannelId(null);
                    setChannelForm({ name: '', botToken: '', chatId: '', ctaLink: '', mediaStorageChatId: '', ctaPrompt: '', enquetePrompt: '', previewPrompt: '' });
                  }}
                  className="text-[#3b82f6] hover:text-[#2563eb] text-sm font-medium"
                >
                  Criar primeiro canal
                </button>
              </div>
            )}
          </div>

          {/* Creation Form */}
          {isCreatingChannel && (
            <div className="bg-[#111827] border border-[#3b82f6]/40 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#f1f5f9]">Criar Novo Canal</h3>
                <button 
                  onClick={() => setIsCreatingChannel(false)} 
                  className="text-xs text-[#64748b] hover:text-red-400"
                >
                  Cancelar
                </button>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Nome do Canal *</label>
                  <input type="text" value={channelForm.name} onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm" placeholder="Ex: Victoria VIP" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">CTA Link *</label>
                  <input type="text" value={channelForm.ctaLink} onChange={(e) => setChannelForm({ ...channelForm, ctaLink: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm" placeholder="https://t.me/seubot" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Bot Token *</label>
                  <input type="password" value={channelForm.botToken} onChange={(e) => setChannelForm({ ...channelForm, botToken: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm" placeholder="123456:ABC-DEF..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Chat ID *</label>
                  <input type="text" value={channelForm.chatId} onChange={(e) => setChannelForm({ ...channelForm, chatId: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm" placeholder="-1001234567890" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Media Storage Chat ID * (obrigatório para enviar imagens)</label>
                  <input 
                    type="text" 
                    value={channelForm.mediaStorageChatId} 
                    onChange={(e) => setChannelForm({ ...channelForm, mediaStorageChatId: e.target.value })} 
                    className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm" 
                    placeholder="-1001234567890 (canal privado para guardar as imagens)" 
                  />
                  <p className="mt-1 text-[10px] text-amber-400">
                    Crie um canal privado no Telegram, adicione o bot como admin, e cole o Chat ID aqui. Sem isso você não consegue enviar imagens.
                  </p>
                </div>
              </div>

              <button 
                onClick={handleCreateChannel}
                className="w-full py-3 bg-[#3b82f6] text-white rounded-xl font-medium hover:bg-[#2563eb]"
              >
                Criar Canal
              </button>
            </div>
          )}

          {!isCreatingChannel && selectedChannel && (
            <>
              {/* === DADOS DO CANAL === */}
              <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-400">📡</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#f1f5f9]">Dados do Canal</h3>
                    <p className="text-xs text-[#64748b]">Informações de conexão com o Telegram</p>
                  </div>
                  <button
                    onClick={handleTestConnection}
                    className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-[#1e293b] hover:border-[#3b82f6] text-[#64748b] hover:text-[#3b82f6] transition-colors"
                  >
                    Testar Conexão
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Nome do Canal</label>
                    <input
                      type="text"
                      value={channelForm.name}
                      onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                      placeholder="Ex: Victoria VIP"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">CTA Link</label>
                    <input
                      type="text"
                      value={channelForm.ctaLink}
                      onChange={(e) => setChannelForm({ ...channelForm, ctaLink: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                      placeholder="https://t.me/seubot?start=start"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Bot Token</label>
                    <input
                      type="password"
                      value={channelForm.botToken}
                      onChange={(e) => setChannelForm({ ...channelForm, botToken: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                      placeholder="123456:ABC-DEF..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Chat ID</label>
                    <input
                      type="text"
                      value={channelForm.chatId}
                      onChange={(e) => setChannelForm({ ...channelForm, chatId: e.target.value })}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                      placeholder="-1001234567890"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Media Storage Chat ID (opcional)</label>
                  <input
                    type="text"
                    value={channelForm.mediaStorageChatId}
                    onChange={(e) => setChannelForm({ ...channelForm, mediaStorageChatId: e.target.value })}
                    className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                    placeholder="-1001234567890"
                  />
                  <p className="mt-1 text-[10px] text-[#475569]">Canal privado para armazenar as imagens enviadas pelo bot</p>
                </div>
              </div>

              {/* Prompt Mestre - Principal (mais visual) */}
              <div className="bg-[#0f172a] border-2 border-[#3b82f6]/30 rounded-2xl p-6 relative">
                <div className="absolute -top-3 left-6 bg-[#0f172a] px-3 text-xs font-semibold text-[#3b82f6] tracking-wider">
                  MAIS IMPORTANTE
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#f1f5f9] flex items-center gap-2">
                      ✨ Prompt Mestre do Canal
                    </h3>
                    <p className="text-sm text-[#64748b] mt-1 max-w-xl">
                      Este prompt define o tom, estilo e estrutura de tudo que o Grok vai gerar (fotos, vídeos, enquetes e CTA Presente).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const template = `Você é a copywriter oficial deste canal. Sua única missão é replicar com perfeição o estilo dos exemplos que você fornecer.

REGRAS OBRIGATÓRIAS:
- Headline em MAIÚSCULAS com emojis dos dois lados
- Corpo curto e direto
- Termine com pergunta provocante
- Depois repita o CTA 3 vezes

Cole seus exemplos abaixo:`;

                      setChannelForm({ ...channelForm, previewPrompt: template });
                      toast.success('Template base carregado! Agora adicione seus exemplos.');
                    }}
                    className="shrink-0 px-4 py-2 text-xs font-medium bg-[#3b82f6] text-white rounded-xl hover:bg-[#2563eb] transition-colors"
                  >
                    Usar Template Pronto
                  </button>
                </div>

                <textarea
                  value={channelForm.previewPrompt}
                  onChange={(e) => setChannelForm({ ...channelForm, previewPrompt: e.target.value })}
                  rows={10}
                  className="w-full bg-[#020617] border border-[#1e293b] rounded-xl px-4 py-3 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm font-mono leading-relaxed"
                  placeholder="Cole aqui seu Prompt Mestre com vários exemplos..."
                />

                <p className="text-[10px] text-[#475569] mt-2">
                  Dica: Quanto mais exemplos reais você colocar, melhor o Grok vai copiar seu estilo.
                </p>
              </div>

              {/* Prompts Avançados (visualmente secundários) */}
              <details className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 group">
                <summary className="text-sm font-semibold text-[#f1f5f9] cursor-pointer flex items-center gap-2">
                  Prompts Avançados (opcional)
                  <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-white/5 text-[#64748b]">Só use se quiser sobrescrever o Mestre</span>
                </summary>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0a0e1a] border border-[#1e293b] rounded-xl p-4">
                    <div className="text-xs font-semibold text-amber-400 mb-2">CTA Presente</div>
                    <textarea
                      value={channelForm.ctaPrompt}
                      onChange={(e) => setChannelForm({ ...channelForm, ctaPrompt: e.target.value })}
                      rows={4}
                      className="w-full bg-transparent border-none p-0 text-[#f1f5f9] placeholder-[#475569] focus:outline-none text-xs resize-y"
                      placeholder="Deixe vazio para usar o Prompt Mestre"
                    />
                  </div>

                  <div className="bg-[#0a0e1a] border border-[#1e293b] rounded-xl p-4">
                    <div className="text-xs font-semibold text-purple-400 mb-2">Enquetes</div>
                    <textarea
                      value={channelForm.enquetePrompt}
                      onChange={(e) => setChannelForm({ ...channelForm, enquetePrompt: e.target.value })}
                      rows={4}
                      className="w-full bg-transparent border-none p-0 text-[#f1f5f9] placeholder-[#475569] focus:outline-none text-xs resize-y"
                      placeholder="Deixe vazio para usar o Prompt Mestre"
                    />
                  </div>
                </div>
              </details>

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

              {/* CTA Presente and Enquetes - now have their own pages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="/dashboard/cta-presente"
                  className="flex items-center gap-4 p-5 bg-[#0d1117] border border-[#1f2937] rounded-xl hover:border-amber-500/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">CTA Presente</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Gerenciar templates e horários de CTA</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                <a
                  href="/dashboard/enquetes"
                  className="flex items-center gap-4 p-5 bg-[#0d1117] border border-[#1f2937] rounded-xl hover:border-purple-500/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">Enquetes</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Gerenciar templates e horários de enquetes</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>

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
            
            <div className="mb-5">
              <label className="block text-xs font-medium text-[#64748b] mb-1.5">API Key</label>
              <input
                type="password"
                value={settings.grok_api_key || ''}
                onChange={(e) => setSettings({ ...settings, grok_api_key: e.target.value })}
                onBlur={(e) => handleUpdateSetting('grok_api_key', e.target.value)}
                className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                placeholder="xai-..."
              />
            </div>

            {/* Model Selection */}
            <div>
              <h4 className="text-sm font-semibold text-[#f1f5f9] mb-3">Modelos do Grok</h4>
              <p className="text-xs text-[#64748b] mb-4">Escolha qual modelo usar em cada tipo de ação. Deixe em branco para usar o modelo padrão.</p>
              <p className="text-[10px] text-[#475569] mb-3">Modelos comuns: <code>grok-4-1-fast-non-reasoning</code>, <code>grok-4</code>, <code>grok-3</code></p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1">Modelo Padrão (Fallback)</label>
                  <input
                    type="text"
                    value={settings.grok_model_default || ''}
                    onChange={(e) => setSettings({ ...settings, grok_model_default: e.target.value })}
                    onBlur={(e) => handleUpdateSetting('grok_model_default', e.target.value)}
                    className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2 text-[#f1f5f9] text-sm"
                    placeholder="grok-4-1-fast-non-reasoning"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1">Análise de Imagens</label>
                    <input
                      type="text"
                      value={settings.grok_model_analysis || ''}
                      onChange={(e) => setSettings({ ...settings, grok_model_analysis: e.target.value })}
                      onBlur={(e) => handleUpdateSetting('grok_model_analysis', e.target.value)}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2 text-[#f1f5f9] text-sm"
                      placeholder="grok-4-1-fast-non-reasoning"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1">Geração de Cópias (Preview)</label>
                    <input
                      type="text"
                      value={settings.grok_model_preview || ''}
                      onChange={(e) => setSettings({ ...settings, grok_model_preview: e.target.value })}
                      onBlur={(e) => handleUpdateSetting('grok_model_preview', e.target.value)}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2 text-[#f1f5f9] text-sm"
                      placeholder="grok-4-1-fast-non-reasoning"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1">Enquetes</label>
                    <input
                      type="text"
                      value={settings.grok_model_enquete || ''}
                      onChange={(e) => setSettings({ ...settings, grok_model_enquete: e.target.value })}
                      onBlur={(e) => handleUpdateSetting('grok_model_enquete', e.target.value)}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2 text-[#f1f5f9] text-sm"
                      placeholder="grok-4-1-fast-non-reasoning"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1">CTA Presente</label>
                    <input
                      type="text"
                      value={settings.grok_model_cta || ''}
                      onChange={(e) => setSettings({ ...settings, grok_model_cta: e.target.value })}
                      onBlur={(e) => handleUpdateSetting('grok_model_cta', e.target.value)}
                      className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2 text-[#f1f5f9] text-sm"
                      placeholder="grok-4-1-fast-non-reasoning"
                    />
                  </div>
                </div>
              </div>
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
