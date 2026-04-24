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

    let registration: ServiceWorkerRegistration | null = null;

    const sendToken = (reg: ServiceWorkerRegistration) => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const sw = reg.active ?? reg.installing ?? reg.waiting;
      sw?.postMessage({ type: 'SET_TOKEN', token });
    };

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
        registration = reg;
        console.debug('[SW] Registered:', reg.scope);

        // Send auth token to SW immediately
        sendToken(reg);

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

        // When a new SW takes control, re-send the token
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (registration) sendToken(registration);
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));

    // Re-send token when localStorage changes (login in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' && e.newValue && registration) {
        const sw = registration.active ?? registration.installing ?? registration.waiting;
        sw?.postMessage({ type: 'SET_TOKEN', token: e.newValue });
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return null;
}
