'use client';

import { ADMIN_MODULES } from '@/lib/admin/modules';
import CrudPage from '@/components/admin/CrudPage';

export default function ClientsPage() {
  return <CrudPage config={ADMIN_MODULES.clients} />;
}
