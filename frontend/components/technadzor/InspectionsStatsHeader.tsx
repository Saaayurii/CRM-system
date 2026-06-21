'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { INSPECTION_STATUS } from '@/components/technadzor/Badge';

interface GroupRow { status?: number; _count?: { _all?: number } }
interface Stats {
  inspections: { byStatus: GroupRow[]; total: number; overdue: number };
}
interface InspectionLite { id: number; inspectionNumber?: string; scheduledDate?: string; status?: number; }

const COLOR_HEX: Record<string, string> = {
  gray: '#9ca3af', blue: '#3b82f6', yellow: '#eab308', green: '#22c55e', red: '#ef4444',
};

function Kpi({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-4 shadow-xs">
      <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t(label)}</div>
      <div className={`text-2xl font-bold ${color ?? 'text-gray-800 dark:text-gray-100'}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{t(sub)}</div>}
    </div>
  );
}

export default function InspectionsStatsHeader() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<InspectionLite[]>([]);

  useEffect(() => {
    api.get<Stats>('/inspections/stats').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/inspections', { params: { limit: 100 } }).then(({ data }) => {
      const list: InspectionLite[] = data?.data || data?.items || (Array.isArray(data) ? data : []);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const up = list
        .filter((i) => i.scheduledDate && (i.status ?? 0) < 2)
        .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
        .slice(0, 5);
      setUpcoming(up);
    }).catch(() => {});
  }, []);

  const insp = stats?.inspections;
  const countByStatus = (s: number) => insp?.byStatus.find((r) => (r.status ?? 0) === s)?._count?._all ?? 0;

  const donut = insp
    ? insp.byStatus.map((r) => {
        const meta = INSPECTION_STATUS[r.status ?? 0] ?? INSPECTION_STATUS[0];
        return { name: t(meta.label), value: r._count?._all ?? 0, color: COLOR_HEX[meta.color] };
      }).filter((d) => d.value > 0)
    : [];

  const fmtDate = (v?: string) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU');
  };
  const dayMark = (v?: string) => {
    if (!v) return null;
    const d = new Date(v); d.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    if (d < now) return { label: 'Просрочена', color: 'text-red-500' };
    if (d.getTime() === now.getTime()) return { label: 'Сегодня', color: 'text-orange-500' };
    return null;
  };

  return (
    <div className="mb-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* KPI */}
      <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Kpi label="Всего инспекций" value={insp?.total ?? 0} />
        <Kpi label="В процессе" value={countByStatus(1)} color="text-yellow-500" />
        <Kpi label="Завершено" value={countByStatus(2)} color="text-green-500" />
        <Kpi label="Просрочено" value={insp?.overdue ?? 0} color="text-red-500" />
      </div>

      {/* Донат-сводка */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-4 shadow-xs flex items-center gap-3">
        <div className="w-20 h-20 shrink-0 relative">
          {donut.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={26} outerRadius={38} paddingAngle={2}>
                  {donut.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-700" />}
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">{insp?.total ?? 0}</div>
        </div>
        <ul className="text-[11px] space-y-0.5 min-w-0">
          {donut.map((d, i) => (
            <li key={i} className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="truncate">{d.name}</span><span className="ml-auto font-medium text-gray-700 dark:text-gray-200">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Ближайшие сроки */}
      {upcoming.length > 0 && (
        <div className="lg:col-span-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-4 shadow-xs">
          <h3 className="text-xs uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-2">{t('Ближайшие сроки')}</h3>
          <div className="flex flex-wrap gap-2">
            {upcoming.map((i) => {
              const mark = dayMark(i.scheduledDate);
              return (
                <Link key={i.id} href={`/dashboard/technadzor/inspections/${i.id}`} className="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-1.5 text-sm hover:border-violet-300 dark:hover:border-violet-500/40">
                  <span className="text-gray-700 dark:text-gray-200">{i.inspectionNumber || `INSP-${i.id}`}</span>
                  <span className={`text-xs ${mark?.color ?? 'text-gray-400'}`}>{mark ? t(mark.label) : fmtDate(i.scheduledDate)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
