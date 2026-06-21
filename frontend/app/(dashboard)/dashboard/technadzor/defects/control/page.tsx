'use client';
import { useRouter } from 'next/navigation';
import TechnadzorListPage from '@/components/technadzor/TechnadzorListPage';
import { technadzorDefectConfigs } from '@/lib/admin/technadzorConfigs';

export default function Page() {
  const router = useRouter();
  return (
    <TechnadzorListPage
      config={technadzorDefectConfigs.control()}
      breadcrumbs={[{ label: 'Дефекты' }, { label: 'На контроле' }]}
      onRowClick={(row) => router.push(`/dashboard/technadzor/defects/${row.id}`)}
    />
  );
}
