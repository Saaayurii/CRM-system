'use client';

import { useSidebarStore } from '@/stores/sidebarStore';

export default function Header() {
  const { sidebarOpen, setSidebarOpen } = useSidebarStore();

  return (
    <header className="sticky top-0 z-30 lg:hidden bg-white dark:bg-gray-800 shadow-xs border-b border-gray-200 dark:border-gray-700/60">
      <div className="px-4 flex items-center h-16">
        <button
          className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          onClick={(e) => { e.stopPropagation(); setSidebarOpen(!sidebarOpen); }}
        >
          <span className="sr-only">Open sidebar</span>
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="5" width="16" height="2" />
            <rect x="4" y="11" width="16" height="2" />
            <rect x="4" y="17" width="16" height="2" />
          </svg>
        </button>
      </div>
    </header>
  );
}
