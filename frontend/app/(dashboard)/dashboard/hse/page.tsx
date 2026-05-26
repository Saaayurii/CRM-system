'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface HseSummary {
  counters: {
    openRisks: number;
    newIncidents: number;
    activePermits: number;
    openViolations: number;
    overdueActions: number;
    criticalMonitoring: number;
  };
  lastIncidents: Array<Record<string, any>>;
  lastViolations: Array<Record<string, any>>;
}

const CARDS: Array<{
  key: keyof HseSummary['counters'];
  title: string;
  href: string;
  color: string;
  description: string;
}> = [
  { key: 'openRisks', title: 'Открытые риски', href: '/dashboard/hse/risks', color: 'orange', description: 'Идентифицированные/смягчаемые' },
  { key: 'newIncidents', title: 'Новые инциденты', href: '/dashboard/hse/incidents', color: 'red', description: 'Требуют расследования' },
  { key: 'activePermits', title: 'Действующие наряды', href: '/dashboard/hse/permits', color: 'blue', description: 'Согласованные и в работе' },
  { key: 'openViolations', title: 'Открытые нарушения', href: '/dashboard/hse/violations', color: 'yellow', description: 'Не устранены' },
  { key: 'overdueActions', title: 'Просроченные меры', href: '/dashboard/hse/corrective-actions', color: 'red', description: 'Корректирующие действия' },
  { key: 'criticalMonitoring', title: 'Критич. показатели', href: '/dashboard/hse/monitoring', color: 'red', description: 'Мониторинг условий' },
];

const COLOR_MAP: Record<string, string> = {
  red: 'border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  orange: 'border-orange-200 dark:border-orange-900 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
  yellow: 'border-yellow-200 dark:border-yellow-900 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
  blue: 'border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  green: 'border-green-200 dark:border-green-900 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
};

const SECTIONS: Array<{ title: string; href: string; description: string; icon: string }> = [
  { title: 'Журнал инструктажей', href: '/dashboard/safety-briefings', description: 'Электронный журнал с подписями участников', icon: '📋' },
  { title: 'Реестр рисков', href: '/dashboard/hse/risks', description: 'Идентификация и оценка рисков', icon: '⚠️' },
  { title: 'Инциденты и НС', href: '/dashboard/hse/incidents', description: 'Расследование, корневые причины', icon: '🚨' },
  { title: 'Наряды-допуски', href: '/dashboard/hse/permits', description: 'Управление допусками на опасные работы', icon: '📑' },
  { title: 'Нарушения ТБ', href: '/dashboard/hse/violations', description: 'Фиксация нарушений и устранение', icon: '🛑' },
  { title: 'Корректирующие меры', href: '/dashboard/hse/corrective-actions', description: 'План действий по результатам', icon: '✅' },
  { title: 'Мониторинг условий', href: '/dashboard/hse/monitoring', description: 'Критические показатели объекта', icon: '🌡️' },
];

export default function HsePage() {
  const [summary, setSummary] = useState<HseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<HseSummary>('/hse/summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Охрана труда (HSE)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Управление рисками, инцидентами, нарядами-допусками и журналом инструктажей.
          </p>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {CARDS.map((c) => {
          const value = summary?.counters[c.key] ?? 0;
          return (
            <Link
              key={c.key}
              href={c.href}
              className={`block rounded-lg border p-4 transition-colors hover:shadow-sm ${COLOR_MAP[c.color] ?? COLOR_MAP.blue}`}
            >
              <div className="text-xs uppercase font-semibold opacity-80">{c.title}</div>
              <div className="text-3xl font-bold mt-1">{loading ? '…' : value}</div>
              <div className="text-xs opacity-70 mt-1">{c.description}</div>
            </Link>
          );
        })}
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-violet-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{s.icon}</span>
              <div>
                <div className="font-semibold text-gray-800 dark:text-gray-100">{s.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.description}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent incidents */}
      {summary && (summary.lastIncidents?.length > 0 || summary.lastViolations?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
          {summary.lastIncidents?.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="font-semibold mb-3">Последние инциденты</div>
              <ul className="space-y-2">
                {summary.lastIncidents.map((i) => (
                  <li key={i.id} className="text-sm border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                    <Link href={`/dashboard/hse/incidents`} className="text-violet-600 hover:underline">
                      #{i.id} · {i.incidentType}
                    </Link>
                    <div className="text-gray-500 truncate">{i.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.lastViolations?.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="font-semibold mb-3">Последние нарушения</div>
              <ul className="space-y-2">
                {summary.lastViolations.map((v) => (
                  <li key={v.id} className="text-sm border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                    <Link href={`/dashboard/hse/violations`} className="text-violet-600 hover:underline">
                      #{v.id} · {v.category || 'нарушение'}
                    </Link>
                    <div className="text-gray-500 truncate">{v.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
