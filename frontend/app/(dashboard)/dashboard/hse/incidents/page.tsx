'use client';
import Link from 'next/link';
import CrudPage from '@/components/admin/CrudPage';
import { ADMIN_MODULES } from '@/lib/admin/modulesConfig';
import { useT } from '@/lib/i18n';

export default function HseIncidentsPage() {
  const t = useT();
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard/hse" className="text-sm text-violet-500 hover:text-violet-600">
          ← Охрана труда
        </Link>
      </div>
      <CrudPage config={ADMIN_MODULES['hse-incidents']} />
    </div>
  );
}
