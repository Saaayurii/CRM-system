'use client';

import Link from 'next/link';
import RegistrationRequestsPanel from '@/components/dashboard/RegistrationRequestsPanel';
import { useT } from '@/lib/i18n';

export default function InvitesPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Заявки и инвайты')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Управление заявками на регистрацию и инвайт-ссылками')}</p>
        </div>
        <Link
          href="/dashboard/employees"
          className="text-sm text-violet-500 hover:text-violet-600 mt-2 sm:mt-0 inline-block"
        >
          &larr; К сотрудникам
        </Link>
      </div>
      <RegistrationRequestsPanel />
    </div>
  );
}
