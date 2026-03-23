'use client';

import { useEffect, useState } from 'react';
import { useOfflineQueueStore } from '@/stores/offlineQueueStore';
import { useToastStore } from '@/stores/toastStore';

export default function PendingSync() {
  const { items, pendingCount, isSyncing, isOnline, refresh, syncNow, removeItem, setOnline } =
    useOfflineQueueStore();
  const addToast = useToastStore((s) => s.addToast);
  const [expanded, setExpanded] = useState(false);

  // Initial load + listen for queue-processed events
  useEffect(() => {
    refresh();

    const handleProcessed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      refresh();
      if (detail.processed > 0) {
        addToast('success', `Синхронизировано: ${detail.processed} запрос(ов)`);
      }
    };

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('crm-queue-processed', handleProcessed);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for SW sync messages
    const handleSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'QUEUE_PROCESSED') {
        refresh();
        if (e.data.processed > 0) {
          addToast('success', `Синхронизировано: ${e.data.processed} запрос(ов)`);
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSwMessage);

    return () => {
      window.removeEventListener('crm-queue-processed', handleProcessed);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
    };
  }, [refresh, setOnline, addToast]);

  if (pendingCount === 0 && isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm w-full">
      {/* Offline banner */}
      {!isOnline && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-yellow-500/90 text-white text-sm rounded-lg shadow-lg backdrop-blur-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728"
            />
          </svg>
          Нет подключения к сети
        </div>
      )}

      {/* Pending badge */}
      {pendingCount > 0 && (
        <div className="bg-gray-900/95 dark:bg-gray-800/95 border border-gray-700 rounded-xl shadow-xl backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              {isSyncing ? (
                <svg
                  className="w-4 h-4 animate-spin text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <span className="w-4 h-4 flex items-center justify-center bg-amber-500 rounded-full text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
              {isSyncing ? 'Синхронизация...' : `${pendingCount} ожидает отправки`}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded list */}
          {expanded && (
            <div className="border-t border-gray-700">
              <ul className="max-h-52 overflow-y-auto divide-y divide-gray-700/50">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 truncate">{item.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {item.method} · {item.entityType} ·{' '}
                        {new Date(item.createdAt).toLocaleTimeString('ru')}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      title="Удалить"
                      className="shrink-0 p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-700 bg-gray-900/40">
                <button
                  onClick={() => syncNow()}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
                </button>
                <button
                  onClick={async () => {
                    await useOfflineQueueStore.getState().clearAll();
                    setExpanded(false);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-500/50 rounded-lg transition-colors"
                >
                  Очистить
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
