'use client';
import TechnadzorListPage from '@/components/technadzor/TechnadzorListPage';
import { technadzorContractorsConfig } from '@/lib/admin/technadzorConfigs';

export default function Page() {
  return (
    <TechnadzorListPage
      config={technadzorContractorsConfig()}
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Подрядчики' }]}
    />
  );
}
