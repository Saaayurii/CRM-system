'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ToastContainer from '@/components/ui/ToastContainer';
import MaintenanceGuard from '@/components/layout/MaintenanceGuard';
import MaintenanceIndicator from '@/components/layout/MaintenanceIndicator';
import PushInit from '@/components/layout/PushInit';
import PendingSync from '@/components/ui/PendingSync';
import OfflineBanner from '@/components/ui/OfflineBanner';
import QuickActionsButton from '@/components/ui/QuickActionsButton';
import MiniChatWidget from '@/components/chat/MiniChatWidget';
import RecordingPill from '@/components/chat/RecordingPill';
import ForcePasswordChangeModal from '@/components/layout/ForcePasswordChangeModal';
import NoteReminder from '@/components/notes/NoteReminder';
import { useFormEnterNav } from '@/hooks/useFormEnterNav';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useFormEnterNav();
  // Фиксируем документ только в оболочке приложения (см. globals.css
  // html.app-shell) — гасим iOS-баунс body, не ломая скролл auth/лендинга.
  useEffect(() => {
    document.documentElement.classList.add('app-shell');
    return () => document.documentElement.classList.remove('app-shell');
  }, []);
  return (
    <MaintenanceGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <Header />
          <main className="grow">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        <QuickActionsButton />
        <MiniChatWidget />
        <RecordingPill />
        <ToastContainer />
        <PushInit />
        <PendingSync />
        <OfflineBanner />
        <ForcePasswordChangeModal />
        <NoteReminder />
        <MaintenanceIndicator />
      </div>
    </MaintenanceGuard>
  );
}
