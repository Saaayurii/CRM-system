'use client';
import TechnadzorScaffold from '@/components/technadzor/TechnadzorScaffold';

export default function Page() {
  return (
    <TechnadzorScaffold
      title="Подрядчики"
      subtitle="Контрагенты и подрядчики (suppliers-service)"
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Подрядчики' }]}
      planned={[
        { title: 'Справочник подрядчиков', description: 'Данные подтягиваются из suppliers-service (contractors), не дублируются.' },
        { title: 'Качество', description: 'Сводка по дефектам и рейтингу подрядчика.' },
      ]}
    />
  );
}
