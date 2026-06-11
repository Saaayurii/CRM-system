'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useChatStore, ChatChannel, ChatMessage } from '@/stores/chatStore';
import { useMiniChatStore } from '@/stores/miniChatStore';
import { useAuthStore } from '@/stores/authStore';
import { previewMessageText } from '@/lib/chat/messagePreview';
import {
  isSelfChat,
  getChannelDisplayName,
  getDirectChannelAvatarUrl,
  isDirectChannelOnline,
  getInitials,
  formatChannelTime,
} from '@/lib/chat/channelDisplay';
import { useT } from '@/lib/i18n';

// Габариты виджета — используются для клампа позиции в пределах экрана
const EXPANDED_W = 380;
const EXPANDED_H = 560;
const MINIMIZED_W = 300;
const HEADER_H = 48;
const MARGIN = 8;

/**
 * Плавающий мини-чат (как мессенджер ВК): список чатов с поиском, окно
 * переписки, перетаскивание за шапку, свернуть/развернуть. Монтируется в
 * layout дашборда, поэтому не закрывается при навигации между страницами.
 * На полной странице чата (/dashboard/chat) скрывается.
 */
export default function MiniChatWidget() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isOpen = useMiniChatStore((s) => s.isOpen);
  const isMinimized = useMiniChatStore((s) => s.isMinimized);
  const position = useMiniChatStore((s) => s.position);
  const close = useMiniChatStore((s) => s.close);
  const toggleMinimized = useMiniChatStore((s) => s.toggleMinimized);
  const setPosition = useMiniChatStore((s) => s.setPosition);

  const acquireConnection = useChatStore((s) => s.acquireConnection);
  const releaseConnection = useChatStore((s) => s.releaseConnection);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const channels = useChatStore((s) => s.channels);
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const user = useAuthStore((s) => s.user);

  const onFullChatPage = pathname.startsWith('/dashboard/chat');
  const visible = mounted && isOpen && !onFullChatPage;

  // Сокет + список каналов, пока виджет видим
  useEffect(() => {
    if (!visible) return;
    acquireConnection();
    fetchChannels(1);
    return () => releaseConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Перетаскивание за шапку ──────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);

  const clampPos = useCallback((x: number, y: number, w: number, h: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      x: Math.min(Math.max(x, MARGIN), Math.max(MARGIN, vw - w - MARGIN)),
      y: Math.min(Math.max(y, MARGIN), Math.max(MARGIN, vh - h - MARGIN)),
    };
  }, []);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    // Кнопки в шапке не должны начинать перетаскивание
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    const onMove = (ev: PointerEvent) => {
      setPosition(clampPos(
        start.left + ev.clientX - start.x,
        start.top + ev.clientY - start.y,
        rect.width,
        rect.height,
      ));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!visible) return null;

  const width = isMinimized ? MINIMIZED_W : EXPANDED_W;
  const height = isMinimized ? HEADER_H : Math.min(EXPANDED_H, window.innerHeight - MARGIN * 2);

  const style: React.CSSProperties = { width };
  if (!isMinimized) style.height = height;
  if (position) {
    const p = clampPos(position.x, position.y, width, height);
    style.left = p.x;
    style.top = p.y;
  } else {
    style.right = 24;
    style.bottom = 96;
  }

  const activeChannel = activeChannelId != null
    ? channels.find((c) => c.id === activeChannelId) ?? null
    : null;
  const inChatView = activeChannelId != null;
  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

  const headerTitle = inChatView
    ? (activeChannel
        ? (isSelfChat(activeChannel, user?.id) ? 'Избранное' : getChannelDisplayName(activeChannel, user?.id))
        : t('Чат'))
    : t('Чат');
  const headerOnline = activeChannel
    && !isSelfChat(activeChannel, user?.id)
    && isDirectChannelOnline(activeChannel, user?.id, onlineUsers);

  const openFullChat = () => {
    router.push(activeChannelId ? `/dashboard/chat?channelId=${activeChannelId}` : '/dashboard/chat');
  };

  return (
    <div
      ref={rootRef}
      className="fixed z-40 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={style}
    >
      {/* Шапка — drag handle */}
      <div
        onPointerDown={onHeaderPointerDown}
        className="flex items-center gap-2 px-3 h-12 shrink-0 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 cursor-move select-none touch-none"
      >
        {inChatView && !isMinimized && (
          <button
            onClick={() => setActiveChannel(null)}
            className="p-1 -ml-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
            title={t('К списку чатов')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {inChatView && activeChannel && !isMinimized ? (
            <>
              <MiniAvatar channel={activeChannel} currentUserId={user?.id} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">{headerTitle}</p>
                {headerOnline && <p className="text-[10px] text-green-500 leading-tight">онлайн</p>}
              </div>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                {isMinimized ? headerTitle : t('Чат')}
              </p>
              {totalUnread > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-violet-500 rounded-full shrink-0">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </>
          )}
        </div>

        {/* Кнопки управления */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={openFullChat}
            className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t('Открыть в полном чате')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
          <button
            onClick={toggleMinimized}
            className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isMinimized ? t('Развернуть') : t('Свернуть')}
          >
            {isMinimized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
          <button
            onClick={close}
            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t('Закрыть')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Тело */}
      {!isMinimized && (
        inChatView
          ? <MiniChatView />
          : <MiniChannelList />
      )}
    </div>
  );
}

/* ───────── Аватар канала ───────── */

function MiniAvatar({ channel, currentUserId, size = 'md' }: { channel: ChatChannel; currentUserId?: number; size?: 'sm' | 'md' }) {
  const isSelf = isSelfChat(channel, currentUserId);
  const displayName = isSelf ? 'Избранное' : getChannelDisplayName(channel, currentUserId);
  const avatarUrl = channel.avatarUrl ?? getDirectChannelAvatarUrl(channel, currentUserId);
  const cls = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center text-white font-semibold overflow-hidden relative shrink-0 ${
        isSelf ? 'bg-amber-400' : channel.channelType === 'group' ? 'bg-violet-500' : 'bg-sky-500'
      }`}
    >
      {isSelf ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ) : (
        getInitials(displayName)
      )}
      {avatarUrl && (
        <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full rounded-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}
    </div>
  );
}

/* ───────── Список чатов ───────── */

function MiniChannelList() {
  const t = useT();
  const channels = useChatStore((s) => s.channels);
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const isLoadingChannels = useChatStore((s) => s.isLoadingChannels);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const channelsPage = useChatStore((s) => s.channelsPage);
  const hasMoreChannels = useChatStore((s) => s.hasMoreChannels);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Подгрузка следующей страницы каналов при прокрутке вниз
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoadingChannels || !hasMoreChannels) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      fetchChannels(channelsPage + 1);
    }
  }, [isLoadingChannels, hasMoreChannels, fetchChannels, channelsPage]);

  const filtered = (() => {
    const bySearch = search.trim()
      ? channels.filter((ch) => {
          const name = isSelfChat(ch, user?.id) ? 'Избранное' : getChannelDisplayName(ch, user?.id);
          return name.toLowerCase().includes(search.toLowerCase());
        })
      : channels;
    const selfChat = bySearch.find((ch) => isSelfChat(ch, user?.id));
    const others = bySearch.filter((ch) => !isSelfChat(ch, user?.id));
    const pinned = others.filter((ch) => ch.isPinned);
    const unpinned = others.filter((ch) => !ch.isPinned);
    return selfChat ? [selfChat, ...pinned, ...unpinned] : [...pinned, ...unpinned];
  })();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Поиск */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Поиск...')}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Список */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 && !isLoadingChannels && (
          <div className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">
            {search ? 'Ничего не найдено' : 'Нет чатов'}
          </div>
        )}
        {filtered.map((channel) => {
          const isSelf = isSelfChat(channel, user?.id);
          const displayName = isSelf ? 'Избранное' : getChannelDisplayName(channel, user?.id);
          const unread = unreadCounts[channel.id] || 0;
          const isOnline = !isSelf && isDirectChannelOnline(channel, user?.id, onlineUsers);

          return (
            <div
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors select-none"
            >
              <div className="relative shrink-0">
                <MiniAvatar channel={channel} currentUserId={user?.id} />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium truncate ${isSelf ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>
                    {displayName}
                  </span>
                  {channel.lastMessage && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                      {formatChannelTime(channel.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {channel.lastMessage ? previewMessageText(channel.lastMessage.text) || 'Вложение' : 'Нет сообщений'}
                  </p>
                  {unread > 0 && (
                    <span className={`ml-2 shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full ${channel.isMutedForMe ? 'bg-gray-400' : 'bg-violet-500'}`}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isLoadingChannels && (
          <div className="p-3 flex justify-center">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Окно переписки ───────── */

function MiniChatView() {
  const t = useT();
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const messages = useChatStore((s) => s.messages);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const startTyping = useChatStore((s) => s.startTyping);
  const stopTyping = useChatStore((s) => s.stopTyping);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const channels = useChatStore((s) => s.channels);
  const user = useAuthStore((s) => s.user);

  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const channel = channels.find((c) => c.id === activeChannelId) ?? null;
  const isGroup = channel?.channelType === 'group';

  // Автоскролл вниз при новом сообщении / смене канала (но не при подгрузке истории)
  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastMsgId, activeChannelId]);

  useEffect(() => { inputRef.current?.focus(); }, [activeChannelId]);

  // Подгрузка истории при прокрутке вверх с сохранением позиции
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || el.scrollTop > 40 || isLoadingMessages || !hasMoreMessages || !activeChannelId || messages.length === 0) return;
    const prevHeight = el.scrollHeight;
    fetchMessages(activeChannelId, messages[0].id).then(() => {
      requestAnimationFrame(() => {
        const node = listRef.current;
        if (node) node.scrollTop = node.scrollHeight - prevHeight;
      });
    });
  }, [isLoadingMessages, hasMoreMessages, activeChannelId, messages, fetchMessages]);

  const send = () => {
    const value = text.trim();
    if (!value || !activeChannelId) return;
    sendMessage(activeChannelId, value);
    setText('');
    stopTyping(activeChannelId);
  };

  const typing = (typingUsers[activeChannelId ?? -1] || []).filter((u) => u.userId !== user?.id);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50 dark:bg-gray-900/40">
      {/* Сообщения */}
      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 flex flex-col gap-1">
        {isLoadingMessages && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!isLoadingMessages && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            Нет сообщений
          </div>
        )}
        {messages.map((msg, i) => (
          <MiniMessageBubble
            key={msg.id}
            message={msg}
            isMine={msg.senderId === user?.id}
            showSender={isGroup && msg.senderId !== user?.id && messages[i - 1]?.senderId !== msg.senderId}
          />
        ))}
        {typing.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 px-1 py-0.5">
            {typing.map((u) => u.name).join(', ')} печатает…
          </p>
        )}
      </div>

      {/* Ввод */}
      <div className="flex items-center gap-2 p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (activeChannelId && e.target.value) startTyping(activeChannelId);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t('Сообщение...')}
          className="flex-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-full text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="w-8 h-8 shrink-0 rounded-full bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
          title={t('Отправить')}
        >
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ───────── Пузырь сообщения ───────── */

// Вложения с бэка могут содержать служебные записи (forward_meta, task_card) с полем type
type RawAttachment = ChatMessage['attachments'][number] & { type?: string; title?: string };

function MiniMessageBubble({ message, isMine, showSender }: { message: ChatMessage; isMine: boolean; showSender: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  // task_card хранит текст в снапшоте вложения
  const displayText = (() => {
    if (message.messageType === 'task_card') {
      const card = (message.attachments as RawAttachment[]).find((a) => a.type === 'task_card');
      return card?.title ? `📋 Задача: ${card.title}` : '📋 Задача';
    }
    return previewMessageText(message.text);
  })();

  const fileAttachments = (message.attachments as RawAttachment[]).filter((a) => a.fileUrl && !a.type);
  const images = fileAttachments.filter((a) => a.mimeType?.startsWith('image/'));
  const files = fileAttachments.filter((a) => !a.mimeType?.startsWith('image/'));

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm break-words ${
          isMine
            ? 'bg-violet-500 text-white rounded-br-md'
            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-md shadow-sm'
        }`}
      >
        {showSender && (
          <p className="text-[11px] font-semibold text-violet-500 dark:text-violet-300 mb-0.5">{message.senderName}</p>
        )}
        {message.forwardMeta && (
          <p className={`text-[11px] mb-0.5 ${isMine ? 'text-violet-100' : 'text-gray-400 dark:text-gray-400'}`}>
            ↪ Переслано от {message.forwardMeta.originalSenderName}
          </p>
        )}
        {message.replyToMessage && (
          <div className={`text-[11px] border-l-2 pl-2 mb-1 ${isMine ? 'border-violet-200 text-violet-100' : 'border-violet-400 text-gray-500 dark:text-gray-300'}`}>
            <span className="font-semibold">{message.replyToMessage.senderName}</span>
            <p className="truncate">{previewMessageText(message.replyToMessage.text)}</p>
          </div>
        )}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {images.map((img) => (
              <a key={img.id ?? img.fileUrl} href={img.fileUrl} target="_blank" rel="noopener noreferrer">
                <img src={img.fileUrl} alt={img.fileName} className="max-w-[180px] max-h-[140px] rounded-lg object-cover" />
              </a>
            ))}
          </div>
        )}
        {files.map((f) => (
          <a
            key={f.id ?? f.fileUrl}
            href={f.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-xs underline mb-0.5 ${isMine ? 'text-violet-100' : 'text-violet-500 dark:text-violet-300'}`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="truncate max-w-[180px]">{f.fileName}</span>
          </a>
        ))}
        {displayText && <span className="whitespace-pre-wrap">{displayText}</span>}
        <span className={`text-[10px] ml-1.5 align-bottom ${isMine ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
          {time}{message.isEdited ? ' · ред.' : ''}
        </span>
      </div>
    </div>
  );
}
