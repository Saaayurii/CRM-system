'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULE_CATEGORIES } from '@/lib/admin/modules';

interface AdminSidebarProps {
  onNavigate?: () => void;
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
        <div key={category.name} className="mt-4">
          <h4 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold px-3 mb-1">
            {category.name}
          </h4>
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
      ))}
    </nav>
  );
}
