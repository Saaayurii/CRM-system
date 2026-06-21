'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="На контроле"
      subtitle="Инспекции под моим наблюдением"
      breadcrumbs={[{ label: 'Проверки' }, { label: 'На контроле' }]}
      planned={[
        { title: 'Наблюдаемые инспекции', description: 'Инспекции, добавленные в наблюдение (watchers).' },
        { title: 'Уведомления о статусах', description: 'Сигналы при смене статуса/просрочке (через notifications-service).' },
      ]}
    />
  );
}
