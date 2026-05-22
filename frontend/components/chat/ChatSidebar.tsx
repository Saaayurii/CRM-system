'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore, ChatChannel } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import CreateChannelModal from './CreateChannelModal';
import ChatContextMenu from './ChatContextMenu';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { previewMessageText } from '@/lib/chat/messagePreview';

interface ChatSidebarProps {
  onSelectChannel: () => void;
}

export default function ChatSidebar({ onSelectChannel }: ChatSidebarProps) {
  const channels = useChatStore((s) => s.channels);
  const archivedChannels = useChatStore((s) => s.archivedChannels);
  const archivedCount = useChatStore((s) => s.archivedCount);
  const showArchive = useChatStore((s) => s.showArchive);
  const setShowArchive = useChatStore((s) => s.setShowArchive);
  const fetchArchivedChannels = useChatStore((s) => s.fetchArchivedChannels);
  const archiveChannel = useChatStore((s) => s.archiveChannel);
  const pinChannel = useChatStore((s) => s.pinChannel);
  const muteChannel = useChatStore((s) => s.muteChannel);
  const markChannelUnread = useChatStore((s) => s.markChannelUnread);
  const markAsRead = useChatStore((s) => s.markAsRead);
  const clearChannelHistory = useChatStore((s) => s.clearChannelHistory);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const channelsPage = useChatStore((s) => s.channelsPage);
  const hasMoreChannels = useChatStore((s) => s.hasMoreChannels);
  const isLoadingChannels = useChatStore((s) => s.isLoadingChannels);
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFolder, setActiveFolder] = useState<'all' | number>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  const [projectNames, setProjectNames] = useState<Map<number, string>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{
    channel: ChatChannel;
    position: { x: number; y: number };
    variant: 'popover' | 'sheet';
  } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const openCtxMenu = useCallback((channel: ChatChannel, x: number, y: number, variant: 'popover' | 'sheet') => {
    setCtxMenu({ channel, position: { x, y }, variant });
  }, []);
  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const handleContextMenu = useCallback((e: React.MouseEvent, channel: ChatChannel) => {
    e.preventDefault();
    e.stopPropagation();
    openCtxMenu(channel, e.clientX, e.clientY, 'popover');
  }, [openCtxMenu]);

  const handleTouchStart = useCallback((e: React.TouchEvent, channel: ChatChannel) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    longPressTriggered.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(15);
      } catch {}
      openCtxMenu(channel, t.clientX, t.clientY, 'sheet');
    }, 500);
  }, [openCtxMenu]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartPos.current.x);
    const dy = Math.abs(t.clientY - touchStartPos.current.y);
    if (dx > 8 || dy > 8) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  }, []);

  // Fetch real project names for any projectId that has no name in channel settings
  useEffect(() => {
    const missingIds = [...new Set(
      channels
        .filter((ch) => ch.projectId != null && !ch.projectName)
        .map((ch) => ch.projectId as number)
    )];
    if (missingIds.length === 0) return;

    api.get('/projects', { params: { limit: 200 } })
      .then(({ data }) => {
        const projects: { id: number; name: string }[] = data?.projects || data?.data || data || [];
        const map = new Map<number, string>();
        for (const p of projects) map.set(p.id, p.name);
        setProjectNames(map);
      })
      .catch(() => {});
  }, [channels]);

  const handleSelect = useCallback(
    async (channelId: number) => {
      await setActiveChannel(channelId);
      onSelectChannel();
    },
    [setActiveChannel, onSelectChannel]
  );

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoadingChannels || !hasMoreChannels) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      fetchChannels(channelsPage + 1);
    }
  }, [isLoadingChannels, hasMoreChannels, fetchChannels, channelsPage]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleOpenArchive = useCallback(() => {
    setShowArchive(true);
    fetchArchivedChannels();
  }, [setShowArchive, fetchArchivedChannels]);

  const handleArchiveChannel = useCallback(async (ch: ChatChannel, isArchived: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setArchivingId(ch.id);
    try {
      await archiveChannel(ch.id, isArchived);
      if (isArchived && activeChannelId === ch.id) setActiveChannel(null);
      addToast('success', isArchived ? 'Чат добавлен в архив' : 'Чат извлечён из архива');
    } catch {
      addToast('error', 'Не удалось изменить статус архива');
    } finally {
      setArchivingId(null);
    }
  }, [archiveChannel, activeChannelId, setActiveChannel, addToast]);

  // Scroll active folder tab into center when it changes
  useEffect(() => {
    const container = tabsScrollRef.current;
    if (!container) return;
    const activeBtn = container.querySelector('[data-active="true"]') as HTMLElement | null;
    if (!activeBtn) return;
    const left = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
    container.scrollTo({ left, behavior: 'smooth' });
  }, [activeFolder]);

  // Build project folders — prefer channel.projectName, then fetched name, then fallback
  const projectFolders = Array.from(
    channels
      .filter((ch) => ch.projectId != null)
      .reduce((map, ch) => {
        const pid = ch.projectId!;
        if (!map.has(pid)) {
          const name = ch.projectName || projectNames.get(pid) || null;
          map.set(pid, name);
        }
        return map;
      }, new Map<number, string | null>())
      .entries()
  );

  // Filter by folder then search
  const folderFiltered = activeFolder === 'all'
    ? channels
    : channels.filter((ch) => ch.projectId === activeFolder);

  const allFiltered = search.trim()
    ? folderFiltered.filter((ch) => {
        const name = isSelfChat(ch, user?.id) ? 'Избранное' : getChannelDisplayName(ch, user?.id);
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : folderFiltered;

  const selfChat = activeFolder === 'all' ? allFiltered.find((ch) => isSelfChat(ch, user?.id)) : undefined;
  const otherChats = allFiltered.filter((ch) => !isSelfChat(ch, user?.id));
  // Pinned first, then others — preserves existing order within each group (which is already newest-first).
  const pinned = otherChats.filter((ch) => ch.isPinned);
  const unpinned = otherChats.filter((ch) => !ch.isPinned);
  const filtered = selfChat ? [selfChat, ...pinned, ...unpinned] : [...pinned, ...unpinned];

  // Shared context menu element — used in both archive and normal views
  const ctxMenuEl = ctxMenu ? (
    <ChatContextMenu
      channel={ctxMenu.channel}
      position={ctxMenu.position}
      variant={ctxMenu.variant}
      isArchived={showArchive}
      hasUnread={(unreadCounts[ctxMenu.channel.id] || 0) > 0}
      canClearHistory={ctxMenu.channel.myRole === 'admin' && !isSelfChat(ctxMenu.channel, user?.id)}
      canDelete={!isSelfChat(ctxMenu.channel, user?.id) && ctxMenu.channel.channelType === 'group'}
      onClose={closeCtxMenu}
      actions={{
        onOpenInNewWindow: () => {
          const url = `/dashboard/chat?channelId=${ctxMenu.channel.id}`;
          window.open(url, '_blank', 'noopener,noreferrer,width=900,height=720');
        },
        onTogglePin: async () => {
          const next = !ctxMenu.channel.isPinned;
          try {
            await pinChannel(ctxMenu.channel.id, next);
            addToast('success', next ? 'Чат закреплён' : 'Чат откреплён');
          } catch {
            addToast('error', 'Не удалось изменить закрепление');
          }
        },
        onMute: async (mutedUntil) => {
          try {
            await muteChannel(ctxMenu.channel.id, mutedUntil);
            addToast('success', mutedUntil ? 'Уведомления выключены' : 'Уведомления включены');
          } catch {
            addToast('error', 'Не удалось изменить настройки уведомлений');
          }
        },
        onToggleMarkUnread: async () => {
          const hasUnreadNow = (unreadCounts[ctxMenu.channel.id] || 0) > 0;
          try {
            if (hasUnreadNow) {
              markAsRead(ctxMenu.channel.id);
              addToast('success', 'Помечено как прочитанное');
            } else {
              await markChannelUnread(ctxMenu.channel.id);
              addToast('success', 'Помечено как непрочитанное');
            }
          } catch {
            addToast('error', 'Не удалось изменить статус');
          }
        },
        onPreview: () => {
          if (showArchive) setShowArchive(false);
          handleSelect(ctxMenu.channel.id);
        },
        onArchive: async (isArchived) => {
          setArchivingId(ctxMenu.channel.id);
          try {
            await archiveChannel(ctxMenu.channel.id, isArchived);
            if (isArchived && activeChannelId === ctxMenu.channel.id) setActiveChannel(null);
            addToast('success', isArchived ? 'Чат добавлен в архив' : 'Чат извлечён из архива');
          } catch {
            addToast('error', 'Не удалось изменить статус архива');
          } finally {
            setArchivingId(null);
          }
        },
        onClearHistory: async () => {
          if (!confirm('Очистить всю историю сообщений этого чата? Это действие необратимо.')) return;
          try {
            await clearChannelHistory(ctxMenu.channel.id);
            addToast('success', 'История очищена');
          } catch {
            addToast('error', 'Не удалось очистить историю');
          }
        },
        onDelete: async () => {
          const ch = ctxMenu.channel;
          if (!confirm(`Удалить чат «${ch.channelName || 'без названия'}»? Это действие нельзя отменить.`)) return;
          setDeletingId(ch.id);
          try {
            await api.delete(`/chat-channels/${ch.id}`);
            fetchChannels(1);
            if (activeChannelId === ch.id) setActiveChannel(null);
            addToast('success', 'Чат удалён');
          } catch {
            addToast('error', 'Не удалось удалить чат');
          } finally {
            setDeletingId(null);
          }
        },
      }}
    />
  ) : null;

  // ── Archive view ─────────────────────────────────────────────────────────
  if (showArchive) {
    const archiveFiltered = search.trim()
      ? archivedChannels.filter((ch) => {
          const name = isSelfChat(ch, user?.id) ? 'Избранное' : getChannelDisplayName(ch, user?.id);
          return name.toLowerCase().includes(search.toLowerCase());
        })
      : archivedChannels;

    return (
      <>
        {/* Archive header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { setShowArchive(false); setSearch(''); }}
              className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Архив</h2>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Archived channel list */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {archiveFiltered.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">
              {search ? 'Ничего не найдено' : 'Архив пуст'}
            </div>
          )}
          {archiveFiltered.map((channel) => {
            const isSelf = isSelfChat(channel, user?.id);
            const displayName = isSelf ? 'Избранное' : getChannelDisplayName(channel, user?.id);
            const avatarUrl = channel.avatarUrl ?? getDirectChannelAvatarUrl(channel, user?.id);
            const unread = unreadCounts[channel.id] || 0;
            const isActive = channel.id === activeChannelId;

            return (
              <div
                key={channel.id}
                className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${
                  isActive ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => {
                  if (longPressTriggered.current) {
                    longPressTriggered.current = false;
                    return;
                  }
                  handleSelect(channel.id);
                }}
                onContextMenu={(e) => handleContextMenu(e, channel)}
                onTouchStart={(e) => handleTouchStart(e, channel)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                <div className="relative shrink-0">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative ${isSelf ? 'bg-amber-400' : channel.channelType === 'group' ? 'bg-violet-500' : 'bg-sky-500'}`}>
                    {avatarUrl
                      ? null
                      : isSelf
                      ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      : getInitials(displayName)
                    }
                    {avatarUrl && <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full rounded-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium truncate ${isActive ? 'text-violet-600 dark:text-violet-400' : isSelf ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>
                      {displayName}
                    </span>
                    {channel.lastMessage && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">{formatTime(channel.lastMessage.createdAt)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {channel.lastMessage ? previewMessageText(channel.lastMessage.text) : 'Нет сообщений'}
                    </p>
                    {unread > 0 && (
                      <span className="ml-2 shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white bg-violet-500 rounded-full">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>

                {/* Unarchive button */}
                <button
                  onClick={(e) => handleArchiveChannel(channel, false, e)}
                  disabled={archivingId === channel.id}
                  className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all disabled:opacity-30"
                  title="Извлечь из архива"
                >
                  {archivingId === channel.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      {ctxMenuEl}
      </>
    );
  }

  // ── Normal view ───────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Чаты</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
            title="Новый чат"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Folder tabs */}
      {projectFolders.length > 0 && (
        <div className="border-b border-gray-100 dark:border-gray-700/60">
          <div className="relative">
            <div ref={tabsScrollRef} className="flex gap-1 px-3 py-2" style={{ overflowX: 'scroll', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
              <button
                data-active={activeFolder === 'all' ? 'true' : 'false'}
                onClick={() => setActiveFolder('all')}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeFolder === 'all'
                    ? 'bg-violet-500 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Все чаты
              </button>
              {projectFolders.map(([pid, pname]) => (
                <button
                  key={pid}
                  data-active={activeFolder === pid ? 'true' : 'false'}
                  onClick={() => setActiveFolder(pid)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap max-w-[120px] truncate ${
                    activeFolder === pid
                      ? 'bg-violet-500 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  title={pname ?? `Проект #${pid}`}
                >
                  {pname ?? `Проект #${pid}`}
                </button>
              ))}
            </div>
            {/* right fade hint */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white dark:from-gray-800" />
          </div>
        </div>
      )}

      {/* Channel list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-none">
        {/* Archive entry — shown when there are archived chats */}
        {archivedCount > 0 && !search && activeFolder === 'all' && (
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700/60 transition-colors"
            onClick={handleOpenArchive}
          >
            <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Архив</span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{archivedCount}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}

        {filtered.length === 0 && !isLoadingChannels && (
          <div className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">
            {search ? 'Ничего не найдено' : 'Нет чатов'}
          </div>
        )}

        {filtered.map((channel) => {
          const isSelf = isSelfChat(channel, user?.id);
          const displayName = isSelf ? 'Избранное' : getChannelDisplayName(channel, user?.id);
          const avatarUrl = channel.avatarUrl ?? getDirectChannelAvatarUrl(channel, user?.id);
          const unread = unreadCounts[channel.id] || 0;
          const isActive = channel.id === activeChannelId;
          const isOnline = !isSelf && isDirectChannelOnline(channel, user?.id, onlineUsers);
          const isDeletedUser = !isSelf && channel.channelType === 'direct' && displayName === 'Удалённый пользователь';

          return (
            <div
              key={channel.id}
              className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${
                isActive ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                if (longPressTriggered.current) {
                  longPressTriggered.current = false;
                  return;
                }
                handleSelect(channel.id);
              }}
              onContextMenu={(e) => handleContextMenu(e, channel)}
              onTouchStart={(e) => handleTouchStart(e, channel)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative ${
                    isSelf ? 'bg-amber-400' : isDeletedUser ? 'bg-gray-400 dark:bg-gray-600' : channel.channelType === 'group' ? 'bg-violet-500' : 'bg-sky-500'
                  }`}
                >
                  {isSelf ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ) : isDeletedUser ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  ) : (
                    getInitials(displayName)
                  )}
                  {avatarUrl && (
                    <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full rounded-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
                </div>
                {!isSelf && channel.channelType === 'direct' && isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-violet-600 dark:text-violet-400' : isSelf ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>
                    {displayName}
                  </span>
                  {channel.lastMessage && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                      {formatTime(channel.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {channel.lastMessage
                      ? channel.channelType === 'group'
                        ? `${isDeletedEmail(channel.lastMessage.senderName) ? 'Удалённый пользователь' : (channel.lastMessage.senderName || 'Удалённый пользователь')}: ${previewMessageText(channel.lastMessage.text)}`
                        : previewMessageText(channel.lastMessage.text)
                      : 'Нет сообщений'}
                  </p>
                  <span className="ml-2 flex items-center gap-1 shrink-0">
                    {channel.isMutedForMe && (
                      <span title="Уведомления выключены" className="flex">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M13.73 21a2 2 0 01-3.46 0M18.63 13A17.9 17.9 0 0118 8a6 6 0 00-9.33-5M6.26 6.26A6 6 0 006 8c0 7-3 9-3 9h14" />
                        </svg>
                      </span>
                    )}
                    {channel.isPinned && (
                      <span title="Закреплён" className="flex">
                        <svg className="w-3.5 h-3.5 text-violet-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 3l7 7-4.5 4.5L19 17l-2 2-2.5-2.5L10 21l-1-6-6-1 4.5-4.5L5 7l2-2 2.5 2.5L14 3z"/>
                        </svg>
                      </span>
                    )}
                    {unread > 0 && (
                      <span className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white rounded-full ${channel.isMutedForMe ? 'bg-gray-400' : 'bg-violet-500'}`}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </span>
                </div>
              </div>

            </div>
          );
        })}

        {isLoadingChannels && (
          <div className="p-4 flex justify-center">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateChannelModal onClose={() => setShowCreateModal(false)} />
      )}

      {ctxMenuEl}
    </>
  );
}

/* ───────── Helpers ───────── */

function getDirectChannelAvatarUrl(channel: ChatChannel, currentUserId?: number): string | undefined {
  if (channel.channelType !== 'direct' || !currentUserId || !channel.members) return undefined;
  const other = channel.members.find((m) => m.id !== currentUserId);
  return other?.avatarUrl;
}

function isSelfChat(channel: ChatChannel, currentUserId?: number): boolean {
  if (channel.channelType !== 'direct' || !currentUserId) return false;
  if (!channel.members || channel.members.length === 0) return false;
  return channel.members.every((m) => m.id === currentUserId);
}

function isDeletedEmail(email?: string | null): boolean {
  return !!email && /^deleted_\d+_\d+@crm\.deleted$/.test(email);
}

function getChannelDisplayName(channel: ChatChannel, currentUserId?: number): string {
  if (channel.channelType === 'group') return channel.channelName || 'Группа';
  if (channel.members && channel.members.length > 0) {
    const other = channel.members.find((m) => m.id !== currentUserId);
    if (other) {
      if (isDeletedEmail(other.name) || isDeletedEmail(other.email)) {
        return 'Удалённый пользователь';
      }
      return other.name || other.email || channel.channelName || 'Прямое сообщение';
    }
  }
  return channel.channelName || 'Прямое сообщение';
}

function isDirectChannelOnline(
  channel: ChatChannel,
  currentUserId: number | undefined,
  onlineUsers: Set<number>
): boolean {
  if (channel.channelType !== 'direct' || !channel.members) return false;
  const other = channel.members.find((m) => m.id !== currentUserId);
  return other ? onlineUsers.has(other.id) : false;
}

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

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7) {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
