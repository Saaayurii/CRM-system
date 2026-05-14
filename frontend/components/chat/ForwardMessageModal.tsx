'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useChatStore, ChatMessage, ChatChannel } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

interface ForwardMessageModalProps {
  message: ChatMessage;
  onClose: () => void;
}

function getChannelDisplay(ch: ChatChannel, currentUserId?: number) {
  if (ch.channelType === 'direct') {
    const partner = ch.members?.find((m) => m.id !== currentUserId);
    const isSelf = ch.members?.every((m) => m.id === currentUserId);
    if (isSelf) return { name: 'Избранное', isSelf: true };
    return { name: partner?.name || partner?.email || ch.channelName || 'Личный чат', isSelf: false };
  }
  return { name: ch.channelName || 'Группа', isSelf: false };
}

function ChannelAvatar({ ch, currentUserId }: { ch: ChatChannel; currentUserId?: number }) {
  const display = getChannelDisplay(ch, currentUserId);
  const initials = display.name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  if (display.isSelf) {
    return (
      <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </div>
    );
  }

  if (ch.channelType === 'group') {
    const avatarSrc = ch.avatarUrl;
    return (
      <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-semibold relative overflow-hidden shrink-0">
        {initials}
        {avatarSrc && (
          <img src={avatarSrc} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
      </div>
    );
  }

  // Direct
  const partner = ch.members?.find((m) => m.id !== currentUserId);
  return (
    <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-semibold relative overflow-hidden shrink-0">
      {initials}
      {partner?.avatarUrl && (
        <img src={partner.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}
    </div>
  );
}

export default function ForwardMessageModal({ message, onClose }: ForwardMessageModalProps) {
  const storeChannels = useChatStore((s) => s.channels);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const authUser = useAuthStore((s) => s.user);
  const currentUserId = authUser?.id;

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [done, setDone] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load channels: use store if populated, otherwise fetch
  useEffect(() => {
    if (storeChannels.length > 0) {
      setChannels(storeChannels);
    } else {
      api.get('/chat-channels', { params: { limit: 200 } })
        .then((res) => {
          const raw = res.data;
          const list: ChatChannel[] = Array.isArray(raw) ? raw : (raw.channels || raw.data || []);
          setChannels(list);
        })
        .catch(() => setChannels([]));
    }
  }, [storeChannels]);

  // Keep in sync if store updates
  useEffect(() => {
    if (storeChannels.length > 0) setChannels(storeChannels);
  }, [storeChannels.length]);

  // Focus search on open
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((ch) => {
      const display = getChannelDisplay(ch, currentUserId);
      return display.name.toLowerCase().includes(q);
    });
  }, [channels, search, currentUserId]);

  const toggleChannel = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selected.size === 0 || isSending) return;
    setIsSending(true);

    const senderName = message.senderName || 'Пользователь';
    const forwardText = `↩️ Переслано от ${senderName}:\n\n${message.text || ''}`.trim();
    const forwardAttachments = message.attachments?.length > 0 ? message.attachments : undefined;

    const ids = Array.from(selected);
    await Promise.allSettled(
      ids.map((channelId) =>
        new Promise<void>((resolve) => {
          sendMessage(channelId, forwardText, forwardAttachments as any, undefined);
          setTimeout(resolve, 50);
        })
      )
    );

    setIsSending(false);
    setDone(true);
    setTimeout(onClose, 800);
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-end sm:items-center justify-end sm:justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet / Modal */}
      <div
        className="relative z-10 w-full sm:max-w-md bg-white dark:bg-gray-800 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[80dvh] sm:max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 sm:pt-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Переслать сообщение</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message preview */}
        <div className="mx-4 mt-3 mb-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/60 border-l-2 border-violet-500 shrink-0">
          <p className="text-xs font-medium text-violet-500 mb-0.5">{message.senderName || 'Пользователь'}</p>
          {message.text ? (
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{message.text}</p>
          ) : message.attachments?.length > 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {message.attachments[0].fileName}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">Пустое сообщение</p>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-2 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Поиск чата..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Чаты не найдены</p>
            </div>
          ) : (
            filtered.map((ch) => {
              const display = getChannelDisplay(ch, currentUserId);
              const isSelected = selected.has(ch.id);
              return (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                    isSelected
                      ? 'bg-violet-50 dark:bg-violet-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="relative">
                    <ChannelAvatar ch={ch} currentUserId={currentUserId} />
                    {/* Checkmark overlay */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-violet-500 scale-100 opacity-100'
                        : 'bg-gray-200 dark:bg-gray-600 scale-75 opacity-0'
                    }`}>
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-gray-100'}`}>
                      {display.name}
                    </p>
                    {ch.channelType === 'group' && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {ch.membersCount || ch.members?.length || 0} участников
                      </p>
                    )}
                    {ch.lastMessage && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {ch.lastMessage.text}
                      </p>
                    )}
                  </div>
                  {/* Visible checkbox on right for desktop */}
                  <div className={`hidden sm:flex w-5 h-5 rounded-full border-2 items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 rounded-b-2xl">
          {done ? (
            <div className="flex items-center justify-center gap-2 py-2 text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Сообщение переслано!</span>
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={selected.size === 0 || isSending}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                selected.size === 0
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-violet-500 hover:bg-violet-600 text-white active:scale-[0.98]'
              }`}
            >
              {isSending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Пересылаем...
                </span>
              ) : selected.size > 0 ? (
                `Переслать в ${selected.size} ${selected.size === 1 ? 'чат' : selected.size < 5 ? 'чата' : 'чатов'}`
              ) : (
                'Выберите чат'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
