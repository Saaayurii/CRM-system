'use client';
import { useParams } from 'next/navigation';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <TechnadzorScaffold
      title={`Дефект ${id ?? ''}`}
      subtitle="Карточка дефекта: описание, фото, связи, история"
      badge="В работе"
      breadcrumbs={[{ label: 'Все дефекты', href: '/dashboard/technadzor/defects' }, { label: 'Дефект' }]}
      planned={[
        { title: 'Шапка', description: 'ID, критичность, тип, категория, источник, статус, объект/помещение.' },
        { title: 'Описание и фото', description: 'Пункт контроля, требование, норматив; галерея фото при выявлении и текущих, файлы.' },
        { title: 'Назначение', description: 'Ответственный, исполнитель, наблюдатели; контакты (чат/звонок/почта).' },
        { title: 'Сроки и контроль', description: 'Плановый/фактический срок, статусная шкала (Создан→Назначен→В работе→Устранён→Проверен→Закрыт).' },
        { title: 'Действия', description: '«Отметить устранённым», «Отправить на проверку», «Создать задачу» (tasks-service), «Закрыть дефект».' },
        { title: 'История и комментарии', description: 'Лента изменений + комментарии.' },
      ]}
    />
  );
}
