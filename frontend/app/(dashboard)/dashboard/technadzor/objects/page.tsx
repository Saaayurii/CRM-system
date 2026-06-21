'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Объекты"
      subtitle="Строительные объекты (projects-service)"
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Объекты' }]}
      planned={[
        { title: 'Справочник объектов', description: 'Объекты из projects-service (construction-sites), не дублируются.' },
        { title: 'Карточка объекта', description: 'Инспекции и дефекты по объекту, технический паспорт.' },
      ]}
    />
  );
}
