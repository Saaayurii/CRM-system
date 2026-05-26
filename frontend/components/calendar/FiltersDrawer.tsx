'use client';

import { useEffect } from 'react';
import { CalendarSource, SOURCE_COLORS, SOURCE_LABELS } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  availableSources: CalendarSource[];
  activeSources: CalendarSource[];
  toggleSource: (s: CalendarSource) => void;
  setAllSources: (sources: CalendarSource[]) => void;
  mine: boolean;
  setMine: (v: boolean) => void;
}

export default function FiltersDrawer({
  open,
  onClose,
  availableSources,
  activeSources,
  toggleSource,
  setAllSources,
  mine,
  setMine,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const allActive = activeSources.length === availableSources.length;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Фильтры</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-100">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <section>
            <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
              Область
            </h4>
            <div className="inline-flex w-full p-0.5 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-sm">
              <button
                type="button"
                onClick={() => setMine(true)}
                className={`flex-1 px-3 py-1.5 rounded-md transition ${
                  mine
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Только мои
              </button>
              <button
                type="button"
                onClick={() => setMine(false)}
                className={`flex-1 px-3 py-1.5 rounded-md transition ${
                  !mine
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Все
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Типы событий
              </h4>
              <button
                type="button"
                onClick={() => setAllSources(allActive ? [] : [...availableSources])}
                className="text-[11px] text-violet-600 hover:text-violet-700"
              >
                {allActive ? 'Скрыть все' : 'Показать все'}
              </button>
            </div>
            <ul className="space-y-1.5">
              {availableSources.map((s) => {
                const active = activeSources.includes(s);
                const color = SOURCE_COLORS[s] || '#3b82f6';
                return (
                  <li key={s}>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleSource(s)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-500 focus:ring-violet-400"
                      />
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        {SOURCE_LABELS[s] || s}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
              Интеграции
            </h4>
            <a
              href="/dashboard/settings/calendar-integrations"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition w-full"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Управлять интеграциями
            </a>
          </section>
        </div>
      </aside>
    </>
  );
}
