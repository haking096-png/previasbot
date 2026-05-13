'use client';

import { useEffect, useState } from 'react';
import { channelApi } from '@/lib/api';
import { Channel } from '@/types';
import toast from 'react-hot-toast';

interface ChannelForm {
  name: string;
  botToken: string;
  chatId: string;
  ctaLink: string;
  modelName: string;
  modelProfession: string;
  modelCharacteristics: string;
  modelPersonality: string;
  copyExamples: string[];
}

const emptyForm: ChannelForm = {
  name: '',
  botToken: '',
  chatId: '',
  ctaLink: '',
  modelName: '',
  modelProfession: '',
  modelCharacteristics: '',
  modelPersonality: '',
  copyExamples: ['', '', '', '', ''],
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChannelForm>(emptyForm);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const response = await channelApi.getAll();
      setChannels(response.data);
    } catch (error: any) {
      toast.error('Erro ao carregar canais');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.botToken || !form.chatId || !form.ctaLink) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const data = {
        ...form,
        copyExamples: form.copyExamples.filter(e => e.trim()),
      };

      if (editingId) {
        await channelApi.update(editingId, data);
        toast.success('Canal atualizado!');
      } else {
        await channelApi.create(data);
        toast.success('Canal criado!');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      loadChannels();
    } catch (error: any) {
      toast.error(editingId ? 'Erro ao atualizar canal' : 'Erro ao criar canal');
    }
  };

  const handleEdit = (channel: Channel) => {
    let examples: string[] = ['', '', '', '', ''];
    if (channel.copyExamples) {
      try {
        const parsed = JSON.parse(channel.copyExamples);
        if (Array.isArray(parsed)) {
          examples = [...parsed, ...Array(5 - parsed.length).fill('')].slice(0, 5);
        }
      } catch { /* ignore */ }
    }

    setForm({
      name: channel.name,
      botToken: channel.botToken,
      chatId: channel.chatId,
      ctaLink: channel.ctaLink,
      modelName: channel.modelName || '',
      modelProfession: channel.modelProfession || '',
      modelCharacteristics: channel.modelCharacteristics || '',
      modelPersonality: channel.modelPersonality || '',
      copyExamples: examples,
    });
    setEditingId(channel.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este canal?')) return;

    try {
      await channelApi.delete(id);
      toast.success('Canal excluído!');
      loadChannels();
    } catch (error: any) {
      toast.error('Erro ao excluir canal');
    }
  };

  const handleToggle = async (channel: Channel) => {
    try {
      await channelApi.update(channel.id, { enabled: !channel.enabled });
      toast.success(channel.enabled ? 'Canal desativado' : 'Canal ativado');
      loadChannels();
    } catch (error: any) {
      toast.error('Erro ao atualizar canal');
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const response = await channelApi.testConnection(id);
      if (response.data.connected) {
        toast.success(`Conectado! Bot: @${response.data.botUsername}`);
      } else {
        toast.error(`Falha: ${response.data.error}`);
      }
    } catch (error: any) {
      toast.error('Erro ao testar conexão');
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Canais</h1>
          <p className="text-gray-400 text-lg">Gerencie seus bots e canais do Telegram</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="bg-gradient-to-r from-accent-blue to-accent-cyan text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-accent-blue/50 transition-all duration-300"
        >
          + Novo Canal
        </button>
      </div>

      {/* Channel List */}
      {channels.length === 0 && !showForm ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-xl font-medium text-white mb-2">Nenhum canal configurado</h3>
          <p className="text-gray-400">Adicione um canal para começar a publicar em múltiplos bots</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {channels.map((channel) => (
            <div key={channel.id} className={`bg-dark-card border rounded-2xl p-6 transition-all duration-300 ${channel.enabled ? 'border-dark-border hover:border-accent-blue' : 'border-dark-border opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{channel.name}</h3>
                  <p className="text-sm text-gray-400">Chat ID: {channel.chatId}</p>
                  {channel._count && (
                    <p className="text-sm text-gray-500">{channel._count.posts} posts</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${channel.enabled ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                    {channel.enabled ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {channel.modelName && (
                  <p className="text-sm text-gray-300">Modelo: {channel.modelName}</p>
                )}
                <p className="text-sm text-gray-400 truncate">CTA: {channel.ctaLink}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(channel)}
                  className="flex-1 bg-dark-bg border border-accent-blue text-accent-blue px-3 py-2 rounded-xl text-sm font-medium hover:bg-accent-blue/10 transition-all"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleTestConnection(channel.id)}
                  className="flex-1 bg-dark-bg border border-accent-cyan text-accent-cyan px-3 py-2 rounded-xl text-sm font-medium hover:bg-accent-cyan/10 transition-all"
                >
                  Testar
                </button>
                <button
                  onClick={() => handleToggle(channel)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${channel.enabled ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20' : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'}`}
                >
                  {channel.enabled ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleDelete(channel.id)}
                  className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Channel Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Editar Canal' : 'Novo Canal'}
            </h3>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none"
                    placeholder="Ex: Victoria VIP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">CTA Link *</label>
                  <input
                    type="text"
                    value={form.ctaLink}
                    onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none"
                    placeholder="https://t.me/seubot?start=start"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bot Token *</label>
                <input
                  type="password"
                  value={form.botToken}
                  onChange={(e) => setForm({ ...form, botToken: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none"
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Chat ID *</label>
                <input
                  type="text"
                  value={form.chatId}
                  onChange={(e) => setForm({ ...form, chatId: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none"
                  placeholder="-1001234567890"
                />
              </div>

              {/* Model Profile */}
              <div className="border-t border-dark-border pt-4 mt-4">
                <h4 className="text-lg font-semibold text-white mb-4">Perfil da Modelo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                    <input
                      type="text"
                      value={form.modelName}
                      onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none"
                      placeholder="Ex: Victoria"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Profissão</label>
                    <input
                      type="text"
                      value={form.modelProfession}
                      onChange={(e) => setForm({ ...form, modelProfession: e.target.value })}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none"
                      placeholder="Ex: Engenheira da Petrobras"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Características</label>
                  <textarea
                    value={form.modelCharacteristics}
                    onChange={(e) => setForm({ ...form, modelCharacteristics: e.target.value })}
                    rows={2}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none"
                    placeholder="Ex: Loira, corpo fitness, tatuada, olhos claros"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Personalidade</label>
                  <textarea
                    value={form.modelPersonality}
                    onChange={(e) => setForm({ ...form, modelPersonality: e.target.value })}
                    rows={2}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none"
                    placeholder="Ex: Safada, provocante, carinhosa, divertida"
                  />
                </div>
              </div>

              {/* Copy Examples */}
              <div className="border-t border-dark-border pt-4 mt-4">
                <h4 className="text-lg font-semibold text-white mb-2">Exemplos de Copy</h4>
                <p className="text-sm text-gray-400 mb-4">As copys geradas vão seguir exatamente a estrutura destes exemplos</p>
                {form.copyExamples.map((example, idx) => (
                  <div key={idx} className="mb-3">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Exemplo {idx + 1}</label>
                    <textarea
                      value={example}
                      onChange={(e) => {
                        const updated = [...form.copyExamples];
                        updated[idx] = e.target.value;
                        setForm({ ...form, copyExamples: updated });
                      }}
                      rows={4}
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-accent-blue focus:outline-none text-sm"
                      placeholder="Cole aqui uma copy completa de exemplo..."
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-accent-blue to-accent-cyan text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-accent-blue/50 transition-all duration-300"
              >
                {editingId ? 'Salvar' : 'Criar Canal'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="flex-1 bg-dark-bg border border-dark-border text-white px-6 py-3 rounded-xl font-semibold hover:bg-dark-border transition-all duration-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
