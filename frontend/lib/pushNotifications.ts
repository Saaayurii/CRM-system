/**
 * Web Push Notifications helpers (client-side)
 *
 * Flow:
 * 1. Fetch VAPID public key from backend  (GET /notifications/vapid-public-key)
 * 2. Request Notification permission from browser
 * 3. Subscribe via PushManager with the VAPID key
 * 4. POST subscription object to backend   (POST /notifications/push-subscribe)
 * 5. Backend stores it in push_subscriptions table
 * 6. When backend calls web-push.sendNotification(), SW shows a native notification
 */

import api from './api';

/** Convert VAPID base64url public key to Uint8Array (required by pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const arr = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  return arr.buffer as ArrayBuffer;
}

/** Returns true when push notifications are supported by the browser */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Current permission state: 'default' | 'granted' | 'denied' */
export function getPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Full subscription flow:
 * - Requests permission
 * - Subscribes via PushManager
 * - Sends subscription to backend
 * Returns the subscription or null on failure/denial.
 */
export async function enablePushNotifications(
  roleId?: number,
): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  // 1. Get VAPID public key
  let vapidPublicKey: string | null =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;

  if (!vapidPublicKey) {
    try {
      const { data } = await api.get<{ publicKey: string | null }>(
        '/notifications/vapid-public-key',
      );
      vapidPublicKey = data.publicKey;
    } catch {
      return null;
    }
  }

  if (!vapidPublicKey) return null;

  // 2. Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  // 3. Wait for SW registration
  const registration = await navigator.serviceWorker.ready;

  // 4. Re-use existing subscription if the endpoint is already registered
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  // 5. Save to backend
  const { endpoint, keys } = subscription.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  await api.post('/notifications/push-subscribe', {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: navigator.userAgent.slice(0, 500),
    roleId,
  });

  return subscription;
}

/**
 * Unsubscribe from push and remove from backend.
 */
export async function disablePushNotifications(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return;

  const { endpoint } = subscription.toJSON() as { endpoint: string };

  await Promise.allSettled([
    subscription.unsubscribe(),
    api.delete('/notifications/push-subscribe', { data: { endpoint } }),
  ]);
}

/**
 * Check if the current browser already has an active push subscription
 * registered with our backend (quick local check via PushManager).
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
