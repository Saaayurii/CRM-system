'use client';

import { useState, useEffect, useCallback } from 'react';

interface StorageLogEntry {
  ts: string;
  level: 'log' | 'warn' | 'error';
  message: string;
}

interface StorageStatus {
  provider: string;
  enabled: boolean;
  endpoint: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
  publicBase: string;
  bucketReachable: boolean | null;
  checkError: string | null;
  checkedAt: string | null;
  logs: StorageLogEntry[];
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function StorageStatusPanel() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/v1/admin/storage/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus(await res.json());
      setError('');
    } catch {
      setError('Не удалось получить статус хранилища');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Цвет «лампочки»: зелёный — S3 доступен, жёлтый — локальный режим, красный — ошибка доступа
  let dot = 'bg-gray-400';
  let headline = 'Хранилище файлов';
  let headlineColor = 'text-gray-700 dark:text-gray-200';
  if (status) {
    if (!status.enabled) {
      dot = 'bg-yellow-500';
      headline = 'Локальное хранилище (S3 выключен)';
      headlineColor = 'text-yellow-600 dark:text-yellow-400';
    } else if (status.bucketReachable) {
      dot = 'bg-green-500';
      headline = `S3 подключён — бакет «${status.bucket}» доступен`;
      headlineColor = 'text-green-600 dark:text-green-400';
    } else {
      dot = 'bg-red-500';
      headline = `S3 недоступен — бакет «${status.bucket}»`;
      headlineColor = 'text-red-600 dark:text-red-400';
    }
  }

  const errorCount = status?.logs.filter((l) => l.level === 'error').length ?? 0;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`w-3 h-3 rounded-full shrink-0 ${dot}`} />
        <span className={`text-base font-semibold ${headlineColor}`}>{headline}</span>
        {errorCount > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
            {errorCount} ошиб.
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); load(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); load(); } }}
            className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
          >
            {loading ? 'Обновление…' : 'Обновить'}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          )}

          {status && (
            <>
              {/* Параметры подключения */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-4">
                <Row label="Провайдер" value={status.provider} />
                <Row label="Endpoint" value={status.endpoint || '—'} mono />
                <Row label="Бакет" value={status.bucket || '—'} mono />
                <Row label="Регион" value={status.region || '—'} mono />
                <Row label="Path-style" value={status.forcePathStyle ? 'да' : 'нет'} />
                <Row label="Публичная база" value={status.publicBase || '—'} mono />
                {status.checkedAt && (
                  <Row label="Проверка бакета" value={fmtTime(status.checkedAt)} />
                )}
                {status.checkError && (
                  <Row label="Ошибка доступа" value={status.checkError} mono danger />
                )}
              </div>

              {/* Лог загрузок/ошибок */}
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Лог хранилища (последние {status.logs.length})
              </p>
              <div className="max-h-72 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {status.logs.length === 0 ? (
                  <p className="text-sm text-gray-400 px-3 py-3">Записей пока нет</p>
                ) : (
                  status.logs.map((l, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-1.5 text-xs font-mono">
                      <span className="text-gray-400 shrink-0">{fmtTime(l.ts)}</span>
                      <span
                        className={
                          l.level === 'error'
                            ? 'text-red-600 dark:text-red-400'
                            : l.level === 'warn'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }
                      >
                        {l.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  danger,
}: {
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}:</span>
      <span
        className={`truncate ${mono ? 'font-mono text-xs' : ''} ${
          danger ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
