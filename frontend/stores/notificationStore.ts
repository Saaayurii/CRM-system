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
import { setFaviconBadge, startTitleFlash, stopTitleFlash } from '@/lib/tabBadge';
import { getFreshAccessToken } from '@/lib/freshToken';

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
  clearAll: () => Promise<void>;
  connectSSE: () => void;
  disconnectSSE: () => void;

  // Push actions
  initPush: (roleId?: number) => Promise<void>;
  togglePush: (roleId?: number) => Promise<void>;
  checkPushStatus: () => Promise<void>;
}

// Ensures the visibilitychange listener is attached only once
let visibilityListenerAttached = false;

// ─── App Badging API ──────────────────────────────────────────────────────────

function updateBadge(count: number): void {
  // Favicon badge — works in every browser tab
  setFaviconBadge(count);

  // PWA app icon badge — only when installed & supported
  if (typeof navigator === 'undefined') return;
  if (!('setAppBadge' in navigator)) return;

  if (count > 0) {
    (navigator as any).setAppBadge(count).catch(() => {});
  } else {
    (navigator as any).clearAppBadge?.().catch(() => {});
  }
}

export { updateBadge };

// ─── Notification Sound ───────────────────────────────────────────────────────

function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
    osc.onended = () => void ctx.close();
  } catch { /* ignore — AudioContext blocked or unsupported */ }
}

// ─── Browser Notification API ─────────────────────────────────────────────────

function showBrowserNotification(notification: Notification): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  if (!document.hidden) return; // only when tab is not visible

  try {
    const n = new window.Notification(notification.title, {
      body: notification.message,
      icon: '/icon-192.png',
      tag: `crm-notif-${notification.id}`,
    });
    n.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      n.close();
    };
  } catch { /* ignore */ }
}

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

      clearAll: async () => {
        try {
          await api.delete('/notifications');
          await disablePushNotifications();
          updateBadge(0);
          set({ notifications: [], unreadCount: 0, pushEnabled: false });
        } catch {
          // silent
        }
      },

      // ─── SSE ──────────────────────────────────────────────────────────────

      connectSSE: () => {
        const { eventSource } = get();
        if (eventSource) return;

        // On returning to the tab: stop the flashing title and revive the
        // stream if the browser dropped it while the tab was backgrounded (once)
        if (typeof document !== 'undefined' && !visibilityListenerAttached) {
          visibilityListenerAttached = true;
          document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            stopTitleFlash();
            // Background tabs get throttled/closed — reconnect immediately
            if (!get().eventSource) {
              const { reconnectTimer } = get();
              if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                set({ reconnectTimer: null });
              }
              get().connectSSE();
            }
            // Resync to catch anything pushed while the stream was down
            // (SSE does not replay missed events)
            void get().fetchNotifications();
          });
        }

        // Open the stream with a guaranteed-fresh token. EventSource bakes the
        // token into the URL, so a stale token here would 401 on (re)connect —
        // refresh it first if it's near expiry.
        void (async () => {
          const token = await getFreshAccessToken();
          if (!token) return;
          // Bail if another connection was established while we awaited
          if (get().eventSource) return;

          const url = sseUrl('/notifications/events', token);
          const es = new EventSource(url);

        es.addEventListener('notification', (event) => {
          try {
            const notification: Notification = JSON.parse(event.data);
            playNotificationSound();
            showBrowserNotification(notification);
            // Flash the tab title while the tab is in the background
            if (typeof document !== 'undefined' && document.hidden) {
              startTitleFlash(`🔔 ${notification.title}`);
            }
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

        es.addEventListener('notification_deleted', (event) => {
          try {
            const { ids } = JSON.parse(event.data) as { ids: number[] };
            if (!Array.isArray(ids) || ids.length === 0) return;
            const idSet = new Set(ids);
            set((state) => {
              const notifications = state.notifications.filter((n) => !idSet.has(n.id));
              const unreadCount = notifications.filter((n) => !n.isRead).length;
              updateBadge(unreadCount);
              return { notifications, unreadCount };
            });
          } catch {
            // ignore parse errors
          }
        });

        es.addEventListener('force_logout', (event) => {
          try {
            const { sessionId } = JSON.parse(event.data);
            const currentSessionId = localStorage.getItem('sessionId');
            if (currentSessionId && Number(currentSessionId) === Number(sessionId)) {
              // This session was revoked — clear credentials and redirect to login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('sessionId');
              document.cookie = 'crm-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              window.location.href = '/auth/login';
            }
          } catch {
            // ignore parse errors
          }
        });

          es.onerror = () => {
            es.close();
            set({ eventSource: null });
            const timer = setTimeout(() => {
              set({ reconnectTimer: null });
              // connectSSE() re-fetches a fresh token before reconnecting,
              // so a 15-min token expiry never strands the stream.
              get().connectSSE();
            }, 5000);
            set({ reconnectTimer: timer });
          };

          set({ eventSource: es });
        })();
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
        const { pushLoading } = get();
        if (pushLoading || !isPushSupported()) return;

        const permission = getPermissionState();
        if (permission !== 'granted') return; // 'denied' or not yet asked

        // Always re-register on the backend, even if the browser already has a
        // subscription. This rebinds the device endpoint to the CURRENT account
        // (handles switching accounts on a shared device — otherwise pushes for
        // the previous account keep arriving). The server reassigns the endpoint
        // and drops stale rows for other users.
        set({ pushLoading: true });
        try {
          const sub = await enablePushNotifications(roleId);
          set({ pushEnabled: !!sub, pushPermission: 'granted' });
        } finally {
          set({ pushLoading: false });
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
