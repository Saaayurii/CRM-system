'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Все инспекции"
      subtitle="Полный реестр инспекций компании"
      breadcrumbs={[{ label: 'Проверки' }, { label: 'Все инспекции' }]}
      planned={[
        { title: 'Реестр', description: 'Все инспекции аккаунта с расширенными фильтрами и экспортом.' },
        { title: 'Массовые действия', description: 'Назначение, смена статуса, экспорт выборки.' },
      ]}
    />
  );
}
