'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function ForemanCalendarPage() {
  const t = useT();
  return (
    <UnifiedCalendar
      title={t('Календарь прораба')}
      subtitle={t('Задачи бригад, инспекции на участках, поставки')}
      defaultSources={['tasks', 'inspections', 'calendar', 'external']}
      availableSources={['tasks', 'inspections', 'calendar', 'attendance', 'external']}
    />
  );
}
