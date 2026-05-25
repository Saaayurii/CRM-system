'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';

export default function WorkerCalendarPage() {
  return (
    <UnifiedCalendar
      title="Мой календарь"
      subtitle="Мои задачи, смены и события"
      defaultSources={['tasks', 'calendar', 'timeoff', 'external']}
      availableSources={['tasks', 'calendar', 'timeoff', 'external']}
      onlyMine
    />
  );
}
