'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { ChatOnlyProvider } from '@/components/chat/ChatOnlyContext';
import ToastContainer from '@/components/ui/ToastContainer';
import MaintenanceGuard from '@/components/layout/MaintenanceGuard';
import RecordingPill from '@/components/chat/RecordingPill';
import PushInit from '@/components/layout/PushInit';

// Standalone chat layout for the chat subdomain (chat.crm.3stroy15.pro).
// Deliberately omits the dashboard chrome (Sidebar/Header/MiniChat/QuickActions)
// — just the chat fills the viewport. Auth/Theme providers come from the root
// layout, so a session established on the main domain (SSO cookie) carries over.
export default function ChatRoomLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    document.documentElement.classList.add('app-shell');
    return () => document.documentElement.classList.remove('app-shell');
  }, []);

  // No session even after init resolved (SSO cookie absent/expired) → login.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#e9e9e9] dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <MaintenanceGuard>
      <ChatOnlyProvider>
        {children}
        <RecordingPill />
        <ToastContainer />
        <PushInit />
      </ChatOnlyProvider>
    </MaintenanceGuard>
  );
}
