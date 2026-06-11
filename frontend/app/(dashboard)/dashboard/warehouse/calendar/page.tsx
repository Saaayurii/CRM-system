'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function WarehouseCalendarPage() {
  const t = useT();
  return (
    <UnifiedCalendar
      title={t('Календарь склада')}
      subtitle={t('Приёмки материалов, ТО оборудования, инвентаризации')}
      defaultSources={['calendar', 'tasks', 'external']}
      availableSources={['calendar', 'tasks', 'projects', 'external']}
    />
  );
}
