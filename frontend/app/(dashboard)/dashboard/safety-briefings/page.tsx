'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CrudPage from '@/components/admin/CrudPage';
import { ADMIN_MODULES } from '@/lib/admin/modulesConfig';

export default function SafetyBriefingsListPage() {
  const router = useRouter();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/dashboard/hse" className="text-sm text-violet-500 hover:text-violet-600">
          ← Охрана труда
        </Link>
      </div>
      <CrudPage
        config={ADMIN_MODULES['safety-briefings']}
        onRowClick={(row) => router.push(`/dashboard/safety-briefings/${row.id}`)}
        onExtraAction={(actionKey, row) => {
          if (actionKey === 'open-detail') {
            router.push(`/dashboard/safety-briefings/${row.id}`);
          }
        }}
      />
    </div>
  );
}
