import { create } from 'zustand';
import { getAllPending, countPending, removeFromQueue, clearQueue, QueueItem } from '@/lib/offlineQueue';
import { processQueueNow } from '@/lib/offlineSync';

interface OfflineQueueState {
  items: QueueItem[];
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;

  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setOnline: (online: boolean) => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  items: [],
  pendingCount: 0,
  isSyncing: false,
  isOnline: true, // always true on SSR; PendingSync useEffect updates this on client mount

  refresh: async () => {
    try {
      const [items, count] = await Promise.all([getAllPending(), countPending()]);
      set({ items, pendingCount: count });
    } catch {
      // IndexedDB may not be available (SSR)
    }
  },

  syncNow: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      await processQueueNow();
      await get().refresh();
    } finally {
      set({ isSyncing: false });
    }
  },

  removeItem: async (id: string) => {
    await removeFromQueue(id);
    await get().refresh();
  },

  clearAll: async () => {
    await clearQueue();
    set({ items: [], pendingCount: 0 });
  },

  setOnline: (online: boolean) => {
    set({ isOnline: online });
    if (online && get().pendingCount > 0) {
      get().syncNow();
    }
  },
}));
