'use client';

import RegistrationRequestsPanel from '@/components/dashboard/RegistrationRequestsPanel';

export default function InvitesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Заявки и инвайты</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление заявками на регистрацию и инвайт-ссылками</p>
      </div>
      <RegistrationRequestsPanel />
    </div>
  );
}
