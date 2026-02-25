'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
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

interface Stats {
  totalEmployees: number;
  pendingLeaves: number;
  presentToday: number;
  expiringDocs: number;
}

interface LeaveRequest {
  id: number;
  userId: number;
  user?: { name: string };
  requestType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: number | string;
  reason?: string;
}

interface AttendanceRecord {
  id: number;
  userId: number;
  user?: { name: string };
  status: string;
  attendanceDate: string;
}

interface DocRecord {
  id: number;
  employeeName?: string;
  documentType: string;
  expiryDate: string;
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
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

const REQUEST_TYPE_MAP: Record<string, string> = {
  vacation: 'Отпуск',
  sick: 'Больничный',
  personal: 'Личные',
};

const ATTENDANCE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  present: { label: 'Присутствует', color: 'green' },
  absent: { label: 'Отсутствует', color: 'red' },
  late: { label: 'Опоздание', color: 'orange' },
  sick: { label: 'Больничный', color: 'yellow' },
  vacation: { label: 'Отпуск', color: 'blue' },
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border: 'none',
  borderRadius: '8px',
  color: '#f3f4f6',
  fontSize: '12px',
  padding: '8px 12px',
};

const LEAVE_STATUS_COLORS: Record<string, string> = {
  'Ожидает': '#f59e0b',
  'Одобрен': '#10b981',
  'Отклонён': '#ef4444',
};

const LEAVE_TYPE_COLORS: Record<string, string> = {
  'Отпуск': '#8b5cf6',
  'Больничный': '#f59e0b',
  'Личные': '#3b82f6',
  'Другое': '#6b7280',
};

const ATTENDANCE_CHART_COLORS: Record<string, string> = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f97316',
  sick: '#f59e0b',
  vacation: '#3b82f6',
};

