'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';

export default function PMCalendarPage() {
  return (
    <UnifiedCalendar
      title="Календарь руководителя проектов"
      subtitle="Дедлайны задач, вехи проектов, инспекции и встречи"
      defaultSources={['calendar', 'tasks', 'projects', 'inspections', 'external']}
      availableSources={['calendar', 'tasks', 'projects', 'inspections', 'timeoff', 'external']}
    />
  );
}
