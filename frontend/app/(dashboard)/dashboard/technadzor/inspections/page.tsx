'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Мои инспекции"
      subtitle="Инспекции, назначенные на текущего пользователя"
      breadcrumbs={[{ label: 'Проверки' }, { label: 'Мои инспекции' }]}
      planned={[
        { title: 'Список инспекций', description: 'Таблица: № инспекции, объект, шаблон, тип, статус, прогресс, срок. Фильтры по объекту/шаблону/типу/статусу/периоду.' },
        { title: 'Сводка', description: 'Счётчики: всего, в работе, на проверке, завершено. Кольцевая диаграмма по статусам.' },
        { title: 'Вкладки', description: 'Список / Календарь / Карта объектов. Кнопки «Новая инспекция» и «Импорт инспекций».' },
        { title: 'Ближайшие сроки', description: 'Виджет с просроченными и сегодняшними инспекциями.' },
      ]}
    />
  );
}
