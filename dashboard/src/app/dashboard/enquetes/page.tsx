'use client';

import { useState, useEffect, useRef } from 'react';
import { templateApi, channelApi, enqueteScheduleApi } from '@/lib/api';
import { useChannelStore } from '@/lib/store';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  channelId: string;
  type: string;
  name: string;
  data: any;
  isActive: boolean;
  order: number;
}

interface Schedule {
  id: string;
  time: string;
  enabled: boolean;
}

export default function EnquetesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newTime, setNewTime] = useState('');
  const { selectedChannelId, setSelectedChannelId } = useChannelStore();
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => { loadChannels(); }, []);
  useEffect(() => {
    if (selectedChannelId) {
      loadTemplates();
      loadSchedules();
    }
  }, [selectedChannelId]);

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
      const res = await templateApi.getAll(selectedChannelId, 'ENQUETE');
      setTemplates(res.data || []);
    } catch (error) {
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!selectedChannelId) return;
    try {
      const res = await enqueteScheduleApi.getAll(selectedChannelId);
      setSchedules(res.data || []);
    } catch (error) {
      toast.error('Erro ao carregar horários');
    }
  };

  const handleTest = async () => {
    if (!selectedChannelId) return;
    setTesting(true);
    try {
      await enqueteScheduleApi.testNow(selectedChannelId);
      toast.success('Enquete sendo gerada!');
    } catch (error) {
      toast.error('Erro ao testar');
    } finally {
      setTimeout(() => setTesting(false), 3000);
    }
  };

  const handleAddSchedule = async () => {
    if (!newTime || !selectedChannelId) return;
    try {
      await enqueteScheduleApi.create(newTime, selectedChannelId);
      toast.success('Horário adicionado');
      setNewTime('');
      loadSchedules();
    } catch (error) {
      toast.error('Erro ao adicionar');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await enqueteScheduleApi.delete(id);
      toast.success('Horário removido');
      loadSchedules();
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  const handleToggleTemplate = async (template: Template) => {
    try {
      await templateApi.update(template.id, { isActive: !template.isActive });
      loadTemplates();
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Excluir template?')) return;
    try {
      await templateApi.delete(id);
      toast.success('Template excluído');
      loadTemplates();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  // Drag and drop reorder
  const handleSort = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const reordered = [...templates];
    const draggedItem = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOverItem.current, 0, draggedItem);
    dragItem.current = null;
    dragOverItem.current = null;
    setTemplates(reordered);

    try {
      await templateApi.reorder(reordered.map((t, idx) => ({ id: t.id, order: idx })));
    } catch {
      loadTemplates();
    }
  };

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Enquetes</h1>
          <p className="text-sm text-gray-400 mt-1">
            Templates e horários de enquetes para o canal
          </p>
        </div>
        <button
          onClick={handleTest}
          disabled={testing || !selectedChannelId}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {testing ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Testar Agora
            </>
          )}
        </button>
      </div>

      <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 font-medium">Canal:</label>
          <select
            value={selectedChannelId || ''}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="flex-1 bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none max-w-xs"
          >
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#1f2937]">
              <div>
                <h2 className="text-sm font-semibold text-white">Templates de Enquetes</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Arraste para reordenar. A IA usa a ordem como referência.
                </p>
              </div>
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-xs font-medium hover:bg-cyan-600 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Template
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Carregando...</div>
            ) : templates.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-white mb-1">Nenhum template ainda</p>
                <p className="text-xs text-gray-500 mb-4">Crie pelo menos 3 templates para a IA ter referências</p>
                <button
                  onClick={() => { setEditing(null); setShowForm(true); }}
                  className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-xs"
                >
                  Criar primeiro template
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#1f2937]">
                {templates.map((template, index) => (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={() => { dragItem.current = index; }}
                    onDragEnter={() => { dragOverItem.current = index; }}
                    onDragEnd={handleSort}
                    onDragOver={(e) => e.preventDefault()}
                    className="p-4 hover:bg-[#161b22] transition-colors cursor-move group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-1 text-gray-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
                          <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
                          <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
                        </svg>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white">{template.name}</h3>
                          {!template.isActive && (
                            <span className="px-1.5 py-0.5 text-[9px] rounded bg-gray-500/20 text-gray-400 font-medium">
                              DESATIVADO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          <span className="text-cyan-400 font-medium">P:</span> {template.data?.question}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          <span className="text-purple-400 font-medium">Opções:</span>{' '}
                          {template.data?.options?.join(' / ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleTemplate(template)}
                          className="p-1.5 rounded-md hover:bg-[#1f2937] text-gray-500 hover:text-purple-400"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setEditing(template); setShowForm(true); }}
                          className="p-1.5 rounded-md hover:bg-[#1f2937] text-gray-500 hover:text-white"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Horários</h2>
            <div className="flex gap-2 mb-3">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="flex-1 bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={handleAddSchedule}
                className="px-3 py-2 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-colors"
              >
                +
              </button>
            </div>

            <div className="space-y-2">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-[#161b22] border border-[#1f2937] rounded-lg">
                  <span className="text-sm text-white font-mono">{s.time}</span>
                  <button
                    onClick={() => handleDeleteSchedule(s.id)}
                    className="text-gray-500 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {schedules.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-3">Nenhum horário</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <EnqueteFormModal
          template={editing}
          channelId={selectedChannelId}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadTemplates(); }}
        />
      )}
    </div>
  );
}

function EnqueteFormModal({
  template,
  channelId,
  onClose,
  onSaved,
}: {
  template: Template | null;
  channelId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [data, setData] = useState<any>(template?.data || {
    question: 'O QUE VOCÊ FARIA COMIGO AGORA? 💦',
    options: [
      'Metia forte sem parar 😈',
      'Comia devagar até eu implorar 💦',
      'Lambia tudo antes de meter 🍑',
    ],
  });

  const handleSave = async () => {
    if (!name || !channelId) {
      toast.error('Preencha o nome e selecione um canal');
      return;
    }
    try {
      if (template) {
        await templateApi.update(template.id, { name, data });
        toast.success('Template atualizado');
      } else {
        await templateApi.create({ channelId, type: 'ENQUETE', name, data });
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
          <h2 className="text-lg font-semibold text-white">{template ? 'Editar' : 'Novo'} Template de Enquete</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome do template *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Enquete Safada, Enquete Quente, etc."
              className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

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
              rows={5}
              className="w-full bg-[#161b22] border border-[#1f2937] rounded-lg px-3 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none resize-y"
              placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Mínimo 2 opções. Separe cada uma em uma linha.
            </p>
          </div>
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
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}