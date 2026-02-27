'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import HRDashboard from '@/components/dashboard/dashboards/HRDashboard';
import PMDashboard from '@/components/dashboard/dashboards/PMDashboard';
import ForemanDashboard from '@/components/dashboard/dashboards/ForemanDashboard';
import SupplierManagerDashboard from '@/components/dashboard/dashboards/SupplierManagerDashboard';
import WarehouseDashboard from '@/components/dashboard/dashboards/WarehouseDashboard';
import AccountantDashboard from '@/components/dashboard/dashboards/AccountantDashboard';
import InspectorDashboard from '@/components/dashboard/dashboards/InspectorDashboard';
import WorkerDashboard from '@/components/dashboard/dashboards/WorkerDashboard';
import RegistrationRequestsPanel from '@/components/dashboard/RegistrationRequestsPanel';

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const key of ['data', 'items', 'results']) {
      if (Array.isArray(data[key])) return data[key];
    }
    const arr = Object.values(data).find((v) => Array.isArray(v));
    if (arr) return arr as any[];
  }
  return [];
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  } catch { return String(v); }
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
}

const PROJECT_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Планирование', color: 'gray' },
  1: { label: 'Активный', color: 'green' },
  2: { label: 'Приостановлен', color: 'yellow' },
  3: { label: 'Завершён', color: 'blue' },
  4: { label: 'Отменён', color: 'red' },
};

const TASK_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая', color: 'gray' },
  1: { label: 'Назначена', color: 'blue' },
  2: { label: 'В работе', color: 'yellow' },
  3: { label: 'На проверке', color: 'purple' },
  4: { label: 'Завершена', color: 'green' },
  5: { label: 'Отменена', color: 'red' },
};

const TASK_PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкий', color: 'green' },
  2: { label: 'Средний', color: 'yellow' },
  3: { label: 'Высокий', color: 'orange' },
  4: { label: 'Критический', color: 'red' },
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937', border: 'none', borderRadius: '8px',
  color: '#f3f4f6', fontSize: '12px', padding: '8px 12px',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  'Планирование': '#9ca3af', 'Активный': '#10b981', 'Приостановлен': '#f59e0b',
  'Завершён': '#3b82f6', 'Отменён': '#ef4444',
};

const TASK_PRIORITY_COLORS: Record<string, string> = {
  'Низкий': '#10b981', 'Средний': '#f59e0b', 'Высокий': '#f97316', 'Критический': '#ef4444',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  'Новая': '#9ca3af', 'Назначена': '#3b82f6', 'В работе': '#f59e0b',
  'На проверке': '#8b5cf6', 'Завершена': '#10b981', 'Отменена': '#ef4444',
};

