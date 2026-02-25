'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';

export default function ChatButton() {
  const router = useRouter();
  const [polledCount, setPolledCount] = useState(0);
  const storeUnreadCounts = useChatStore((s) => s.unreadCounts);

  // Derive total from store (updated instantly on markAsRead / new message)
  const storeTotal = Object.values(storeUnreadCounts).reduce((sum, n) => sum + n, 0);

  // Track whether the store has been hydrated (fetchChannels populates unreadCounts)
  const storeHydrated = Object.keys(storeUnreadCounts).length > 0;

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/chat-channels/unread-summary');
      if (Array.isArray(data)) {
        const total = data.reduce((sum: number, ch: any) => sum + (ch.unreadCount || 0), 0);
        setPolledCount(total);
      } else {
        setPolledCount(data.totalUnread || 0);
      }
    } catch {
      // Chat service may not be available
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Use store value when available (real-time), otherwise fall back to polled value
  const unreadCount = storeHydrated ? storeTotal : polledCount;

  return (
    <button
      className="relative w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full transition-colors"
      onClick={() => router.push('/dashboard/chat')}
      title="Чат"
    >
      <span className="sr-only">Чат</span>
      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
