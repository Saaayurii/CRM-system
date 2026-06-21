'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { CrudModuleConfig } from '@/types/admin';
import TechnadzorListPage from '@/components/technadzor/TechnadzorListPage';
import InspectionsStatsHeader from '@/components/technadzor/InspectionsStatsHeader';
import { technadzorInspectionConfigs } from '@/lib/admin/technadzorConfigs';

type Variant = 'mine' | 'assigned' | 'control' | 'all';

// Резолвим id проекта/инспектора в имена прямо в рендере колонок.
function withNames(base: CrudModuleConfig, projects: Record<number, string>, users: Record<number, string>): CrudModuleConfig {
  const columns = base.columns.map((col) => {
    if (col.key === 'projectId') {
      return {
        ...col,
        render: (v: unknown) => {
          const id = Number(v);
          if (!v) return <span className="text-gray-400">—</span>;
          return <span className="text-sm text-gray-700 dark:text-gray-200">{projects[id] || `#${id}`}</span>;
        },
      };
    }
    if (col.key === 'inspectorId') {
      return {
        ...col,
        render: (v: unknown) => {
          const id = Number(v);
          if (!v) return <span className="text-gray-400">—</span>;
          return <span className="text-sm text-gray-700 dark:text-gray-200">{users[id] || `#${id}`}</span>;
        },
      };
    }
    return col;
  });
  return { ...base, columns };
}

export default function TechnadzorInspectionsList({
  variant,
  breadcrumbLabel,
}: {
  variant: Variant;
  breadcrumbLabel: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Record<number, string>>({});
  const [users, setUsers] = useState<Record<number, string>>({});

  useEffect(() => {
    api.get('/projects', { params: { limit: 500 } }).then(({ data }) => {
      const list: any[] = data?.data || data?.items || (Array.isArray(data) ? data : []);
      setProjects(Object.fromEntries(list.map((p) => [p.id, p.name || p.title || `#${p.id}`])));
    }).catch(() => {});
    api.get('/users', { params: { limit: 500 } }).then(({ data }) => {
      const list: any[] = data?.data || data?.users || (Array.isArray(data) ? data : []);
      setUsers(Object.fromEntries(list.map((u) => [
        u.id,
        [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || `#${u.id}`,
      ])));
    }).catch(() => {});
  }, []);

  const config = useMemo(
    () => withNames(technadzorInspectionConfigs[variant](), projects, users),
    [variant, projects, users],
  );

  return (
    <TechnadzorListPage
      config={config}
      breadcrumbs={[{ label: 'Проверки' }, { label: breadcrumbLabel }]}
      header={<InspectionsStatsHeader />}
      onRowClick={(row) => router.push(`/dashboard/technadzor/inspections/${row.id}`)}
    />
  );
}
