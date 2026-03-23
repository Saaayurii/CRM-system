/**
 * Background Sync helpers.
 * - registerSync(): registers a SW Background Sync tag so the SW processes
 *   the IndexedDB queue when connectivity is restored.
 * - processQueueNow(): fallback for browsers without Background Sync (Safari).
 *   Runs in page context, reads IndexedDB directly and replays requests.
 */

import { getAllPending, removeFromQueue } from './offlineQueue';

export const SYNC_TAG = 'crm-sync';

// ─── Register SW Background Sync ──────────────────────────────────────────────

export async function registerSync(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const registration = await getSwRegistration();
  if (!registration) return false;

  // Background Sync API (Chrome, Edge, Samsung; NOT Safari)
  if ('sync' in registration) {
    try {
      await (registration as any).sync.register(SYNC_TAG);
      return true;
    } catch {
      // fall through to online fallback
    }
  }

  // Fallback: process immediately if online, else wait for 'online' event
  if (navigator.onLine) {
    processQueueNow().catch(() => {});
  } else {
    // One-shot listener — will fire when connection returns
    const handler = () => {
      window.removeEventListener('online', handler);
      processQueueNow().catch(() => {});
    };
    window.addEventListener('online', handler);
  }

  return false;
}

// ─── Fallback queue processor (page context) ──────────────────────────────────

export async function processQueueNow(): Promise<{ processed: number; failed: number }> {
  const items = await getAllPending();
  if (!items.length) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${item.token}`,
        },
        body: JSON.stringify(item.body),
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok || response.status === 409) {
        // 409 Conflict = already exists (duplicate), treat as success
        await removeFromQueue(item.id);
        processed++;
      } else if (response.status >= 400 && response.status < 500) {
        // Client errors (400, 422, etc.) — remove from queue to avoid retry loops
        await removeFromQueue(item.id);
        failed++;
      } else {
        failed++; // server error — keep in queue for next retry
      }
    } catch {
      failed++; // network error — keep in queue
    }
  }

  // Notify stores/UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('crm-queue-processed', {
        detail: { processed, failed, remaining: items.length - processed },
      }),
    );
  }

  return { processed, failed };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}
