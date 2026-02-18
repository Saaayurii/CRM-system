'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { sseUrl } from '@/lib/sseUrl';
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

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const userRole = user.role?.code ?? '';

    // 1. Initial check — catches the case where maintenance was already on before opening the page
    api.get('/system-settings').then((res) => {
      const settings: Record<string, unknown> = res.data?.settings ?? {};
      const event: MaintenanceEvent = {
        mode: Boolean(settings.maintenance_mode),
        allowedRoles: (settings.maintenance_allowed_roles as string[]) ?? [],
      };
      if (shouldBlock(event, userRole)) router.push('/maintenance');
    }).catch(() => {});

    // 2. SSE — catches real-time changes while user is active
    const es = new EventSource(sseUrl('/system-settings/events', token));
    esRef.current = es;

    es.addEventListener('maintenance', (e: MessageEvent) => {
      try {
        const event: MaintenanceEvent = JSON.parse(e.data);
        if (shouldBlock(event, userRole)) router.push('/maintenance');
      } catch {
        // ignore parse errors
      }
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [user, isLoading, router]);

  return <>{children}</>;
}
