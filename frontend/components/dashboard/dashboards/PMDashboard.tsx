'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function getDateStr(): string {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

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
  } catch {
    return String(v);
  }
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
}

const TASK_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая', color: 'gray' },
  1: { label: 'Назначена', color: 'blue' },
  2: { label: 'В работе', color: 'yellow' },
  3: { label: 'На проверке', color: 'purple' },
  4: { label: 'Завершена', color: 'green' },
  5: { label: 'Отменена', color: 'red' },
};

const PROJECT_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Планирование', color: 'gray' },
  1: { label: 'Активный', color: 'green' },
  2: { label: 'Приостановлен', color: 'yellow' },
  3: { label: 'Завершён', color: 'blue' },
  4: { label: 'Отменён', color: 'red' },
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border: 'none',
  borderRadius: '8px',
  color: '#f3f4f6',
  fontSize: '12px',
  padding: '8px 12px',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  'Новая': '#9ca3af',
  'Назначена': '#3b82f6',
  'В работе': '#f59e0b',
  'На проверке': '#8b5cf6',
  'Завершена': '#10b981',
  'Отменена': '#ef4444',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  'Планирование': '#9ca3af',
  'Активный': '#10b981',
  'Приостановлен': '#f59e0b',
  'Завершён': '#3b82f6',
  'Отменён': '#ef4444',
};

export default function PMDashboard({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskStats, setTaskStats] = useState<any>(null);

  // Chart data
  const [tasksByStatus, setTasksByStatus] = useState<any[]>([]);
  const [projectsByStatus, setProjectsByStatus] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [projectsRes, tasksRes, statsRes] = await Promise.allSettled([
      api.get('/projects'),
      api.get('/tasks', { params: { limit: 100 } }),
      api.get('/tasks/stats'),
    ]);

    const allProjects = projectsRes.status === 'fulfilled' ? extractArray(projectsRes.value.data) : [];
    const allTasks = tasksRes.status === 'fulfilled' ? extractArray(tasksRes.value.data) : [];
    const stats = statsRes.status === 'fulfilled' ? statsRes.value.data : null;

    setProjects(allProjects);
    setTasks(allTasks);
    setTaskStats(stats);

    // Build task status chart
    const taskStatusCounts: Record<string, number> = {};
    allTasks.forEach((t: any) => {
      const s = TASK_STATUS_MAP[Number(t.status)];
      const label = s?.label || 'Другое';
      taskStatusCounts[label] = (taskStatusCounts[label] || 0) + 1;
    });
    setTasksByStatus(
      Object.entries(taskStatusCounts).map(([name, value]) => ({
        name,
        value,
        color: TASK_STATUS_COLORS[name] || '#6b7280',
      }))
    );

    // Build project status chart
    const projectStatusCounts: Record<string, number> = {};
    allProjects.forEach((p: any) => {
      const s = PROJECT_STATUS_MAP[Number(p.status)];
      const label = s?.label || 'Другое';
      projectStatusCounts[label] = (projectStatusCounts[label] || 0) + 1;
    });
    setProjectsByStatus(
      Object.entries(projectStatusCounts).map(([name, value]) => ({
        name,
        value,
        color: PROJECT_STATUS_COLORS[name] || '#6b7280',
      }))
    );

    setLoading(false);
  }

  const myProjects = projects.filter(
    (p: any) => p.projectManagerId === user?.id || p.managerId === user?.id
  );
  const activeProjects = projects.filter((p: any) => Number(p.status) === 1);
  const now = new Date();
  const overdueTasks = tasks.filter((t: any) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due < now && Number(t.status) !== 4 && Number(t.status) !== 5;
  });

  const totalTasks = taskStats?.total ?? tasks.length;
  const totalProjects = projects.length;

  const statCards = [
    { label: 'Всего проектов', value: totalProjects, icon: 'projects', color: 'violet' },
    { label: 'Активные проекты', value: activeProjects.length, icon: 'active', color: 'green' },
    { label: 'Всего задач', value: totalTasks, icon: 'tasks', color: 'blue' },
    { label: 'Просроченные задачи', value: overdueTasks.length, icon: 'overdue', color: 'red' },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    projects: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    active: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    tasks: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    overdue: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
          {getGreeting()}, {user?.name || user?.email || 'Пользователь'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {user?.role?.name && <span className="text-violet-500 font-medium">{user.role.name}</span>}
          <span className="mx-2">&middot;</span>
          <span className="capitalize">{getDateStr()}</span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${c.bg} flex items-center justify-center ${c.text}`}>
                  {iconMap[card.icon]}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Link href="/dashboard/pm/projects" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Проекты</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Управление проектами</p>
          </div>
        </Link>
        <Link href="/dashboard/pm/tasks" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Задачи</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Управление задачами</p>
          </div>
        </Link>
        <Link href="/dashboard/pm/construction-sites" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Стройплощадки</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Строительные площадки</p>
          </div>
        </Link>
      </div>

      {/* My projects table + Overdue tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* My projects */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Мои проекты</h3>
            <Link href="/dashboard/pm/projects" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
              Все проекты
            </Link>
          </div>
          <div className="p-5">
            {myProjects.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет назначенных проектов</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                      <th className="pb-2 font-medium">Название</th>
                      <th className="pb-2 font-medium">Статус</th>
                      <th className="pb-2 font-medium text-right">Бюджет</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myProjects.slice(0, 8).map((p: any) => {
                      const st = PROJECT_STATUS_MAP[Number(p.status)];
                      return (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[180px]">{p.name}</td>
                          <td className="py-2.5">
                            {st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                            {p.budget != null ? `${Number(p.budget).toLocaleString('ru-RU')} ₽` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Overdue tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Просроченные задачи</h3>
            <Link href="/dashboard/pm/tasks" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
              Все задачи
            </Link>
          </div>
          <div className="p-5">
            {overdueTasks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет просроченных задач</p>
            ) : (
              <div className="space-y-3">
                {overdueTasks.slice(0, 8).map((t: any) => {
                  const st = TASK_STATUS_MAP[Number(t.status)];
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{t.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Срок: {fmtDate(t.dueDate)}
                          {t.projectName && <span> &middot; {t.projectName}</span>}
                        </p>
                      </div>
                      <div className="ml-3">
                        {st ? <StatusBadge label={st.label} color={st.color} /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Task status bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Распределение задач по статусам
          </h3>
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
                    {tasksByStatus.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project status donut */}
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Статусы проектов
          </h3>
          <div className="h-64">
            {projectsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectsByStatus}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {projectsByStatus.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value: string) => <span className="text-gray-600 dark:text-gray-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
