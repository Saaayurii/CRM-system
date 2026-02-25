'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
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

const TASK_PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкий', color: 'green' },
  2: { label: 'Средний', color: 'yellow' },
  3: { label: 'Высокий', color: 'orange' },
  4: { label: 'Критический', color: 'red' },
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

const PRIORITY_COLORS: Record<string, string> = {
  'Низкий': '#10b981',
  'Средний': '#f59e0b',
  'Высокий': '#f97316',
  'Критический': '#ef4444',
};

export default function ForemanDashboard({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);

  const [tasksByStatus, setTasksByStatus] = useState<any[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [tasksRes, statsRes, sitesRes, equipRes, inspRes] = await Promise.allSettled([
      api.get('/tasks', { params: { limit: 200 } }),
      api.get('/tasks/stats'),
      api.get('/construction-sites'),
      api.get('/equipment', { params: { limit: 200 } }),
      api.get('/inspections', { params: { limit: 200 } }),
    ]);

    const allTasks = tasksRes.status === 'fulfilled' ? extractArray(tasksRes.value.data) : [];
    const stats = statsRes.status === 'fulfilled' ? statsRes.value.data : null;
    const allSites = sitesRes.status === 'fulfilled' ? extractArray(sitesRes.value.data) : [];
    const allEquipment = equipRes.status === 'fulfilled' ? extractArray(equipRes.value.data) : [];
    const allInspections = inspRes.status === 'fulfilled' ? extractArray(inspRes.value.data) : [];

    setTasks(allTasks);
    setTaskStats(stats);
    setSites(allSites);
    setEquipment(allEquipment);
    setInspections(allInspections);

    // Task status chart
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

    // Task priority chart
    const priorityCounts: Record<string, number> = {};
    allTasks.forEach((t: any) => {
      const p = TASK_PRIORITY_MAP[Number(t.priority)];
      const label = p?.label || 'Не указан';
      priorityCounts[label] = (priorityCounts[label] || 0) + 1;
    });
    setTasksByPriority(
      Object.entries(priorityCounts).map(([name, value]) => ({
        name,
        value,
        color: PRIORITY_COLORS[name] || '#6b7280',
      }))
    );

    setLoading(false);
  }

  const myTasks = tasks.filter((t: any) => {
    if (t.assigneeId === user?.id) return true;
    if (Array.isArray(t.assignees)) {
      return t.assignees.some((a: any) => a.userId === user?.id);
    }
    return false;
  });

  const inProgressTasks = myTasks.filter((t: any) => Number(t.status) === 2);
  const activeSites = sites.filter((s: any) => Number(s.status) === 1);
  const pendingInspections = inspections.filter((i: any) => {
    const st = String(i.status ?? '');
    return st === 'planned' || st === 'in_progress' || Number(i.status) === 0 || Number(i.status) === 1;
  });

  const statCards = [
    { label: 'Мои задачи', value: myTasks.length, icon: 'tasks', color: 'blue' },
    { label: 'В работе', value: inProgressTasks.length, icon: 'active', color: 'yellow' },
    { label: 'Стройплощадки', value: activeSites.length, icon: 'sites', color: 'green' },
    { label: 'Проверки', value: pendingInspections.length, icon: 'inspections', color: 'purple' },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    tasks: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    active: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    sites: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    inspections: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link href="/dashboard/foreman/tasks" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
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
        <Link href="/dashboard/foreman/construction-sites" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
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
        <Link href="/dashboard/foreman/equipment" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Оборудование</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Техника и инструменты</p>
          </div>
        </Link>
        <Link href="/dashboard/foreman/inspections" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Проверки</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Инспекции и контроль</p>
          </div>
        </Link>
      </div>

      {/* My tasks table + Active construction sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* My tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Мои задачи</h3>
            <Link href="/dashboard/foreman/tasks" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
              Все задачи
            </Link>
          </div>
          <div className="p-5">
            {myTasks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет назначенных задач</p>
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
                    {myTasks.slice(0, 8).map((t: any) => {
                      const st = TASK_STATUS_MAP[Number(t.status)];
                      const pr = TASK_PRIORITY_MAP[Number(t.priority)];
                      return (
                        <tr key={t.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[180px]">{t.title}</td>
                          <td className="py-2.5">
                            {st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="py-2.5">
                            {pr ? <StatusBadge label={pr.label} color={pr.color} /> : <span className="text-gray-400">—</span>}
                          </td>
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

        {/* Active construction sites */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Активные стройплощадки</h3>
            <Link href="/dashboard/foreman/construction-sites" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
              Все площадки
            </Link>
          </div>
          <div className="p-5">
            {activeSites.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет активных площадок</p>
            ) : (
              <div className="space-y-3">
                {activeSites.slice(0, 8).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{s.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {s.address || 'Адрес не указан'}
                        {s.project?.name && <span> &middot; {s.project.name}</span>}
                      </p>
                    </div>
                    <StatusBadge label="Активная" color="green" />
                  </div>
                ))}
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

        {/* Task priority donut */}
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Приоритеты задач
          </h3>
          <div className="h-64">
            {tasksByPriority.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tasksByPriority}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {tasksByPriority.map((entry, idx) => (
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
