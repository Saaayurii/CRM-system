'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function InspectorCalendarPage() {
  const t = useT();
  return (
    <UnifiedCalendar
      title={t('Календарь инспектора')}
      subtitle={t('Запланированные инспекции и дедлайны устранения дефектов')}
      defaultSources={['inspections', 'tasks', 'calendar', 'external']}
      availableSources={['inspections', 'tasks', 'calendar', 'projects', 'external']}
      onlyMine
    />
  );
}
