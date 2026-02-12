'use client';

import { useState } from 'react';
import type { DiagnosticError, ErrorCategory } from '@/types/admin';
import { getCategoryLabel } from '@/lib/errors';

interface ErrorDiagnosticsPanelProps {
  errors: DiagnosticError[];
  onCheckAll?: () => void;
  isChecking?: boolean;
}

const CATEGORY_COLORS: Record<ErrorCategory, string> = {
  network: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  auth: 'bg-red-500/20 text-red-700 dark:text-red-400',
  service: 'bg-violet-500/20 text-violet-700 dark:text-violet-400',
  database: 'bg-sky-500/20 text-sky-700 dark:text-sky-400',
  unknown: 'bg-gray-500/20 text-gray-700 dark:text-gray-400',
};

export default function ErrorDiagnosticsPanel({ errors, onCheckAll, isChecking }: ErrorDiagnosticsPanelProps) {
  const [isOpen, setIsOpen] = useState(errors.length > 0);

  const grouped = errors.reduce<Record<ErrorCategory, DiagnosticError[]>>((acc, err) => {
    if (!acc[err.category]) acc[err.category] = [];
    acc[err.category].push(err);
    return acc;
  }, {} as Record<ErrorCategory, DiagnosticError[]>);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Диагностика ошибок
          </h3>
          {errors.length > 0 && (
            <span className="bg-red-500/20 text-red-700 dark:text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">
              {errors.length}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-700/60">
          {onCheckAll && (
            <div className="pt-3 mb-3">
              <button
                onClick={onCheckAll}
                disabled={isChecking}
                className="btn-sm bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
              >
                {isChecking ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Проверка...
                  </>
                ) : (
                  'Проверить все сервисы'
                )}
              </button>
            </div>
          )}

          {errors.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-3">
              Ошибок не обнаружено
            </p>
          ) : (
            <div className="space-y-4 pt-3">
              {(Object.keys(grouped) as ErrorCategory[]).map((category) => (
                <div key={category}>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-2 ${CATEGORY_COLORS[category]}`}
                  >
                    {getCategoryLabel(category)} ({grouped[category].length})
                  </span>
                  <div className="space-y-2">
                    {grouped[category].map((err, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 dark:bg-gray-900/30 rounded-lg px-4 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            {err.service}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(err.timestamp).toLocaleTimeString('ru-RU')}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">{err.message}</p>
                        <p className="text-violet-600 dark:text-violet-400 mt-1 text-xs">
                          Рекомендация: {err.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
