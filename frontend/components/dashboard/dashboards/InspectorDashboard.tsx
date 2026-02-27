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
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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
  } catch { return String(v); }
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

const INSPECTION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  planned: { label: 'Запланирована', color: 'gray' },
  in_progress: { label: 'В процессе', color: 'yellow' },
  completed: { label: 'Завершена', color: 'green' },
  failed: { label: 'Не пройдена', color: 'red' },
};

const DEFECT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: 'Открыт', color: 'red' },
  in_progress: { label: 'В работе', color: 'yellow' },
  resolved: { label: 'Исправлен', color: 'green' },
  closed: { label: 'Закрыт', color: 'gray' },
};

const DEFECT_SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'Низкая', color: 'green' },
  medium: { label: 'Средняя', color: 'yellow' },
  high: { label: 'Высокая', color: 'orange' },
  critical: { label: 'Критическая', color: 'red' },
};

const TASK_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая', color: 'gray' },
  1: { label: 'Назначена', color: 'blue' },
  2: { label: 'В работе', color: 'yellow' },
  3: { label: 'На проверке', color: 'purple' },
  4: { label: 'Завершена', color: 'green' },
  5: { label: 'Отменена', color: 'red' },
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937', border: 'none', borderRadius: '8px',
  color: '#f3f4f6', fontSize: '12px', padding: '8px 12px',
};

const INSP_STATUS_COLORS: Record<string, string> = {
  'Запланирована': '#9ca3af', 'В процессе': '#f59e0b', 'Завершена': '#10b981', 'Не пройдена': '#ef4444',
};

const SEVERITY_COLORS: Record<string, string> = {
  'Низкая': '#10b981', 'Средняя': '#f59e0b', 'Высокая': '#f97316', 'Критическая': '#ef4444',
};

export default function InspectorDashboard({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  const [defects, setDefects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [inspByStatus, setInspByStatus] = useState<any[]>([]);
  const [defectsBySeverity, setDefectsBySeverity] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [inspRes, defRes, taskRes, siteRes] = await Promise.allSettled([
      api.get('/inspections', { params: { limit: 200 } }),
      api.get('/defects', { params: { limit: 200 } }),
      api.get('/tasks', { params: { limit: 200 } }),
      api.get('/construction-sites'),
    ]);

    const allInspections = inspRes.status === 'fulfilled' ? extractArray(inspRes.value.data) : [];
    const allDefects = defRes.status === 'fulfilled' ? extractArray(defRes.value.data) : [];
    const allTasks = taskRes.status === 'fulfilled' ? extractArray(taskRes.value.data) : [];
    const allSites = siteRes.status === 'fulfilled' ? extractArray(siteRes.value.data) : [];

    setInspections(allInspections);
    setDefects(allDefects);
    setTasks(allTasks);
    setSites(allSites);

    // Inspections by status
    const inspCounts: Record<string, number> = {};
    allInspections.forEach((i: any) => {
      const s = INSPECTION_STATUS_MAP[String(i.status ?? '')];
      const label = s?.label || 'Другое';
      inspCounts[label] = (inspCounts[label] || 0) + 1;
    });
    setInspByStatus(Object.entries(inspCounts).map(([name, value]) => ({
      name, value, color: INSP_STATUS_COLORS[name] || '#6b7280',
    })));

    // Defects by severity
    const sevCounts: Record<string, number> = {};
    allDefects.forEach((d: any) => {
      const s = DEFECT_SEVERITY_MAP[String(d.severity ?? '')];
      const label = s?.label || 'Не указана';
      sevCounts[label] = (sevCounts[label] || 0) + 1;
    });
    setDefectsBySeverity(Object.entries(sevCounts).map(([name, value]) => ({
      name, value, color: SEVERITY_COLORS[name] || '#6b7280',
    })));

    setLoading(false);
  }

  const openDefects = defects.filter((d: any) => d.status === 'open' || d.status === 'in_progress');
  const myTasks = tasks.filter((t: any) => {
    if (t.assigneeId === user?.id) return true;
    if (Array.isArray(t.assignees)) return t.assignees.some((a: any) => a.userId === user?.id);
    return false;
  });

  const statCards = [
    { label: 'Инспекции', value: inspections.length, icon: 'inspections', color: 'blue' },
    { label: 'Дефекты (открытые)', value: openDefects.length, icon: 'defects', color: 'red' },
    { label: 'Мои задачи', value: myTasks.length, icon: 'tasks', color: 'yellow' },
    { label: 'Стройплощадки', value: sites.length, icon: 'sites', color: 'green' },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    inspections: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    defects: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    tasks: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    sites: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${c.bg} flex items-center justify-center ${c.text}`}>{iconMap[card.icon]}</div>
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
        {[
          { href: '/dashboard/inspector/inspections', label: 'Инспекции', desc: 'Журнал инспекций' },
          { href: '/dashboard/inspector/defects', label: 'Дефекты', desc: 'Выявленные дефекты' },
          { href: '/dashboard/inspector/tasks', label: 'Задачи', desc: 'Мои задачи' },
          { href: '/dashboard/inspector/construction-sites', label: 'Стройплощадки', desc: 'Строительные площадки' },
        ].map((a, i) => {
          const cls = ['bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400', 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'];
          return (
            <Link key={a.href} href={a.href} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cls[i]}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{a.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Последние инспекции</h3>
            <Link href="/dashboard/inspector/inspections" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Все инспекции</Link>
          </div>
          <div className="p-5">
            {inspections.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет инспекций</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                      <th className="pb-2 font-medium">Название</th>
                      <th className="pb-2 font-medium">Статус</th>
                      <th className="pb-2 font-medium text-right">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspections.slice(0, 8).map((i: any) => {
                      const st = INSPECTION_STATUS_MAP[String(i.status ?? '')];
                      return (
                        <tr key={i.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[200px]">{i.title || `#${i.id}`}</td>
                          <td className="py-2.5">{st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}</td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{fmtDate(i.inspectionDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Открытые дефекты</h3>
            <Link href="/dashboard/inspector/defects" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Все дефекты</Link>
          </div>
          <div className="p-5">
            {openDefects.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет открытых дефектов</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                      <th className="pb-2 font-medium">Название</th>
                      <th className="pb-2 font-medium">Серьёзность</th>
                      <th className="pb-2 font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openDefects.slice(0, 8).map((d: any) => {
                      const sev = DEFECT_SEVERITY_MAP[String(d.severity ?? '')];
                      const st = DEFECT_STATUS_MAP[String(d.status ?? '')];
                      return (
                        <tr key={d.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[180px]">{d.title || `#${d.id}`}</td>
                          <td className="py-2.5">{sev ? <StatusBadge label={sev.label} color={sev.color} /> : <span className="text-gray-400">—</span>}</td>
                          <td className="py-2.5">{st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Инспекции по статусам</h3>
          <div className="h-64">
            {inspByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inspByStatus} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                  <Bar dataKey="value" name="Инспекции" radius={[4, 4, 0, 0]}>
                    {inspByStatus.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Дефекты по серьёзности</h3>
          <div className="h-64">
            {defectsBySeverity.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={defectsBySeverity} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {defectsBySeverity.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} formatter={(value: string) => <span className="text-gray-600 dark:text-gray-400">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
