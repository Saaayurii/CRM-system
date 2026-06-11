'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function WorkerCalendarPage() {
  const t = useT();
  return (
    <UnifiedCalendar
      title={t('Мой календарь')}
      subtitle={t('Мои задачи, смены и события')}
      defaultSources={['tasks', 'calendar', 'timeoff', 'external']}
      availableSources={['tasks', 'calendar', 'timeoff', 'external']}
      onlyMine
    />
  );
}
