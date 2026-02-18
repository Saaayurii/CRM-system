'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ChatButton() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/chat-channels/unread-summary');
        setUnreadCount(data.totalUnread || 0);
      } catch {
        // Chat service may not be available
      }
    };
    fetchUnread();
    // Refresh every 60s as a fallback; real-time updates come via chatStore when on chat page
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      className="relative w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full transition-colors"
      onClick={() => router.push('/dashboard/chat')}
      title="Чат"
    >
      <span className="sr-only">Чат</span>
      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-11.25 5.25v-1.5a3.375 3.375 0 013.375-3.375h7.5a3.375 3.375 0 013.375 3.375v1.5M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 1.793.484 3.474 1.328 4.916l-.902 3.584 3.584-.902A9.71 9.71 0 0012 21.75c5.385 0 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
