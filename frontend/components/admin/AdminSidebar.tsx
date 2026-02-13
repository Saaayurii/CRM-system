'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULE_CATEGORIES } from '@/lib/admin/modules';
import type { ModuleCategory } from '@/types/admin';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

function CategoryGroup({ category, pathname, onNavigate }: { category: ModuleCategory; pathname: string; onNavigate?: () => void }) {
  const hasActiveChild = category.modules.some((mod) => pathname === `/admin/${mod.slug}`);
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
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

      {MODULE_CATEGORIES.map((category) => (
        <CategoryGroup
          key={category.name}
          category={category}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
