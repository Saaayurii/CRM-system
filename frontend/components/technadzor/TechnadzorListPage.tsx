'use client';

import Link from 'next/link';
import type { CrudModuleConfig } from '@/types/admin';
import CrudPage from '@/components/admin/CrudPage';
import { useT } from '@/lib/i18n';

interface TechnadzorListPageProps {
  config: CrudModuleConfig;
  breadcrumbs: Array<{ label: string; href?: string }>;
  /** Клик по строке (например, переход в карточку). */
  onRowClick?: (row: Record<string, unknown>) => void;
  /** Доп. действия справа от хлебных крошек (например, ссылка на конструктор). */
  actions?: React.ReactNode;
  /** Контент над таблицей (например, KPI-карточки и сводка). */
  header?: React.ReactNode;
}

/**
 * Страница-список раздела «Технадзор»: хлебные крошки + переиспользуемый CrudPage.
 */
export default function TechnadzorListPage({ config, breadcrumbs, onRowClick, actions, header }: TechnadzorListPageProps) {
  const t = useT();
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
          <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">
            {t('Технадзор')}
          </Link>
          {breadcrumbs.map((bc, i) => (
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
        {actions}
      </div>
      {header}
      <CrudPage config={config} onRowClick={onRowClick} />
    </div>
  );
}
