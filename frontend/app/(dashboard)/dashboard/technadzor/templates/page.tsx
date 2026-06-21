'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TechnadzorListPage from '@/components/technadzor/TechnadzorListPage';
import { technadzorTemplatesConfig } from '@/lib/admin/technadzorConfigs';

export default function Page() {
  const router = useRouter();
  return (
    <TechnadzorListPage
      config={technadzorTemplatesConfig()}
      breadcrumbs={[{ label: 'Справочники' }, { label: 'Шаблоны инспекций' }]}
      onRowClick={(row) => router.push(`/dashboard/technadzor/templates/new?id=${row.id}`)}
      actions={
        <Link href="/dashboard/technadzor/templates/new" className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white">
          Конструктор чек-листа
        </Link>
      }
    />
  );
}
