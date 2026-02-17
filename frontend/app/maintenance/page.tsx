'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface MaintenanceInfo {
  companyName: string;
  message: string;
  endTime: string | null;
}

function formatEndTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function Gear({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}

export default function MaintenancePage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role?.code === 'super_admin';
  const [info, setInfo] = useState<MaintenanceInfo>({
    companyName: 'CRM Система',
    message: 'Ведутся технические работы. Пожалуйста, зайдите позже.',
    endTime: null,
  });

  useEffect(() => {
    api.get('/system-settings').then((res) => {
      const data = res.data;
      const settings = data.settings || {};
      setInfo({
        companyName: data.name || 'CRM Система',
        message:
          settings.maintenance_message ||
          'Ведутся технические работы. Пожалуйста, зайдите позже.',
        endTime: settings.maintenance_end_time || null,
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10 text-center">
          {/* Animated icon */}
          <div className="flex justify-center mb-6">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
                <Gear className="w-10 h-10 text-violet-500 animate-[spin_8s_linear_infinite]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Logo / company name */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <svg className="fill-violet-500 shrink-0" xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 32 32">
              <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
            </svg>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{info.companyName}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-4 mb-3">
            Технические работы
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
            {info.message}
          </p>

          {/* Estimated end time */}
          {info.endTime && (
            <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-6">
              <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <div className="text-left">
                <p className="text-xs text-gray-400 dark:text-gray-500">Ожидаемое завершение</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formatEndTime(info.endTime)}
                </p>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-700 mb-6" />

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            Работаем над улучшениями системы
          </div>

          {/* Super-admin back link */}
          {isSuperAdmin && (
            <div className="space-y-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                Вернуться в систему
              </Link>
              <p className="text-xs text-gray-400 dark:text-gray-500">Только для супер-администратора</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          © {new Date().getFullYear()} {info.companyName}. Приносим извинения за неудобства.
        </p>
      </div>
    </div>
  );
}
