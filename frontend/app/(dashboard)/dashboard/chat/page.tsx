'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';

export default function ChatPage() {
  const connect = useChatStore((s) => s.acquireConnection);
  const disconnect = useChatStore((s) => s.releaseConnection);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const channels = useChatStore((s) => s.channels);
  // Раскрытие dashboard-рейла (по ховеру трекпада/пера на iPad) — двигаем левый
  // край чата следом, чтобы рейл не налезал, а чат сдвигался как на ПК.
  const sidebarExpanded = useSidebarStore((s) => s.sidebarExpanded);

  const [showSidebar, setShowSidebar] = useState(true);
  const searchParams = useSearchParams();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Resizable sidebar (desktop only) — drag the divider to widen/narrow the
  // chat list, persisted in localStorage. Mobile keeps the full-width list.
  const SIDEBAR_MIN = 260;
  const SIDEBAR_MAX = 560;
  const [sidebarWidth, setSidebarWidth] = useState(320);
  // 'mobile' (<1024) — одна панель с переключением.
  // 'tablet' (≥1024 + тач) — полноэкранный двухпанельный оверлей (перекрывает
  //   icon-rail и глобальную шапку, как в Telegram на iPad).
  // 'desktop' (≥1024 + мышь) — две панели внутри dashboard-раскладки.
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const isDesktop = layoutMode !== 'mobile'; // обе двухпанельные раскладки используют sidebarWidth
  const isResizingRef = useRef(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem('chat_sidebar_width'));
    if (saved && saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX) setSidebarWidth(saved);
    const wide = window.matchMedia('(min-width: 1024px)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const apply = () => {
      if (!wide.matches) setLayoutMode('mobile');
      else setLayoutMode(coarse.matches ? 'tablet' : 'desktop');
    };
    apply();
    wide.addEventListener('change', apply);
    coarse.addEventListener('change', apply);
    return () => {
      wide.removeEventListener('change', apply);
      coarse.removeEventListener('change', apply);
    };
  }, []);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const onMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const container = chatContainerRef.current;
      const left = container ? container.getBoundingClientRect().left : 0;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, ev.clientX - left));
      setSidebarWidth(next);
    };
    const onUp = () => {
      isResizingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setSidebarWidth((w) => { localStorage.setItem('chat_sidebar_width', String(w)); return w; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // iOS: when keyboard opens, visual viewport shrinks but fixed elements don't move.
  // Track visualViewport and resize the container to fit the visible area.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const el = chatContainerRef.current;
      if (!el) return;
      // Десктоп (мышь, ≥1024) сохраняет высоту внутри раскладки; за клавиатурой
      // следят только полноэкранные оверлеи — телефон и тач-планшет.
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      if (wide && !coarse) return;
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

  // Auto-select channel from URL param (e.g. push notification click), or
  // restore the last opened channel after a reload (desktop only).
  const restoredRef = useRef(false);
  const appliedUrlChannelRef = useRef<number | null>(null);
  useEffect(() => {
    if (!channels.length) return;

    const channelId = searchParams.get('channelId');
    if (channelId) {
      const id = Number(channelId);
      // Параметр применяем один раз: channels обновляется на каждое новое
      // сообщение, и повторный setActiveChannel очищал бы messages и
      // перезагружал открытый чат (спиннер + прыжок скролла вниз)
      if (appliedUrlChannelRef.current !== id && channels.find((c) => c.id === id)) {
        appliedUrlChannelRef.current = id;
        restoredRef.current = true;
        setActiveChannel(id);
        setShowSidebar(false);
        window.history.replaceState(null, '', '/dashboard/chat');
      }
      return;
    }

    // Restore last opened channel once. On mobile we stay on the list so the
    // user isn't dropped straight into a chat.
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      const saved = Number(localStorage.getItem('chat_last_channel'));
      if (saved && channels.find((c) => c.id === saved)) {
        setActiveChannel(saved);
      }
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
    : 'max-lg:fixed max-lg:inset-0 max-lg:z-30';

  return (
    <div ref={chatContainerRef} className={`flex bg-[#e9e9e9] dark:bg-gray-900 shadow-xs overflow-hidden overscroll-none ${
      layoutMode === 'tablet'
        // Карточка чата как на ПК: скруглённая, с отступами от рейла и краёв.
        // Левый край следует ширине рейла (80/256px) + зазор 12px.
        ? `fixed top-3 bottom-3 right-3 z-50 rounded-2xl transition-[left] duration-200 ${sidebarExpanded ? 'left-[16.75rem]' : 'left-[5.75rem]'}`
        : `${mobileClass} lg:h-[calc(100dvh-4rem)] lg:rounded-2xl sm:max-lg:h-[calc(100dvh-64px)] sm:max-lg:-mx-6 sm:max-lg:-my-8 sm:max-lg:w-[calc(100%+3rem)] max-lg:rounded-none`
    }`}>
      {/* Sidebar: always visible on lg+, toggle on mobile */}
      <div
        className={`${
          showSidebar ? 'flex' : 'hidden'
        } lg:flex w-full lg:shrink-0 flex-col border-r border-white dark:border-gray-700 bg-[#e9e9e9] dark:bg-gray-900`}
        style={isDesktop ? { width: sidebarWidth } : undefined}
      >
        <ChatSidebar onSelectChannel={handleSelectChannel} />
      </div>

      {/* Resize handle (desktop only) — drag to set sidebar width */}
      <div
        onMouseDown={startResize}
        className="hidden lg:block relative w-1 shrink-0 cursor-col-resize group"
        title="Потяните, чтобы изменить ширину"
      >
        <span className="absolute inset-y-0 -left-1 -right-1 z-10" />
        <span className="absolute inset-y-0 left-0 w-px bg-transparent group-hover:bg-violet-400/70 group-active:bg-violet-500 transition-colors" />
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
