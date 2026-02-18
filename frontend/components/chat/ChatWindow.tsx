'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
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
  const user = useAuthStore((s) => s.user);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef(0);

  const activeChannel = channels.find((ch) => ch.id === activeChannelId);
  const channelTyping = activeChannelId ? typingUsers[activeChannelId] || [] : [];

  // Auto-scroll to bottom on new messages (only if user is near bottom)
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
        // Preserve scroll position after prepending older messages
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
          <p className="text-gray-400 dark:text-gray-500 text-lg">
            Выберите чат для начала общения
          </p>
        </div>
      </div>
    );
  }

  const channelName =
    activeChannel.channelType === 'group'
      ? activeChannel.channelName
      : activeChannel.members?.find((m) => m.id !== user?.id)?.name || activeChannel.channelName;

  return (
    <div className="flex flex-col h-full">
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

        {/* Channel info */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${
            activeChannel.channelType === 'group' ? 'bg-violet-500' : 'bg-sky-500'
          }`}
        >
          {activeChannel.avatarUrl ? (
            <img src={activeChannel.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            channelName
              .split(' ')
              .map((w) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            {channelName}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {activeChannel.channelType === 'group'
              ? `${activeChannel.membersCount} участник${pluralize(activeChannel.membersCount)}`
              : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50 dark:bg-gray-900"
      >
        {/* Loading indicator for older messages */}
        {isLoadingMessages && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.senderId === user?.id;
          const showAvatar =
            idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;

          return (
            <ChatMessage
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              showAvatar={showAvatar}
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
  );
}

function pluralize(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return '';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'а';
  return 'ов';
}
