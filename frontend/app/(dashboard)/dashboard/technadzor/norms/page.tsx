'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Нормативы (ГОСТ, СП)"
      subtitle="Библиотека нормативных документов и связанных данных"
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Нормативы (ГОСТ, СП)' }]}
      planned={[
        { title: 'Библиотека нормативов', description: 'Дерево документов (СП, ГОСТ, СНиП) с разделами и пунктами. Уже частично есть в wiki-service (construction-norms).' },
        { title: 'Карточка пункта', description: 'Информация, контрольные пункты, типовые дефекты, связанные шаблоны, история изменений.' },
        { title: 'Связь данных', description: 'Граф связей: норматив → контрольный пункт → типовые дефекты → шаблон инспекции.' },
      ]}
    />
  );
}
