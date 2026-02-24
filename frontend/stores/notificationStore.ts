import { create } from 'zustand';
import api from '@/lib/api';
import { sseUrl } from '@/lib/sseUrl';

export interface Notification {
  id: number;
  title: string;
  message?: string;
  notificationType?: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  eventSource: EventSource | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  connectSSE: () => void;
  disconnectSSE: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  eventSource: null,
  reconnectTimer: null,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/notifications', {
        params: { page: 1, limit: 20 },
      });
      const items: Notification[] = data.data || [];
      set({
        notifications: items,
        unreadCount: items.filter((n) => !n.isRead).length,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // silent
    }
  },

  markAllAsRead: async () => {
    const { notifications } = get();
    const unread = notifications.filter((n) => !n.isRead);
    try {
      await Promise.all(unread.map((n) => api.put(`/notifications/${n.id}/read`)));
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      // silent
    }
  },

  connectSSE: () => {
    const { eventSource } = get();
    if (eventSource) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const url = sseUrl('/notifications/events', token);
    const es = new EventSource(url);

    es.addEventListener('notification', (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 20),
          unreadCount: state.unreadCount + 1,
        }));
      } catch {
        // ignore parse errors
      }
    });

    es.onerror = () => {
      // Close the stale connection (likely expired token) and reconnect
      // after a delay to avoid hammering the server with 401s
      es.close();
      set({ eventSource: null });
      const timer = setTimeout(() => {
        set({ reconnectTimer: null });
        const freshToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (freshToken) {
          get().connectSSE();
        }
      }, 30000);
      set({ reconnectTimer: timer });
    };

    set({ eventSource: es });
  },

  disconnectSSE: () => {
    const { eventSource, reconnectTimer } = get();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    if (eventSource) {
      eventSource.close();
    }
    set({ eventSource: null, reconnectTimer: null });
  },
}));
