'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Назначенные мне"
      subtitle="Дефекты, где я ответственный или исполнитель"
      breadcrumbs={[{ label: 'Дефекты' }, { label: 'Назначенные мне' }]}
      planned={[
        { title: 'Мои дефекты', description: 'Дефекты в моей зоне ответственности с приоритетом по SLA.' },
        { title: 'Быстрые статусы', description: 'Отметить устранённым / отправить на проверку.' },
      ]}
    />
  );
}
