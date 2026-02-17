'use client';

import RoleAccessMatrix from '@/components/admin/RoleAccessMatrix';

export default function RolesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">Матрица доступа к модулям</h1>
      </div>
      <RoleAccessMatrix />
    </div>
  );
}
