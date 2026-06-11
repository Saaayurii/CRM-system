'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

interface UserProfile {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  isActive?: boolean;
  availability?: number;
  hireDate?: string;
  birthDate?: string;
  address?: string;
  avatarUrl?: string;
  role?: { name?: string; code?: string };
  roleId?: number;
}

const ROLE_NAMES: Record<number, string> = {
  1: 'Супер Администратор',
  2: 'Администратор',
  3: 'HR Менеджер',
  4: 'Менеджер проектов',
  5: 'Прораб',
  6: 'Снабженец',
  7: 'Кладовщик',
  8: 'Бухгалтер',
  9: 'Инспектор',
  10: 'Рабочий',
  11: 'Поставщик',
  12: 'Подрядчик',
  13: 'Наблюдатель',
  14: 'Аналитик',
};

const AVAILABILITY_LABEL: Record<number, string> = {
  0: 'Офлайн', 1: 'Онлайн', 2: 'Занят', 3: 'В отпуске', 4: 'На больничном',
};

function fmtDate(v: string | null | undefined): string | null {
  if (!v) return null;
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return null;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0] || '?').toUpperCase();
}

interface Props {
  userId: number;
  onClose: () => void;
}

/** Read-only employee card opened by clicking a sender avatar/name in chat. */
export default function UserProfileModal({ userId, onClose }: Props) {
  const t = useT();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/users/${userId}`)
      .then(({ data }) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const active = user?.isActive ?? true;
  const roleName = user?.role?.name || ROLE_NAMES[user?.roleId || 0] || '—';
  const availLabel = AVAILABILITY_LABEL[user?.availability ?? 1] ?? 'Онлайн';
  const birthDate = fmtDate(user?.birthDate);
  const hireDate = fmtDate(user?.hireDate);
  const displayName = user?.name || user?.email || 'Пользователь';

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            Не удалось загрузить профиль
          </div>
        )}

        {!loading && !error && user && (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xl font-bold uppercase shrink-0 relative overflow-hidden">
                {getInitials(displayName)}
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full rounded-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                  {displayName}
                </h2>
                {user.position && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.position}</p>
                )}
                <span className={`inline-flex mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  active
                    ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                    : 'bg-red-500/20 text-red-700 dark:text-red-400'
                }`}>
                  {active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            </div>

            {/* Details */}
            <dl className="space-y-3">
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <dt className="text-xs text-gray-400">{t('Роль')}</dt>
                  <dd className="text-sm text-gray-800 dark:text-gray-100">{roleName}</dd>
                </div>
              </div>

              {user.phone && (
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <dt className="text-xs text-gray-400">{t('Телефон')}</dt>
                    <dd>
                      <a href={`tel:${user.phone}`} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
                        {user.phone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {user.email && (
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <dt className="text-xs text-gray-400">Email</dt>
                    <dd className="text-sm text-gray-800 dark:text-gray-100 break-all">{user.email}</dd>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9 10a3 3 0 106 0 3 3 0 00-6 0z" />
                </svg>
                <div>
                  <dt className="text-xs text-gray-400">{t('Доступность')}</dt>
                  <dd className="text-sm text-gray-800 dark:text-gray-100">{availLabel}</dd>
                </div>
              </div>

              {hireDate && (
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <dt className="text-xs text-gray-400">{t('Дата найма')}</dt>
                    <dd className="text-sm text-gray-800 dark:text-gray-100">{hireDate}</dd>
                  </div>
                </div>
              )}

              {birthDate && (
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18z" />
                  </svg>
                  <div>
                    <dt className="text-xs text-gray-400">{t('Дата рождения')}</dt>
                    <dd className="text-sm text-gray-800 dark:text-gray-100">{birthDate}</dd>
                  </div>
                </div>
              )}

              {user.address && (
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <dt className="text-xs text-gray-400">{t('Адрес')}</dt>
                    <dd className="text-sm text-gray-800 dark:text-gray-100">{user.address}</dd>
                  </div>
                </div>
              )}
            </dl>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={onClose}
                className="w-full py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
