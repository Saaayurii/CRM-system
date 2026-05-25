'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';

type Item = { href: string; label: string; icon: React.ReactNode };

function IconHome() {
  return (
    <svg className="shrink-0 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}
function IconProjects() {
  return (
    <svg className="shrink-0 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg className="shrink-0 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg className="shrink-0 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4h16v12H7l-3 3V4Z" />
    </svg>
  );
}
function IconCoin() {
  return (
    <svg className="shrink-0 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9c0-1.1 1.3-2 3-2s3 .9 3 2-1.3 2-3 2-3 .9-3 2 1.3 2 3 2 3-.9 3-2M12 6v12" />
    </svg>
  );
}
function IconCal() {
  return (
    <svg className="shrink-0 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

const ITEMS: Item[] = [
  { href: '/dashboard', label: 'Главная', icon: <IconHome /> },
  { href: '/dashboard/projects', label: 'Мои проекты', icon: <IconProjects /> },
  { href: '/dashboard/documents', label: 'Документы', icon: <IconDoc /> },
  { href: '/dashboard/finance', label: 'Финансы', icon: <IconCoin /> },
  { href: '/dashboard/calendar', label: 'Календарь', icon: <IconCal /> },
  { href: '/dashboard/chat', label: 'Чат с командой', icon: <IconChat /> },
];

export default function ClientSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useSidebarStore();
  const user = useAuthStore((s) => s.user);
  const chatUnread = useChatStore((s) => Object.values(s.unreadCounts).reduce((a, b) => a + b, 0));
  const fetchChatUnreadSummary = useChatStore((s) => s.fetchUnreadSummary);

  useEffect(() => {
    if (!user) return;
    fetchChatUnreadSummary();
    const id = setInterval(fetchChatUnreadSummary, 60_000);
    return () => clearInterval(id);
  }, [user, fetchChatUnreadSummary]);

  return (
    <div className="min-w-fit">
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />
      <div
        id="sidebar"
        className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-auto lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'}`}
      >
        <div className="flex justify-between items-center px-4 py-5">
          <Link href="/dashboard" className="block">
            <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
              3.15
              <span className="hidden lg:sidebar-expanded:inline ml-1 text-gray-700 dark:text-gray-200 text-sm font-normal">
                Портал клиента
              </span>
            </span>
          </Link>
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="px-3 mt-2">
          <ul className="space-y-1">
            {ITEMS.map((item) => {
              const active = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      active
                        ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {item.icon}
                    <span className="text-sm font-medium hidden lg:sidebar-expanded:inline flex-1">
                      {item.label}
                    </span>
                    {item.href === '/dashboard/chat' && chatUnread > 0 && (
                      <span className="hidden lg:sidebar-expanded:inline-block px-2 py-0.5 text-xs rounded-full bg-rose-500 text-white">
                        {chatUnread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto px-4 py-4 hidden lg:sidebar-expanded:block text-xs text-gray-400">
          Режим только просмотра
        </div>
      </div>
    </div>
  );
}
