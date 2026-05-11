'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULE_CATEGORIES } from '@/lib/admin/modules';
import type { ModuleCategory } from '@/types/admin';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

function CategoryGroup({ category, pathname, onNavigate, open, onToggle }: {
  category: ModuleCategory;
  pathname: string;
  onNavigate?: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const hasActiveChild = category.modules.some((mod) => pathname === `/admin/${mod.slug}`);

  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs uppercase font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 group"
      >
        <span className={hasActiveChild ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}>
          {category.name}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: open ? `${category.modules.length * 40}px` : '0px',
          opacity: open ? 1 : 0,
        }}
      >
        {category.modules.map((mod) => (
          <Link
            key={mod.slug}
            href={`/admin/${mod.slug}`}
            onClick={onNavigate}
            className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
              pathname === `/admin/${mod.slug}`
                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            {mod.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const isGlobalAdmin = useAuthStore((s) => s.user?.isGlobalAdmin);

  // Accordion: find the initially active category
  const initialOpen = MODULE_CATEGORIES.findIndex((cat) =>
    cat.modules.some((mod) => pathname === `/admin/${mod.slug}`)
  );
  const [openIndex, setOpenIndex] = useState<number>(initialOpen);

  useEffect(() => {
    function fetchCount() {
      api.get('/auth/registration-requests', { params: { status: 0 } })
        .then(({ data }) => {
          const arr = Array.isArray(data) ? data : (data?.data || data?.items || []);
          setPendingCount(arr.length);
        })
        .catch(() => {});
    }
    fetchCount();
    const id = setInterval(fetchCount, 5_000);
    return () => clearInterval(id);
  }, []);

  return (
    <nav className="w-56 shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 h-fit lg:sticky lg:top-24 max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar">
      <Link
        href="/admin"
        onClick={onNavigate}
        className={`block px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
          pathname === '/admin'
            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
        }`}
      >
        Инфраструктура
      </Link>

      <Link
        href="/admin/roles"
        onClick={onNavigate}
        className={`block px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
          pathname === '/admin/roles'
            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
        }`}
      >
        Матрица доступа
      </Link>

      <Link
        href="/admin/registrations"
        onClick={onNavigate}
        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
          pathname === '/admin/registrations'
            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
        }`}
      >
        Заявки
        {pendingCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-violet-500 rounded-full">
            {pendingCount}
          </span>
        )}
      </Link>

      {isGlobalAdmin && (
        <Link
          href="/admin/companies"
          onClick={onNavigate}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
            pathname === '/admin/companies'
              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          Компании
        </Link>
      )}

      {isGlobalAdmin && (
        <Link
          href="/admin/invites"
          onClick={onNavigate}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
            pathname === '/admin/invites'
              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          Инвайты
        </Link>
      )}

      <Link
        href="/admin/telegram"
        onClick={onNavigate}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
          pathname === '/admin/telegram'
            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
        }`}
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.012 9.482c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.875.739z"/>
        </svg>
        Импорт Telegram
      </Link>

      {MODULE_CATEGORIES.map((category, idx) => (
        <CategoryGroup
          key={category.name}
          category={category}
          pathname={pathname}
          onNavigate={onNavigate}
          open={openIndex === idx}
          onToggle={() => setOpenIndex(openIndex === idx ? -1 : idx)}
        />
      ))}
    </nav>
  );
}
