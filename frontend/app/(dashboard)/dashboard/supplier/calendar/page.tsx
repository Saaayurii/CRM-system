'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';

export default function SupplierCalendarPage() {
  return (
    <UnifiedCalendar
      title="Календарь снабжения"
      subtitle="Поставки, заявки, заказы поставщикам"
      defaultSources={['calendar', 'tasks', 'external']}
      availableSources={['calendar', 'tasks', 'projects', 'external']}
    />
  );
}
