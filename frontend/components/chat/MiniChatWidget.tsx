'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useChatStore, ChatChannel, ChatMessage as ChatMessageType } from '@/stores/chatStore';
import { useMiniChatStore } from '@/stores/miniChatStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { getChatBackground } from '@/lib/appearance';
import { useBubbleGradientFlow } from '@/hooks/useBubbleGradientFlow';
import { previewMessageText } from '@/lib/chat/messagePreview';
import {
  isSelfChat,
  getChannelDisplayName,
  getDirectChannelAvatarUrl,
  isDirectChannelOnline,
  getInitials,
  formatChannelTime,
  formatLastSeen,
} from '@/lib/chat/channelDisplay';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import VoicePlayerBar from './VoicePlayerBar';
import ForwardMessageModal from './ForwardMessageModal';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

// Габариты виджета — используются для клампа позиции в пределах экрана
const EXPANDED_W = 400;
const EXPANDED_H = 600;
const MINIMIZED_W = 300;
const HEADER_H = 48;
const MARGIN = 8;

/**
 * Плавающий мини-чат (как мессенджер ВК): список чатов с поиском, окно
 * переписки, перетаскивание за шапку, свернуть/развернуть. Монтируется в
 * layout дашборда, поэтому не закрывается при навигации между страницами.
 * На полной странице чата (/dashboard/chat) скрывается.
 *
 * Переписка и инпут — те же компоненты, что в полном чате (ChatMessage,
 * ChatInput): смайлики, вложения, голосовые/видео, ответы, закрепление,
 * пересылка, реакции и настройки оформления работают одинаково.
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

  // «был(а) в сети…» для офлайн-собеседника в шапке (хуки — до раннего return)
  const lastSeenAt = useChatStore((s) => s.lastSeenAt);
  const fetchLastSeen = useChatStore((s) => s.fetchLastSeen);
  const headerChannel = activeChannelId != null
    ? channels.find((c) => c.id === activeChannelId) ?? null
    : null;
  const headerPartnerId = (headerChannel && headerChannel.channelType === 'direct' && !isSelfChat(headerChannel, user?.id))
    ? headerChannel.members?.find((m) => m.id !== user?.id)?.id
    : undefined;
  const headerPartnerOnline = headerPartnerId ? onlineUsers.has(headerPartnerId) : false;
  useEffect(() => {
    if (visible && headerPartnerId && !headerPartnerOnline) fetchLastSeen([headerPartnerId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, headerPartnerId, headerPartnerOnline]);

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
  const headerLastSeen = headerPartnerId && !headerOnline
    ? formatLastSeen(lastSeenAt[headerPartnerId])
    : null;

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
                {headerOnline ? (
                  <p className="text-[10px] text-green-500 leading-tight">онлайн</p>
                ) : headerLastSeen ? (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-tight">был(а) в сети {headerLastSeen}</p>
                ) : null}
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

/* ───────── Окно переписки ─────────
   Переиспользует ChatMessage и ChatInput из полного чата: контекстное меню
   (ответить, копировать, закрепить, переслать, реакции, редактировать,
   удалить), смайлики, вложения, голосовые/видео и настройки оформления. */