/* ─── SuperAdmin Dashboard (roleId=1) ────────────────────────────────────── */
function SuperAdminDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [projectsByStatus, setProjectsByStatus] = useState<any[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [projRes, taskRes, usersRes, teamsRes] = await Promise.allSettled([
        api.get('/projects', { params: { limit: 200 } }),
        api.get('/tasks', { params: { limit: 200 } }),
        api.get('/users', { params: { limit: 1 } }),
        api.get('/teams', { params: { limit: 1 } }),
      ]);

      const allProjects = projRes.status === 'fulfilled' ? extractArray(projRes.value.data) : [];
      const allTasks = taskRes.status === 'fulfilled' ? extractArray(taskRes.value.data) : [];
      setProjects(allProjects);
      setTasks(allTasks);
      setUserCount(usersRes.status === 'fulfilled' ? (usersRes.value.data.total ?? extractArray(usersRes.value.data).length) : null);
      setTeamCount(teamsRes.status === 'fulfilled' ? (teamsRes.value.data.total ?? extractArray(teamsRes.value.data).length) : null);

      // Projects by status
      const psCounts: Record<string, number> = {};
      allProjects.forEach((p: any) => {
        const s = PROJECT_STATUS_MAP[Number(p.status)];
        const label = s?.label || 'Другое';
        psCounts[label] = (psCounts[label] || 0) + 1;
      });
      setProjectsByStatus(Object.entries(psCounts).map(([name, value]) => ({
        name, value, color: PROJECT_STATUS_COLORS[name] || '#6b7280',
      })));

      // Tasks by priority
      const prCounts: Record<string, number> = {};
      allTasks.forEach((t: any) => {
        const p = TASK_PRIORITY_MAP[Number(t.priority)];
        const label = p?.label || 'Не указан';
        prCounts[label] = (prCounts[label] || 0) + 1;
      });
      setTasksByPriority(Object.entries(prCounts).map(([name, value]) => ({
        name, value, color: TASK_PRIORITY_COLORS[name] || '#6b7280',
      })));

      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Проекты', value: projects.length, href: '/dashboard/projects', accent: 'violet' },
    { label: 'Задачи', value: tasks.length, href: '/dashboard/tasks', accent: 'green' },
    { label: 'Сотрудники', value: userCount ?? '—', href: '/dashboard/employees', accent: 'sky' },
    { label: 'Команды', value: teamCount ?? '—', href: '/dashboard/teams', accent: 'orange' },
  ];

  const accentMap: Record<string, string> = {
    violet: 'text-violet-500 group-hover:ring-violet-500/20',
    green: 'text-green-500 group-hover:ring-green-500/20',
    sky: 'text-sky-500 group-hover:ring-sky-500/20',
    orange: 'text-orange-500 group-hover:ring-orange-500/20',
  };

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Панель управления</h1>
          {user && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Добро пожаловать, {user.email}</p>}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className="group">
            <div className={`bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5 transition-shadow group-hover:shadow-md group-hover:ring-1 ${accentMap[card.accent]}`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{card.label}</h2>
                <svg className="w-5 h-5 text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className={`text-3xl font-bold ${accentMap[card.accent].split(' ')[0]}`}>{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Settings button */}
      <div className="mb-6">
        <button onClick={() => router.push('/admin/settings')} className="group text-left">
          <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5 transition-shadow group-hover:shadow-md group-hover:ring-1 group-hover:ring-violet-500/20 inline-flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Настройки приложения</span>
          </div>
        </button>
      </div>

      {/* Recent projects table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs mb-6">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Последние проекты</h3>
          <Link href="/dashboard/projects" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Все проекты</Link>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет проектов</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                    <th className="pb-2 font-medium">Название</th>
                    <th className="pb-2 font-medium">Статус</th>
                    <th className="pb-2 font-medium text-right">Бюджет</th>
                    <th className="pb-2 font-medium text-right">Начало</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 5).map((p: any) => {
                    const st = PROJECT_STATUS_MAP[Number(p.status)];
                    return (
                      <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                        <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[200px]">{p.name}</td>
                        <td className="py-2.5">{st ? <StatusBadge label={st.label} color={st.color} /> : '—'}</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{p.budget != null ? `${Number(p.budget).toLocaleString('ru-RU')} ₽` : '—'}</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{fmtDate(p.startDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Проекты по статусам</h3>
          <div className="h-64">
            {projectsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsByStatus} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                  <Bar dataKey="value" name="Проекты" radius={[4, 4, 0, 0]}>
                    {projectsByStatus.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Задачи по приоритетам</h3>
          <div className="h-64">
            {tasksByPriority.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tasksByPriority} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {tasksByPriority.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} formatter={(value: string) => <span className="text-gray-600 dark:text-gray-400">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Registration requests */}
      <RegistrationRequestsPanel />
    </div>
  );
}

