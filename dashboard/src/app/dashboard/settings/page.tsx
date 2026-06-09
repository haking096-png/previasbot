'use client';

import { useEffect, useState, useRef } from 'react';
import { settingsApi, scheduleApi, channelApi } from '@/lib/api';
import { Settings, Schedule, Channel } from '@/types';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

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
    previewPrompt: '',
  });

  // Estado de salvamento e detecção de mudanças
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const originalFormRef = useRef(channelForm);

  // Detectar se há mudanças não salvas
  const isDirty = JSON.stringify(channelForm) !== JSON.stringify(originalFormRef.current);

  // Atalho de teclado Ctrl+S / Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedChannelId && isDirty && !isSaving) {
          handleSaveChannel();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedChannelId, isDirty, isSaving, channelForm]);

  // Reset do form dirty ao trocar de canal
  useEffect(() => {
    if (selectedChannel) {
      const form = {
        name: selectedChannel.name,
        botToken: selectedChannel.botToken,
        chatId: selectedChannel.chatId,
        ctaLink: selectedChannel.ctaLink,
        mediaStorageChatId: selectedChannel.mediaStorageChatId || '',
        previewPrompt: selectedChannel.previewPrompt || '',
      };
      setChannelForm(form);
      originalFormRef.current = form;
      setLastSaved(new Date());
    }
  }, [selectedChannelId, channels]);

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
      previewPrompt: channel.previewPrompt || '',
    });
  };

  const handleSaveChannel = async () => {
    if (!selectedChannelId || isSaving) return;

    // Validação básica
    if (!channelForm.name?.trim()) {
      toast.error('Nome do canal é obrigatório');
      return;
    }
    if (!channelForm.botToken?.trim()) {
      toast.error('Bot Token é obrigatório');
      return;
    }
    if (!channelForm.chatId?.trim()) {
      toast.error('Chat ID é obrigatório');
      return;
    }
    if (!channelForm.ctaLink?.trim()) {
      toast.error('CTA Link é obrigatório');
      return;
    }
    if (!channelForm.mediaStorageChatId?.trim()) {
      toast.error('Media Storage Chat ID é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      await channelApi.update(selectedChannelId, channelForm);
      originalFormRef.current = { ...channelForm };
      setLastSaved(new Date());
      toast.success('✅ Configurações salvas com sucesso!');
      await loadData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao salvar canal';
      toast.error(message);
    } finally {
      setIsSaving(false);
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

      await loadData();

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

  const handleToggleChannel = async () => {
    if (!selectedChannel) return;
    try {
      await channelApi.update(selectedChannel.id, { enabled: !selectedChannel.enabled });
      toast.success(selectedChannel.enabled ? 'Canal desativado' : 'Canal ativado');
      await loadData();
    } catch (error: any) {
      toast.error('Erro ao atualizar canal');
    }
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return;
    const confirmMsg = `Tem certeza que deseja EXCLUIR o canal "${selectedChannel.name}"?\n\nIsso vai remover:\n- Todos os posts vinculados\n- Todos os schedules\n- Todas as midias vinculadas\n\nEssa acao NAO pode ser desfeita.`;
    if (!confirm(confirmMsg)) return;

    try {
      await channelApi.delete(selectedChannel.id);
      toast.success('Canal excluido');
      setSelectedChannelId(null);
      await loadData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao excluir canal';
      toast.error(message);
    }
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  const formatLastSaved = (date: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 10) return 'agora mesmo';
    if (diff < 60) return `há ${diff}s`;
    if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
    return `às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-primary)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configuracoes</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Gerencie seus canais, prompts e configuracoes do sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('channel')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            activeTab === 'channel'
              ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-violet-500/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Canais
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            activeTab === 'global'
              ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-violet-500/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Avancado
        </button>
      </div>

      {/* Channel Config Tab */}
      {activeTab === 'channel' && (
        <div className="space-y-5">
          {/* Channel Selector + Create */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Meus Canais</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setIsCreatingChannel(true);
                  setSelectedChannelId(null);
                  setChannelForm({
                    name: '',
                    botToken: '',
                    chatId: '',
                    ctaLink: '',
                    mediaStorageChatId: '',
                    previewPrompt: '',
                  });
                }}
              >
                + Novo Canal
              </Button>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                    selectedChannelId === channel.id
                      ? 'border-[var(--accent-primary)] bg-violet-500/5'
                      : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
                  } ${!channel.enabled ? 'opacity-50' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                    selectedChannelId === channel.id
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                  }`}>
                    {channel.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedChannelId === channel.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {channel.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{channel.chatId}</p>
                  </div>
                  {!channel.enabled && (
                    <Badge variant="danger" size="sm">DESATIVADO</Badge>
                  )}
                </button>
              ))}
            </div>
            {channels.length === 0 && !isCreatingChannel && (
              <div className="text-center py-6">
                <p className="text-[var(--text-muted)] text-sm mb-3">Nenhum canal criado ainda</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreatingChannel(true);
                    setSelectedChannelId(null);
                    setChannelForm({ name: '', botToken: '', chatId: '', ctaLink: '', mediaStorageChatId: '', previewPrompt: '' });
                  }}
                >
                  Criar primeiro canal
                </Button>
              </div>
            )}
          </Card>

          {/* Creation Form */}
          {isCreatingChannel && (
            <Card padding="lg" className="border-[var(--accent-primary)]/30">
              <CardHeader>
                <CardTitle>Criar Novo Canal</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreatingChannel(false)}
                >
                  Cancelar
                </Button>
              </CardHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Canal *"
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                  placeholder="Ex: Victoria VIP"
                />
                <Input
                  label="CTA Link *"
                  value={channelForm.ctaLink}
                  onChange={(e) => setChannelForm({ ...channelForm, ctaLink: e.target.value })}
                  placeholder="https://t.me/seubot"
                />
                <Input
                  label="Bot Token *"
                  type="password"
                  value={channelForm.botToken}
                  onChange={(e) => setChannelForm({ ...channelForm, botToken: e.target.value })}
                  placeholder="123456:ABC-DEF..."
                />
                <Input
                  label="Chat ID *"
                  value={channelForm.chatId}
                  onChange={(e) => setChannelForm({ ...channelForm, chatId: e.target.value })}
                  placeholder="-1001234567890"
                />
                <div className="md:col-span-2">
                  <Input
                    label="Media Storage Chat ID *"
                    value={channelForm.mediaStorageChatId}
                    onChange={(e) => setChannelForm({ ...channelForm, mediaStorageChatId: e.target.value })}
                    placeholder="-1001234567890 (canal privado para guardar as imagens)"
                    hint="Crie um canal privado no Telegram, adicione o bot como admin, e cole o Chat ID aqui."
                  />
                </div>
              </div>

              <Button onClick={handleCreateChannel} className="w-full mt-6">
                Criar Canal
              </Button>
            </Card>
          )}

          {!isCreatingChannel && selectedChannel && (
            <>
              {/* === DADOS DO CANAL === */}
              <Card padding="lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle>Dados do Canal</CardTitle>
                      <CardDescription>Informacoes de conexao com o Telegram</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedChannel.enabled ? 'success' : 'danger'}>
                      {selectedChannel.enabled ? 'Ativo' : 'Desativado'}
                    </Badge>
                  </div>
                </CardHeader>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Button variant="secondary" size="sm" onClick={handleTestConnection}>
                    Testar Conexao
                  </Button>
                  <Button
                    variant={selectedChannel.enabled ? 'secondary' : 'secondary'}
                    size="sm"
                    onClick={handleToggleChannel}
                  >
                    {selectedChannel.enabled ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleDeleteChannel}>
                    Excluir
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nome do Canal"
                    value={channelForm.name}
                    onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                    placeholder="Ex: Victoria VIP"
                  />
                  <Input
                    label="CTA Link"
                    value={channelForm.ctaLink}
                    onChange={(e) => setChannelForm({ ...channelForm, ctaLink: e.target.value })}
                    placeholder="https://t.me/seubot?start=start"
                  />
                  <Input
                    label="Bot Token"
                    type="password"
                    value={channelForm.botToken}
                    onChange={(e) => setChannelForm({ ...channelForm, botToken: e.target.value })}
                    placeholder="123456:ABC-DEF..."
                  />
                  <Input
                    label="Chat ID"
                    value={channelForm.chatId}
                    onChange={(e) => setChannelForm({ ...channelForm, chatId: e.target.value })}
                    placeholder="-1001234567890"
                  />
                </div>

                <div className="mt-4">
                  <Input
                    label="Media Storage Chat ID (opcional)"
                    value={channelForm.mediaStorageChatId}
                    onChange={(e) => setChannelForm({ ...channelForm, mediaStorageChatId: e.target.value })}
                    placeholder="-1001234567890"
                    hint="Canal privado para armazenar as imagens enviadas pelo bot"
                  />
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    {isDirty ? (
                      <>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Alterações não salvas
                        </span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[10px]">Ctrl+S</kbd>
                        <span>para salvar</span>
                      </>
                    ) : lastSaved ? (
                      <>
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Salvo {formatLastSaved(lastSaved)}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {isDirty && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedChannel) {
                            setChannelForm({
                              name: selectedChannel.name,
                              botToken: selectedChannel.botToken,
                              chatId: selectedChannel.chatId,
                              ctaLink: selectedChannel.ctaLink,
                              mediaStorageChatId: selectedChannel.mediaStorageChatId || '',
                              
                              
                              previewPrompt: selectedChannel.previewPrompt || '',
                            });
                            toast.success('Alterações descartadas');
                          }
                        }}
                        disabled={isSaving}
                      >
                        Descartar
                      </Button>
                    )}
                    <Button
                      onClick={handleSaveChannel}
                      disabled={!isDirty || isSaving}
                      loading={isSaving}
                      variant={isDirty ? 'primary' : 'secondary'}
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Prompt Mestre */}
              <Card padding="lg" className="border-[var(--accent-primary)]/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">Prompt Mestre</span>
                      <Badge variant="purple" size="sm">Importante</Badge>
                    </div>
                    <CardDescription>
                      Este prompt define o tom, estilo e estrutura de tudo que o Grok vai gerar
                    </CardDescription>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const template = `Voce e a copywriter oficial deste canal. Sua unica missao e replicar com perfeicao o estilo dos exemplos que voce fornecer.

REGRAS OBRIGATORIAS:
- Headline em MAIUSCULAS com emojis dos dois lados
- Corpo curto e direto
- Termine com pergunta provocante
- Depois repita o CTA 3 vezes

Cole seus exemplos abaixo:`;

                      setChannelForm({ ...channelForm, previewPrompt: template });
                      toast.success('Template base carregado!');
                    }}
                  >
                    Usar Template
                  </Button>
                </CardHeader>

                <Textarea
                  value={channelForm.previewPrompt}
                  onChange={(e) => setChannelForm({ ...channelForm, previewPrompt: e.target.value })}
                  rows={10}
                  placeholder="Cole aqui seu Prompt Mestre com varios exemplos..."
                  className="font-mono"
                />

                <p className="text-[10px] text-[var(--text-muted)] mt-2">
                  Dica: Quanto mais exemplos reais voce colocar, melhor o Grok vai copiar seu estilo.
                </p>
              </Card>

              {/* Schedule Times */}
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Horarios de Publicacao</CardTitle>
                  <CardDescription>{selectedChannel.name}</CardDescription>
                </CardHeader>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newScheduleTime}
                      onChange={(e) => setNewScheduleTime(e.target.value)}
                      className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/10 text-sm"
                    />
                    <Button onClick={handleAddSchedule}>
                      Adicionar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleSchedule(schedule.id, schedule.enabled, schedule.time)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                              schedule.enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)]'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              schedule.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                          <span className={`text-sm font-medium ${schedule.enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                            {schedule.time}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSchedule(schedule.id)}>
                          Excluir
                        </Button>
                      </div>
                    ))}
                  </div>

                  {schedules.length === 0 && (
                    <p className="text-[var(--text-muted)] text-center text-sm py-4">
                      Nenhum horario configurado
                    </p>
                  )}
                </div>
              </Card>

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="/dashboard/cta-presente"
                  className="flex items-center gap-4 p-5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl hover:border-amber-500/30 transition-all duration-150 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">CTA Presente</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Gerenciar horarios de CTA</p>
                  </div>
                  <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                <a
                  href="/dashboard/enquetes"
                  className="flex items-center gap-4 p-5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl hover:border-violet-500/30 transition-all duration-150 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                    <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Enquetes</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Gerenciar horarios de enquetes</p>
                  </div>
                  <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Global Config Tab */}
      {activeTab === 'global' && (
        <div className="space-y-5">
          {/* Grok API */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Grok API (xAI)</CardTitle>
            </CardHeader>

            <div className="space-y-6">
              <Input
                label="API Key"
                type="password"
                value={settings.grok_api_key || ''}
                onChange={(e) => setSettings({ ...settings, grok_api_key: e.target.value })}
                onBlur={(e) => handleUpdateSetting('grok_api_key', e.target.value)}
                placeholder="xai-..."
              />

              <div>
                <div className="mb-3">
                  <CardTitle>Modelos do Grok</CardTitle>
                  <CardDescription>Escolha qual modelo usar em cada tipo de acao</CardDescription>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Modelo Padrao (Fallback)"
                    value={settings.grok_model_default || ''}
                    onChange={(e) => setSettings({ ...settings, grok_model_default: e.target.value })}
                    onBlur={(e) => handleUpdateSetting('grok_model_default', e.target.value)}
                    placeholder="grok-4-1-fast-non-reasoning"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Analise de Imagens"
                      value={settings.grok_model_analysis || ''}
                      onChange={(e) => setSettings({ ...settings, grok_model_analysis: e.target.value })}
                      onBlur={(e) => handleUpdateSetting('grok_model_analysis', e.target.value)}
                      placeholder="grok-4-1-fast-non-reasoning"
                    />
                    <Input
                      label="Geracao de Copias (Preview)"
                      value={settings.grok_model_preview || ''}
                      onChange={(e) => setSettings({ ...settings, grok_model_preview: e.target.value })}
                      onBlur={(e) => handleUpdateSetting('grok_model_preview', e.target.value)}
                      placeholder="grok-4-1-fast-non-reasoning"
                    />
                    <Input
                      label="Enquetes"
                      value={settings.grok_model_enquete || ''}
                      onChange={(e) => setSettings({ ...settings, grok_model_enquete: e.target.value })}
                      onBlur={(e) => handleUpdateSetting('grok_model_enquete', e.target.value)}
                      placeholder="grok-4-1-fast-non-reasoning"
                    />
                    <Input
                      label="CTA Presente"
                      value={settings.grok_model_cta || ''}
                      onChange={(e) => setSettings({ ...settings, grok_model_cta: e.target.value })}
                      onBlur={(e) => handleUpdateSetting('grok_model_cta', e.target.value)}
                      placeholder="grok-4-1-fast-non-reasoning"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Automation */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Automacao</CardTitle>
            </CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Agendamento Automatico</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
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
                  settings.automation_enabled === 'true' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    settings.automation_enabled === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </Card>

          {/* Admin Password */}
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Seguranca</CardTitle>
            </CardHeader>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Alterar Senha Admin</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  id="new-password"
                  className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/10 text-sm"
                  placeholder="Nova senha..."
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const input = document.getElementById('new-password') as HTMLInputElement;
                    if (input.value) {
                      handleUpdateSetting('admin_password', input.value);
                      input.value = '';
                    }
                  }}
                >
                  Alterar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
