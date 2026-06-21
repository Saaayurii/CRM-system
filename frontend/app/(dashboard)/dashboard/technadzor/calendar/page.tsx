'use client';

import Link from 'next/link';
import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function Page() {
  const t = useT();
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6">
      <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span><span className="text-gray-700 dark:text-gray-200">{t('Календарь')}</span>
      </nav>
      <UnifiedCalendar
        title={t('Календарь инспекций')}
        subtitle={t('Запланированные инспекции и сроки устранения дефектов')}
        defaultSources={['inspections', 'tasks', 'calendar', 'external']}
        availableSources={['inspections', 'tasks', 'calendar', 'projects', 'external']}
        defaultView="month"
      />
    </div>
  );
}
