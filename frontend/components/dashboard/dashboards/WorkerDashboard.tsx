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

function fmtTime(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

const PAYROLL_STATUS_MAP: Record<string, { label: string; color: string; chartColor: string }> = {
  paid: { label: 'Выплачен', color: 'green', chartColor: '#10b981' },
  approved: { label: 'Одобрен', color: 'blue', chartColor: '#f59e0b' },
  pending: { label: 'Ожидает', color: 'yellow', chartColor: '#f59e0b' },
  draft: { label: 'Черновик', color: 'gray', chartColor: '#9ca3af' },
};

const BONUS_TYPE_MAP: Record<string, string> = {
  performance: 'За результаты',
  holiday: 'Праздничная',
  quarterly: 'Квартальная',
  annual: 'Годовая',
  other: 'Другое',
};

export default function WorkerDashboard({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [timeOff, setTimeOff] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<any[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [tasksRes, attendanceRes, timeOffRes, sitesRes, payrollRes, bonusesRes] = await Promise.allSettled([
      api.get('/tasks', { params: { limit: 200 } }),
      api.get('/attendance'),
      api.get('/time-off-requests'),
      api.get('/construction-sites'),
      api.get('/payroll'),
      api.get('/bonuses'),
    ]);

    const allTasks = tasksRes.status === 'fulfilled' ? extractArray(tasksRes.value.data) : [];
    const allAttendance = attendanceRes.status === 'fulfilled' ? extractArray(attendanceRes.value.data) : [];
    const allTimeOff = timeOffRes.status === 'fulfilled' ? extractArray(timeOffRes.value.data) : [];
    const allSites = sitesRes.status === 'fulfilled' ? extractArray(sitesRes.value.data) : [];
    const allPayroll = payrollRes.status === 'fulfilled' ? extractArray(payrollRes.value.data) : [];
    const allBonuses = bonusesRes.status === 'fulfilled' ? extractArray(bonusesRes.value.data) : [];

    setTasks(allTasks);
    setAttendance(allAttendance);
    setTimeOff(allTimeOff);
    setSites(allSites);
    setPayroll(allPayroll);
    setBonuses(allBonuses);

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

  // Today's tasks
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = myTasks.filter((t: any) => {
    if (!t.dueDate) return false;
    return String(t.dueDate).slice(0, 10) === today;
  });

  // Attendance this month
  const now = new Date();
  const monthAttendance = attendance.filter((a: any) => {
    if (!a.date && !a.checkIn) return false;
    const d = new Date(a.date || a.checkIn);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Time-off stats
  const pendingTimeOff = timeOff.filter((r: any) => r.status === 0 || r.status === 'pending');

  // Payroll chart data
  const payrollChartData = payroll.slice(0, 12).map((p: any) => {
    const st = PAYROLL_STATUS_MAP[String(p.status)] || PAYROLL_STATUS_MAP.draft;
    return {
      name: p.payrollPeriod || p.period || fmtDate(p.createdAt),
      amount: Number(p.totalAmount || p.netSalary || p.amount || 0),
      fill: st.chartColor,
    };
  });

  const statCards = [
    { label: 'Мои задачи', value: myTasks.length, icon: 'tasks', color: 'blue' },
    { label: 'В работе', value: inProgressTasks.length, icon: 'active', color: 'yellow' },
    { label: 'Посещений (мес)', value: monthAttendance.length, icon: 'attendance', color: 'green' },
    { label: 'Отпуска ожидают', value: pendingTimeOff.length, icon: 'timeoff', color: 'purple' },
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
    attendance: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    timeoff: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link href="/dashboard/worker/tasks" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Задачи</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Мои задачи</p>
          </div>
        </Link>
        <Link href="/dashboard/worker/attendance" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Посещаемость</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Рабочее время</p>
          </div>
        </Link>
        <Link href="/dashboard/worker/time-off" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Отпуска</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Заявки на отпуск</p>
          </div>
        </Link>
        <Link href="/dashboard/worker/construction-sites" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Стройплощадки</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Объекты</p>
          </div>
        </Link>
      </div>

      {/* Today's tasks + Recent attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today's tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Задачи на сегодня
              {todayTasks.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {todayTasks.length}
                </span>
              )}
            </h3>
            <Link href="/dashboard/worker/tasks" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
              Все задачи
            </Link>
          </div>
          <div className="p-5">
            {todayTasks.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Нет задач на сегодня</p>
                {myTasks.length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Всего задач: {myTasks.length}</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                      <th className="pb-2 font-medium">Название</th>
                      <th className="pb-2 font-medium">Статус</th>
                      <th className="pb-2 font-medium">Приоритет</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayTasks.slice(0, 8).map((t: any) => {
                      const st = TASK_STATUS_MAP[Number(t.status)];
                      const pr = TASK_PRIORITY_MAP[Number(t.priority)];
                      return (
                        <tr key={t.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[200px]">{t.title}</td>
                          <td className="py-2.5">
                            {st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="py-2.5">
                            {pr ? <StatusBadge label={pr.label} color={pr.color} /> : <span className="text-gray-400">—</span>}
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

        {/* Recent attendance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Последняя посещаемость</h3>
            <Link href="/dashboard/worker/attendance" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
              Вся история
            </Link>
          </div>
          <div className="p-5">
            {attendance.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет записей</p>
            ) : (
              <div className="space-y-3">
                {attendance.slice(0, 7).map((a: any, idx: number) => {
                  const hoursWorked = a.hoursWorked || a.totalHours;
                  return (
                    <div key={a.id || idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {fmtDate(a.date || a.checkIn)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {fmtTime(a.checkIn)} — {fmtTime(a.checkOut)}
                        </p>
                      </div>
                      {hoursWorked != null && (
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {Number(hoursWorked).toFixed(1)}ч
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payroll chart + Bonuses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payroll bar chart */}
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Зарплата по периодам</h3>
          <div className="h-64">
            {payrollChartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных о зарплате</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollChartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                  <Bar dataKey="amount" name="Сумма" radius={[4, 4, 0, 0]}>
                    {payrollChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Выплачен</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Ожидает</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Черновик</span>
          </div>
        </div>

        {/* Bonuses list */}
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Бонусы</h3>
          </div>
          <div className="p-5">
            {bonuses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет бонусов</p>
            ) : (
              <div className="space-y-3">
                {bonuses.slice(0, 7).map((b: any, idx: number) => (
                  <div key={b.id || idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {BONUS_TYPE_MAP[String(b.bonusType || b.type)] || String(b.bonusType || b.type || 'Бонус')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(b.createdAt || b.date)}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      +{Number(b.amount || 0).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts: Task status + Task priority */}
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
