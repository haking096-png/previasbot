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
          <p className="text-sm text-[#64748b] mt-1">
            Gerenciamento de canais foi movido para <strong>Configurações</strong> para ficar mais simples.
          </p>
        </div>
        <a 
          href="/dashboard/settings" 
          className="px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
        >
          Ir para Configurações
        </a>
      </div>

      {/* Channel List */}
      {channels.length === 0 && !showForm ? (
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-8 text-center max-w-lg mx-auto">
          <div className="mx-auto w-14 h-14 rounded-full bg-[var(--accent-cyan)]/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m2-4v4m0 0v4m0-4h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#f1f5f9] mb-2">Vamos configurar seu primeiro canal</h3>
          <p className="text-sm text-[#64748b] mb-6 max-w-sm mx-auto">
            Você precisa criar um canal no Telegram e conectar o bot. É rápido e vamos te guiar.
          </p>
          <button 
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors"
          >
            Criar meu primeiro canal
          </button>
          <p className="text-[10px] text-[#475569] mt-4">Você vai precisar do Token do Bot (do @BotFather) e do Chat ID.</p>
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
                <p className="mt-1 text-[10px] text-[#475569]">
                  Crie um bot no <a href="https://t.me/BotFather" target="_blank" className="text-[var(--accent-cyan)] hover:underline">@BotFather</a> e cole o token aqui.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Chat ID *</label>
                <input type="text" value={form.chatId} onChange={(e) => setForm({ ...form, chatId: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm" placeholder="-1001234567890" />
                <p className="mt-1 text-[10px] text-[#475569]">
                  Adicione o bot como admin no canal/grupo e envie uma mensagem. Depois acesse: <br />
                  <code className="text-[10px]">https://api.telegram.org/botSEU_TOKEN/getUpdates</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748b] mb-1.5">Media Storage Chat ID</label>
                <input type="text" value={form.mediaStorageChatId} onChange={(e) => setForm({ ...form, mediaStorageChatId: e.target.value })} className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm" placeholder="-1001234567890 (canal para armazenar midias)" />
                <p className="mt-1 text-[10px] text-[#475569]">Chat ID de um canal/grupo privado onde as imagens serao armazenadas pelo bot</p>
              </div>

              {/* Preview Prompt - THE MAIN THING */}
              <div className="border-t border-[#1e293b] pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[#f1f5f9]">Prompt Mestre do Canal (Copywriter)</h4>
                    <p className="text-[11px] text-[#64748b]">Cole aqui um prompt GRANDE com muitos exemplos no estilo exato que você quer. Esse é o coração do canal.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const template = `Você é a copywriter oficial deste canal. Sua única missão é replicar com perfeição o estilo, estrutura, tom, emojis, nível de ousadia e formatação dos exemplos abaixo em TODAS as gerações (copys de foto, copys de vídeo, enquetes e CTA Presente).

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- Headline sempre em MAIÚSCULAS com emojis dos dois lados
- Corpo curto (2-4 linhas), direto, safado, usando as mesmas gírias e nível de detalhe dos exemplos
- Sempre terminar com uma pergunta provocante
- Depois da pergunta, repetir o CTA exatamente 3 vezes (essas 3 linhas viram os links clicáveis)
- Tom: safada, direta, um pouco carinhosa e viciada

Exemplos de copy no estilo exato que você deve seguir:

🔥 LOIRA PELADA COM PLUG NO CUZINHO

Tô de quatro na cama peladinha mostrando essa bund4 grande empinada com plugzinho brilhando no cuzinho 😈
Olhando pra trás com cara de safada enquanto aperto minha bunda pra você…

Tá imaginando como seria tirar esse plug e me comer bem fundo?

Vem ver o vídeo completo sem censura agora 👇

🍑 QUERO VER TUDO 🍑
🍑 QUERO VER TUDO 🍑
🍑 QUERO VER TUDO 🍑

---

🔥 LOIRA DE QUATRO REBOLANDO LENTAMENTE

De quatro na cama, rebolando bem devagar só pra você ver essa bundão gostosa balançando. Cuzinho apertadinho e bucetinha já molhadinha de tesão 😈💦

Quer ver eu rebolando mais forte e abrindo tudinho pra você?

🍑 ENTRA AGORA E VÊ TUDO 🍑
🍑 ENTRA AGORA E VÊ TUDO 🍑
🍑 ENTRA AGORA E VÊ TUDO 🍑

---

**Exemplos de Enquetes que convertem muito (use esse mesmo estilo):**

ONDE VOCÊ GOZARIA EM MIM AGORA? 💦

- Bem fundo no cuzinho apertado 😈
- Na boca enquanto eu engasgo gostoso 👄
- Na bucetinha bem molhada e inchada 🍑
- No meu rostinho safado

---

QUAL BURACO VOCÊ QUER COMER PRIMEIRO HOJE?

- Cuzinho virgem e apertadinho
- Bucetinha já escorrendo de tesão
- Minha boquinha gulosa e quente

---

EU TÔ DE QUATRO AGORA... O QUE VOCÊ FARIA COMIGO?

- Metia devagar até eu implorar por mais
- Comia sem parar até eu gozar tremendo
- Colocava um plug e metia forte
- Filmava enquanto me fodia gostoso

---

**Exemplos de CTA Presente que convertem (use esse mesmo estilo):**

EU AINDA TÔ AQUI COM O PRESENTINHO 🎁

Vim te dar um presentinho bem safado pra você gozar gostoso...

Mas ele só vai durar mais um pouquinho 😈

🎁 RESGATAR MEU PRESENTE AGORA
🎁 RESGATAR MEU PRESENTE AGORA
🎁 RESGATAR MEU PRESENTE AGORA

---

OLHA O QUE EU TENHO PRA VOCÊ HOJE 💦

Gravei um vídeo bem quente e exclusivo só pensando em você gozando...

Quer ver eu me tocando bem devagar e gemendo seu nome?

🎁 QUERO VER MEU PRESENTE AGORA
🎁 QUERO VER MEU PRESENTE AGORA
🎁 QUERO VER MEU PRESENTE AGORA

---

Quando o usuário der uma descrição de vídeo, crie a copy adaptando para o que está acontecendo no vídeo, mantendo exatamente o mesmo estilo, estrutura, tom e formatação dos exemplos acima (inclusive enquetes e CTA Presente).`;

                      setForm({ ...form, previewPrompt: template });
                    }}
                    className="px-3 py-1 text-xs font-medium bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] rounded-lg transition-colors"
                  >
                    Usar Template Pronto
                  </button>
                </div>

                <textarea
                  value={form.previewPrompt}
                  onChange={(e) => setForm({ ...form, previewPrompt: e.target.value })}
                  rows={14}
                  className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-3 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-sm font-mono leading-relaxed"
                  placeholder={`COLE AQUI SEU PROMPT MESTRE (o mais importante do canal)

Esse prompt será usado como referência principal para:
- Copys de fotos
- Copys de VÍDEOS (descreva o que acontece no vídeo)
- Enquetes (se o campo específico estiver vazio)
- CTA Presente (se o campo específico estiver vazio)

Dicas para ficar excelente:
- Cole vários exemplos reais do seu canal (quanto mais, melhor)
- Explique regras de formatação: onde usar MAIÚSCULA, onde repetir o CTA 3x, onde colocar o link
- Inclua tom, gírias, emojis preferidos, estrutura exata
- Mencione que deve funcionar tanto para fotos quanto para descrições de vídeo

Exemplo de início bom:

Você é a copywriter oficial deste canal. Siga EXATAMENTE o estilo dos exemplos abaixo em tudo que gerar (copys de imagem, copys de vídeo, enquetes e CTA presente).

Regras obrigatórias:
- Headline geralmente em MAIÚSCULAS com emojis dos dois lados
- Corpo direto, safado, usando as gírias do exemplo
- Termine com uma pergunta provocante
- Depois da pergunta, repita o CTA exatamente 3 vezes (essas 3 linhas viram os links clicáveis)
- Mantenha o mesmo nível de ousadia e personalidade

Exemplos de copy no estilo que você deve copiar:

🔥 LOIRA PELADA COM PLUG NO CUZINHO

Tô de quatro na cama peladinha mostrando essa bund4 grande empinada com plugzinho brilhando no cuzinho 😈
Olhando pra trás com cara de safada enquanto aperto minha bunda pra você…

Tá imaginando como seria tirar esse plug e me comer bem fundo?

Vem ver o vídeo completo sem censura agora 👇

🍑 QUERO VER TUDO 🍑
🍑 QUERO VER TUDO 🍑
🍑 QUERO VER TUDO 🍑

[ Cole aqui mais 5~10 exemplos seus... ]`}
                />

                {/* Quick Test Area - now clearly supports video descriptions */}
                <div className="mt-3 p-3 bg-[#0a0e1a] border border-[#1e293b] rounded-lg">
                  <div className="text-xs font-semibold text-[#f1f5f9] mb-1">Testar o Prompt Mestre</div>
                  <p className="text-[10px] text-[#64748b] mb-2">
                    Cole uma descrição de <strong>foto</strong> ou do que acontece no <strong>vídeo</strong>. O prompt acima será usado para gerar a copy.
                  </p>

                  <textarea
                    id="test-input"
                    rows={3}
                    className="w-full bg-[#111827] border border-[#1e293b] rounded px-2 py-1.5 text-xs text-[#e2e8f0] placeholder-[#475569]"
                    placeholder="Ex: Loira de quatro na cama com plug no cuzinho, olhando pra trás com cara de safada e rebolando devagar..."
                  />

                  <button
                    type="button"
                    onClick={async () => {
                      const testInput = (document.getElementById('test-input') as HTMLTextAreaElement)?.value;
                      if (!testInput || !form.previewPrompt) {
                        alert('Cole o Prompt Mestre acima e uma descrição (de foto ou vídeo) para testar');
                        return;
                      }
                      try {
                        const res = await fetch('/api/previews/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            prompt: form.previewPrompt,
                            description: testInput,
                            ctaLink: form.ctaLink || 'https://t.me/seubot'
                          })
                        });
                        const data = await res.json();
                        alert(
                          `HEADLINE:\n${data.headline}\n\n` +
                          `CORPO:\n${data.body}\n\n` +
                          `PRÉ-CTA: ${data.preCta}\n\n` +
                          `CTAs (repetidos):\n${data.cta}`
                        );
                      } catch (err) {
                        alert('Erro no teste. Verifique se o backend está rodando.');
                      }
                    }}
                    className="mt-2 w-full text-xs py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded font-medium transition-colors"
                  >
                    Gerar Copy com o Prompt Mestre (Foto ou Vídeo)
                  </button>

                  <p className="text-[10px] text-[#475569] mt-1.5">
                    Dica: Teste várias vezes e ajuste seu prompt até a IA reproduzir exatamente o seu estilo (maiúsculas, repetições, tom, etc).
                  </p>
                </div>
              </div>

              {/* CTA and Enquete Prompts - now secondary / optional */}
              <div className="border-t border-[#1e293b] pt-4 mt-4 space-y-4">
                <div>
                  <details className="group">
                    <summary className="text-xs font-medium text-[#64748b] cursor-pointer hover:text-[#94a3b8] flex items-center gap-2">
                      Campos avançados (opcional)
                      <span className="text-[10px] text-[#475569] group-open:hidden">— só use se quiser sobrescrever o Prompt Mestre</span>
                    </summary>

                    <div className="mt-3 space-y-4 pl-1">
                      {/* CTA Prompt */}
                      <div>
                        <h4 className="text-xs font-semibold text-[#f1f5f9] mb-1">Prompt de CTA Presente (opcional)</h4>
                        <p className="text-[10px] text-[#64748b] mb-2">Deixe vazio para usar o estilo do Prompt Mestre acima.</p>
                        <textarea
                          value={form.ctaPrompt}
                          onChange={(e) => setForm({ ...form, ctaPrompt: e.target.value })}
                          rows={4}
                          className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-xs"
                          placeholder="Deixe em branco para usar o Prompt Mestre"
                        />
                      </div>

                      {/* Enquete Prompt */}
                      <div>
                        <h4 className="text-xs font-semibold text-[#f1f5f9] mb-1">Prompt de Enquete (opcional)</h4>
                        <p className="text-[10px] text-[#64748b] mb-2">Deixe vazio para usar o estilo do Prompt Mestre acima.</p>
                        <textarea
                          value={form.enquetePrompt}
                          onChange={(e) => setForm({ ...form, enquetePrompt: e.target.value })}
                          rows={4}
                          className="w-full bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2 text-[#f1f5f9] placeholder-[#475569] focus:border-[#3b82f6] focus:outline-none text-xs"
                          placeholder="Deixe em branco para usar o Prompt Mestre"
                        />
                      </div>
                    </div>
                  </details>
                </div>
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
