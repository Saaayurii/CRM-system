'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function HRCalendarPage() {
  const t = useT();
  return (
    <UnifiedCalendar
      title={t('Календарь HR')}
      subtitle={t('Отпуска, больничные, табель, обучение сотрудников')}
      defaultSources={['timeoff', 'attendance', 'calendar', 'external']}
      availableSources={['timeoff', 'attendance', 'calendar', 'tasks', 'external']}
    />
  );
}
