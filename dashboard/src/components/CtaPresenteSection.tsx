'use client';

import { useEffect, useState } from 'react';
import { ctaPresenteScheduleApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface CtaSchedule {
  id: string;
  time: string;
  enabled: boolean;
}

export default function CtaPresenteSection({ channelId, channelName }: { channelId: string; channelName: string }) {
  const [schedules, setSchedules] = useState<CtaSchedule[]>([]);
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    loadData();
  }, [channelId]);

  const loadData = async () => {
    try {
      const schedulesRes = await ctaPresenteScheduleApi.getAll(channelId);
      setSchedules(schedulesRes.data);
    } catch (error) {
      console.error('Error loading CTA schedule data:', error);
    }
  };

  const handleAddSchedule = async () => {
    if (!newTime) { toast.error('Informe um horario'); return; }
    try {
      await ctaPresenteScheduleApi.create(newTime, channelId);
      toast.success('Horario adicionado!');
      setNewTime('');
      loadData();
    } catch (error) {
      toast.error('Erro ao adicionar horario');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await ctaPresenteScheduleApi.delete(id);
      toast.success('Horario excluido!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir horario');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#111827] border border-[#1e293b] rounded-lg p-5">
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-1">Horarios para CTA Presente — {channelName}</h3>
        <p className="text-xs text-[#64748b] mb-3">A IA vai gerar CTAs originais automaticamente nos horarios configurados, usando o prompt definido no canal.</p>
        <div className="flex gap-2 mb-3">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="flex-1 bg-[#0a0e1a] border border-[#1e293b] rounded-lg px-3 py-2.5 text-[#f1f5f9] focus:border-[#3b82f6] focus:outline-none text-sm"
          />
          <button onClick={handleAddSchedule} className="px-4 py-2.5 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] transition-colors">Adicionar</button>
        </div>
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-[#0a0e1a] border border-[#1e293b] rounded-lg">
              <span className="text-[#f1f5f9] text-sm font-medium">{s.time}</span>
              <button onClick={() => handleDeleteSchedule(s.id)} className="text-[#64748b] hover:text-red-400 text-xs font-medium transition-colors">Excluir</button>
            </div>
          ))}
          {schedules.length === 0 && <p className="text-[#64748b] text-xs text-center py-2">Nenhum horario configurado</p>}
        </div>
      </div>
    </div>
  );
}
