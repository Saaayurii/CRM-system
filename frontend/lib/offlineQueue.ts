/**
 * IndexedDB queue for offline-first form submissions.
 * DB: "crm-offline", store: "queue"
 * Shared between client code AND the service worker (same origin).
 */

export const OFFLINE_DB_NAME = 'crm-offline';
export const OFFLINE_STORE   = 'queue';
const DB_VERSION = 1;

export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueueItem {
  id: string;
  method: HttpMethod;
  /** Full URL including origin, e.g. http://localhost:3030/api/v1/tasks */
  url: string;
  body: unknown;
  /** JWT token captured at queue time */
  token: string;
  /** 'task' | 'inspection' | 'time_log' | 'material' | … */
  entityType: string;
  /** Human-readable description shown in the UI */
  label: string;
  createdAt: number;
  retryCount: number;
}

// ─── DB open ──────────────────────────────────────────────────────────────────

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        const store = db.createObjectStore(OFFLINE_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

export async function addToQueue(
  item: Omit<QueueItem, 'id' | 'createdAt' | 'retryCount'>,
): Promise<QueueItem> {
  const db = await openOfflineDB();
  const full: QueueItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    retryCount: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_STORE).add(full);
    tx.oncomplete = () => resolve(full);
    tx.onerror   = () => reject(tx.error);
  });
}

export async function getAllPending(): Promise<QueueItem[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(OFFLINE_STORE, 'readonly');
    const req = tx.objectStore(OFFLINE_STORE).index('createdAt').getAll();
    req.onsuccess = () => resolve(req.result as QueueItem[]);
    req.onerror   = () => reject(req.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror   = () => reject(tx.error);
  });
}

export async function countPending(): Promise<number> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(OFFLINE_STORE, 'readonly');
    const req = tx.objectStore(OFFLINE_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror   = () => reject(tx.error);
  });
}
