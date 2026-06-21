'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Пункты контроля"
      subtitle="Библиотека контрольных пунктов"
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Пункты контроля' }]}
      planned={[
        { title: 'Библиотека пунктов', description: 'Контрольные пункты с кодом, типом контроля (документарный/измерительный/инструментальный), привязкой к нормативу.' },
        { title: 'Связи', description: 'Связанные дефекты и шаблоны для каждого пункта.' },
      ]}
    />
  );
}