function MiniChatView() {
  const t = useT();
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const messages = useChatStore((s) => s.messages);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const setReplyToMessage = useChatStore((s) => s.setReplyToMessage);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const deleteMessageSocket = useChatStore((s) => s.deleteMessage);
  const editMessageSocket = useChatStore((s) => s.editMessage);
  const reactToMessage = useChatStore((s) => s.reactToMessage);
  const pinMessageSocket = useChatStore((s) => s.pinMessage);
  const unpinMessageSocket = useChatStore((s) => s.unpinMessage);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const channelReadAts = useChatStore((s) => s.channelReadAts);
  const channels = useChatStore((s) => s.channels);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const user = useAuthStore((s) => s.user);

  // Оформление: те же обои чата, что и в полном мессенджере
  const chatWallpaper = useThemeStore((s) => s.appearance.chatWallpaper);
  const customWallpaperUrl = useThemeStore((s) => s.appearance.customWallpaperUrl);
  const customWallpaperColor = useThemeStore((s) => s.appearance.customWallpaperColor);
  const chatPattern = useThemeStore((s) => s.appearance.chatPattern);
  const patternContrast = useThemeStore((s) => s.appearance.patternContrast);
  const resolvedTheme = useThemeStore((s) => s.theme);
  const wallpaperStyle = getChatBackground({ chatWallpaper, customWallpaperUrl, customWallpaperColor, chatPattern, patternContrast }, resolvedTheme);

  const [forwardingMessage, setForwardingMessage] = useState<ChatMessageType | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // «Градиент по всем сообщениям» — срез общего градиента на каждом пузыре
  useBubbleGradientFlow(listRef);

  const channel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );
  const channelMembers = useMemo(() => channel?.members ?? [], [channel]);
  const pinnedMessages = useMemo(() => channel?.pinnedMessages ?? [], [channel]);
  const isSelf = channel ? isSelfChat(channel, user?.id) : false;
  const currentMember = channelMembers.find((m) => m.id === user?.id);
  const isCurrentUserMuted = currentMember?.isMuted ?? false;
  const isCurrentUserAdmin = currentMember?.role === 'admin';
  const canPin = channel?.channelType === 'direct' || isCurrentUserAdmin;
  const lastPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedMessages.length - 1] : null;

  // Сброс режимов ответа/редактирования при смене канала
  useEffect(() => {
    setEditingMessage(null);
    setReplyToMessage(null);
  }, [activeChannelId, setEditingMessage, setReplyToMessage]);

  // Автоскролл вниз при новом сообщении / смене канала (но не при подгрузке истории)
  const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    // Новое сообщение отменяет якорь подгрузки истории, иначе догрузка медиа
    // из старой пачки вернёт скролл обратно наверх
    prependAnchorRef.current = null;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastMsgId, activeChannelId]);

  // Подгрузка истории при прокрутке вверх. Позицию держит «якорь»: первое
  // старое сообщение остаётся на месте даже когда медиа пачки догружается
  // и меняет высоту (иначе чат прыгает).
  const prependAnchorRef = useRef<{ id: number; top: number } | null>(null);

  const repinAnchor = useCallback(() => {
    const anchor = prependAnchorRef.current;
    const node = listRef.current;
    if (!anchor || !node) return;
    const el = node.querySelector(`[data-msgid="${anchor.id}"]`) as HTMLElement | null;
    if (!el) return;
    const delta = el.getBoundingClientRect().top - anchor.top;
    if (delta !== 0) node.scrollTop += delta;
  }, []);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // Ручной скролл перебазирует якорь на текущую позицию
    const anchor = prependAnchorRef.current;
    if (anchor) {
      const anchorEl = el.querySelector(`[data-msgid="${anchor.id}"]`) as HTMLElement | null;
      if (anchorEl) anchor.top = anchorEl.getBoundingClientRect().top;
    }
    if (el.scrollTop > 40 || isLoadingMessages || !hasMoreMessages || !activeChannelId || messages.length === 0) return;
    const firstId = messages[0].id;
    const firstEl = el.querySelector(`[data-msgid="${firstId}"]`) as HTMLElement | null;
    const anchorTop = firstEl?.getBoundingClientRect().top ?? el.getBoundingClientRect().top;
    fetchMessages(activeChannelId, firstId).then(() => {
      requestAnimationFrame(() => {
        prependAnchorRef.current = { id: firstId, top: anchorTop };
        repinAnchor();
        setTimeout(() => { prependAnchorRef.current = null; }, 2500);
        const node = listRef.current;
        if (node) {
          node.querySelectorAll('img').forEach((img) => {
            if (!img.complete) img.addEventListener('load', repinAnchor, { once: true });
          });
          node.querySelectorAll('video').forEach((v) => {
            if (v.readyState < 1) v.addEventListener('loadedmetadata', repinAnchor, { once: true });
          });
        }
      });
    });
  }, [isLoadingMessages, hasMoreMessages, activeChannelId, messages, fetchMessages, repinAnchor]);

  const scrollToMessage = useCallback((id: number) => {
    const el = listRef.current?.querySelector(`[data-msgid="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Прочитано ли своё сообщение собеседником
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
      return Object.entries(reads)
        .filter(([uid, readAt]) => Number(uid) !== user?.id && new Date(readAt) >= new Date(msg.createdAt))
        .map(([uid]) => {
          const m = channelMembers.find((m) => m.id === Number(uid));
          return m ? { id: m.id, name: m.name || m.email || 'Пользователь', avatarUrl: m.avatarUrl } : null;
        })
        .filter(Boolean) as { id: number; name: string; avatarUrl?: string }[];
    },
    [activeChannelId, channelReadAts, user?.id, channelMembers]
  );

  // Удаление сообщения вместе с загруженными файлами
  const handleDeleteMessage = useCallback(async (msg: ChatMessageType) => {
    if (msg.attachments && msg.attachments.length > 0) {
      await Promise.allSettled(
        msg.attachments.map((att) => {
          const filename = att.fileUrl?.split('/').pop();
          if (!filename) return Promise.resolve();
          return api.delete(`/chat-channels/upload/${filename}`).catch(() => {});
        })
      );
    }
    deleteMessageSocket(msg.id);
  }, [deleteMessageSocket]);

  const handlePin = useCallback((msg: ChatMessageType) => {
    if (!activeChannelId) return;
    const alreadyPinned = pinnedMessages.some((p) => p.id === msg.id);
    if (alreadyPinned) {
      unpinMessageSocket(activeChannelId, msg.id);
    } else {
      pinMessageSocket(activeChannelId, msg.id, msg.text, msg.senderName);
    }
  }, [activeChannelId, pinnedMessages, pinMessageSocket, unpinMessageSocket]);

  const handleGoToOriginalChannel = useCallback((channelId: number) => {
    setActiveChannel(channelId);
  }, [setActiveChannel]);

  const typing = (typingUsers[activeChannelId ?? -1] || []).filter((u) => u.userId !== user?.id);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Глобальный плеер голосового */}
      <VoicePlayerBar />

      {/* Закреплённое сообщение */}
      {lastPinned && (
        <button
          onClick={() => scrollToMessage(lastPinned.id)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-left shrink-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 3l7 7-4.5 4.5L19 17l-2 2-2.5-2.5L10 21l-1-6-6-1 4.5-4.5L5 7l2-2 2.5 2.5L14 3z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-violet-500 leading-tight">{t('Закреплённое сообщение')}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate leading-tight">{previewMessageText(lastPinned.text)}</p>
          </div>
        </button>
      )}

      {/* Сообщения — обои как в полном чате */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-1 ${wallpaperStyle ? '' : 'bg-[#e9e9e9] dark:bg-gray-900'}`}
        style={wallpaperStyle ?? undefined}
      >
        {isLoadingMessages && messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {isLoadingMessages && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!hasMoreMessages && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <span className="text-xs text-gray-300 dark:text-gray-600">{t('Начало переписки')}</span>
          </div>
        )}
        {!isLoadingMessages && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
            Нет сообщений
          </div>
        )}

        {messages.map((msg, idx) => {
          // В «Избранном» пересланные чужие сообщения показываются слева
          const isOwn = isSelf && msg.forwardMeta
            ? msg.forwardMeta.originalSenderId === user?.id
            : msg.senderId === user?.id;
          const prevMsg = messages[idx - 1];
          const prevIsOwn = isSelf && prevMsg?.forwardMeta
            ? prevMsg.forwardMeta.originalSenderId === user?.id
            : prevMsg?.senderId === user?.id;
          const showAvatar = idx === 0 || prevIsOwn !== isOwn || (
            isSelf && msg.forwardMeta
              ? prevMsg?.forwardMeta?.originalSenderId !== msg.forwardMeta.originalSenderId
              : prevMsg?.senderId !== msg.senderId
          );
          const read = isOwn ? isMessageRead(msg) : false;
          const readers = isOwn ? getMessageReaders(msg) : [];
          const isMsgPinned = pinnedMessages.some((p) => p.id === msg.id);
          const showDateSep = idx === 0 || toDateKey(prevMsg.createdAt) !== toDateKey(msg.createdAt);

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex justify-center py-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/80 px-3 py-1 rounded-full select-none">
                    {formatDateSep(msg.createdAt)}
                  </span>
                </div>
              )}
              <div data-msgid={msg.id}>
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
                  onEdit={isOwn ? (newText: string) => editMessageSocket(msg.id, newText) : undefined}
                  onPin={canPin ? handlePin : undefined}
                  onForward={setForwardingMessage}
                  onGoToOriginalChannel={msg.forwardMeta ? handleGoToOriginalChannel : undefined}
                  isPinned={isMsgPinned}
                  canPin={canPin}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Индикатор набора */}
      {typing.length > 0 && (
        <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0">
          {typing.length === 1
            ? `${typing[0].name} печатает...`
            : `${typing.map((u) => u.name).join(', ')} печатают...`}
        </div>
      )}

      {/* Инпут — тот же, что в полном чате (смайлики, вложения, голосовые/видео) */}
      {activeChannelId != null && (
        isCurrentUserMuted ? (
          <div className="px-3 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
            <p className="text-xs text-red-500 dark:text-red-400 text-center">
              {t('Администратор ограничил возможность отправки сообщений')}
            </p>
          </div>
        ) : (
          <ChatInput
            channelId={activeChannelId}
            projectId={channel?.projectId ?? undefined}
            channelType={channel?.channelType}
          />
        )
      )}

      {/* Пересылка сообщения */}
      {forwardingMessage && (
        <ForwardMessageModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
        />
      )}
    </div>
  );
}

/* ───────── Хелперы дат ───────── */

function toDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateSep(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}
