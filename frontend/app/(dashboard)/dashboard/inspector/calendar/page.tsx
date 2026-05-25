'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';

export default function InspectorCalendarPage() {
  return (
    <UnifiedCalendar
      title="Календарь инспектора"
      subtitle="Запланированные инспекции и дедлайны устранения дефектов"
      defaultSources={['inspections', 'tasks', 'calendar', 'external']}
      availableSources={['inspections', 'tasks', 'calendar', 'projects', 'external']}
      onlyMine
    />
  );
}
