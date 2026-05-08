'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore, ChatChannel } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import CreateChannelModal from './CreateChannelModal';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface ChatSidebarProps {
  onSelectChannel: () => void;
}

export default function ChatSidebar({ onSelectChannel }: ChatSidebarProps) {
  const channels = useChatStore((s) => s.channels);
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
  const addToast = useToastStore((s) => s.addToast);
  const [projectNames, setProjectNames] = useState<Map<number, string>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

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

  const handleDeleteChannel = useCallback(async (ch: ChatChannel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Удалить чат «${ch.channelName || ch.channelType === 'direct' ? '' : ch.channelName}»? Это действие нельзя отменить.`)) return;
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
  }, [activeChannelId, fetchChannels, setActiveChannel, addToast]);

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
  const filtered = selfChat ? [selfChat, ...otherChats] : otherChats;

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

          const canDelete = !isSelf && channel.channelType === 'group';

          return (
            <div
              key={channel.id}
              className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                isActive ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => handleSelect(channel.id)}
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
                  {channel.lastMessage && !canDelete && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                      {formatTime(channel.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {channel.lastMessage
                      ? channel.channelType === 'group'
                        ? `${isDeletedEmail(channel.lastMessage.senderName) ? 'Удалённый пользователь' : (channel.lastMessage.senderName || 'Удалённый пользователь')}: ${channel.lastMessage.text}`
                        : channel.lastMessage.text
                      : 'Нет сообщений'}
                  </p>
                  {unread > 0 && (
                    <span className="ml-2 shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white bg-violet-500 rounded-full">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete button for group chats */}
              {canDelete && (
                <button
                  onClick={(e) => handleDeleteChannel(channel, e)}
                  disabled={deletingId === channel.id}
                  className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-30"
                  title="Удалить группу"
                >
                  {deletingId === channel.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              )}
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
