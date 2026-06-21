'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { sseUrl } from '@/lib/sseUrl';
import { getFreshAccessToken } from '@/lib/freshToken';
import api from '@/lib/api';

interface MaintenanceEvent {
  mode: boolean;
  allowedRoles: string[];
}

function shouldBlock(event: MaintenanceEvent, userRole: string): boolean {
  return event.mode && !event.allowedRoles.includes(userRole);
}

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role?.code === 'super_admin') return;

    const userRole = user.role?.code ?? '';
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // Source of truth: poll the current setting. SSE is just the fast path —
    // because Redis pub/sub keeps no history, an event fired while this client
    // was disconnected (e.g. api-gateway restarting during a deploy) is lost
    // forever, so we re-check on every (re)connect + on a 30s interval. This is
    // what makes maintenance show up without a page reload.
    const checkNow = async () => {
      if (closed) return;
      try {
        const res = await api.get('/system-settings');
        const settings: Record<string, unknown> = res.data?.settings ?? {};
        const event: MaintenanceEvent = {
          mode: Boolean(settings.maintenance_mode),
          allowedRoles: (settings.maintenance_allowed_roles as string[]) ?? [],
        };
        if (shouldBlock(event, userRole)) router.push('/maintenance');
      } catch {
        // ignore — next poll/SSE will retry
      }
    };

    // 1. Immediate check on mount.
    void checkNow();

    // 2. SSE — instant push on changes; reconnects with a fresh token so a
    //    15-min token expiry (or a backgrounded tab) never strands the stream.
    //    Re-checks the setting on every (re)connect to catch events missed
    //    while disconnected.
    const connect = async () => {
      if (closed) return;
      const token = await getFreshAccessToken();
      if (closed || !token) return;

      const es = new EventSource(sseUrl('/system-settings/events', token));
      esRef.current = es;

      es.onopen = () => { void checkNow(); };

      es.addEventListener('maintenance', (e: MessageEvent) => {
        try {
          const event: MaintenanceEvent = JSON.parse(e.data);
          if (shouldBlock(event, userRole)) router.push('/maintenance');
        } catch {
          // ignore parse errors
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

    // 3. Safety-net polling — guarantees the maintenance screen appears even if
    //    the SSE event was missed entirely (deploy window, dropped connection).
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
  }, [user, isLoading, router]);

  return <>{children}</>;
}
