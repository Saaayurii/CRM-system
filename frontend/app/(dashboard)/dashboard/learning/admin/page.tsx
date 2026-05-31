'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

interface TrainingMaterial {
  id: number;
  title: string;
  materialType?: string;
  isMandatory?: boolean;
  isPublished?: boolean;
  targetRoleIds?: number[] | unknown;
}

interface User {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roleId?: number;
  role_id?: number;
  role?: { id: number; name: string; code: string };
}

interface ProgressRow {
  id: number;
  userId: number;
  trainingMaterialId: number;
  startedAt?: string | null;
  completedAt?: string | null;
  progressPercentage: number;
  updatedAt?: string;
}

interface Stats {
  rows: ProgressRow[];
  perMaterial: Record<number, { total: number; completed: number; inProgress: number }>;
  perUser: Record<number, { total: number; completed: number; inProgress: number }>;
  summary: { totalRecords: number; totalCompleted: number; totalInProgress: number };
}

function userLabel(u: User): string {
  return u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || `#${u.id}`;
}

export default function TrainingStatsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const roleCode = user?.role?.code;
  const canView = roleCode === 'admin' || roleCode === 'super_admin' || roleCode === 'hr_manager';

  const addToast = useToastStore((s) => s.addToast);

  const [users, setUsers] = useState<User[]>([]);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [onlyMandatory, setOnlyMandatory] = useState(false);

  useEffect(() => {
    if (!canView) {
      router.push('/dashboard/learning');
    }
  }, [canView, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, mRes, sRes] = await Promise.all([
        api.get('/users', { params: { limit: 500 } }),
        api.get('/training-materials', { params: { limit: 500 } }),
        api.get('/training-progress/stats'),
      ]);
      const uArr: User[] = Array.isArray(uRes.data) ? uRes.data : (uRes.data?.users ?? uRes.data?.data ?? uRes.data?.items ?? []);
      const mArr: TrainingMaterial[] = Array.isArray(mRes.data) ? mRes.data : (mRes.data?.data ?? mRes.data?.items ?? []);
      setUsers(uArr);
      setMaterials(mArr);
      setStats(sRes.data as Stats);
    } catch {
      addToast('error', 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (canView) fetchAll();
  }, [canView, fetchAll]);

  const visibleMaterials = useMemo(() => {
    return materials.filter((m) => (onlyMandatory ? m.isMandatory : true));
  }, [materials, onlyMandatory]);

  const visibleUsers = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => userLabel(u).toLowerCase().includes(s) || (u.email ?? '').toLowerCase().includes(s));
  }, [users, search]);

  // userId × materialId → progress
  const grid = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    if (stats?.rows) {
      for (const r of stats.rows) {
        map.set(`${r.userId}:${r.trainingMaterialId}`, r);
      }
    }
    return map;
  }, [stats]);

  const userTotals = useCallback((userId: number) => {
    let done = 0;
    let started = 0;
    let mandatoryDone = 0;
    let mandatoryTotal = 0;
    for (const m of visibleMaterials) {
      const r = grid.get(`${userId}:${m.id}`);
      const pct = r?.progressPercentage ?? 0;
      if (pct >= 100) done += 1;
      else if (pct > 0 || r?.startedAt) started += 1;
      if (m.isMandatory) {
        mandatoryTotal += 1;
        if (pct >= 100) mandatoryDone += 1;
      }
    }
    return { done, started, mandatoryDone, mandatoryTotal };
  }, [grid, visibleMaterials]);

  if (!canView) return null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/learning" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            К библиотеке
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Аналитика обучения
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Прогресс сотрудников по всем материалам аккаунта.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Сотрудников" value={users.length} color="violet" />
        <SummaryCard label="Материалов" value={materials.length} color="blue" />
        <SummaryCard
          label="Записей о прогрессе"
          value={stats?.summary.totalRecords ?? 0}
          color="orange"
        />
        <SummaryCard
          label="Завершено всего"
          value={stats?.summary.totalCompleted ?? 0}
          color="green"
        />
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Поиск по сотрудникам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400 min-w-[220px]"
        />
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyMandatory}
            onChange={(e) => setOnlyMandatory(e.target.checked)}
            className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 accent-violet-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400/50"
          />
          Только обязательные материалы
        </label>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
          Загрузка статистики...
        </div>
      ) : visibleMaterials.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
          Нет материалов для отображения.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/80 sticky top-0">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/80 text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 min-w-[200px]">
                    Сотрудник
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 min-w-[110px]">
                    Сводка
                  </th>
                  {visibleMaterials.map((m) => (
                    <th
                      key={m.id}
                      className="px-2 py-3 text-center font-medium text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 min-w-[100px]"
                      title={m.title}
                    >
                      <div className="text-[11px] line-clamp-2 max-w-[100px] mx-auto">
                        {m.title}
                      </div>
                      {m.isMandatory && (
                        <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          ОБЯЗ
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((u, idx) => {
                  const totals = userTotals(u.id);
                  const pct = visibleMaterials.length > 0 ? Math.round((totals.done / visibleMaterials.length) * 100) : 0;
                  return (
                    <tr key={u.id} className={idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/40'}>
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700/70">
                        <div className="font-medium truncate max-w-[260px]">{userLabel(u)}</div>
                        {u.email && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[260px]">
                            {u.email}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center border-b border-gray-100 dark:border-gray-700/70">
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                            {totals.done}/{visibleMaterials.length}
                          </div>
                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded">
                            <div
                              className={`h-full rounded ${pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-violet-500' : 'bg-gray-300'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {totals.mandatoryTotal > 0 && (
                            <div className={`text-[10px] ${totals.mandatoryDone === totals.mandatoryTotal ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              Обяз: {totals.mandatoryDone}/{totals.mandatoryTotal}
                            </div>
                          )}
                        </div>
                      </td>
                      {visibleMaterials.map((m) => {
                        const r = grid.get(`${u.id}:${m.id}`);
                        const pct = r?.progressPercentage ?? 0;
                        const isDone = pct >= 100;
                        const isStarted = pct > 0 || !!r?.startedAt;
                        return (
                          <td
                            key={m.id}
                            className="px-2 py-2.5 text-center border-b border-gray-100 dark:border-gray-700/70"
                            title={
                              isDone
                                ? `Изучено (${r?.completedAt ? new Date(r.completedAt).toLocaleDateString('ru-RU') : ''})`
                                : isStarted
                                ? `В процессе: ${pct}%`
                                : 'Не начато'
                            }
                          >
                            {isDone ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs">
                                ✓
                              </span>
                            ) : isStarted ? (
                              <span className="inline-flex items-center justify-center min-w-[32px] h-6 px-1.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-medium">
                                {pct}%
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: 'violet' | 'blue' | 'orange' | 'green' }) {
  const map = {
    violet: 'from-violet-500/10 to-fuchsia-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/50',
    blue:   'from-blue-500/10 to-sky-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
    orange: 'from-orange-500/10 to-amber-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
    green:  'from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${map[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wide opacity-80 mt-1">{label}</div>
    </div>
  );
}
