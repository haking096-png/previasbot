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
  mediaStorageChatId: string;
  ctaPrompt: string;
  enquetePrompt: string;
  previewPrompt: string;
}

const emptyForm: ChannelForm = {
  name: '',
  botToken: '',
  chatId: '',
  ctaLink: '',
  mediaStorageChatId: '',
  ctaPrompt: '',
  enquetePrompt: '',
  previewPrompt: '',
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
      if (error.response?.status !== 401) {
        console.warn('Failed to load channels, retrying...');
        setTimeout(loadChannels, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.botToken || !form.chatId || !form.ctaLink) {
      toast.error('Preencha os campos obrigatorios');
      return;
    }

    try {
      if (editingId) {
        await channelApi.update(editingId, form);
        toast.success('Canal atualizado!');
      } else {
        await channelApi.create(form);
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
    setForm({
      name: channel.name,
      botToken: channel.botToken,
      chatId: channel.chatId,
      ctaLink: channel.ctaLink,
      mediaStorageChatId: channel.mediaStorageChatId || '',
      ctaPrompt: channel.ctaPrompt || '',
      enquetePrompt: channel.enquetePrompt || '',
      previewPrompt: channel.previewPrompt || '',
    });
    setEditingId(channel.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este canal?')) return;

    try {
      await channelApi.delete(id);
      toast.success('Canal excluido!');
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
      toast.error('Erro ao testar conexao');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0e1a]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#3b82f6] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Canais</h1>
          <p className="text-sm text-[#64748b] mt-1">Gerencie seus bots e canais do Telegram</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
        >
          + Novo Canal
        </button>
      </div>

      {/* Channel List */}
      {channels.length === 0 && !showForm ? (
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-8 text-center">
          <h3 className="text-sm font-medium text-[#f1f5f9] mb-1">Nenhum canal configurado</h3>
          <p className="text-xs text-[#64748b]">Adicione um canal para comecar a publicar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {channels.map((channel) => (
            <div key={channel.id} className={`bg-[#111827] border border-[#1e293b] rounded-lg p-5 hover:border-[#334155] transition-colors ${!channel.enabled ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-bold ${channel.enabled ? 'bg-[#3b82f6] text-white' : 'bg-[#1e293b] text-[#64748b]'}`}>
                    {channel.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#f1f5f9]">{channel.name}</h3>
                    <p className="text-xs text-[#64748b]">Chat ID: {channel.chatId}</p>
                    {channel._count && (
                      <p className="text-xs text-[#475569]">{channel._count.posts} posts</p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${channel.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {channel.enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                {channel.ctaPrompt && (
                  <p className="text-xs text-[#64748b] truncate">CTA Prompt configurado</p>
                )}
                {channel.enquetePrompt && (
                  <p className="text-xs text-[#64748b] truncate">Enquete Prompt configurado</p>
                )}
                {channel.previewPrompt && (
                  <p className="text-xs text-[#64748b] truncate">Preview Prompt configurado</p>
                )}
                <p className="text-xs text-[#475569] truncate">CTA: {channel.ctaLink}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(channel)}
                  className="flex-1 text-xs font-medium text-[#64748b] py-2 border border-[#1e293b] rounded-lg hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleTestConnection(channel.id)}
                  className="flex-1 text-xs font-medium text-[#64748b] py-2 border border-[#1e293b] rounded-lg hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                >
                  Testar
                </button>
                <button
                  onClick={() => handleToggle(channel)}
                  className={`text-xs font-medium py-2 px-3 border rounded-lg transition-colors ${channel.enabled ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/5' : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5'}`}
                >
                  {channel.enabled ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleDelete(channel.id)}
                  className="text-xs font-medium text-[#64748b] py-2 px-3 border border-[#1e293b] rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg max-w-2xl w-full p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#f1f5f9] mb-4">
              {editingId ? 'Editar Canal' : 'Novo Canal'}
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Nome *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm" placeholder="Ex: Victoria VIP" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">CTA Link *</label>
                  <input type="text" value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm" placeholder="https://t.me/seubot?start=start" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Bot Token *</label>
                <input type="password" value={form.botToken} onChange={(e) => setForm({ ...form, botToken: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm" placeholder="123456:ABC-DEF..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Chat ID *</label>
                <input type="text" value={form.chatId} onChange={(e) => setForm({ ...form, chatId: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm" placeholder="-1001234567890" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Media Storage Chat ID</label>
                <input type="text" value={form.mediaStorageChatId} onChange={(e) => setForm({ ...form, mediaStorageChatId: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm" placeholder="-1001234567890 (canal para armazenar midias)" />
                <p className="mt-1 text-[10px] text-[#475569]">Chat ID de um canal/grupo privado onde as imagens serao armazenadas pelo bot</p>
              </div>

              {/* Preview Prompt */}
              <div className="border-t border-[#1e293b] pt-3 mt-3">
                <h4 className="text-xs font-semibold text-[#f1f5f9] mb-1">Prompt de Preview (Copy da foto)</h4>
                <p className="text-[10px] text-[#64748b] mb-2">Defina o perfil da modelo, estilo de escrita, exemplos de copy, etc. Este prompt sera usado para gerar as previas das fotos.</p>
                <textarea
                  value={form.previewPrompt}
                  onChange={(e) => setForm({ ...form, previewPrompt: e.target.value })}
                  rows={6}
                  className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                  placeholder={`Ex:\nNome: Victoria\nCaracteristicas: Loira, corpo fitness, tatuada, madura\nPersonalidade: Safada, provocante, carinhosa\n\n--- Exemplos de Copy ---\nBUNDÃO EMPINADO 🍑🔥\n\nLoira gostosa de quatro...\nCorpo perfeito rebolando.\n\nQuer ver tudo? 👇\n\n🍑 VER A SAFADA 🍑`}
                />
              </div>

              {/* CTA Prompt */}
              <div className="border-t border-[#1e293b] pt-3 mt-3">
                <h4 className="text-xs font-semibold text-[#f1f5f9] mb-1">Prompt de CTA Presente</h4>
                <p className="text-[10px] text-[#64748b] mb-2">Defina como a IA deve gerar as mensagens de CTA presente. Inclua nome, personalidade e exemplos de CTAs.</p>
                <textarea
                  value={form.ctaPrompt}
                  onChange={(e) => setForm({ ...form, ctaPrompt: e.target.value })}
                  rows={6}
                  className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                  placeholder={`Ex:\nNome: Victoria\nPersonalidade: Safada e carinhosa\n\n--- Exemplos ---\nEU AINDA TO AQUI 🎁\n\nVim te dar um presentinho...\nAbre antes que eu mude de ideia 😈\n\n🎁 RESGATAR PRESENTE`}
                />
              </div>

              {/* Enquete Prompt */}
              <div className="border-t border-[#1e293b] pt-3 mt-3">
                <h4 className="text-xs font-semibold text-[#f1f5f9] mb-1">Prompt de Enquete</h4>
                <p className="text-[10px] text-[#64748b] mb-2">Defina como a IA deve gerar as enquetes. Inclua nome, personalidade e exemplos de enquetes.</p>
                <textarea
                  value={form.enquetePrompt}
                  onChange={(e) => setForm({ ...form, enquetePrompt: e.target.value })}
                  rows={6}
                  className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm"
                  placeholder={`Ex:\nNome: Victoria\nPersonalidade: Provocante e interativa\n\n--- Exemplos ---\nONDE VC GOZARIA EM MIM? 💦\n- Na boca 👄\n- No corpo 🍑\n- Dentro 😈`}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors">
                {editingId ? 'Salvar' : 'Criar Canal'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-[#1e293b] text-[#64748b] rounded-lg text-sm font-medium hover:border-[#334155] transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
