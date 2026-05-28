'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import EmployeesPage from '../employees/page';
import ClientsPage from '../clients/page';
import TeamsPage from '../teams/page';

const ALL_TABS = [
  { id: 'employees', label: 'Сотрудники' },
  { id: 'clients',   label: 'Клиенты' },
  { id: 'teams',     label: 'Команды' },
];

function CommunityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const roleCode = user?.role?.code;
  const isSuperAdmin = roleCode === 'super_admin';
  const isAdmin = roleCode === 'admin';
  const isPM = roleCode === 'project_manager';
  const isHR = roleCode === 'hr_manager';

  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.id === 'clients') return isSuperAdmin || isAdmin || isPM;
    if (t.id === 'teams') return isSuperAdmin || isAdmin || isPM || isHR;
    return true;
  });

  const rawTab = searchParams.get('tab') || 'employees';
  const activeTab = visibleTabs.find((t) => t.id === rawTab)?.id ?? visibleTabs[0]?.id ?? 'employees';
  const activeLabel = visibleTabs.find((t) => t.id === activeTab)?.label ?? '';

  const setTab = (id: string) => router.push(`/dashboard/community?tab=${id}`);

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Сообщество' }, { label: activeLabel }]} />

      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-0">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'employees' && <EmployeesPage />}
      {activeTab === 'clients'   && <ClientsPage />}
      {activeTab === 'teams'     && <TeamsPage />}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense>
      <CommunityContent />
    </Suspense>
  );
}
