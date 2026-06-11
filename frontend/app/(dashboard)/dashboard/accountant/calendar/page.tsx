'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function AccountantCalendarPage() {
  const t = useT();
  return (
    <UnifiedCalendar
      title={t('Календарь бухгалтера')}
      subtitle={t('Графики платежей, акты, расчёт ЗП и отчётные периоды')}
      defaultSources={['calendar', 'tasks', 'external']}
      availableSources={['calendar', 'tasks', 'projects', 'external']}
    />
  );
}
