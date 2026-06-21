'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Новый шаблон инспекции"
      subtitle="Создайте структуру инспекции, добавьте пункты и настройте логику"
      breadcrumbs={[{ label: 'Шаблоны инспекций', href: '/dashboard/technadzor/templates' }, { label: 'Новый шаблон' }]}
      planned={[
        { title: 'Структура шаблона', description: 'Разделы с drag-and-drop, пункты контроля из библиотеки, обязательность пунктов.' },
        { title: 'Настройки инспекции', description: 'Тип инспекции, объект применения, вес для рейтинга, «требовать фото», «авто-создавать дефекты».' },
        { title: 'Права доступа', description: 'Кто может проводить/видеть инспекции по шаблону.' },
        { title: 'Предпросмотр и сводка', description: 'Сводка (разделы/пункты/обязательные) + предпросмотр структуры. «Сохранить черновик» / «Опубликовать».' },
      ]}
    />
  );
}
