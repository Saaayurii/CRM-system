'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

interface NavCard {
  title: string;
  href: string;
  description: string;
  icon: string;
  color: string;
}

const NAV_ITEMS: NavCard[] = [
  { title: 'Инспекции', href: '/dashboard/technadzor/inspections', description: 'Полный реестр инспекций', icon: '📋', color: 'violet' },
  { title: 'Дефекты', href: '/dashboard/technadzor/defects', description: 'Реестр выявленных дефектов', icon: '⚠️', color: 'red' },
  { title: 'Аналитика', href: '/dashboard/technadzor/analytics', description: 'Статистика и сводки', icon: '📊', color: 'green' },
  { title: 'PDF отчёты', href: '/dashboard/technadzor/reports', description: 'Генерация актов и отчётов', icon: '📄', color: 'violet' },
  { title: 'Шаблоны инспекций', href: '/dashboard/technadzor/templates', description: 'Конструктор чек-листов', icon: '🧩', color: 'blue' },
  { title: 'Пункты контроля', href: '/dashboard/technadzor/control-points', description: 'Библиотека контрольных пунктов', icon: '✅', color: 'green' },
  { title: 'Нормативы (ГОСТ, СП)', href: '/dashboard/technadzor/norms', description: 'Нормативная база', icon: '📚', color: 'violet' },
  { title: 'Подрядчики', href: '/dashboard/technadzor/contractors', description: 'Контрагенты и подрядчики', icon: '🏗️', color: 'amber' },
];

const COLOR_MAP: Record<string, string> = {
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  violet: 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
};

export default function TechnadzorOverviewPage() {
  const t = useT();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('Технадзор')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('Технический надзор: инспекции, контроль качества, дефекты и нормативы')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/40 transition"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 ${COLOR_MAP[item.color] ?? COLOR_MAP.violet}`}>
              <span>{item.icon}</span>
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
              {t(item.title)}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t(item.description)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
