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
            {tab === 'documents' && <DocumentsTab employee={employee} />}
            {tab === 'finance' && <FinanceTab employee={employee} />}
            {tab === 'access' && <AccessTab employee={employee} />}
            {tab === 'projects' && <ProjectsTab employee={employee} />}
            {tab === 'activity' && <ActivityTab employee={employee} />}
            {tab === 'history' && <HistoryTab employee={employee} />}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500">
      <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span className="text-sm">Загрузка...</span>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 text-gray-400 dark:text-gray-500">
      <svg className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
      <p className="text-xs mt-1">{text}</p>
    </div>
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

function DocumentsTab({ employee }: { employee: EmployeeData }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/hr/employee-documents', { params: { userId: employee.id } })
      .then((res) => {
        const raw = res.data;
        setDocs(
          Array.isArray(raw) ? raw :
          Array.isArray(raw?.documents) ? raw.documents :
          Array.isArray(raw?.data) ? raw.data : []
        );
      })
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [employee.id]);

  if (loading) return <LoadingState />;
  if (docs.length === 0) return <EmptyState title="Документы" text="Документы сотрудника не загружены" />;

  const typeLabel = (d: any) =>
    d.documentType || d.document_type || d.type || 'Документ';

  return (
    <div className="space-y-2">
      {docs.map((d: any) => (
        <div
          key={d.id}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
        >
          <div className="shrink-0 w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{typeLabel(d)}</p>
            {(d.createdAt || d.created_at) && (
              <p className="text-xs text-gray-400 mt-0.5">{fmtDate(d.createdAt || d.created_at)}</p>
            )}
          </div>
          {(d.fileUrl || d.file_url) && (
            <a
              href={d.fileUrl || d.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
            >
              Открыть
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function FinanceTab({ employee }: { employee: EmployeeData }) {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/finance/payroll', { params: { userId: employee.id } }).catch(() => null),
      api.get('/finance/bonuses', { params: { userId: employee.id } }).catch(() => null),
    ])
      .then(([prRes, bonRes]) => {
        const prRaw = prRes?.data;
        setPayroll(
          Array.isArray(prRaw) ? prRaw :
          Array.isArray(prRaw?.payroll) ? prRaw.payroll :
          Array.isArray(prRaw?.data) ? prRaw.data : []
        );
        const bonRaw = bonRes?.data;
        setBonuses(
          Array.isArray(bonRaw) ? bonRaw :
          Array.isArray(bonRaw?.bonuses) ? bonRaw.bonuses :
          Array.isArray(bonRaw?.data) ? bonRaw.data : []
        );
      })
      .finally(() => setLoading(false));
  }, [employee.id]);

  if (loading) return <LoadingState />;

  const fmt = (n: any) => Number(n).toLocaleString('ru-RU');

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          Расчётные ведомости
        </h3>
        {payroll.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Нет данных о начислениях</p>
        ) : (
          <div className="space-y-2">
            {payroll.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
              >
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    {fmtDate(p.periodStart || p.period_start)} — {fmtDate(p.periodEnd || p.period_end)}
                  </p>
                  {p.status && (
                    <p className="text-xs text-gray-400 mt-0.5">{p.status}</p>
                  )}
                </div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">
                  {fmt(p.amount)} ₽
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Бонусы</h3>
        {bonuses.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Бонусы не начислялись</p>
        ) : (
          <div className="space-y-2">
            {bonuses.map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 mr-4">
                  {b.reason || '—'}
                </p>
                <p className="shrink-0 font-semibold text-green-600 dark:text-green-400">
                  +{fmt(b.amount)} ₽
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
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

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  in_progress: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  review: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  done: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
  cancelled: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Готово',
  cancelled: 'Отменено',
};

function ProjectsTab({ employee }: { employee: EmployeeData }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/tasks', { params: { assignedToUserId: employee.id, limit: 30 } })
      .then((res) => {
        const raw = res.data;
        setTasks(
          Array.isArray(raw) ? raw :
          Array.isArray(raw?.tasks) ? raw.tasks :
          Array.isArray(raw?.data) ? raw.data : []
        );
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [employee.id]);

  if (loading) return <LoadingState />;
  if (tasks.length === 0)
    return <EmptyState title="Задачи" text="Нет назначенных задач" />;

  return (
    <div className="space-y-2">
      {tasks.map((t: any) => {
        const statusKey = t.status || 'todo';
        return (
          <div
            key={t.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {t.title || '—'}
              </p>
              {(t.dueDate || t.due_date) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  До {fmtDate(t.dueDate || t.due_date)}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${TASK_STATUS_COLORS[statusKey] || TASK_STATUS_COLORS.todo}`}
            >
              {TASK_STATUS_LABELS[statusKey] || statusKey}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityTab({ employee }: { employee: EmployeeData }) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/hr/attendance', { params: { userId: employee.id, limit: 30 } })
      .then((res) => {
        const raw = res.data;
        setAttendance(
          Array.isArray(raw) ? raw :
          Array.isArray(raw?.attendance) ? raw.attendance :
          Array.isArray(raw?.data) ? raw.data : []
        );
      })
      .catch(() => setAttendance([]))
      .finally(() => setLoading(false));
  }, [employee.id]);

  if (loading) return <LoadingState />;
  if (attendance.length === 0)
    return <EmptyState title="Активность" text="Нет данных о посещаемости" />;

  const fmtTime = (val: string | undefined) => {
    if (!val) return '—';
    const t = val.includes('T') ? val.split('T')[1] : val;
    return t.slice(0, 5);
  };

  return (
    <div>
      <div className="grid grid-cols-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase px-3 mb-2">
        <span>Дата</span>
        <span>Приход</span>
        <span>Уход</span>
      </div>
      <div className="space-y-1.5">
        {attendance.map((a: any) => (
          <div
            key={a.id}
            className="grid grid-cols-3 items-center p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm"
          >
            <span className="text-gray-700 dark:text-gray-200">{fmtDate(a.date)}</span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              {fmtTime(a.checkIn || a.check_in)}
            </span>
            <span className="text-red-500 dark:text-red-400 font-medium">
              {fmtTime(a.checkOut || a.check_out)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ employee }: { employee: EmployeeData }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/audit/event-logs', { params: { userId: employee.id, limit: 30 } })
      .then((res) => {
        const raw = res.data;
        setLogs(
          Array.isArray(raw) ? raw :
          Array.isArray(raw?.eventLogs) ? raw.eventLogs :
          Array.isArray(raw?.logs) ? raw.logs :
          Array.isArray(raw?.data) ? raw.data : []
        );
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [employee.id]);

  if (loading) return <LoadingState />;
  if (logs.length === 0)
    return <EmptyState title="История изменений" text="Нет записей об изменениях" />;

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      create: 'Создание',
      update: 'Обновление',
      delete: 'Удаление',
    };
    return map[action?.toLowerCase()] || action || '—';
  };

  return (
    <div className="space-y-2">
      {logs.map((l: any) => (
        <div
          key={l.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
        >
          <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-violet-400 mt-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {actionLabel(l.action)}{' '}
              <span className="text-gray-500 dark:text-gray-400">{l.entityType || ''}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {fmtDate(l.createdAt || l.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
