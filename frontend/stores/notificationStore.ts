import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { sseUrl } from '@/lib/sseUrl';
import {
  isPushSupported,
  getPermissionState,
  enablePushNotifications,
  disablePushNotifications,
  isPushSubscribed,
} from '@/lib/pushNotifications';

export interface Notification {
  id: number;
  title: string;
  message?: string;
  notificationType?: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  createdAt: string;
  priority?: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  eventSource: EventSource | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;

  // Push / PWA
  pushSupported: boolean;
  pushEnabled: boolean;
  pushPermission: NotificationPermission;
  pushLoading: boolean;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  connectSSE: () => void;
  disconnectSSE: () => void;

  // Push actions
  initPush: (roleId?: number) => Promise<void>;
  togglePush: (roleId?: number) => Promise<void>;
  checkPushStatus: () => Promise<void>;
}

// ─── App Badging API ──────────────────────────────────────────────────────────

function updateBadge(count: number): void {
  if (typeof navigator === 'undefined') return;
  if (!('setAppBadge' in navigator)) return;

  if (count > 0) {
    (navigator as any).setAppBadge(count).catch(() => {});
  } else {
    (navigator as any).clearAppBadge?.().catch(() => {});
  }
}

export { updateBadge };

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      eventSource: null,
      reconnectTimer: null,

      pushSupported: false,
      pushEnabled: false,
      pushPermission: 'default',
      pushLoading: false,

      // ─── Notifications ────────────────────────────────────────────────────

      fetchNotifications: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.get('/notifications', {
            params: { page: 1, limit: 20 },
          });
          const items: Notification[] = data.data || [];
          const unreadCount = items.filter((n) => !n.isRead).length;
          updateBadge(unreadCount);
          set({ notifications: items, unreadCount, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      markAsRead: async (id: number) => {
        try {
          await api.put(`/notifications/${id}/read`);
          set((state) => {
            const unreadCount = Math.max(0, state.unreadCount - 1);
            updateBadge(unreadCount);
            return {
              notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
              ),
              unreadCount,
            };
          });
        } catch {
          // silent
        }
      },

      markAllAsRead: async () => {
        const { notifications } = get();
        const unread = notifications.filter((n) => !n.isRead);
        try {
          await Promise.all(unread.map((n) => api.put(`/notifications/${n.id}/read`)));
          updateBadge(0);
          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
          }));
        } catch {
          // silent
        }
      },

      // ─── SSE ──────────────────────────────────────────────────────────────

      connectSSE: () => {
        const { eventSource } = get();
        if (eventSource) return;

        const token =
          typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token) return;

        const url = sseUrl('/notifications/events', token);
        const es = new EventSource(url);

        es.addEventListener('notification', (event) => {
          try {
            const notification: Notification = JSON.parse(event.data);
            set((state) => {
              const unreadCount = state.unreadCount + 1;
              updateBadge(unreadCount);
              return {
                notifications: [notification, ...state.notifications].slice(0, 20),
                unreadCount,
              };
            });
          } catch {
            // ignore parse errors
          }
        });

        es.onerror = () => {
          es.close();
          set({ eventSource: null });
          const timer = setTimeout(() => {
            set({ reconnectTimer: null });
            const freshToken =
              typeof window !== 'undefined'
                ? localStorage.getItem('accessToken')
                : null;
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
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (eventSource) eventSource.close();
        set({ eventSource: null, reconnectTimer: null });
      },

      // ─── Push Notifications ────────────────────────────────────────────────

      checkPushStatus: async () => {
        const supported = isPushSupported();
        if (!supported) {
          set({ pushSupported: false, pushEnabled: false });
          return;
        }
        const permission = getPermissionState();
        const subscribed = await isPushSubscribed();
        set({
          pushSupported: true,
          pushPermission: permission,
          pushEnabled: subscribed && permission === 'granted',
        });
      },

      initPush: async (roleId?: number) => {
        const { pushEnabled, pushLoading } = get();
        if (pushEnabled || pushLoading || !isPushSupported()) return;

        const permission = getPermissionState();
        if (permission === 'denied') return; // user already blocked it

        // Auto-subscribe only if permission already granted (silent re-register)
        if (permission === 'granted') {
          const subscribed = await isPushSubscribed();
          if (!subscribed) {
            set({ pushLoading: true });
            try {
              const sub = await enablePushNotifications(roleId);
              set({ pushEnabled: !!sub, pushPermission: 'granted' });
            } finally {
              set({ pushLoading: false });
            }
          } else {
            set({ pushEnabled: true, pushPermission: 'granted' });
          }
        }
      },

      togglePush: async (roleId?: number) => {
        const { pushEnabled, pushLoading } = get();
        if (pushLoading) return;

        set({ pushLoading: true });
        try {
          if (pushEnabled) {
            await disablePushNotifications();
            set({ pushEnabled: false });
          } else {
            const sub = await enablePushNotifications(roleId);
            const permission = getPermissionState();
            set({ pushEnabled: !!sub, pushPermission: permission });
          }
        } finally {
          set({ pushLoading: false });
        }
      },
    }),
    {
      name: 'notification-push-state',
      // Only persist the push toggle state — not notifications or SSE refs
      partialize: (state) => ({
        pushEnabled: state.pushEnabled,
      }),
    },
  ),
);