const ATTENDANCE_CHART_LABELS: Record<string, string> = {
  present: 'Присутствует',
  absent: 'Отсутствует',
  late: 'Опоздание',
  sick: 'Больничный',
  vacation: 'Отпуск',
};

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function HRDashboard({ user }: { user: any }) {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalEmployees: 0, pendingLeaves: 0, presentToday: 0, expiringDocs: 0 });
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<DocRecord[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Chart data
  const [weeklyAttendance, setWeeklyAttendance] = useState<any[]>([]);
  const [leavesByType, setLeavesByType] = useState<any[]>([]);
  const [leavesByStatus, setLeavesByStatus] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [usersRes, leavesRes, attendanceRes, docsRes] = await Promise.allSettled([
      api.get('/users'),
      api.get('/time-off-requests', { params: { limit: 100 } }),
      api.get('/attendance', { params: { limit: 100 } }),
      api.get('/employee-documents', { params: { limit: 100 } }),
    ]);

    const users = usersRes.status === 'fulfilled' ? extractArray(usersRes.value.data) : [];
    const leaves = leavesRes.status === 'fulfilled' ? extractArray(leavesRes.value.data) : [];
    const attendance = attendanceRes.status === 'fulfilled' ? extractArray(attendanceRes.value.data) : [];
    const docs = docsRes.status === 'fulfilled' ? extractArray(docsRes.value.data) : [];

    const pending = leaves.filter((l: any) => l.status === 0 || l.status === 'pending');
    const today = new Date().toISOString().slice(0, 10);
    const todayAtt = attendance.filter((a: any) => {
      const d = a.attendanceDate ? new Date(a.attendanceDate).toISOString().slice(0, 10) : '';
      return d === today;
    });
    const presentCount = todayAtt.filter((a: any) => a.status === 'present' || a.status === 'late').length;

    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const expiring = docs.filter((d: any) => {
      if (!d.expiryDate) return false;
      const exp = new Date(d.expiryDate);
      return exp <= thirtyDays && exp >= new Date();
    });

    setStats({
      totalEmployees: users.length,
      pendingLeaves: pending.length,
      presentToday: presentCount,
      expiringDocs: expiring.length,
    });
    setPendingLeaves(pending.slice(0, 10));
    setTodayAttendance(todayAtt.slice(0, 10));
    setExpiringDocs(expiring.slice(0, 10));

    // Build chart data
    buildWeeklyAttendance(attendance);
    buildLeaveCharts(leaves);

    setLoading(false);
  }

  function buildWeeklyAttendance(attendance: any[]) {
    const days: Record<string, Record<string, number>> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { present: 0, absent: 0, late: 0, sick: 0, vacation: 0 };
    }

    attendance.forEach((a: any) => {
      if (!a.attendanceDate) return;
      const key = new Date(a.attendanceDate).toISOString().slice(0, 10);
      if (days[key] && a.status) {
        days[key][a.status] = (days[key][a.status] || 0) + 1;
      }
    });

    const data = Object.entries(days).map(([date, counts]) => {
      const d = new Date(date);
      return {
        name: `${DAY_NAMES[d.getDay()]} ${d.getDate()}`,
        ...counts,
      };
    });
    setWeeklyAttendance(data);
  }

  function buildLeaveCharts(leaves: any[]) {
    // By type
    const typeCounts: Record<string, number> = {};
    leaves.forEach((l: any) => {
      const label = REQUEST_TYPE_MAP[l.requestType] || 'Другое';
      typeCounts[label] = (typeCounts[label] || 0) + 1;
    });
    setLeavesByType(
      Object.entries(typeCounts).map(([name, value]) => ({
        name,
        value,
        color: LEAVE_TYPE_COLORS[name] || '#6b7280',
      }))
    );

    // By status
    const statusMap: Record<string | number, string> = {
      0: 'Ожидает', pending: 'Ожидает',
      1: 'Одобрен', approved: 'Одобрен',
      2: 'Отклонён', rejected: 'Отклонён',
    };
    const statusCounts: Record<string, number> = {};
    leaves.forEach((l: any) => {
      const label = statusMap[l.status] || 'Другое';
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });
    setLeavesByStatus(
      Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
        color: LEAVE_STATUS_COLORS[name] || '#6b7280',
      }))
    );
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

  async function handleLeaveAction(id: number, status: number) {
    setActionLoading(id);
    try {
      await api.put(`/time-off-requests/${id}`, { status });
      addToast('success', status === 1 ? 'Заявка одобрена' : 'Заявка отклонена');
      loadData();
    } catch {
      addToast('error', 'Ошибка при обновлении заявки');
    } finally {
      setActionLoading(null);
    }
  }

  const statCards = [
    { label: 'Сотрудники', value: stats.totalEmployees, icon: 'users', color: 'violet' },
    { label: 'Ожидают одобрения', value: stats.pendingLeaves, icon: 'clock', color: 'yellow' },
    { label: 'Присутствуют сегодня', value: stats.presentToday, icon: 'check', color: 'green' },
    { label: 'Истекающие документы', value: stats.expiringDocs, icon: 'alert', color: 'red' },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    users: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    clock: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    check: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    alert: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
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
        <Link href="/dashboard/hr/attendance" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Посещаемость</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Учёт рабочего времени</p>
          </div>
        </Link>
        <Link href="/dashboard/hr/time-off" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Отпуска и отсутствия</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Заявки на отпуск</p>
          </div>
        </Link>
        <Link href="/dashboard/hr/documents" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Документы сотрудников</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Управление документами</p>
          </div>
        </Link>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly attendance bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Посещаемость за неделю
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttendance} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  formatter={(value: string) => <span className="text-gray-600 dark:text-gray-400">{value}</span>}
                />
                <Bar dataKey="present" name="Присутствует" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="Опоздание" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Отсутствует" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sick" name="Больничный" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vacation" name="Отпуск" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave requests by status — donut */}
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Статусы заявок
          </h3>
          <div className="h-64">
            {leavesByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leavesByStatus}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leavesByStatus.map((entry, idx) => (
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

      {/* Leave types chart + Pending leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Leave types donut */}
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Типы отпусков
          </h3>
          <div className="h-64">
            {leavesByType.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leavesByType}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leavesByType.map((entry, idx) => (
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

        {/* Pending leave requests */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Заявки на отпуск</h3>
            <Link href="/dashboard/hr/time-off" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
              Все заявки
            </Link>
          </div>
          <div className="p-5">
            {pendingLeaves.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет ожидающих заявок</p>
            ) : (
              <div className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {leave.user?.name || `ID: ${leave.userId}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {REQUEST_TYPE_MAP[leave.requestType] || leave.requestType} &middot; {fmtDate(leave.startDate)} — {fmtDate(leave.endDate)} &middot; {leave.daysCount} дн.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => handleLeaveAction(leave.id, 1)}
                        disabled={actionLoading === leave.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60 transition-colors disabled:opacity-50"
                      >
                        Одобрить
                      </button>
                      <button
                        onClick={() => handleLeaveAction(leave.id, 2)}
                        disabled={actionLoading === leave.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today attendance + Expiring docs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today's attendance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Посещаемость сегодня</h3>
            <Link href="/dashboard/hr/attendance" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
              Подробнее
            </Link>
          </div>
          <div className="p-5">
            {todayAttendance.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет записей за сегодня</p>
            ) : (
              <div className="space-y-3">
                {todayAttendance.map((rec) => {
                  const st = ATTENDANCE_STATUS_MAP[rec.status];
                  return (
                    <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {rec.user?.name || `ID: ${rec.userId}`}
                      </p>
                      {st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400 text-xs">{rec.status}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Expiring documents */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Истекающие документы (30 дней)</h3>
            <Link href="/dashboard/hr/documents" className="text-xs text-violet-500 hover:text-violet-600 font-medium">
              Все документы
            </Link>
          </div>
          <div className="p-5">
            {expiringDocs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет истекающих документов</p>
            ) : (
              <div className="space-y-3">
                {expiringDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {doc.employeeName || `Документ #${doc.id}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{doc.documentType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">{fmtDate(doc.expiryDate)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Истекает</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
