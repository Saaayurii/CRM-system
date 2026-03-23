'use client';

import { useState, useCallback } from 'react';
import { useToastStore } from '@/stores/toastStore';
import { useOfflineQueueStore } from '@/stores/offlineQueueStore';
import { addToQueue } from '@/lib/offlineQueue';
import { registerSync } from '@/lib/offlineSync';

export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface UseOfflineFormOptions {
  method: HttpMethod;
  /** Full path like /api/v1/tasks or /api/v1/tasks/:id */
  path: string;
  entityType: string;
}

interface SubmitResult {
  ok: boolean;
  data?: any;
  queued?: boolean;
}

export function useOfflineForm({ method, path, entityType }: UseOfflineFormOptions) {
  const [isPending, setIsPending] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const refreshQueue = useOfflineQueueStore((s) => s.refresh);

  const submit = useCallback(
    async (body: unknown, label = entityType): Promise<SubmitResult> => {
      setIsPending(true);

      const token =
        typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';

      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}${path}`;

      // ── Try online first ────────────────────────────────────────────────────
      if (navigator.onLine) {
        try {
          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10_000),
          });

          if (response.ok) {
            const data = await response.json().catch(() => ({}));
            setIsPending(false);
            return { ok: true, data };
          }

          // Don't queue client errors (validation failures etc.)
          if (response.status >= 400 && response.status < 500) {
            const err = await response.json().catch(() => ({ message: 'Ошибка запроса' }));
            addToast('error', err.message || `Ошибка ${response.status}`);
            setIsPending(false);
            return { ok: false };
          }

          // 5xx — fall through to queue
        } catch {
          // Network error — fall through to queue
        }
      }

      // ── Queue for later ─────────────────────────────────────────────────────
      try {
        await addToQueue({ method, url, body, token, entityType, label });
        await registerSync();
        await refreshQueue();
        addToast(
          'info',
          `Нет связи. ${label} сохранено и будет отправлено автоматически.`,
        );
        setIsPending(false);
        return { ok: true, queued: true };
      } catch {
        addToast('error', 'Не удалось сохранить офлайн');
        setIsPending(false);
        return { ok: false };
      }
    },
    [method, path, entityType, addToast, refreshQueue],
  );

  return { submit, isPending };
}
