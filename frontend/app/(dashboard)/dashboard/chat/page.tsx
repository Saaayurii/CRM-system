'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';

export default function ChatPage() {
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const activeChannelId = useChatStore((s) => s.activeChannelId);

  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    connect();
    fetchChannels(1);

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On mobile, selecting a channel hides sidebar
  const handleSelectChannel = () => {
    setShowSidebar(false);
  };

  const handleBackToSidebar = () => {
    setShowSidebar(true);
  };

  return (
    <div className="flex h-[calc(100dvh-64px)] bg-white dark:bg-gray-900 rounded-xl shadow-xs overflow-hidden">
      {/* Sidebar: always visible on lg+, toggle on mobile */}
      <div
        className={`${
          showSidebar ? 'flex' : 'hidden'
        } lg:flex w-full lg:w-80 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700`}
      >
        <ChatSidebar onSelectChannel={handleSelectChannel} />
      </div>

      {/* Chat window: always visible on lg+, toggle on mobile */}
      <div
        className={`${
          !showSidebar || activeChannelId ? 'flex' : 'hidden'
        } lg:flex flex-1 flex-col min-w-0`}
      >
        <ChatWindow onBack={handleBackToSidebar} />
      </div>
    </div>
  );
}
