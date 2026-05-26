'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  EmployeeAvatar,
  EmployeeData,
  ModalShell,
  OnlineBadge,
  fmtDate,
  getRoleName,
} from './shared';

type TabKey =
  | 'main'
  | 'documents'
  | 'finance'
  | 'access'
  | 'projects'
  | 'activity'
  | 'history';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  {
    key: 'main',
    label: 'Основное',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: 'documents',
    label: 'Документы',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'finance',
    label: 'Финансы',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    key: 'access',
    label: 'Доступы',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.657-1.343-3-3-3S6 9.343 6 11s1.343 3 3 3 3-1.343 3-3zm0 0v6m6-6V9a2 2 0 00-2-2h-1m3 4v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6" />
      </svg>
    ),
  },
  {
    key: 'projects',
    label: 'Проекты и задачи',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    key: 'activity',
    label: 'Активность',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    key: 'history',
    label: 'История изменений',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

interface Props {
  employee: EmployeeData;
  canEdit?: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

interface Stats {
  projects: number;
  tasks: number;
  accessRoles: number;
}

export default function EmployeeFullProfileModal({
  employee,
  canEdit = true,
  onClose,
  onEdit,
}: Props) {
  const [tab, setTab] = useState<TabKey>('main');
  const [stats, setStats] = useState<Stats>({ projects: 0, tasks: 0, accessRoles: 1 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          api.get('/tasks', { params: { assignedToUserId: employee.id, limit: 1 } }).catch(() => null),
          api.get('/projects', { params: { limit: 1 } }).catch(() => null),
        ]);
        if (cancelled) return;
        const tasksTotal =
          tasksRes?.data?.total ??
          (Array.isArray(tasksRes?.data?.tasks) ? tasksRes?.data.tasks.length : 0) ??
          0;
        const projectsTotal =
          projectsRes?.data?.total ??
          (Array.isArray(projectsRes?.data?.projects) ? projectsRes?.data.projects.length : 0) ??
          0;
        setStats({
          projects: Number(projectsTotal) || 0,
          tasks: Number(tasksTotal) || 0,
          accessRoles: 1,
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee.id]);

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-4xl">
      <div className="flex h-[640px] max-h-[90dvh]">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 py-4">
          <nav className="flex flex-col">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors text-left ${
                    active
                      ? 'text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 border-r-2 border-violet-500 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className={active ? 'text-violet-500' : 'text-gray-400'}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="px-6 pt-5 pb-3 flex items-start gap-4 border-b border-gray-100 dark:border-gray-700">
            <EmployeeAvatar employee={employee} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                {employee.name}
              </h2>
              <div className="mt-1">
                <OnlineBadge employee={employee} />
              </div>
            </div>
            <div className="flex items-start gap-1">
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  title="Редактировать"
                  className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                title="Закрыть"
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {tab === 'main' && <MainTab employee={employee} stats={stats} />}
            {tab === 'documents' && <PlaceholderTab title="Документы" />}
            {tab === 'finance' && <PlaceholderTab title="Финансы" />}
            {tab === 'access' && <AccessTab employee={employee} />}
            {tab === 'projects' && <PlaceholderTab title="Проекты и задачи" />}
            {tab === 'activity' && <PlaceholderTab title="Активность" />}
            {tab === 'history' && <PlaceholderTab title="История изменений" />}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-100">{value || '—'}</dd>
    </div>
  );
}

function MainTab({ employee, stats }: { employee: EmployeeData; stats: Stats }) {
  const hireDate = fmtDate(employee.hireDate || employee.hire_date);
  const active = employee.isActive ?? employee.is_active ?? true;
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Основное</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Роль" value={getRoleName(employee)} />
          <Field
            label="Телефон"
            value={
              employee.phone ? (
                <a
                  href={`tel:${employee.phone}`}
                  className="text-violet-600 dark:text-violet-400 hover:underline"
                >
                  {employee.phone}
                </a>
              ) : null
            }
          />
          <Field label="Должность" value={employee.position} />
          <Field
            label="Email"
            value={
              <a
                href={`mailto:${employee.email}`}
                className="text-violet-600 dark:text-violet-400 hover:underline break-all"
              >
                {employee.email}
              </a>
            }
          />
          <Field label="Дата найма" value={hireDate} />
          <Field label="Статус" value={active ? 'Активен' : 'Деактивирован'} />
          {employee.address && <Field label="Адрес" value={employee.address} />}
        </dl>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Проектов" value={stats.projects} hint="Доступных проектов" />
        <StatCard label="Задач" value={stats.tasks} hint="Назначено задач" />
        <StatCard label="Права доступа" value={stats.accessRoles} hint="Ролей в системе" />
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</div>
    </div>
  );
}

function AccessTab({ employee }: { employee: EmployeeData }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Роль в системе</h3>
      <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {getRoleName(employee)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          ID роли: {employee.roleId ?? employee.role_id ?? '—'}
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Тонкая настройка прав по разделам — в разработке.
      </p>
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 text-gray-400 dark:text-gray-500">
      <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
      <p className="text-xs mt-1">Раздел в разработке</p>
    </div>
  );
}
