'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function PMCalendarPage() {
  const t = useT();
  return (
    <UnifiedCalendar
      title={t('Календарь руководителя проектов')}
      subtitle={t('Дедлайны задач, вехи проектов, инспекции и встречи')}
      defaultSources={['calendar', 'tasks', 'projects', 'inspections', 'external']}
      availableSources={['calendar', 'tasks', 'projects', 'inspections', 'timeoff', 'external']}
    />
  );
}
