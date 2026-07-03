'use client';

import { useT } from '@/lib/i18n';

interface ChatListHeaderProps {
  search: string;
  onSearch: (v: string) => void;
  activeFolder: 'all' | number;
  onFolder: (f: 'all' | number) => void;
  /** [projectId, projectName | null][] — вкладки-папки проектов. */
  projectFolders: [number, string | null][];
  /** Кнопка «новый чат»; если не передана — не показывается. */
  onNewChat?: () => void;
}

/**
 * Шапка списка чатов (заголовок «Чаты» + поиск + вкладки-папки), вынесенная для
 * переиспользования: в форум-режиме она рендерится над рельсом чатов и списком
 * тем, чтобы шапка/поиск/вкладки не прятались (как в обычном списке чатов).
 */
export default function ChatListHeader({
  search,
  onSearch,
  activeFolder,
  onFolder,
  projectFolders,
  onNewChat,
}: ChatListHeaderProps) {
  const t = useT();
  return (
    <div className="shrink-0">
      {/* Header */}
      <div className="px-3 pt-3 pb-2.5 bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-700/60">
        <div className="flex items-center justify-between mb-2.5 pl-1">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{t('Чаты')}</h2>
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="w-9 h-9 flex items-center justify-center text-violet-500 hover:bg-violet-100/70 dark:hover:bg-violet-500/15 rounded-full transition-colors active:scale-95"
              title={t('Новый чат')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.586-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t('Поиск')}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100/90 dark:bg-gray-700/70 border-0 rounded-full text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:bg-white dark:focus:bg-gray-700 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Folder tabs */}
      {projectFolders.length > 0 && (
        <div className="border-b border-gray-200/70 dark:border-gray-700/60 bg-white/60 dark:bg-gray-800/50 backdrop-blur-xl">
          <div className="relative">
            <div className="flex px-2" style={{ overflowX: 'scroll', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
              <button
                onClick={() => onFolder('all')}
                className={`relative shrink-0 px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeFolder === 'all'
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {t('Все чаты')}
                {activeFolder === 'all' && <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full bg-violet-500" />}
              </button>
              {projectFolders.map(([pid, pname]) => (
                <button
                  key={pid}
                  onClick={() => onFolder(pid)}
                  className={`relative shrink-0 px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap max-w-[140px] truncate ${
                    activeFolder === pid
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  title={pname ?? `Проект #${pid}`}
                >
                  {pname ?? `Проект #${pid}`}
                  {activeFolder === pid && <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full bg-violet-500" />}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white dark:from-gray-800" />
          </div>
        </div>
      )}
    </div>
  );
}
