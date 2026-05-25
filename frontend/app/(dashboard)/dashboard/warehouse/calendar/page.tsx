'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';

export default function WarehouseCalendarPage() {
  return (
    <UnifiedCalendar
      title="Календарь склада"
      subtitle="Приёмки материалов, ТО оборудования, инвентаризации"
      defaultSources={['calendar', 'tasks', 'external']}
      availableSources={['calendar', 'tasks', 'projects', 'external']}
    />
  );
}
