'use client';
import { useParams } from 'next/navigation';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <TechnadzorScaffold
      title={`Инспекция ${id ?? ''}`}
      subtitle="Карточка инспекции: прогресс, пункты контроля, результаты"
      badge="Приёмочная"
      breadcrumbs={[{ label: 'Мои инспекции', href: '/dashboard/technadzor/inspections' }, { label: 'Инспекция' }]}
      planned={[
        { title: 'Шапка', description: 'Объект, тип, статус, назначенный, прогресс (12/48), кнопки «Завершить инспекцию», «Отложить».' },
        { title: 'Структура инспекции', description: 'Разделы и пункты контроля со статусами: соответствует / замечание / не соответствует / не проверено.' },
        { title: 'Информация об объекте', description: 'Вкладка с данными объекта (из projects-service construction-sites).' },
        { title: 'Кнопка «Провести»', description: 'Переход в режим проведения инспекции по чек-листу.' },
      ]}
    />
  );
}
