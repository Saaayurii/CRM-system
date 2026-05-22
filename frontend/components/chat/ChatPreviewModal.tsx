'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { ChatChannel, ChatMessage as ChatMessageType, mapRawMessage } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import ChatMessage from './ChatMessage';

const RU_MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function toDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateSep(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (toDateKey(dateStr) === toDateKey(now.toISOString())) return 'Сегодня';
  const yest = new Date(now.getTime() - 86400000);
  if (toDateKey(dateStr) === toDateKey(yest.toISOString())) return 'Вчера';
  if (d.getFullYear() === now.getFullYear()) return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function pluralizeMembers(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'участник';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'участника';
  return 'участников';
}

interface Props {
  channel: ChatChannel;
  onClose: () => void;
  onOpenFull: () => void;
}

/**
 * Telegram-style chat preview — a floating modal that loads recent messages
 * read-only, WITHOUT marking the channel as read or making it the active channel.
 */
export default function ChatPreviewModal({ channel, onClose, onOpenFull }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Resolve display name (mirrors ChatSidebar logic)
  const isSelf =
    channel.channelType === 'direct' &&
    !!channel.members &&
    channel.members.length > 0 &&
    channel.members.every((m) => m.id === currentUserId);
  const partner =
    !isSelf && channel.channelType === 'direct'
      ? channel.members?.find((m) => m.id !== currentUserId)
      : null;
  const displayName = isSelf
    ? 'Избранное'
    : channel.channelType === 'group'
      ? channel.channelName || 'Группа'
      : partner?.name || partner?.email || channel.channelName || 'Чат';
  const avatarUrl = channel.avatarUrl ?? partner?.avatarUrl;
  const subtitle =
    channel.channelType === 'group'
      ? `${channel.membersCount} ${pluralizeMembers(channel.membersCount)}`
      : isSelf
        ? 'Личное пространство'
        : partner?.email || '';

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/chat-channels/${channel.id}/messages`, { params: { limit: 40 } })
      .then(({ data }) => {
        if (cancelled) return;
        const rawList: unknown = data?.data ?? data;
        const list = Array.isArray(rawList) ? rawList.map(mapRawMessage).reverse() : [];
        setMessages(list);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channel.id]);

  // Scroll to bottom once messages render
  useEffect(() => {
    if (!loading && messages.length > 0) {
      requestAnimationFrame(() => endRef.current?.scrollIntoView());
    }
  }, [loading, messages.length]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distFromBottom > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (typeof document === 'undefined') return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-[70vh] max-h-[640px] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden relative shrink-0 ${
              isSelf ? 'bg-amber-400' : channel.channelType === 'group' ? 'bg-violet-500' : 'bg-sky-500'
            }`}
          >
            {isSelf ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ) : (
              getInitials(displayName)
            )}
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt=""
                className="absolute inset-0 w-full h-full rounded-full object-cover z-10"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{displayName}</p>
            {subtitle && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 py-2 bg-gray-50 dark:bg-gray-900 relative"
        >
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              Не удалось загрузить сообщения
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              Нет сообщений
            </div>
          )}

          {!loading && !error && messages.map((msg, idx) => {
            const isOwn = msg.senderId === currentUserId;
            const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
            const showDateSep = idx === 0 || toDateKey(messages[idx - 1].createdAt) !== toDateKey(msg.createdAt);
            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="flex justify-center py-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/80 px-3 py-1 rounded-full select-none">
                      {formatDateSep(msg.createdAt)}
                    </span>
                  </div>
                )}
                <ChatMessage
                  message={msg}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  isRead={false}
                  onReply={() => {}}
                  onReact={() => {}}
                  onDelete={() => {}}
                  readOnly
                />
              </div>
            );
          })}
          <div ref={endRef} />

          {/* Scroll-down button */}
          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              className="sticky bottom-2 ml-auto mr-1 flex w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-600 items-center justify-center text-violet-500 hover:text-violet-600 transition-colors"
              title="Вниз"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Footer — open full chat */}
        <button
          onClick={onOpenFull}
          className="shrink-0 flex items-center justify-center gap-2 py-3 border-t border-gray-200 dark:border-gray-700 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
        >
          Открыть чат
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
