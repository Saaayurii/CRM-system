'use client';

import { useEffect } from 'react';
import { useToastStore } from '@/stores/toastStore';

/**
 * Registers /sw.js and sets up Periodic Background Sync.
 * Mount once in the root layout (inside <body>).
 *
 * Flow:
 *  1. Register /sw.js
 *  2. Send current auth token to SW (stored in IndexedDB for background use)
 *  3. Register periodic-background-sync tag "crm-data-sync" (min 15 min)
 *  4. Listen for SYNC_COMPLETE messages from SW
 */
export default function ServiceWorkerInit() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Токен теперь в httpOnly-cookie — SW делает fetch с credencials и получает
    // cookie сам; пробрасывать токен в SW (SET_TOKEN) больше не нужно.

    const registerPeriodicSync = async (reg: ServiceWorkerRegistration) => {
      if (!('periodicSync' in reg)) return;

      try {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });

        if (status.state === 'granted') {
          // @ts-expect-error periodicSync is not yet in TS lib
          await reg.periodicSync.register('crm-data-sync', {
            minInterval: 15 * 60 * 1000, // 15 minutes
          });
          console.debug('[SW] Periodic sync registered (15 min)');
        } else {
          console.debug('[SW] periodic-background-sync permission:', status.state);
        }
      } catch (err) {
        // Non-fatal — periodic sync is a progressive enhancement
        console.debug('[SW] Periodic sync not available:', err);
      }
    };

    // Handle messages from the service worker
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        const { synced, total, timestamp } = event.data;
        console.debug(
          `[SW] Background sync complete: ${synced}/${total} routes updated at`,
          new Date(timestamp).toLocaleTimeString('ru-RU'),
        );
        window.dispatchEvent(
          new CustomEvent('sw:sync-complete', {
            detail: { synced, total, timestamp },
          }),
        );
      } else if (event.data?.type === 'PUSH_NOTIFICATION') {
        const { data } = event.data;
        const message = data?.message || data?.title || 'Новое уведомление';
        useToastStore.getState().addToast('info', message);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.debug('[SW] Registered:', reg.scope);

        // Register periodic background sync
        registerPeriodicSync(reg);

        // Check for SW updates on every page load
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.debug('[SW] Update available');
            }
          });
        });

      })
      .catch((err) => console.warn('[SW] Registration failed:', err));

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, []);

  return null;
}
