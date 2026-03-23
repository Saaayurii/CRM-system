'use client';

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Set initial state (SSR-safe)
    setOffline(!navigator.onLine);

    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Animate in/out
  useEffect(() => {
    if (offline) {
      setVisible(true);
    } else {
      // Short delay so the slide-out animation plays
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [offline]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]
        w-[calc(100%-2rem)] max-w-sm
        transition-all duration-300 ease-in-out
        ${offline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
      `}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900 dark:bg-gray-800 shadow-2xl border border-gray-700 dark:border-gray-600">
        {/* Pulsing dot */}
        <span className="relative flex shrink-0 h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">Нет соединения</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-tight">Проверьте подключение к интернету</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Обновить
        </button>
      </div>
    </div>
  );
}
