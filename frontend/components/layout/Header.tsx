'use client';

import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useChatStore } from '@/stores/chatStore';
import { useT } from '@/lib/i18n';

/**
 * Mobile menu trigger — a floating round button in the BOTTOM-LEFT corner,
 * mirroring the quick-actions "+" FAB (bottom-right) in size and shape.
 * On admin pages the admin sidebar toggle is stacked above it (bottom-24) so
 * the two never overlap.
 */
export default function Header() {
  const t = useT();
  const { sidebarOpen, setSidebarOpen } = useSidebarStore();
  const pathname = usePathname();
  const chatConversationOpen = useChatStore((s) => s.activeChannelId !== null);

  // Hide the floating trigger while the menu is open (the sidebar covers it)
  if (sidebarOpen) return null;

  // На мобильном чате с открытым диалогом страница (fixed inset-0 z-50)
  // перекрывает кнопку — она некликабельна, а с Liquid Glass ещё и
  // просвечивает сквозь полупрозрачную панель ввода. Прячем целиком.
  if (pathname?.startsWith('/dashboard/chat') && chatConversationOpen) return null;

  return (
    <button
      className="lg:hidden fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-xl flex items-center justify-center transition-colors"
      aria-controls="sidebar"
      aria-expanded={sidebarOpen}
      onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }}
    >
      <span className="sr-only">{t('Открыть меню')}</span>
      <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="5" width="16" height="2" />
        <rect x="4" y="11" width="16" height="2" />
        <rect x="4" y="17" width="16" height="2" />
      </svg>
    </button>
  );
}
