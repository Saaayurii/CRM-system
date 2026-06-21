'use client';
import { useParams } from 'next/navigation';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <TechnadzorScaffold
      title="Проведение инспекции"
      subtitle="Пошаговый проход по пунктам контроля с фотофиксацией"
      badge="Приёмочная"
      breadcrumbs={[
        { label: 'Мои инспекции', href: '/dashboard/technadzor/inspections' },
        { label: 'Инспекция', href: `/dashboard/technadzor/inspections/${id ?? ''}` },
        { label: 'Проведение' },
      ]}
      planned={[
        { title: 'Прогресс', description: 'Общий прогресс + счётчики: соответствует / замечания / не соответствует / не проверено.' },
        { title: 'Список пунктов', description: 'Разделы и пункты контроля с поиском и фильтрами, выбор текущего пункта.' },
        { title: 'Панель пункта', description: 'Статус проверки, фотофиксация (3/5), комментарий, навигация «Предыдущий/Следующий пункт».' },
        { title: 'Создать дефект', description: 'Кнопка «Создать дефект по этому пункту» → запись в defects (inspections-service).' },
        { title: 'Завершение', description: '«Завершить инспекцию» с проверкой обязательных пунктов и фото.' },
      ]}
    />
  );
}
