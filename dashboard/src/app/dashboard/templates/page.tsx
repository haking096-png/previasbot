'use client';

import { useState, useEffect, useRef } from 'react';
import { templateApi, channelApi } from '@/lib/api';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  channelId: string;
  type: 'PREVIEW' | 'CTA_PRESENTE' | 'ENQUETE';
  name: string;
  data: any;
  ctaLink?: string;
  isActive: boolean;
  order: number;
}

type TemplateType = 'PREVIEW' | 'CTA_PRESENTE' | 'ENQUETE';

const TABS: { id: TemplateType; label: string; description: string; icon: string }[] = [
  { id: 'PREVIEW', label: 'Prévias', description: 'Headline + Body + CTA', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'CTA_PRESENTE', label: 'CTA Presente', description: 'Headline + Body + CTA', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
  { id: 'ENQUETE', label: 'Enquetes', description: 'Pergunta + Opções', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
];

const DEFAULT_TEMPLATES: Record<TemplateType, any> = {
  PREVIEW: {
    headline: '🔥 LOIRA SAFADA EM AÇÃO 🔥',
    body: 'Tô aqui de quatro bem safadinha mostrando tudo pra você...\nCuzinho apertadinho e bundão empinadinho 😈💦',
    preCta: 'Tá imaginando como seria me comer agora?',
    cta: '🍑 QUERO VER TUDO 🍑\n🍑 QUERO VER TUDO 🍑\n🍑 QUERO VER TUDO 🍑',
  },
  CTA_PRESENTE: {
    headline: '🎁 PRESENTE PRA VOCÊ 🎁',
    body: 'Vim te dar um presentinho bem safado pra você gozar gostoso...',
    preCta: 'Mas ele só vai durar mais um pouquinho 😈',
    cta: '🎁 RESGATAR MEU PRESENTE AGORA\n🎁 RESGATAR MEU PRESENTE AGORA\n🎁 RESGATAR MEU PRESENTE AGORA',
  },
  ENQUETE: {
    question: 'O QUE VOCÊ FARIA COMIGO AGORA? 💦',
    options: [
      'Metia forte sem parar 😈',
      'Comia devagar até eu implorar 💦',
      'Lambia tudo antes de meter 🍑',
    ],
  },
};

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplateType>('PREVIEW');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { selectedChannelId, setSelectedChannelId } = useChannelStore();
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (selectedChannelId) loadTemplates();
  }, [selectedChannelId, activeTab]);

  const loadChannels = async () => {
    try {
      const res = await channelApi.getAll();
      setChannels(res.data || []);
      if (!selectedChannelId && res.data?.length > 0) {
        setSelectedChannelId(res.data[0].id);
      }
    } catch (error) {
      toast.error('Erro ao carregar canais');
    }
  };

  const loadTemplates = async () => {
    if (!selectedChannelId) return;
    setLoading(true);
    try {
      const res = await templateApi.getAll(selectedChannelId, activeTab);
      setTemplates(res.data || []);
    } catch (error) {
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este template?')) return;
    try {
      await templateApi.delete(id);
      toast.success('Template excluído');
      loadTemplates();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      await templateApi.update(template.id, { isActive: !template.isActive });
      loadTemplates();
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  // Drag and drop reorder
  const handleSort = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _templates = [...templates];
    const draggedItem = _templates.splice(dragItem.current, 1)[0];
    _templates.splice(dragOverItem.current, 0, draggedItem);
    dragItem.current = null;
    dragOverItem.current = null;
    setTemplates(_templates);

    // Save new order
    try {
      await templateApi.reorder(
        _templates.map((t, idx) => ({ id: t.id, order: idx }))
      );
    } catch (error) {
      toast.error('Erro ao reordenar');
      loadTemplates();
    }
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Templates</h1>
        <p className="text-sm text-gray-400 mt-1">
          Crie e gerencie templates de prévia, CTA Presente e enquetes. Arraste para reordenar.
        </p>
      </div>

      {/* Channel Selector */}
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 font-medium">Canal ativo:</label>
          <select
            value={selectedChannelId || ''}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="flex-1 bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none max-w-xs"
          >
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {selectedChannel && (
            <span className="text-xs text-gray-500">
              Templates ativos: {templates.filter(t => t.isActive).length} de {templates.length}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                p-4 rounded-xl border text-left transition-all
                ${active
                  ? 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-[#0d1117] border-[#1f2937] hover:border-[#374151]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#1f2937] text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-gray-300'}`}>{tab.label}</p>
                  <p className="text-[10px] text-gray-500">{tab.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Templates List */}
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#1f2937]">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Templates de {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Arraste os cards para reordenar. A IA usa a ordem como referência.
            </p>
          </div>
          <button
            onClick={handleAddTemplate}
            className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-xs font-medium hover:bg-cyan-600 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Template
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Carregando...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1f2937] mx-auto flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-white mb-1">Nenhum template ainda</h3>
            <p className="text-xs text-gray-500 mb-4">Crie pelo menos 3 templates para a IA ter referências de estilo</p>
            <button
              onClick={handleAddTemplate}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-xs font-medium hover:bg-cyan-600"
            >
              Criar primeiro template
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1f2937]">
            {templates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                type={activeTab}
                onEdit={() => handleEdit(template)}
                onDelete={() => handleDelete(template.id)}
                onToggleActive={() => handleToggleActive(template)}
                onDragStart={() => { dragItem.current = index; }}
                onDragEnter={() => { dragOverItem.current = index; }}
                onDragEnd={handleSort}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <TemplateFormModal
          type={activeTab}
          template={editingTemplate}
          channelId={selectedChannelId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Template Card with drag-and-drop
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TemplateCard({
  template,
  index,
  type,
  onEdit,
  onDelete,
  onToggleActive,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  template: Template;
  index: number;
  type: TemplateType;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className="p-4 hover:bg-[#161b22] transition-colors cursor-move group"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div className="pt-1 text-gray-600 group-hover:text-gray-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" />
            <circle cx="13" cy="15" r="1.5" />
          </svg>
        </div>

        {/* Order Number */}
        <div className="pt-1">
          <div className="w-6 h-6 rounded-full bg-[#1f2937] text-gray-400 text-[10px] font-bold flex items-center justify-center">
            {index + 1}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-sm font-semibold text-white truncate">{template.name}</h3>
            {!template.isActive && (
              <span className="px-1.5 py-0.5 text-[9px] rounded bg-gray-500/20 text-gray-400 font-medium">
                DESATIVADO
              </span>
            )}
          </div>

          {type === 'PREVIEW' || type === 'CTA_PRESENTE' ? (
            <div className="space-y-1 text-xs text-gray-400">
              {template.data?.headline && (
                <p><span className="text-cyan-400 font-medium">Headline:</span> {template.data.headline}</p>
              )}
              {template.data?.body && (
                <p className="line-clamp-1"><span className="text-purple-400 font-medium">Body:</span> {template.data.body.replace(/\n/g, ' / ')}</p>
              )}
              {template.data?.cta && (
                <p className="line-clamp-1"><span className="text-emerald-400 font-medium">CTA:</span> {template.data.cta.split('\n')[0]}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-xs text-gray-400">
              <p><span className="text-cyan-400 font-medium">Pergunta:</span> {template.data?.question}</p>
              <p className="line-clamp-1">
                <span className="text-purple-400 font-medium">Opções:</span>{' '}
                {template.data?.options?.join(' / ')}
              </p>
            </div>
          )}

          {template.ctaLink && (
            <p className="text-[10px] text-cyan-400 mt-1.5 truncate">
              🔗 {template.ctaLink}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
            className="p-1.5 rounded-md hover:bg-[#1f2937] text-gray-500 hover:text-cyan-400"
            title={template.isActive ? 'Desativar' : 'Ativar'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-md hover:bg-[#1f2937] text-gray-500 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Template Form Modal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TemplateFormModal({
  type,
  template,
  channelId,
  onClose,
  onSaved,
}: {
  type: TemplateType;
  template: Template | null;
  channelId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [data, setData] = useState<any>(template?.data || DEFAULT_TEMPLATES[type]);
  const [ctaLink, setCtaLink] = useState(template?.ctaLink || '');

  const handleSave = async () => {
    if (!name || !channelId) {
      toast.error('Preencha o nome e selecione um canal');
      return;
    }

    try {
      if (template) {
        await templateApi.update(template.id, { name, data, ctaLink });
        toast.success('Template atualizado');
      } else {
        await templateApi.create({ channelId, type, name, data, ctaLink });
        toast.success('Template criado');
      }
      onSaved();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#0d1117] border border-[#1f2937] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-[#1f2937] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {template ? 'Editar' : 'Novo'} Template de {TABS.find(t => t.id === type)?.label}
            </h2>
            <p className="text-xs text-gray-500 mt-1">Cole um exemplo real do seu canal</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Nome do template *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Loira Safada, Morena Safada, etc."
              className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {type === 'PREVIEW' || type === 'CTA_PRESENTE' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Headline</label>
                <input
                  type="text"
                  value={data.headline || ''}
                  onChange={(e) => setData({ ...data, headline: e.target.value })}
                  placeholder="🔥 LOIRA SAFADA EM AÇÃO 🔥"
                  className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Body</label>
                <textarea
                  value={data.body || ''}
                  onChange={(e) => setData({ ...data, body: e.target.value })}
                  rows={4}
                  placeholder="Linha 1...&#10;Linha 2..."
                  className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none resize-y"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Pre-CTA (pergunta)</label>
                <input
                  type="text"
                  value={data.preCta || ''}
                  onChange={(e) => setData({ ...data, preCta: e.target.value })}
                  placeholder="Tá imaginando como seria?"
                  className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  CTA (uma linha por botão)
                </label>
                <textarea
                  value={data.cta || ''}
                  onChange={(e) => setData({ ...data, cta: e.target.value })}
                  rows={3}
                  placeholder="🍑 QUERO VER TUDO 🍑&#10;🍑 QUERO VER TUDO 🍑&#10;🍑 QUERO VER TUDO 🍑"
                  className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none resize-y"
                />
                <p className="text-[10px] text-gray-500 mt-1">Cada linha vira um botão clicável no Telegram</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Pergunta</label>
                <input
                  type="text"
                  value={data.question || ''}
                  onChange={(e) => setData({ ...data, question: e.target.value })}
                  placeholder="O QUE VOCÊ FARIA COMIGO? 💦"
                  className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Opções (uma por linha)</label>
                <textarea
                  value={(data.options || []).join('\n')}
                  onChange={(e) => setData({ ...data, options: e.target.value.split('\n').filter(Boolean) })}
                  rows={4}
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                  className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none resize-y"
                />
              </div>
            </>
          )}

          {type !== 'ENQUETE' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Link do CTA (opcional)</label>
              <input
                type="text"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder="https://t.me/seubot"
                className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-[#1f2937]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-[#1f2937] text-gray-400 rounded-lg text-sm font-medium hover:border-gray-600 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors"
          >
            Salvar Template
          </button>
        </div>
      </div>
    </div>
  );
}