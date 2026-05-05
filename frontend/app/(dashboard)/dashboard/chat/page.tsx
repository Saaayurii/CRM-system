'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';

export default function ChatPage() {
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const channels = useChatStore((s) => s.channels);

  const [showSidebar, setShowSidebar] = useState(true);
  const searchParams = useSearchParams();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // iOS: when keyboard opens, visual viewport shrinks but fixed elements don't move.
  // Track visualViewport and resize the container to fit the visible area.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const el = chatContainerRef.current;
      if (!el || window.innerWidth >= 1024) return;
      el.style.height = `${vv.height}px`;
      el.style.top = `${vv.offsetTop}px`;
      el.style.bottom = 'auto';
    };
    const reset = () => {
      const el = chatContainerRef.current;
      if (el) { el.style.height = ''; el.style.top = ''; el.style.bottom = ''; }
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      reset();
    };
  }, []);

  useEffect(() => {
    connect();
    fetchChannels(1);

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select channel from URL param (e.g. push notification click)
  useEffect(() => {
    const channelId = searchParams.get('channelId');
    if (!channelId || !channels.length) return;
    const id = Number(channelId);
    if (channels.find((c) => c.id === id)) {
      setActiveChannel(id);
      setShowSidebar(false);
    }
  }, [channels, searchParams, setActiveChannel]);

  // On mobile, selecting a channel hides sidebar
  const handleSelectChannel = () => {
    setShowSidebar(false);
  };

  const handleBackToSidebar = () => {
    setShowSidebar(true);
    setActiveChannel(null);
  };

  // On mobile: fixed fullscreen always (avoids py-8 layout padding issues)
  const mobileClass = activeChannelId
    ? 'max-lg:fixed max-lg:inset-0 max-lg:z-50'
    : 'max-lg:fixed max-lg:inset-x-0 max-lg:top-16 max-lg:bottom-0 max-lg:z-10';

  return (
    <div ref={chatContainerRef} className={`flex ${mobileClass} lg:h-[calc(100dvh-64px-4rem)] bg-white dark:bg-gray-900 max-lg:rounded-none lg:rounded-xl shadow-xs overflow-hidden`}>
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
