'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import FinanceOperationModal from '@/components/finance/FinanceOperationModal';

interface Operation {
  id: number;
  paymentNumber?: string;
  direction?: 'income' | 'expense' | null;
  subType?: string | null;
  documentType?: string | null;
  amount: number | string;
  paymentDate?: string;
  paymentDatetime?: string | null;
  cashLocation?: string | null;
  bankName?: string | null;
  projectId?: number | null;
  constructionSiteId?: number | null;
  paymentAccountId?: number | null;
  description?: string | null;
  status?: number | null;
  paymentAccount?: { id: number; name: string; bankName?: string | null } | null;
}

interface Project { id: number; name: string }
interface Site { id: number; address?: string; name?: string; projectId?: number }

const SUBTYPE_LABEL: Record<string, string> = {
  advance: 'Аванс',
  payment: 'Оплата',
  refund: 'Возврат',
  bill: 'Счёт',
  material: 'Материалы',
  advance_disbursement: 'Авансирование',
  payroll: 'Расчёт',
};

const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  1: { label: 'Проведён', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  2: { label: 'Отменён', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return value;
  }
}

type TabKey = 'all' | 'income' | 'expense';

export default function FinancePage() {
  const [tab, setTab] = useState<TabKey>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [projectFilter, setProjectFilter] = useState<number | ''>('');
  const [siteFilter, setSiteFilter] = useState<number | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects', { params: { limit: 200 } });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setProjects(list.map((p: any) => ({ id: p.id, name: p.name ?? p.title ?? `#${p.id}` })));
    } catch {
      setProjects([]);
    }
  }, []);

  const loadSites = useCallback(async (projId: number | '') => {
    if (!projId) {
      setSites([]);
      return;
    }
    try {
      const res = await api.get('/construction-sites', {
        params: { projectId: projId, limit: 200 },
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setSites(
        list.map((s: any) => ({
          id: s.id,
          address: s.address ?? s.name,
          name: s.name,
          projectId: s.projectId ?? s.project_id,
        })),
      );
    } catch {
      setSites([]);
    }
  }, []);

  const loadOperations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (tab !== 'all') params.direction = tab;
      if (projectFilter) params.projectId = projectFilter;
      if (siteFilter) params.constructionSiteId = siteFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/payments', { params });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setOperations(list);
    } catch {
      setOperations([]);
    } finally {
      setLoading(false);
    }
  }, [tab, projectFilter, siteFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadSites(projectFilter);
    setSiteFilter('');
  }, [projectFilter, loadSites]);

  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let advance = 0;
    for (const op of operations) {
      const amt = Number(op.amount ?? 0);
      if (op.direction === 'income') {
        income += amt;
        if (op.subType === 'advance') advance += amt;
      } else if (op.direction === 'expense') {
        expense += amt;
      }
    }
    return { income, expense, advance, balance: income - expense };
  }, [operations]);

  const projectName = (id?: number | null) => {
    if (!id) return null;
    return projects.find((p) => p.id === id)?.name ?? `#${id}`;
  };
  const siteName = (id?: number | null) => {
    if (!id) return null;
    const s = sites.find((s) => s.id === id);
    return s ? s.address ?? s.name ?? `#${id}` : `#${id}`;
  };

  const filteredOps = operations;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-violet-500 hover:text-violet-600 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Назад к панели управления
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">
            Финансы
          </h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn bg-violet-500 hover:bg-violet-600 text-white"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Добавить операцию
        </button>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Приход" value={stats.income} color="emerald" />
        <SummaryCard label="Расход" value={stats.expense} color="red" />
        <SummaryCard
          label="Баланс"
          value={stats.balance}
          color={stats.balance >= 0 ? 'emerald' : 'red'}
        />
        <SummaryCard label="В т.ч. авансы" value={stats.advance} color="violet" />
      </div>

      {/* Табы и фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
        <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          {(
            [
              { key: 'all', label: 'Все операции' },
              { key: 'income', label: 'Приходы' },
              { key: 'expense', label: 'Расходы' },
            ] as { key: TabKey; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 ${
                tab === t.key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Проект</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value ? Number(e.target.value) : '')}
              className="form-select w-full text-sm"
            >
              <option value="">Все проекты</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Объект</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value ? Number(e.target.value) : '')}
              disabled={!projectFilter}
              className="form-select w-full text-sm disabled:opacity-50"
            >
              <option value="">{projectFilter ? 'Все объекты' : 'Сначала проект'}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.address ?? s.name ?? `#${s.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Период с</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="form-input w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">по</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="form-input w-full text-sm"
            />
          </div>
        </div>

        {/* Таблица */}
        <div className="overflow-x-auto">
          <table className="table-auto w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-4 py-2 text-left whitespace-nowrap">Документ</th>
                <th className="px-4 py-2 text-left">Тип</th>
                <th className="px-4 py-2 text-left">Категория</th>
                <th className="px-4 py-2 text-right">Сумма</th>
                <th className="px-4 py-2 text-left whitespace-nowrap">Дата/время</th>
                <th className="px-4 py-2 text-left">Проект / Объект</th>
                <th className="px-4 py-2 text-left">Счёт / Способ</th>
                <th className="px-4 py-2 text-left">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    Загрузка…
                  </td>
                </tr>
              ) : filteredOps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    Нет операций по выбранным фильтрам
                  </td>
                </tr>
              ) : (
                filteredOps.map((op) => {
                  const isIncome = op.direction === 'income';
                  const status = STATUS_LABEL[Number(op.status ?? 0)];
                  return (
                    <tr key={op.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {op.paymentNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            isIncome
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {isIncome ? 'Приход' : 'Расход'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {op.subType ? SUBTYPE_LABEL[op.subType] ?? op.subType : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                          isIncome ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {isIncome ? '+' : '−'} {formatMoney(op.amount)} ₽
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDateTime(op.paymentDatetime ?? op.paymentDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {projectName(op.projectId) ? (
                          <div>
                            <div className="text-sm">{projectName(op.projectId)}</div>
                            {siteName(op.constructionSiteId) && (
                              <div className="text-xs text-gray-500">{siteName(op.constructionSiteId)}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {op.cashLocation === 'hand' ? (
                          <span className="text-xs">На руки</span>
                        ) : op.paymentAccount ? (
                          <div>
                            <div className="text-sm">{op.paymentAccount.name}</div>
                            {op.paymentAccount.bankName && (
                              <div className="text-xs text-gray-500">{op.paymentAccount.bankName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {status ? (
                          <span className={`text-xs px-2 py-1 rounded font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FinanceOperationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          loadOperations();
        }}
        defaultProjectId={projectFilter || null}
        defaultConstructionSiteId={siteFilter || null}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'emerald' | 'red' | 'violet';
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    violet: 'text-violet-600 dark:text-violet-400',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4">
      <div className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${colorMap[color]}`}>{formatMoney(value)} ₽</div>
    </div>
  );
}
