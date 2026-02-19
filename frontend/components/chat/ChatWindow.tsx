'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useChatStore, ChatChannel, ChatMessage as ChatMessageType } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
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
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const channelReadAts = useChatStore((s) => s.channelReadAts);
  const user = useAuthStore((s) => s.user);

  const [showInfo, setShowInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef(0);

  const activeChannel = channels.find((ch) => ch.id === activeChannelId);
  const channelTyping = activeChannelId ? typingUsers[activeChannelId] || [] : [];

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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
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

  // Scroll to bottom when channel changes
  useEffect(() => {
    if (activeChannelId) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView();
      }, 100);
    }
  }, [activeChannelId]);

  // Load more on scroll up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMessages || !hasMoreMessages || !activeChannelId) return;
    if (container.scrollTop < 100 && messages.length > 0) {
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
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                isSelf
                  ? 'bg-amber-400'
                  : activeChannel.channelType === 'group'
                  ? 'bg-violet-500'
                  : 'bg-sky-500'
              }`}
            >
              {activeChannel.avatarUrl ? (
                <img src={activeChannel.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : isSelf ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : (
                getInitials(channelDisplayName)
              )}
            </div>
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

          {/* Info / settings toggle */}
          <button
            onClick={() => setShowInfo((v) => !v)}
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

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50 dark:bg-gray-900"
        >
          {isLoadingMessages && (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {messages.map((msg, idx) => {
            const isOwn = msg.senderId === user?.id;
            const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
            const read = isOwn ? isMessageRead(msg) : false;

            return (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
                isRead={read}
                onReply={() => setReplyToMessage(msg)}
              />
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
        <ChatInput channelId={activeChannelId} />
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
  onClose: () => void;
}

function InfoPanel({ channel, partner, isSelf, isPartnerOnline, onClose }: InfoPanelProps) {
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
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${
              isSelf
                ? 'bg-amber-400'
                : channel.channelType === 'group'
                ? 'bg-violet-500'
                : 'bg-sky-500'
            }`}
          >
            {channel.avatarUrl ? (
              <img src={channel.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : isSelf ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ) : (
              getInitials(partner?.name || channel.channelName)
            )}
          </div>

          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-gray-100">
              {isSelf ? 'Избранное' : partner?.name || channel.channelName}
            </p>
            {!isSelf && channel.channelType === 'direct' && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {partner?.email || ''}
              </p>
            )}
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

        {/* Members (group) */}
        {channel.channelType === 'group' && channel.members && channel.members.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Участники ({channel.membersCount})
            </p>
            <div className="space-y-2">
              {channel.members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(m.name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{m.name}</p>
                    {m.email && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{m.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
