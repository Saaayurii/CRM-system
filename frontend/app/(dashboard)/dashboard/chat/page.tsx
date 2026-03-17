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
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);

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
    setActiveChannel(null);
  };

  // On mobile: fixed fullscreen when in a conversation, normal height when on list
  const mobileClass = activeChannelId
    ? 'max-lg:fixed max-lg:inset-0 max-lg:z-50'
    : 'max-lg:h-[calc(100dvh-64px-4rem)]';

  return (
    <div className={`flex ${mobileClass} lg:h-[calc(100dvh-64px-4rem)] bg-white dark:bg-gray-900 max-lg:rounded-none lg:rounded-xl shadow-xs overflow-hidden`}>
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
