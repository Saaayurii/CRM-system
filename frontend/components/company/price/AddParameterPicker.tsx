'use client';

import { useMemo, useState } from 'react';
import type { LibraryParameter } from '@/lib/price/types';

export default function AddParameterPicker({
  library,
  onPickLibrary,
  onCreateBlank,
  onClose,
}: {
  library: LibraryParameter[];
  onPickLibrary: (p: LibraryParameter) => void;
  onCreateBlank: () => void;
  onClose: () => void;
  onLibraryChanged?: () => void;
}) {
  const [tab, setTab] = useState<'library' | 'new'>('library');
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => library.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())),
    [library, q],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Добавить параметр</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">✕</button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 px-3">
          {(['library', 'new'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'library' ? 'Из библиотеки' : 'Создать новый'}
            </button>
          ))}
        </div>

        {tab === 'library' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск параметра…"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">
                {library.length === 0 ? 'Библиотека пуста. Создайте параметр или добавьте новый.' : 'Ничего не найдено'}
              </p>
            ) : (
              <ul className="space-y-1">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => onPickLibrary(p)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{p.name}</span>
                      <span className="text-xs text-gray-400">{p.values.length} знач.</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Создать пустую группу параметров и настроить её прямо в услуге. Чтобы переиспользовать
              параметр в других услугах, добавьте его в библиотеку через кнопку «Параметры» в прайсе.
            </p>
            <button
              onClick={onCreateBlank}
              className="w-full px-4 py-2.5 text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
            >
              Создать новую группу параметров
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
