'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useChatStore, ChatChannel, ChatMessage as ChatMessageType } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatWindowProps {
  onBack: () => void;
}

export default function ChatWindow({ onBack }: ChatWindowProps) {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const messages = useChatStore((s) => s.messages);
  const channels = useChatStore((s) => s.channels);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const setReplyToMessage = useChatStore((s) => s.setReplyToMessage);
  const deleteMessageSocket = useChatStore((s) => s.deleteMessage);
  const reactToMessage = useChatStore((s) => s.reactToMessage);
  const pinMessageSocket = useChatStore((s) => s.pinMessage);
  const unpinMessageSocket = useChatStore((s) => s.unpinMessage);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const channelReadAts = useChatStore((s) => s.channelReadAts);
  const setChatWindowOpen = useChatStore((s) => s.setChatWindowOpen);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setChatWindowOpen(true);
    return () => setChatWindowOpen(false);
  }, [setChatWindowOpen]);

  // Scroll to bottom when keyboard appears (iOS visual viewport resize)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      // Small timeout lets the container resize first
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIdx, setMatchIdx] = useState(0);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
  const pendingScrollIdRef = useRef<number | null>(null);
  const scrollFetchAttemptsRef = useRef(0);
  const MAX_SCROLL_FETCHES = 20; // 20 × 50 = 1000 сообщений максимум

  const doHighlightScroll = useCallback((id: number) => {
    const container = messagesContainerRef.current;
    const el = container?.querySelector(`[data-msgid="${id}"]`);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMsgId(id);
    setTimeout(() => setHighlightedMsgId(null), 1700);
    return true;
  }, []);

  const scrollToMessage = useCallback((id: number) => {
    if (doHighlightScroll(id)) return;
    // Сообщение не загружено — запускаем подгрузку
    pendingScrollIdRef.current = id;
    scrollFetchAttemptsRef.current = 0;
  }, [doHighlightScroll]);

  // После каждой загрузки сообщений — проверяем есть ли ожидаемый элемент в DOM
  useEffect(() => {
    const id = pendingScrollIdRef.current;
    if (id === null || isLoadingMessages) return;

    if (doHighlightScroll(id)) {
      pendingScrollIdRef.current = null;
      scrollFetchAttemptsRef.current = 0;
      return;
    }

    // Ещё не нашли — грузим следующую пачку
    if (!hasMoreMessages || scrollFetchAttemptsRef.current >= MAX_SCROLL_FETCHES || !activeChannelId) {
      pendingScrollIdRef.current = null;
      scrollFetchAttemptsRef.current = 0;
      return;
    }

    const firstMsgId = messages[0]?.id;
    if (!firstMsgId) { pendingScrollIdRef.current = null; return; }

    scrollFetchAttemptsRef.current++;
    // Сохраняем scrollHeight чтобы не прыгать при prepend
    const container = messagesContainerRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    fetchMessages(activeChannelId, firstMsgId).then(() => {
      // Восстанавливаем позицию только если ещё не нашли (иначе doHighlightScroll сделает своё)
      if (pendingScrollIdRef.current !== null && container) {
        container.scrollTop = container.scrollHeight - prevHeight;
      }
    });
  }, [messages, isLoadingMessages, hasMoreMessages, activeChannelId, fetchMessages, doHighlightScroll]);

  // При смене канала сбрасываем ожидающий скролл
  useEffect(() => {
    pendingScrollIdRef.current = null;
    scrollFetchAttemptsRef.current = 0;
  }, [activeChannelId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef(0);
  const initialLoadRef = useRef(false);
  const isInitialLoadingRef = useRef(false);

  const activeChannel = channels.find((ch) => ch.id === activeChannelId);
  const channelTyping = activeChannelId ? typingUsers[activeChannelId] || [] : [];

  const currentMember = useMemo(
    () => activeChannel?.members?.find((m) => m.id === user?.id),
    [activeChannel, user?.id],
  );
  const isCurrentUserMuted = currentMember?.isMuted ?? false;
  const isCurrentUserAdmin = currentMember?.role === 'admin';

  // Self-chat detection
  const isSelf =
    activeChannel?.channelType === 'direct' &&
    (activeChannel.members?.every((m) => m.id === user?.id) ?? false);

  // Partner info for direct chats
  const partner =
    !isSelf && activeChannel?.channelType === 'direct'
      ? activeChannel.members?.find((m) => m.id !== user?.id)
      : null;

  const isPartnerOnline = partner ? onlineUsers.has(partner.id) : false;

  const channelDisplayName = isSelf
    ? 'Избранное'
    : activeChannel?.channelType === 'group'
    ? activeChannel.channelName || 'Группа'
    : partner?.name || partner?.email || activeChannel?.channelName || '';

  // Compute search matches
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return messages
      .map((m, idx) => ({ msg: m, idx }))
      .filter(({ msg }) => msg.text?.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  // Reset match index when query changes
  useEffect(() => { setMatchIdx(0); }, [searchQuery]);

  // Scroll to active match
  useEffect(() => {
    if (searchMatches.length === 0) return;
    const target = searchMatches[matchIdx];
    if (!target) return;
    const el = document.querySelector(`[data-msgid="${target.msg.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [matchIdx, searchMatches]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
    else setSearchQuery('');
  }, [showSearch]);

  // Ctrl+F to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const stepMatch = (dir: 1 | -1) => {
    if (searchMatches.length === 0) return;
    setMatchIdx((i) => (i + dir + searchMatches.length) % searchMatches.length);
  };

  // Mark initial load when channel changes
  useEffect(() => {
    if (activeChannelId) {
      initialLoadRef.current = true;
      isInitialLoadingRef.current = true;
      prevMessagesLenRef.current = 0;
    }
  }, [activeChannelId]);

  // Auto-scroll: instant on initial load, smooth on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      isInitialLoadingRef.current = false;
      prevMessagesLenRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView();
      return;
    }

    const isNewMessage = messages.length > prevMessagesLenRef.current;
    prevMessagesLenRef.current = messages.length;
    if (isNewMessage) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages.length]);

  // Load more on scroll up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMessages || !hasMoreMessages || !activeChannelId) return;
    if (container.scrollTop < 200 && messages.length > 0) {
      const oldScrollHeight = container.scrollHeight;
      fetchMessages(activeChannelId, messages[0]?.id).then(() => {
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - oldScrollHeight;
          }
        });
      });
    }
  }, [isLoadingMessages, hasMoreMessages, activeChannelId, messages, fetchMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Determine if an own message has been read by the partner
  const isMessageRead = useCallback(
    (msg: ChatMessageType): boolean => {
      if (!activeChannelId || msg.senderId !== user?.id) return false;
      const reads = channelReadAts[activeChannelId] || {};
      return Object.entries(reads).some(
        ([uid, readAt]) =>
          Number(uid) !== user?.id && new Date(readAt) >= new Date(msg.createdAt)
      );
    },
    [activeChannelId, channelReadAts, user?.id]
  );

  const getMessageReaders = useCallback(
    (msg: ChatMessageType): { id: number; name: string; avatarUrl?: string }[] => {
      if (!activeChannelId || msg.senderId !== user?.id) return [];
      const reads = channelReadAts[activeChannelId] || {};
      const members = activeChannel?.members || [];
      return Object.entries(reads)
        .filter(([uid, readAt]) => Number(uid) !== user?.id && new Date(readAt) >= new Date(msg.createdAt))
        .map(([uid]) => {
          const m = members.find((m) => m.id === Number(uid));
          return m ? { id: m.id, name: m.name || m.email || 'Пользователь', avatarUrl: m.avatarUrl } : null;
        })
        .filter(Boolean) as { id: number; name: string; avatarUrl?: string }[];
    },
    [activeChannelId, channelReadAts, user?.id, activeChannel?.members]
  );

  // Delete message + its files
  const handleDeleteMessage = useCallback(async (msg: ChatMessageType) => {
    // Delete uploaded files first
    if (msg.attachments && msg.attachments.length > 0) {
      await Promise.allSettled(
        msg.attachments.map((att) => {
          const filename = att.fileUrl.split('/').pop();
          if (!filename) return Promise.resolve();
          return api.delete(`/chat-channels/upload/${filename}`).catch(() => {});
        })
      );
    }
    deleteMessageSocket(msg.id);
  }, [deleteMessageSocket]);

  // Pinned messages
  const canPin = activeChannel?.channelType === 'direct' || isCurrentUserAdmin;
  const pinnedMessages = activeChannel?.pinnedMessages ?? [];
  const [pinnedIndex, setPinnedIndex] = useState(0);

  // При смене канала или изменении списка — показываем последнее закреплённое
  useEffect(() => {
    setPinnedIndex(pinnedMessages.length > 0 ? pinnedMessages.length - 1 : 0);
  }, [activeChannelId, pinnedMessages.length]);

  const currentPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedIndex] : null;

  const handlePin = useCallback((msg: ChatMessageType) => {
    if (!activeChannelId) return;
    const alreadyPinned = pinnedMessages.some((p) => p.id === msg.id);
    if (alreadyPinned) {
      unpinMessageSocket(activeChannelId, msg.id);
    } else {
      pinMessageSocket(activeChannelId, msg.id, msg.text, msg.senderName);
    }
  }, [activeChannelId, pinnedMessages, pinMessageSocket, unpinMessageSocket]);

  const handleBannerClick = useCallback(() => {
    if (!currentPinned) return;
    const el = messagesContainerRef.current?.querySelector(`[data-msgid="${currentPinned.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Перелистываем к предыдущему (как в ТГ)
    if (pinnedMessages.length > 1) {
      setPinnedIndex((i) => (i - 1 + pinnedMessages.length) % pinnedMessages.length);
    }
  }, [currentPinned, pinnedMessages]);

  // No active channel
  if (!activeChannelId || !activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg
            className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-gray-400 dark:text-gray-500 text-lg">Выберите чат для начала общения</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* Main chat column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          {/* Back button (mobile) */}
          <button
            onClick={onBack}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Avatar */}
          <div className="relative shrink-0">
            {(() => {
              const avatarSrc = activeChannel.channelType === 'direct'
                ? (partner?.avatarUrl ?? activeChannel.avatarUrl)
                : activeChannel.avatarUrl;
              return (
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden relative ${
                isSelf
                  ? 'bg-amber-400'
                  : activeChannel.channelType === 'group'
                  ? 'bg-violet-500'
                  : 'bg-sky-500'
              }`}
            >
              {isSelf ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : (
                getInitials(channelDisplayName)
              )}
              {avatarSrc && (
                <img
                  src={avatarSrc}
                  alt=""
                  className="absolute inset-0 w-full h-full rounded-full object-cover z-10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </div>
              );
            })()}
            {!isSelf && activeChannel.channelType === 'direct' && isPartnerOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
            )}
          </div>

          {/* Channel info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {channelDisplayName}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {isSelf
                ? 'Личное пространство'
                : activeChannel.channelType === 'group'
                ? `${activeChannel.membersCount} участник${pluralize(activeChannel.membersCount)}`
                : isPartnerOnline
                ? 'В сети'
                : partner?.email
                ? partner.email
                : 'Не в сети'}
            </p>
          </div>

          {/* Search toggle */}
          <button
            onClick={() => { setShowSearch((v) => !v); setShowInfo(false); }}
            className={`p-2 rounded-lg transition-colors ${
              showSearch
                ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Поиск по сообщениям (Ctrl+F)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Info / settings toggle */}
          <button
            onClick={() => { setShowInfo((v) => !v); setShowSearch(false); }}
            className={`p-2 rounded-lg transition-colors ${
              showInfo
                ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Информация"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') stepMatch(e.shiftKey ? -1 : 1);
                if (e.key === 'Escape') setShowSearch(false);
              }}
              placeholder="Поиск в переписке…"
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
            />
            {searchQuery.trim().length >= 2 && (
              <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                {searchMatches.length > 0 ? `${matchIdx + 1} / ${searchMatches.length}` : '0 результатов'}
              </span>
            )}
            <button
              onClick={() => stepMatch(-1)}
              disabled={searchMatches.length === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
              title="Предыдущее"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => stepMatch(1)}
              disabled={searchMatches.length === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
              title="Следующее"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => setShowSearch(false)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Pinned message banner */}
        {currentPinned && (
          <div
            className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors shrink-0"
            onClick={handleBannerClick}
          >
            {/* Полоска-индикатор слева */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              {pinnedMessages.length > 1
                ? pinnedMessages.map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all ${
                        i === pinnedIndex
                          ? 'w-1 h-3 bg-violet-500'
                          : 'w-1 h-1 bg-violet-300 dark:bg-violet-700'
                      }`}
                    />
                  ))
                : <div className="w-1 h-5 bg-violet-500 rounded-full" />}
            </div>

            {/* Текст */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-violet-500 leading-none mb-0.5">
                {pinnedMessages.length > 1
                  ? `Закреплённое сообщение · ${pinnedIndex + 1}/${pinnedMessages.length}`
                  : 'Закреплённое сообщение'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                {currentPinned.text || '📎 Вложение'}
              </p>
            </div>

            {/* Открепить */}
            {canPin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeChannelId && currentPinned) unpinMessageSocket(activeChannelId, currentPinned.id);
                }}
                className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
                title="Открепить"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50 dark:bg-gray-900"
        >
          {/* Initial loading — full area spinner */}
          {isLoadingMessages && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Lazy loading — top spinner when loading older messages */}
          {isLoadingMessages && messages.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400 dark:text-gray-500">
              <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              {pendingScrollIdRef.current !== null ? 'Ищем сообщение…' : 'Загружаем более старые сообщения…'}
            </div>
          )}

          {/* No more messages indicator */}
          {!hasMoreMessages && messages.length > 0 && (
            <div className="flex justify-center py-2">
              <span className="text-xs text-gray-300 dark:text-gray-600">Начало переписки</span>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isOwn = msg.senderId === user?.id;
            const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
            const read = isOwn ? isMessageRead(msg) : false;
            const readers = isOwn ? getMessageReaders(msg) : [];
            const activeMatch = searchMatches.length > 0 && searchMatches[matchIdx]?.msg.id === msg.id;
            const isMatchedMsg = showSearch && searchQuery.trim().length >= 2 && searchMatches.some((m) => m.msg.id === msg.id);
            const isMsgPinned = pinnedMessages.some((p) => p.id === msg.id);

            const isReplyHighlighted = highlightedMsgId === msg.id;
            return (
              <div
                key={msg.id}
                data-msgid={msg.id}
                className={[
                  activeMatch ? 'rounded-xl ring-2 ring-violet-400 dark:ring-violet-500 ring-offset-2 dark:ring-offset-gray-900' : '',
                  isReplyHighlighted ? 'chat-reply-highlight' : '',
                ].filter(Boolean).join(' ')}
              >
                <ChatMessage
                  message={msg}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  isRead={read}
                  readers={readers}
                  onReply={() => setReplyToMessage(msg)}
                  onScrollToReply={msg.replyToMessage?.id ? () => scrollToMessage(msg.replyToMessage!.id) : undefined}
                  onReact={reactToMessage}
                  onDelete={handleDeleteMessage}
                  onPin={canPin ? handlePin : undefined}
                  isPinned={isMsgPinned}
                  canPin={canPin}
                  highlightQuery={isMatchedMsg ? searchQuery.trim() : undefined}
                />
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {channelTyping.length > 0 && (
          <div className="px-4 py-1 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <span className="inline-flex items-center gap-1">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              {channelTyping.length === 1
                ? `${channelTyping[0]} печатает...`
                : `${channelTyping.join(', ')} печатают...`}
            </span>
          </div>
        )}

        {/* Input */}
        {isCurrentUserMuted ? (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="text-sm text-red-500 dark:text-red-400">Администратор ограничил возможность отправки сообщений</span>
            </div>
          </div>
        ) : (
          <ChatInput channelId={activeChannelId} projectId={activeChannel.projectId ?? undefined} />
        )}
      </div>

      {/* Info panel — desktop: right column; mobile: overlay */}
      {showInfo && (
        <>
          {/* Desktop */}
          <div className="hidden lg:flex w-72 shrink-0 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <InfoPanel
              channel={activeChannel}
              partner={partner}
              isSelf={isSelf}
              isPartnerOnline={isPartnerOnline}
              isAdmin={isCurrentUserAdmin}
              currentUserId={user?.id}
              onClose={() => setShowInfo(false)}
            />
          </div>
          {/* Mobile overlay */}
          <div className="absolute inset-0 z-20 bg-white dark:bg-gray-800 overflow-y-auto lg:hidden">
            <InfoPanel
              channel={activeChannel}
              partner={partner}
              isSelf={isSelf}
              isPartnerOnline={isPartnerOnline}
              isAdmin={isCurrentUserAdmin}
              currentUserId={user?.id}
              onClose={() => setShowInfo(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ───────── Info Panel ───────── */

interface InfoPanelProps {
  channel: ChatChannel;
  partner: { id: number; name: string; avatarUrl?: string; email?: string } | null | undefined;
  isSelf: boolean;
  isPartnerOnline: boolean;
  isAdmin: boolean;
  currentUserId?: number;
  onClose: () => void;
}

function InfoPanel({ channel, partner, isSelf, isPartnerOnline, isAdmin, currentUserId, onClose }: InfoPanelProps) {
  const [userDetails, setUserDetails] = useState<any>(null);
  const [members, setMembers] = useState(channel.members ?? []);
  const [mutingId, setMutingId] = useState<number | null>(null);
  const updateChannels = useChatStore((s) => s.fetchChannels);

  useEffect(() => {
    setMembers(channel.members ?? []);
  }, [channel.members]);

  useEffect(() => {
    if (!isSelf && channel.channelType === 'direct' && partner?.id) {
      api.get(`/users/${partner.id}`).then(({ data }) => setUserDetails(data)).catch(() => {});
    }
  }, [isSelf, channel.channelType, partner?.id]);

  const handleToggleMute = async (memberId: number, currentlyMuted: boolean) => {
    setMutingId(memberId);
    try {
      await api.patch(`/chat-channels/${channel.id}/members/${memberId}`, { isMuted: !currentlyMuted });
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, isMuted: !currentlyMuted } : m)),
      );
      // Refresh channels so the muted user's view updates on next fetch
      updateChannels(1);
    } catch {
      // ignore
    } finally {
      setMutingId(null);
    }
  };

  const details = userDetails;

  return (
    <div className="flex flex-col h-full">
      {/* Info header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {channel.channelType === 'group' ? 'О группе' : 'О пользователе'}
        </span>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-2 py-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold relative overflow-hidden ${
              isSelf
                ? 'bg-amber-400'
                : channel.channelType === 'group'
                ? 'bg-violet-500'
                : 'bg-sky-500'
            }`}
          >
            {isSelf ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ) : (
              getInitials(partner?.name || channel.channelName)
            )}
            {(channel.avatarUrl || (!isSelf && channel.channelType === 'direct' && partner?.avatarUrl)) && (
              <img
                src={channel.avatarUrl || partner?.avatarUrl}
                alt=""
                className="absolute inset-0 w-full h-full rounded-full object-cover z-10"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>

          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-gray-100">
              {isSelf ? 'Избранное' : partner?.name || channel.channelName}
            </p>
            {!isSelf && channel.channelType === 'direct' && (
              <span
                className={`inline-flex items-center gap-1 mt-1 text-xs ${
                  isPartnerOnline ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                {isPartnerOnline ? 'В сети' : 'Не в сети'}
              </span>
            )}
            {isSelf && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Личное пространство
              </p>
            )}
          </div>
        </div>

        {/* User details (direct chat) */}
        {!isSelf && channel.channelType === 'direct' && (
          <div className="space-y-3">
            <InfoRow icon="email" label="Email" value={details?.email || partner?.email} />
            <InfoRow icon="phone" label="Телефон" value={details?.phone} />
            <InfoRow icon="role" label="Роль" value={details?.role?.name} />
            <InfoRow icon="position" label="Должность" value={details?.position} />
            <InfoRow icon="team" label="Команда" value={details?.team?.name} />
            <InfoRow
              icon="calendar"
              label="В компании с"
              value={details?.hireDate ? new Date(details.hireDate).toLocaleDateString('ru-RU') : undefined}
            />
          </div>
        )}

        {/* Members (group) */}
        {channel.channelType === 'group' && members.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Участники ({channel.membersCount})
            </p>
            <div className="space-y-2">
              {members.map((m) => {
                const isSelf = m.id === currentUserId;
                const isDeleted = !m.name || /^deleted_\d+_\d+@crm\.deleted$/.test(m.email ?? '');
                const displayName = isDeleted ? 'Удалённый пользователь' : m.name;
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden relative ${isDeleted ? 'bg-gray-400 dark:bg-gray-600' : 'bg-sky-500'}`}>
                      {isDeleted ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      ) : (
                        getInitials(m.name)
                      )}
                      {!isDeleted && m.avatarUrl && (
                        <img
                          src={m.avatarUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full rounded-full object-cover z-10"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isDeleted ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-800 dark:text-gray-100'}`}>
                        {displayName}
                        {!isDeleted && m.role === 'admin' && (
                          <span className="ml-1 text-xs text-violet-500 font-medium not-italic">admin</span>
                        )}
                      </p>
                      {!isDeleted && m.isMuted && (
                        <p className="text-xs text-red-400">Ограничен</p>
                      )}
                    </div>
                    {isAdmin && !isSelf && !isDeleted && (
                      <button
                        onClick={() => handleToggleMute(m.id, m.isMuted ?? false)}
                        disabled={mutingId === m.id}
                        title={m.isMuted ? 'Снять ограничение' : 'Ограничить отправку'}
                        className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                          m.isMuted
                            ? 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-400'
                        }`}
                      >
                        {mutingId === m.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        ) : m.isMuted ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 18.364V5.636m0 0L8.464 9.172M12 5.636l3.536 3.536" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Info Row ───────── */

const INFO_ICONS: Record<string, React.ReactNode> = {
  email: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  phone: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  role: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  position: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  team: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <div className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0">
        {INFO_ICONS[icon]}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm text-gray-800 dark:text-gray-100 break-words">{value}</p>
      </div>
    </div>
  );
}

/* ───────── Helpers ───────── */

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function pluralize(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return '';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'а';
  return 'ов';
}
