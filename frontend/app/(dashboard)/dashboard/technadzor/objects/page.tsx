'use client';
import TechnadzorListPage from '@/components/technadzor/TechnadzorListPage';
import { technadzorObjectsConfig } from '@/lib/admin/technadzorConfigs';

export default function Page() {
  return (
    <TechnadzorListPage
      config={technadzorObjectsConfig()}
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Объекты' }]}
    />
  );
}
