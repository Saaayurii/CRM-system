'use client';

import { use, useState } from 'react';
import { notFound } from 'next/navigation';
import { ADMIN_MODULES } from '@/lib/admin/modules';
import CrudPage from '@/components/admin/CrudPage';
import EmployeeQuickViewModal from '@/components/employee/EmployeeQuickViewModal';
import EmployeeEditModal from '@/components/employee/EmployeeEditModal';
import EmployeeFullProfileModal from '@/components/employee/EmployeeFullProfileModal';
import type { EmployeeData } from '@/components/employee/shared';

export default function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = use(params);
  const config = ADMIN_MODULES[module];

  if (!config) {
    notFound();
  }

  if (module === 'users') {
    return <UsersAdminPage config={config} />;
  }

  return <CrudPage config={config} />;
}

function UsersAdminPage({ config }: { config: (typeof ADMIN_MODULES)[string] }) {
  const [viewing, setViewing] = useState<EmployeeData | null>(null);
  const [fullProfile, setFullProfile] = useState<EmployeeData | null>(null);
  const [editing, setEditing] = useState<EmployeeData | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  return (
    <>
      <CrudPage
        key={refreshTick}
        config={config}
        onRowClick={(row) => setViewing(row as unknown as EmployeeData)}
      />

      {viewing && (
        <EmployeeQuickViewModal
          employee={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
          onOpenFullProfile={() => {
            setFullProfile(viewing);
            setViewing(null);
          }}
        />
      )}

      {fullProfile && (
        <EmployeeFullProfileModal
          employee={fullProfile}
          onClose={() => setFullProfile(null)}
          onEdit={() => {
            setEditing(fullProfile);
            setFullProfile(null);
          }}
        />
      )}

      {editing && (
        <EmployeeEditModal
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}
    </>
  );
}
