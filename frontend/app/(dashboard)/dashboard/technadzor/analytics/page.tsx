'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Аналитика"
      subtitle="Статистика инспекций и дефектов"
      breadcrumbs={[{ label: 'Отчёты' }, { label: 'Аналитика' }]}
      planned={[
        { title: 'Ключевые метрики', description: 'Кол-во инспекций, дефектов, % соответствия, средний срок устранения.' },
        { title: 'Графики', description: 'Динамика дефектов по времени, по объектам, по критичности, по подрядчикам.' },
        { title: 'Рейтинги', description: 'Рейтинг объектов/подрядчиков по качеству.' },
      ]}
    />
  );
}
