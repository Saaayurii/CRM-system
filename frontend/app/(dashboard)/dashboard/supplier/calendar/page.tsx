'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function SupplierCalendarPage() {
  const t = useT();
  return (
    <UnifiedCalendar
      title={t('Календарь снабжения')}
      subtitle={t('Поставки, заявки, заказы поставщикам')}
      defaultSources={['calendar', 'tasks', 'external']}
      availableSources={['calendar', 'tasks', 'projects', 'external']}
    />
  );
}
