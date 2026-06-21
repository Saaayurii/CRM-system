'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { INSPECTION_STATUS, DEFECT_STATUS, DEFECT_SEVERITY } from '@/components/technadzor/Badge';

interface GroupRow { status?: number; severity?: number; _count?: { _all?: number } }
interface Stats {
  inspections: { byStatus: GroupRow[]; total: number; overdue: number };
  defects: { byStatus: GroupRow[]; bySeverity: GroupRow[]; total: number; overdue: number };
}

const COLOR_HEX: Record<string, string> = {
  gray: '#9ca3af', blue: '#3b82f6', yellow: '#eab308', purple: '#a855f7',
  green: '#22c55e', red: '#ef4444', orange: '#f97316', violet: '#8b5cf6',
};

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
      <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t(label)}</div>
      <div className={`text-3xl font-bold ${accent ?? 'text-gray-800 dark:text-gray-100'}`}>{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Stats>('/inspections/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <div className="animate-pulse h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <div key={i} className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const insp = stats?.inspections;
  const def = stats?.defects;

  const inspPie = (insp?.byStatus ?? []).map((r) => {
    const meta = INSPECTION_STATUS[r.status ?? 0] ?? INSPECTION_STATUS[0];
    return { name: t(meta.label), value: r._count?._all ?? 0, color: COLOR_HEX[meta.color] };
  });
  const defStatusPie = (def?.byStatus ?? []).map((r) => {
    const meta = DEFECT_STATUS[r.status ?? 0] ?? DEFECT_STATUS[0];
    return { name: t(meta.label), value: r._count?._all ?? 0, color: COLOR_HEX[meta.color] };
  });
  const defSeverityBar = (def?.bySeverity ?? [])
    .map((r) => {
      const meta = r.severity != null ? DEFECT_SEVERITY[r.severity] : undefined;
      return { name: meta ? t(meta.label) : t('Не указана'), value: r._count?._all ?? 0, color: meta ? COLOR_HEX[meta.color] : COLOR_HEX.gray };
    })
    .sort((a, b) => b.value - a.value);

  const resolvedRate = def && def.total > 0
    ? Math.round((((def.byStatus.find((s) => (s.status ?? 0) >= 3)?._count?._all) ?? 0) / def.total) * 100)
    : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span><span className="text-gray-700 dark:text-gray-200">{t('Аналитика')}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">{t('Аналитика')}</h1>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Всего инспекций" value={insp?.total ?? 0} />
        <StatCard label="Просроченные инспекции" value={insp?.overdue ?? 0} accent="text-orange-500" />
        <StatCard label="Всего дефектов" value={def?.total ?? 0} />
        <StatCard label="Просроченные дефекты" value={def?.overdue ?? 0} accent="text-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Инспекции по статусам */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Инспекции по статусам')}</h3>
          {inspPie.some((d) => d.value > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={inspPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                    {inspPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-gray-400 py-12 text-center">{t('Нет данных')}</p>}
        </div>

        {/* Дефекты по статусам */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Дефекты по статусам')}</h3>
          {defStatusPie.some((d) => d.value > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={defStatusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                    {defStatusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-gray-400 py-12 text-center">{t('Нет данных')}</p>}
        </div>

        {/* % устранения */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs flex flex-col">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Устранение дефектов')}</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-green-500">{resolvedRate}%</div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">{t('Дефектов устранено/проверено/закрыто')}</p>
          </div>
        </div>

        {/* Дефекты по критичности */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Дефекты по критичности')}</h3>
          {defSeverityBar.some((d) => d.value > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defSeverityBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#80808033" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {defSeverityBar.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-gray-400 py-12 text-center">{t('Нет данных')}</p>}
        </div>
      </div>
    </div>
  );
}
