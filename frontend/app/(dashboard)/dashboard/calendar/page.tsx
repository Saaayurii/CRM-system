'use client';

import UnifiedCalendar from '@/components/calendar/UnifiedCalendar';
import { useT } from '@/lib/i18n';

export default function CalendarPage() {
  const t = useT();
  return (
    <UnifiedCalendar
      title={t('Календарь компании')}
      subtitle={t('Единая точка планирования: проекты, задачи, инспекции, HR-процессы')}
    />
  );
}
