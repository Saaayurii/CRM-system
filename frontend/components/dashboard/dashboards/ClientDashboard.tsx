'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function getDateStr(): string {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const key of ['data', 'items', 'results', 'projects']) {
      if (Array.isArray(data[key])) return data[key];
    }
    const arr = Object.values(data).find((v) => Array.isArray(v));
    if (arr) return arr as any[];
  }
  return [];
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return String(v);
  }
}

const PROJECT_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Черновик', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  1: { label: 'В работе', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  2: { label: 'Приостановлен', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  3: { label: 'Завершён', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  4: { label: 'Отменён', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

type Tile = { href: string; label: string; desc: string; icon: React.ReactNode };

const TILES: Tile[] = [
  {
    href: '/dashboard/projects',
    label: 'Мои проекты',
    desc: 'Статус и прогресс работ',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
  {
    href: '/dashboard/documents',
    label: 'Документы',
    desc: 'Акты и проектная документация',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v5h5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/chat',
    label: 'Чат с командой',
    desc: 'Вопросы по вашему объекту',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path d="M4 4h16v12H7l-3 3V4Z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/calendar',
    label: 'Календарь',
    desc: 'События и сроки',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    ),
  },
];

export default function ClientDashboard({ user }: { user: any }) {
  const t = useT();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get('/projects', { params: { limit: 50 } })
      .then(({ data }) => {
        if (active) setProjects(extractArray(data));
      })
      .catch(() => {
        if (active) setProjects([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fullName = user?.name || 'Клиент';

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {getGreeting()}, {fullName}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">{getDateStr()}</p>
        <span className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200/60 dark:ring-violet-500/20">
          Клиентский портал · режим только просмотра
        </span>
      </div>

      {/* Projects */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('Ваши объекты')}</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
            Пока нет доступных проектов. Они появятся, когда менеджер откроет вам доступ.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const st = PROJECT_STATUS[p.status] ?? PROJECT_STATUS[0];
              const progress = typeof p.progress === 'number' ? Math.max(0, Math.min(100, p.progress)) : null;
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.id}`}
                  className="block rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">{p.name}</h3>
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  {p.code && <p className="mt-1 text-xs text-gray-400">{p.code}</p>}
                  {progress !== null && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>{t('Прогресс')}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Начало: {fmtDate(p.startDate ?? p.start_date)}</span>
                    <span>Срок: {fmtDate(p.endDate ?? p.end_date)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick access tiles */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('Быстрый доступ')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                {t.icon}
              </div>
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{t.label}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
