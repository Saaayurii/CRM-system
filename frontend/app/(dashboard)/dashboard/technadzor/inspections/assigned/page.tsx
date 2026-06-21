'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Назначенные мне"
      subtitle="Инспекции, назначенные мне другими сотрудниками"
      breadcrumbs={[{ label: 'Проверки' }, { label: 'Назначенные мне' }]}
      planned={[
        { title: 'Входящие назначения', description: 'Список инспекций, где я исполнитель/инспектор, с приоритетом по сроку.' },
        { title: 'Принять / Отклонить', description: 'Быстрые действия по входящему назначению.' },
      ]}
    />
  );
}
