'use client';

import { useRouter } from 'next/navigation';
import TechnadzorListPage from '@/components/technadzor/TechnadzorListPage';
import InspectionsStatsHeader from '@/components/technadzor/InspectionsStatsHeader';
import { technadzorInspectionConfigs } from '@/lib/admin/technadzorConfigs';

type Variant = 'mine' | 'assigned' | 'control' | 'all';

export default function TechnadzorInspectionsList({
  variant,
  breadcrumbLabel,
}: {
  variant: Variant;
  breadcrumbLabel: string;
}) {
  const router = useRouter();
  // Имена проекта/инспектора приходят с бэкенда (projectName/inspectorName).
  return (
    <TechnadzorListPage
      config={technadzorInspectionConfigs[variant]()}
      breadcrumbs={[{ label: 'Проверки' }, { label: breadcrumbLabel }]}
      header={<InspectionsStatsHeader />}
      onRowClick={(row) => router.push(`/dashboard/technadzor/inspections/${row.id}`)}
    />
  );
}
