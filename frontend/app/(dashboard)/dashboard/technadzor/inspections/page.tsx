'use client';
import { useRouter } from 'next/navigation';
import TechnadzorListPage from '@/components/technadzor/TechnadzorListPage';
import { technadzorInspectionConfigs } from '@/lib/admin/technadzorConfigs';

export default function Page() {
  const router = useRouter();
  return (
    <TechnadzorListPage
      config={technadzorInspectionConfigs.mine()}
      breadcrumbs={[{ label: 'Проверки' }, { label: 'Мои инспекции' }]}
      onRowClick={(row) => router.push(`/dashboard/technadzor/inspections/${row.id}`)}
    />
  );
}
