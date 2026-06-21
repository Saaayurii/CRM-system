'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="PDF отчёты"
      subtitle="Генерация и настройка отчётов"
      breadcrumbs={[{ label: 'Отчёты' }, { label: 'PDF отчёты' }]}
      planned={[
        { title: 'Шаблоны отчётов', description: 'Акт осмотра, отчёт технадзора, приёмка квартиры, гарантийный осмотр, промежуточный контроль, исполнительная документация.' },
        { title: 'Настройка отчёта', description: 'Выбор инспекции/объекта, разделы отчёта, оформление, язык.' },
        { title: 'Предпросмотр и генерация', description: 'Предпросмотр PDF + «Сформировать отчёт» (documents-service /pdf/generate).' },
        { title: 'Мои отчёты', description: 'История сгенерированных отчётов.' },
      ]}
    />
  );
}
