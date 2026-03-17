'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULE_CATEGORIES } from '@/lib/admin/modules';
import type { ModuleCategory } from '@/types/admin';
import api from '@/lib/api';

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