/* ─── Admin Dashboard (roleId=2) ─────────────────────────────────────────── */
function AdminDashboard({ user }: { user: any }) {
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Доброе утро' : now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер';
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [tasksByStatus, setTasksByStatus] = useState<any[]>([]);
  const [projectsByStatus, setProjectsByStatus] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [projRes, taskRes, usersRes, teamsRes] = await Promise.allSettled([
        api.get('/projects', { params: { limit: 200 } }),
        api.get('/tasks', { params: { limit: 200 } }),
        api.get('/users', { params: { limit: 1 } }),
        api.get('/teams', { params: { limit: 1 } }),
      ]);

      const allProjects = projRes.status === 'fulfilled' ? extractArray(projRes.value.data) : [];
      const allTasks = taskRes.status === 'fulfilled' ? extractArray(taskRes.value.data) : [];
      setProjects(allProjects);
      setTasks(allTasks);
      setUserCount(usersRes.status === 'fulfilled' ? (usersRes.value.data.total ?? extractArray(usersRes.value.data).length) : null);
      setTeamCount(teamsRes.status === 'fulfilled' ? (teamsRes.value.data.total ?? extractArray(teamsRes.value.data).length) : null);

      // Tasks by status
      const tsCounts: Record<string, number> = {};
      allTasks.forEach((t: any) => {
        const s = TASK_STATUS_MAP[Number(t.status)];
        const label = s?.label || 'Другое';
        tsCounts[label] = (tsCounts[label] || 0) + 1;
      });
      setTasksByStatus(Object.entries(tsCounts).map(([name, value]) => ({
        name, value, color: TASK_STATUS_COLORS[name] || '#6b7280',
      })));

      // Projects by status
      const psCounts: Record<string, number> = {};
      allProjects.forEach((p: any) => {
        const s = PROJECT_STATUS_MAP[Number(p.status)];
        const label = s?.label || 'Другое';
        psCounts[label] = (psCounts[label] || 0) + 1;
      });
      setProjectsByStatus(Object.entries(psCounts).map(([name, value]) => ({
        name, value, color: PROJECT_STATUS_COLORS[name] || '#6b7280',
      })));

      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: 'Проекты', value: projects.length, color: 'blue' },
    { label: 'Задачи', value: tasks.length, color: 'green' },
    { label: 'Сотрудники', value: userCount ?? '—', color: 'yellow' },
    { label: 'Команды', value: teamCount ?? '—', color: 'purple' },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
          {greeting}, {user?.name || user?.email || 'Пользователь'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{dateStr}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${c.bg} flex items-center justify-center ${c.text}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{loading ? '—' : card.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent tasks table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs mb-6">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Последние задачи</h3>
          <Link href="/dashboard/tasks" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Все задачи</Link>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет задач</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                    <th className="pb-2 font-medium">Название</th>
                    <th className="pb-2 font-medium">Статус</th>
                    <th className="pb-2 font-medium">Приоритет</th>
                    <th className="pb-2 font-medium text-right">Срок</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.slice(0, 5).map((t: any) => {
                    const st = TASK_STATUS_MAP[Number(t.status)];
                    const pr = TASK_PRIORITY_MAP[Number(t.priority)];
                    return (
                      <tr key={t.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                        <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[200px]">{t.title}</td>
                        <td className="py-2.5">{st ? <StatusBadge label={st.label} color={st.color} /> : '—'}</td>
                        <td className="py-2.5">{pr ? <StatusBadge label={pr.label} color={pr.color} /> : '—'}</td>
                        <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{fmtDate(t.dueDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Задачи по статусам</h3>
          <div className="h-64">
            {tasksByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByStatus} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                  <Bar dataKey="value" name="Задачи" radius={[4, 4, 0, 0]}>
                    {tasksByStatus.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Проекты по статусам</h3>
          <div className="h-64">
            {projectsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={projectsByStatus} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {projectsByStatus.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} formatter={(value: string) => <span className="text-gray-600 dark:text-gray-400">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Registration requests */}
      <RegistrationRequestsPanel />
    </div>
  );
}

/* ─── Role → Dashboard mapping ───────────────────────────────────────────── */
const ROLE_DASHBOARD: Record<number, React.ComponentType<{ user: any }>> = {
  3: HRDashboard,
  4: PMDashboard,
  5: ForemanDashboard,
  6: SupplierManagerDashboard,
  7: WarehouseDashboard,
  8: AccountantDashboard,
  9: InspectorDashboard,
  10: WorkerDashboard,
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const roleId = user?.roleId;

  if (roleId === 1) {
    return <SuperAdminDashboard user={user} />;
  }

  const RoleDashboard = roleId ? ROLE_DASHBOARD[roleId] : undefined;
  if (RoleDashboard) {
    return <RoleDashboard user={user} />;
  }

  return <AdminDashboard user={user} />;
}
