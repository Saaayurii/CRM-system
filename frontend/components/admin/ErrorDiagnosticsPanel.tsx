'use client';

import { useState } from 'react';
import type { DiagnosticError, ErrorCategory, Severity } from '@/types/admin';
import { getCategoryLabel } from '@/lib/errors';

interface FixStep {
  service: string;
  action: string;
  success: boolean;
  message: string;
}

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

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30',
  high: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Критический',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function SpinnerIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function ErrorDiagnosticsPanel({ errors, onCheckAll, isChecking }: ErrorDiagnosticsPanelProps) {
  const [isOpen, setIsOpen] = useState(errors.length > 0);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [fixAllSteps, setFixAllSteps] = useState<FixStep[]>([]);
  const [fixingService, setFixingService] = useState<string | null>(null);

  // Sort errors by severity (critical first)
  const sortedErrors = [...errors].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  const hasFixableErrors = errors.some((e) => e.autoFixAvailable);

  async function handleFixAll() {
    setIsFixingAll(true);
    setFixAllSteps([]);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/docker/auto-fix', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'fix-all' }),
      });
      if (res.ok) {
        const data = await res.json();
        setFixAllSteps(data.steps || []);
      }
    } catch {
      // ignore
    } finally {
      setIsFixingAll(false);
      // Re-check services after fix
      onCheckAll?.();
    }
  }

  async function handleFixService(serviceName: string) {
    setFixingService(serviceName);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/docker/auto-fix', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'fix-service', serviceName: `crm-${serviceName}` }),
      });
      if (res.ok) {
        const data = await res.json();
        const step = data.steps?.[0];
        if (step && !step.success) {
          alert(`Ошибка: ${step.message}`);
        }
      }
    } catch {
      // ignore
    } finally {
      setFixingService(null);
      onCheckAll?.();
    }
  }

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
          {/* Action buttons */}
          <div className="pt-3 mb-3 flex items-center gap-2 flex-wrap">
            {onCheckAll && (
              <button
                onClick={onCheckAll}
                disabled={isChecking}
                className="btn-sm bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
              >
                {isChecking ? (
                  <>
                    <SpinnerIcon className="-ml-1 mr-2 h-3 w-3" />
                    Проверка...
                  </>
                ) : (
                  'Проверить все сервисы'
                )}
              </button>
            )}
            {hasFixableErrors && (
              <button
                onClick={handleFixAll}
                disabled={isFixingAll}
                className="btn-sm bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
              >
                {isFixingAll ? (
                  <>
                    <SpinnerIcon className="-ml-1 mr-2 h-3 w-3" />
                    Починка...
                  </>
                ) : (
                  'Починить всё'
                )}
              </button>
            )}
          </div>

          {/* Fix-all progress */}
          {fixAllSteps.length > 0 && (
            <div className="mb-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-4 py-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Результат починки:
              </p>
              <div className="space-y-1">
                {fixAllSteps
                  .filter((s) => s.action !== 'skip')
                  .map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {step.success ? (
                        <span className="text-green-500">&#10003;</span>
                      ) : (
                        <span className="text-red-500">&#10007;</span>
                      )}
                      <span className="text-gray-700 dark:text-gray-300">
                        {step.service.replace(/^crm-/, '')}
                      </span>
                      <span className="text-gray-400">— {step.message}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {errors.length === 0 ? (
            <div className="flex items-center gap-2 py-3">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.78 4.97a.75.75 0 0 0-1.06 0L7 8.69 5.28 6.97a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0 0-1.06Z" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Все сервисы работают нормально
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {sortedErrors.map((err, i) => (
                <div
                  key={i}
                  className="bg-gray-50 dark:bg-gray-900/30 rounded-lg px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {err.service}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${SEVERITY_COLORS[err.severity]}`}
                      >
                        {SEVERITY_LABELS[err.severity]}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${CATEGORY_COLORS[err.category]}`}
                      >
                        {getCategoryLabel(err.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {err.autoFixAvailable && (
                        <button
                          onClick={() => handleFixService(err.service)}
                          disabled={fixingService === err.service}
                          className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors font-medium"
                        >
                          {fixingService === err.service ? (
                            <SpinnerIcon className="h-3 w-3" />
                          ) : (
                            'Починить'
                          )}
                        </button>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(err.timestamp).toLocaleTimeString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">{err.message}</p>
                  {err.affectedBy.length > 0 && (
                    <p className="text-orange-600 dark:text-orange-400 mt-1 text-xs">
                      Блокируется: {err.affectedBy.join(', ')}
                    </p>
                  )}
                  <p className="text-violet-600 dark:text-violet-400 mt-1 text-xs">
                    Рекомендация: {err.suggestion}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
