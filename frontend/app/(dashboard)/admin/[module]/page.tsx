'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { ADMIN_MODULES } from '@/lib/admin/modules';
import CrudPage from '@/components/admin/CrudPage';

export default function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = use(params);
  const config = ADMIN_MODULES[module];

  if (!config) {
    notFound();
  }

  return <CrudPage config={config} />;
}
