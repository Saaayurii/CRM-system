'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="На контроле"
      subtitle="Дефекты под наблюдением до устранения"
      breadcrumbs={[{ label: 'Дефекты' }, { label: 'На контроле' }]}
      planned={[
        { title: 'Наблюдаемые дефекты', description: 'Дефекты, добавленные в наблюдение (watchers).' },
        { title: 'Контроль SLA', description: 'Просроченные сроки устранения с эскалацией через уведомления.' },
      ]}
    />
  );
}
