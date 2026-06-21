'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Календарь инспекций"
      subtitle="Сроки и расписание проверок"
      breadcrumbs={[{ label: 'Проверки' }, { label: 'Календарь' }]}
      planned={[
        { title: 'Месяц / Неделя / День', description: 'Календарная сетка инспекций по датам проведения.' },
        { title: 'Интеграция с calendar-service', description: 'Синхронизация событий инспекций в общий календарь.' },
      ]}
    />
  );
}
