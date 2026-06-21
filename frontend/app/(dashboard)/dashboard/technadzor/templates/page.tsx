'use client';
import TechnadzorListPage from '@/components/technadzor/TechnadzorListPage';
import { technadzorTemplatesConfig } from '@/lib/admin/technadzorConfigs';

export default function Page() {
  return (
    <TechnadzorListPage
      config={technadzorTemplatesConfig()}
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Шаблоны инспекций' }]}
    />
  );
}
