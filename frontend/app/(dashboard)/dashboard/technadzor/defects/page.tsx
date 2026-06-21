'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Все дефекты"
      subtitle="Реестр выявленных дефектов и нарушений"
      breadcrumbs={[{ label: 'Дефекты' }, { label: 'Все дефекты' }]}
      planned={[
        { title: 'Реестр дефектов', description: 'Таблица: ID, наименование, объект/помещение, критичность, тип, статус, срок устранения (SLA).' },
        { title: 'Фильтры', description: 'По объекту, критичности, статусу, исполнителю, просрочке SLA.' },
        { title: 'Создать дефект', description: 'Создание дефекта вручную или из пункта инспекции.' },
      ]}
    />
  );
}
