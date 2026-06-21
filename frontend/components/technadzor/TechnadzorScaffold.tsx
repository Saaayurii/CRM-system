'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export interface ScaffoldPlannedBlock {
  title: string;
  description: string;
}

interface TechnadzorScaffoldProps {
  /** Заголовок страницы */
  title: string;
  /** Краткое описание назначения раздела */
  subtitle?: string;
  /** Хлебные крошки (последний элемент — текущая страница) */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Что планируется на странице — показываем как карточки «в разработке» */
  planned?: ScaffoldPlannedBlock[];
  /** Бейдж справа от заголовка, например тип инспекции */
  badge?: string;
}

/**
 * Унифицированный каркас страницы раздела «Технадзор».
 * На этапе навигации/скелета показывает заголовок, хлебные крошки
 * и перечень планируемых блоков. Реальное наполнение подключается
 * на следующих итерациях (см. backend inspections-service).
 */
export default function TechnadzorScaffold({
  title,
  subtitle,
  breadcrumbs,
  planned = [],
  badge,
}: TechnadzorScaffoldProps) {
  const t = useT();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">
          {t('Технадзор')}
        </Link>
        {(breadcrumbs ?? []).map((bc, i) => (
          <span key={i} className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {bc.href ? (
              <Link href={bc.href} className="text-violet-500 hover:text-violet-600">{t(bc.label)}</Link>
            ) : (
              <span className="text-gray-700 dark:text-gray-200">{t(bc.label)}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{t(title)}</h1>
            {badge && (
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300">
                {t(badge)}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t(subtitle)}</p>}
        </div>
        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
          {t('В разработке')}
        </span>
      </div>

      {/* Planned blocks */}
      {planned.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {planned.map((b, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t(b.title)}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t(b.description)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-sm text-gray-400 dark:text-gray-500">
        {t('Каркас раздела. Функциональность подключается на следующих итерациях — данные берутся из inspections-service.')}
      </div>
    </div>
  );
}
