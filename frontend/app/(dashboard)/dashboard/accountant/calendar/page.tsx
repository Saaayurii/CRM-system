'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';

export default function AccountantCalendarPage() {
  return (
    <UnifiedCalendar
      title="Календарь бухгалтера"
      subtitle="Графики платежей, акты, расчёт ЗП и отчётные периоды"
      defaultSources={['calendar', 'tasks', 'external']}
      availableSources={['calendar', 'tasks', 'projects', 'external']}
    />
  );
}
