'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { sseUrl } from '@/lib/sseUrl';
import { ensureFreshSession } from '@/lib/freshToken';
import { getSystemSettings, invalidateSystemSettings } from '@/lib/settingsRequest';
import api from '@/lib/api';

/**
 * Постоянный индикатор для супер-админа: режим «технические работы» сейчас
 * включён для остальных пользователей. Супер-админ продолжает работать
 * (MaintenanceGuard его пропускает), но видит, что система закрыта — например,
 * когда деплой автоматически включил заглушку. Real-time: SSE + поллинг 30с,
 * та же механика, что у MaintenanceGuard (Redis pub/sub без истории → нужен
 * переопрос на каждом (пере)подключении).
 */
export default function MaintenanceIndicator() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const isSuperAdmin = user?.role?.code === 'super_admin';

  useEffect(() => {
    if (isLoading || !isSuperAdmin) return;

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const checkNow = async () => {
      if (closed) return;
      try {
        const data = await getSystemSettings();
        setOn(Boolean((data?.settings as { maintenance_mode?: boolean })?.maintenance_mode));
      } catch {
        // ignore — next poll/SSE retries
      }
    };

    void checkNow();

    const connect = async () => {
      if (closed) return;
      const ok = await ensureFreshSession();
      if (closed || !ok) return;

      const es = new EventSource(sseUrl('/system-settings/events'), { withCredentials: true });
      esRef.current = es;
      es.onopen = () => { void checkNow(); };
      es.addEventListener('maintenance', (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data);
          setOn(Boolean(event.mode));
        } catch {
          // ignore
        }
      });
      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (closed) return;
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    void connect();

    const pollTimer = setInterval(() => { void checkNow(); }, 30000);
    const onVisible = () => {
      if (document.hidden || closed) return;
      void checkNow();
      if (!esRef.current) void connect();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisible);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [isLoading, isSuperAdmin]);

  if (!isSuperAdmin || !on) return null;

  const turnOff = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.put('/system-settings', { settings: { maintenance_mode: false } });
      invalidateSystemSettings(); // сбросить кеш, чтобы опрос не вернул старое значение
      setOn(false);
    } catch {
      // optimistic; SSE/poll will resync if it failed
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-full bg-amber-500 text-white shadow-lg px-4 py-2 text-sm font-medium">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
      </span>
      Режим обслуживания включён — обычные пользователи видят заглушку
      <button
        onClick={turnOff}
        disabled={busy}
        className="ml-1 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60"
      >
        {busy ? 'Выключаю…' : 'Выключить'}
      </button>
    </div>
  );
}
