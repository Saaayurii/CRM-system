'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';

export default function HRCalendarPage() {
  return (
    <UnifiedCalendar
      title="Календарь HR"
      subtitle="Отпуска, больничные, табель, обучение сотрудников"
      defaultSources={['timeoff', 'attendance', 'calendar', 'external']}
      availableSources={['timeoff', 'attendance', 'calendar', 'tasks', 'external']}
    />
  );
}
