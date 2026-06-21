'use client';
import { useRouter } from 'next/navigation';
import { useToastStore } from '@/stores/toastStore';
import TechnadzorListPage from '@/components/technadzor/TechnadzorListPage';
import { technadzorObjectsConfig } from '@/lib/admin/technadzorConfigs';

export default function Page() {
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  return (
    <TechnadzorListPage
      config={technadzorObjectsConfig()}
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Объекты' }]}
      // Клик по строке → расширенная карточка объекта проекта (с техническим паспортом)
      onRowClick={(row) => {
        const projectId = row.projectId ?? row.project_id;
        if (projectId) {
          router.push(`/dashboard/projects/${projectId}/objects/${row.id}`);
        } else {
          addToast('warning', 'У объекта не указан проект — паспорт доступен только для объектов внутри проекта');
        }
      }}
    />
  );
}
