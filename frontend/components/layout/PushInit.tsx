'use client';

import { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Silent component that initialises push notifications once the user is
 * authenticated.  Mount it in the dashboard layout — it renders nothing.
 */
export default function PushInit() {
  const { initPush } = useNotificationStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    // Pass roleId so the backend can store it for role-based filtering
    initPush(user.roleId ?? undefined);
  }, [user, initPush]);

  // Also re-subscribe when the SW sends PUSH_SUBSCRIPTION_CHANGED
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        initPush(user?.roleId ?? undefined);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [user, initPush]);

  return null;
}
