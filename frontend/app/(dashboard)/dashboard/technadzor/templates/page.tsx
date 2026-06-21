'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Шаблоны инспекций"
      subtitle="Конструктор чек-листов для инспекций"
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Шаблоны инспекций' }]}
      planned={[
        { title: 'Список шаблонов', description: 'Шаблоны чек-листов с типом инспекции и кол-вом пунктов.' },
        { title: 'Новый шаблон', description: 'Переход в конструктор: разделы + пункты из библиотеки.' },
      ]}
    />
  );
}
