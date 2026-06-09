'use client';

import { useEffect, useState, useRef } from 'react';
import { channelApi } from '@/lib/api';
import { Channel } from '@/types';
import { useChannelStore } from '@/lib/store';

export default function ChannelSelector() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { selectedChannelId, setSelectedChannelId } = useChannelStore();

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChannels = async () => {
    try {
      const response = await channelApi.getAll();
      const enabledChannels = response.data.filter((c: Channel) => c.enabled);
      setChannels(enabledChannels);

      if (!selectedChannelId && enabledChannels.length > 0) {
        setSelectedChannelId(enabledChannels[0].id);
      }
    } catch (error) {
      console.warn('ChannelSelector: failed to load channels, will retry');
      setTimeout(loadChannels, 3000);
    } finally {
      setLoading(false);
    }
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  if (loading) {
    return (
      <div className="h-10 w-56 skeleton rounded-xl" />
    );
  }

  if (channels.length === 0) {
    return (
      <a
        href="/dashboard/settings"
        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl text-[var(--text-muted)] hover:text-amber-400 hover:border-amber-500/30 transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
        Adicionar Canal
      </a>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-hover)] transition-all min-w-[220px]"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-violet-500/20">
          {selectedChannel?.name.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm text-[var(--text-primary)] font-medium truncate max-w-[140px]">
            {selectedChannel?.name || 'Selecionar Canal'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {channels.length} canal{channels.length > 1 ? 'is' : ''} disponivel{channels.length > 1 ? 'is' : ''}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl shadow-2xl shadow-black/30 z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-[var(--border-default)]">
            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Canais Ativos</p>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => {
                  setSelectedChannelId(channel.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-violet-500/10 text-violet-400'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                }`}>
                  {channel.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{channel.name}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{channel.chatId}</p>
                </div>
                {selectedChannelId === channel.id && (
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[var(--border-default)]">
            <a href="/dashboard/settings" className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-violet-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gerenciar Canais
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
