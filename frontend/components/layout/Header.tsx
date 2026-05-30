'use client';

import { useSidebarStore } from '@/stores/sidebarStore';

/**
 * Mobile menu trigger. Instead of a full-width top bar, it's a floating round
 * button in the TOP-LEFT corner (lg:hidden). The bottom-left corner is reserved
 * for the admin sidebar toggle and bottom-right for the quick-actions FAB, so
 * top-left is the only free corner — no overlap with either.
 */
export default function Header() {
  const { sidebarOpen, setSidebarOpen } = useSidebarStore();

  return (
    <button
      className="lg:hidden fixed left-3 z-40 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg flex items-center justify-center transition-colors"
      style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
      aria-controls="sidebar"
      aria-expanded={sidebarOpen}
      onClick={(e) => { e.stopPropagation(); setSidebarOpen(!sidebarOpen); }}
    >
      <span className="sr-only">Открыть меню</span>
      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="5" width="16" height="2" />
        <rect x="4" y="11" width="16" height="2" />
        <rect x="4" y="17" width="16" height="2" />
      </svg>
    </button>
  );
}
