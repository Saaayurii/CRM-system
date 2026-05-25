'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';

export default function ForemanCalendarPage() {
  return (
    <UnifiedCalendar
      title="Календарь прораба"
      subtitle="Задачи бригад, инспекции на участках, поставки"
      defaultSources={['tasks', 'inspections', 'calendar', 'external']}
      availableSources={['tasks', 'inspections', 'calendar', 'attendance', 'external']}
    />
  );
}
