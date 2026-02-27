'use client';
import Link from 'next/link';
import CrudPage from '@/components/admin/CrudPage';
import { ADMIN_MODULES } from '@/lib/admin/modulesConfig';

export default function InspectorDefectsPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard" className="text-sm text-violet-500 hover:text-violet-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Назад к панели управления
        </Link>
      </div>
      <CrudPage config={ADMIN_MODULES.defects} />
    </div>
  );
}
