import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TaskNotifState {
  unreadCount: number;
  lastSeenAt: number;
  setUnreadCount: (n: number) => void;
  markRead: () => void;
}

export const useTaskNotifStore = create<TaskNotifState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      lastSeenAt: 0,
      setUnreadCount: (n) => set({ unreadCount: n }),
      markRead: () => set({ unreadCount: 0, lastSeenAt: Date.now() }),
    }),
    { name: 'task-notif' }
  )
);
