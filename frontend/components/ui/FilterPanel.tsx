'use client';

import { useState, useEffect } from 'react';

export interface FilterField {
  type: 'search' | 'select';
  key: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

interface FilterPanelProps {
  fields: FilterField[];
  hasActiveFilters: boolean;
  onReset: () => void;
  className?: string;
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent';

function FilterFields({ fields }: { fields: FilterField[] }) {
  return (
    <>
      {fields.map((f) =>
        f.type === 'search' ? (
          <input
            key={f.key}
            type="text"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            placeholder={f.placeholder || 'Поиск...'}
            className={inputCls}
          />
        ) : (
          <select
            key={f.key}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className={inputCls}
          >
            <option value="">{f.placeholder || 'Все'}</option>
            {(f.options || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )
      )}
    </>
  );
}

export default function FilterPanel({ fields, hasActiveFilters, onReset, className }: FilterPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on resize to desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setDrawerOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const colCount = fields.length;
  const gridCols =
    colCount <= 2 ? 'sm:grid-cols-2' :
    colCount === 3 ? 'sm:grid-cols-3' :
    colCount === 4 ? 'sm:grid-cols-4' :
    'sm:grid-cols-2 lg:grid-cols-5';

  return (
    <>
      {/* Desktop: sticky bar */}
      <div
        className={`hidden sm:block sticky top-16 z-20 bg-white dark:bg-gray-800 shadow-sm rounded-xl p-4 mb-4 ${className ?? ''}`}
      >
        <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
          <FilterFields fields={fields} />
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="mt-3 text-sm text-violet-500 hover:text-violet-600 font-medium"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Mobile: floating filter button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className={`sm:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg font-medium text-sm transition-colors ${
          hasActiveFilters
            ? 'bg-violet-500 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
        }`}
        aria-label="Фильтры"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        Фильтры
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-white/80 inline-block" />
        )}
      </button>

      {/* Mobile: drawer */}
      {drawerOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel slides in from right */}
          <div className="relative ml-auto w-80 max-w-full h-full bg-white dark:bg-gray-800 shadow-xl flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="font-semibold text-gray-800 dark:text-gray-100">Фильтры</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter fields */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <FilterFields fields={fields} />
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              {hasActiveFilters && (
                <button
                  onClick={() => { onReset(); setDrawerOpen(false); }}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Сбросить
                </button>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
