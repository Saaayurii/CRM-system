'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore, ChatChannel } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import CreateChannelModal from './CreateChannelModal';

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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Separate "Избранное" (self-chat) and sort it to top
  const allFiltered = search.trim()
    ? channels.filter((ch) => {
        const name = isSelfChat(ch, user?.id) ? 'Избранное' : getChannelDisplayName(ch, user?.id);
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : channels;

  const selfChat = allFiltered.find((ch) => isSelfChat(ch, user?.id));
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

      {/* Channel list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
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

          return (
            <button
              key={channel.id}
              onClick={() => handleSelect(channel.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'bg-violet-50 dark:bg-violet-500/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden ${
                    isSelf
                      ? 'bg-amber-400'
                      : channel.channelType === 'group'
                      ? 'bg-violet-500'
                      : 'bg-sky-500'
                  }`}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : isSelf ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
                {!isSelf && channel.channelType === 'direct' && isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium truncate ${
                      isActive
                        ? 'text-violet-600 dark:text-violet-400'
                        : isSelf
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-800 dark:text-gray-100'
                    }`}
                  >
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
                        ? `${channel.lastMessage.senderName}: ${channel.lastMessage.text}`
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
            </button>
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

function getChannelDisplayName(channel: ChatChannel, currentUserId?: number): string {
  if (channel.channelType === 'group') return channel.channelName || 'Группа';
  if (channel.members && channel.members.length > 0) {
    const other = channel.members.find((m) => m.id !== currentUserId);
    if (other) return other.name || other.email || channel.channelName;
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
