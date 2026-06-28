'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '@/lib/api';
import { formatMoney, toLocalYmd } from '@/lib/utils';
import { useDownloadPdf } from '@/lib/hooks/useDownloadPdf';
import FinanceOperationModal from '@/components/finance/FinanceOperationModal';
import FinanceOperationDrawer from '@/components/finance/FinanceOperationDrawer';
import DocumentsOverview from '@/components/estimates/DocumentsOverview';
import { useIsClient } from '@/hooks/useIsClient';
import FinancialReportModal from '@/components/estimates/FinancialReportModal';
import { useT } from '@/lib/i18n';

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

function formatTimeShort(value?: string | null) {
  if (!value) return '';
  try {
    const d = new Date(value);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function groupByDate(ops: Operation[]) {
  const groups: Record<string, Operation[]> = {};
  for (const op of ops) {
    const raw = op.paymentDatetime ?? op.paymentDate;
    let key = 'Без даты';
    if (raw) {
      try {
        const d = new Date(raw);
        key = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch {
        key = raw;
      }
    }
    (groups[key] ||= []).push(op);
  }
  return groups;
}

type TabKey = 'all' | 'income' | 'expense' | 'advance' | 'documents';
type ViewMode = 'table' | 'grid';
type QuickPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

const PIE_COLORS = ['#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];

function periodRange(p: QuickPeriod): { from: string; to: string } | null {
  if (p === 'custom') return null;
  const now = new Date();
  const to = toLocalYmd(now);
  const start = new Date(now);
  if (p === 'today') {
    // start stays today
  } else if (p === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (p === 'month') {
    start.setDate(1);
  } else if (p === 'quarter') {
    const qStartMonth = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(qStartMonth, 1);
  } else if (p === 'year') {
    start.setMonth(0, 1);
  }
  return { from: toLocalYmd(start), to };
}

function formatDateShort(value?: string) {
  if (!value) return '';
  try {
    const d = new Date(value);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return value;
  }
}

interface DocumentTemplate {
  key: string;
  title: string;
  description: string;
  file: string;
  fileLabel: string;
  icon: React.ReactNode;
}

const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    key: 'price-list',
    title: 'Прайс-лист',
    description: 'Прайс на работы по ремонту в формате Excel — открывается в любой табличной программе',
    file: '/templates/price-list.csv',
    fileLabel: 'price-list.csv',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M3 7h18M5 7v12a2 2 0 002 2h10a2 2 0 002-2V7M8 11h8M8 15h5" />
      </svg>
    ),
  },
  {
    key: 'contract-repair',
    title: 'Договор подряда на ремонт',
    description: 'Для безопасных сделок с заказчиками — физическими и юридическими лицами',
    file: '/templates/contract-repair.rtf',
    fileLabel: 'contract-repair.rtf',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3l3 3M4 20h4l10.5-10.5a2.121 2.121 0 10-3-3L5 17v3z" />
      </svg>
    ),
  },
  {
    key: 'contract-construction',
    title: 'Договор подряда на строительство',
    description: 'Для сделок по налоговому стимулированию строительной отрасли',
    file: '/templates/contract-construction.rtf',
    fileLabel: 'contract-construction.rtf',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-7 9 7v10a2 2 0 01-2 2h-4v-7H10v7H6a2 2 0 01-2-2V10z" />
      </svg>
    ),
  },
  {
    key: 'contract-subcontract',
    title: 'Договор субподряда',
    description: 'Защитит подрядчика при работе с субподрядчиком — гарантии, ответственность, удержания',
    file: '/templates/contract-subcontract.rtf',
    fileLabel: 'contract-subcontract.rtf',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1.724 1.724 0 013.35 0l.477 1.857a1.724 1.724 0 002.485 1.03l1.687-.9a1.724 1.724 0 012.37 2.37l-.9 1.687a1.724 1.724 0 001.03 2.485l1.857.477a1.724 1.724 0 010 3.35l-1.857.477a1.724 1.724 0 00-1.03 2.485l.9 1.687a1.724 1.724 0 01-2.37 2.37l-1.687-.9a1.724 1.724 0 00-2.485 1.03l-.477 1.857a1.724 1.724 0 01-3.35 0l-.477-1.857a1.724 1.724 0 00-2.485-1.03l-1.687.9a1.724 1.724 0 01-2.37-2.37l.9-1.687a1.724 1.724 0 00-1.03-2.485l-1.857-.477a1.724 1.724 0 010-3.35l1.857-.477a1.724 1.724 0 001.03-2.485l-.9-1.687a1.724 1.724 0 012.37-2.37l1.687.9a1.724 1.724 0 002.485-1.03l.477-1.857z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'contract-supply',
    title: 'Договор комплектации',
    description: 'Закрывает 90% правовых рисков подрядчика при поставке материалов и оборудования',
    file: '/templates/contract-supply.rtf',
    fileLabel: 'contract-supply.rtf',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4L4 7m0 0v10l8 4" />
      </svg>
    ),
  },
];

export default function FinancePage() {
  const t = useT();
  const isClient = useIsClient();
  const [tab, setTab] = useState<TabKey>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [projectFilter, setProjectFilter] = useState<number | ''>('');
  const [docFlowProjectId, setDocFlowProjectId] = useState<number | ''>('');
  const [showFinancialReport, setShowFinancialReport] = useState(false);
  const [siteFilter, setSiteFilter] = useState<number | ''>('');
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('month');
  const [dateFrom, setDateFrom] = useState(() => periodRange('month')!.from);
  const [dateTo, setDateTo] = useState(() => periodRange('month')!.to);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('financeViewMode') as ViewMode) || 'table';
    }
    return 'table';
  });
  const { download: downloadPdf, loading: pdfLoading } = useDownloadPdf();

  // Close action menu on outside click
  useEffect(() => {
    if (openMenuId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  // Close settings dropdown on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  const applyQuickPeriod = (p: QuickPeriod) => {
    setQuickPeriod(p);
    const r = periodRange(p);
    if (r) {
      setDateFrom(r.from);
      setDateTo(r.to);
    }
  };

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('financeViewMode', mode);
  };

  const loadProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects', { params: { limit: 200 } });
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data?.projects ?? []);
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
      const params: Record<string, unknown> = { limit: 200 };
      if (tab === 'income' || tab === 'expense') params.direction = tab;
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
    let advanceIn = 0;
    let advanceOut = 0;
    for (const op of operations) {
      const amt = Number(op.amount ?? 0);
      if (op.direction === 'income') {
        income += amt;
        if (op.subType === 'advance') advanceIn += amt;
      } else if (op.direction === 'expense') {
        expense += amt;
        if (op.subType === 'advance_disbursement') advanceOut += amt;
      }
    }
    return {
      income,
      expense,
      cashFlow: income - expense,
      advanceBalance: advanceIn - advanceOut,
    };
  }, [operations]);

  // Балансы по счетам/кассам
  const accountBalances = useMemo(() => {
    const map = new Map<string, { key: string; label: string; bank?: string; total: number }>();
    for (const op of operations) {
      const sign = op.direction === 'income' ? 1 : op.direction === 'expense' ? -1 : 0;
      if (!sign) continue;
      const amt = Number(op.amount ?? 0) * sign;
      let key: string;
      let label: string;
      let bank: string | undefined;
      if (op.cashLocation === 'hand') {
        key = 'hand';
        label = 'Касса (на руки)';
      } else if (op.paymentAccount) {
        key = `acc-${op.paymentAccount.id}`;
        label = op.paymentAccount.name;
        bank = op.paymentAccount.bankName ?? undefined;
      } else {
        key = 'unknown';
        label = 'Без счёта';
      }
      const cur = map.get(key) ?? { key, label, bank, total: 0 };
      cur.total += amt;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [operations]);

  // Расходы по категориям (subType)
  const expenseByCategory = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const op of operations) {
      if (op.direction !== 'expense') continue;
      const key = op.subType || 'other';
      sums[key] = (sums[key] ?? 0) + Number(op.amount ?? 0);
    }
    return Object.entries(sums)
      .map(([k, v]) => ({ name: SUBTYPE_LABEL[k] ?? 'Прочее', value: v }))
      .sort((a, b) => b.value - a.value);
  }, [operations]);

  // Расходы по проектам
  const expenseByProject = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const op of operations) {
      if (op.direction !== 'expense') continue;
      const key = op.projectId ? String(op.projectId) : 'none';
      sums[key] = (sums[key] ?? 0) + Number(op.amount ?? 0);
    }
    return Object.entries(sums)
      .map(([k, v]) => {
        const name = k === 'none' ? 'Без проекта' : (projects.find((p) => p.id === Number(k))?.name ?? `#${k}`);
        return { name, value: v };
      })
      .sort((a, b) => b.value - a.value);
  }, [operations, projects]);

  const projectName = (id?: number | null) => {
    if (!id) return null;
    return projects.find((p) => p.id === id)?.name ?? `#${id}`;
  };
  const siteName = (id?: number | null) => {
    if (!id) return null;
    const s = sites.find((s) => s.id === id);
    return s ? s.address ?? s.name ?? `#${id}` : `#${id}`;
  };

  const filteredOps = useMemo(() => {
    if (tab === 'advance') {
      return operations.filter(
        (op) => op.subType === 'advance' || op.subType === 'advance_disbursement',
      );
    }
    return operations;
  }, [operations, tab]);

  // Итого по отфильтрованным операциям (для футер-строки таблицы)
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const op of filteredOps) {
      const amt = Number(op.amount ?? 0);
      if (op.direction === 'income') income += amt;
      else if (op.direction === 'expense') expense += amt;
    }
    return { income, expense, net: income - expense };
  }, [filteredOps]);

  const handleDeleteOperation = useCallback(async (id: number) => {
    if (!confirm('Удалить операцию?')) return;
    try {
      await api.delete(`/payments/${id}`);
      loadOperations();
    } catch {
      alert('Не удалось удалить операцию');
    } finally {
      setOpenMenuId(null);
    }
  }, [loadOperations]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Финансы
          </h1>
          {tab !== 'documents' && (dateFrom || dateTo) && (
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Период: {formatDateShort(dateFrom) || '—'} – {formatDateShort(dateTo) || '—'}
            </div>
          )}
        </div>
        {tab !== 'documents' && (
          <div className="flex items-center gap-0.5">
            {!isClient && (
              <button
                onClick={() => setModalOpen(true)}
                title={t('Добавить операцию')}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings((v) => !v)}
                title={t('Экспорт')}
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {showSettings && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-50">
                  <button
                    onClick={() => {
                      downloadPdf('payments', tab === 'income' ? 'Приходы' : tab === 'expense' ? 'Расходы' : 'Операции', operations.map((op) => ({
                        Документ: op.paymentNumber ?? '—',
                        Тип: op.direction === 'income' ? 'Приход' : op.direction === 'expense' ? 'Расход' : '—',
                        Категория: op.subType ? (SUBTYPE_LABEL[op.subType] ?? op.subType) : '—',
                        Сумма: `${op.direction === 'income' ? '+' : '−'} ${formatMoney(op.amount)} ₽`,
                        'Дата/время': formatDateTime(op.paymentDatetime ?? op.paymentDate),
                        Проект: projectName(op.projectId) || '—',
                        Объект: siteName(op.constructionSiteId) || '—',
                        Счёт: op.cashLocation === 'hand' ? 'На руки' : (op.paymentAccount?.name || '—'),
                        Статус: STATUS_LABEL[Number(op.status ?? 0)]?.label || '—',
                      })));
                      setShowSettings(false);
                    }}
                    disabled={pdfLoading || operations.length === 0}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {pdfLoading ? 'PDF...' : 'Скачать PDF'}
                  </button>
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg ml-1">
              <button
                onClick={() => handleViewMode('table')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                title={t('Таблица')}
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => handleViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                title={t('Карточки')}
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Быстрые периоды */}
      {tab !== 'documents' && (
        <div className="mb-4">
          <div className="flex items-center gap-1 flex-wrap">
            {([
              ['today', 'Сегодня'],
              ['week', 'Неделя'],
              ['month', 'Месяц'],
              ['quarter', 'Квартал'],
              ['year', 'Год'],
              ['custom', 'Произвольный'],
            ] as [QuickPeriod, string][]).map(([k, l]) => (
              <button
                key={k}
                onClick={() => applyQuickPeriod(k)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  quickPeriod === k
                    ? 'bg-violet-500 text-white border-violet-500'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {quickPeriod === 'custom' && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-violet-300 dark:border-violet-600 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">С</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs text-gray-800 dark:text-gray-100 bg-transparent border-none outline-none cursor-pointer"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">—</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('по')}</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs text-gray-800 dark:text-gray-100 bg-transparent border-none outline-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Сводка KPI */}
      {tab !== 'documents' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <SummaryCard
            label={t('Денежный поток')}
            value={stats.cashFlow}
            color={stats.cashFlow >= 0 ? 'emerald' : 'red'}
            hint="Приход − Расход"
            sign
          />
          <SummaryCard label={t('Приход')} value={stats.income} color="emerald" sign="+" />
          <SummaryCard label={t('Расход')} value={stats.expense} color="red" sign="−" />
          <SummaryCard
            label={t('Баланс по счетам')}
            value={accountBalances.reduce((s, a) => s + a.total, 0)}
            color={accountBalances.reduce((s, a) => s + a.total, 0) >= 0 ? 'emerald' : 'red'}
          />
          <SummaryCard
            label={t('Авансовый остаток')}
            value={stats.advanceBalance}
            color="violet"
            hint="Авансы получено − выдано"
          />
        </div>
      )}

      {/* Счета / кассы + графики */}
      {tab !== 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Счета / кассы */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Счета / кассы')}</h3>
              <span className="text-xs text-gray-400">{accountBalances.length}</span>
            </div>
            {accountBalances.length === 0 ? (
              <div className="text-sm text-gray-400 py-6 text-center">{t('Нет операций')}</div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {accountBalances.map((a) => (
                  <li key={a.key} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        a.key === 'hand'
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300'
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {a.key === 'hand' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m3-6h10a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2v-6a2 2 0 012-2zm7 5a2 2 0 11-4 0 2 2 0 014 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-7-4v8M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                          )}
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{a.label}</div>
                        {a.bank && <div className="text-xs text-gray-500 truncate">{a.bank}</div>}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold whitespace-nowrap ${
                      a.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatMoney(a.total)} ₽
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Расходы по категориям */}
          <ExpenseDonut title={t('Расходы по категориям')} data={expenseByCategory} />

          {/* Расходы по проектам */}
          <ExpenseDonut title={t('Расходы по проектам')} data={expenseByProject} />
        </div>
      )}

      {/* Табы и фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
        <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          {(
            [
              { key: 'all', label: 'Все операции' },
              { key: 'income', label: 'Приходы' },
              { key: 'expense', label: 'Расходы' },
              { key: 'advance', label: 'Авансы' },
              { key: 'documents', label: 'Пакеты документов' },
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

        {tab === 'documents' ? (
          <div className="p-4 sm:p-6 space-y-6">
            {/* ─── Документооборот по проекту ────────────────── */}
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    Документооборот проекта
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Прайс компании, сметы проекта и платежи — источники для генерации PDF.
                  </p>
                </div>
                <div className="min-w-[260px]">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('Проект')}</label>
                  <select
                    value={docFlowProjectId}
                    onChange={(e) => setDocFlowProjectId(e.target.value ? Number(e.target.value) : '')}
                    className="form-select w-full text-sm"
                  >
                    <option value="">{t('— выберите проект —')}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {docFlowProjectId === '' ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Выберите проект, чтобы увидеть его документооборот.
                </div>
              ) : (
                <DocumentsOverview
                  projectId={Number(docFlowProjectId)}
                  onCreateEstimate={() => window.location.assign(`/dashboard/projects/${docFlowProjectId}?tab=estimates`)}
                  onOpenFinancialReport={() => setShowFinancialReport(true)}
                />
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700" />

            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Пакеты готовых документов
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Готовые шаблоны для скачивания и использования в работе. Файлы открываются в Word, Excel или LibreOffice.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {DOCUMENT_TEMPLATES.map((doc) => (
                <a
                  key={doc.key}
                  href={doc.file}
                  download={doc.fileLabel}
                  className="group flex gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-400 hover:shadow-md transition"
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                    {doc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-300">
                      {doc.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {doc.description}
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-300">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      Скачать {doc.fileLabel}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : (
        <>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('Проект')}</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value ? Number(e.target.value) : '')}
              className="form-select w-full text-sm"
            >
              <option value="">{t('Все проекты')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('Объект')}</label>
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
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('Период с')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setQuickPeriod('custom'); }}
              className="form-input w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('по')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setQuickPeriod('custom'); }}
              className="form-input w-full text-sm"
            />
          </div>
        </div>

        {/* Мобильная лента — история операций (как в банке) */}
        <div className="sm:hidden">
          {loading ? (
            <div className="px-4 py-6 text-center text-gray-500">{t('Загрузка…')}</div>
          ) : filteredOps.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500">
              Нет операций по выбранным фильтрам
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {Object.entries(groupByDate(filteredOps)).map(([dateLabel, ops]) => (
                <div key={dateLabel}>
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 sticky top-0">
                    {dateLabel}
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {ops.map((op) => {
                      const isIncome = op.direction === 'income';
                      const status = STATUS_LABEL[Number(op.status ?? 0)];
                      const proj = projectName(op.projectId);
                      const site = siteName(op.constructionSiteId);
                      const account = op.cashLocation === 'hand'
                        ? 'На руки'
                        : op.paymentAccount?.name;
                      const time = formatTimeShort(op.paymentDatetime ?? op.paymentDate);
                      return (
                        <li key={op.id} className="px-4 py-3 active:bg-gray-50 dark:active:bg-gray-900/30">
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                isIncome
                                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                              aria-hidden
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {isIncome ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7-7m0 0l-7 7m7-7v18" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7 7m0 0l7-7m-7 7V3" />
                                )}
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-800 dark:text-gray-100 truncate">
                                    {op.subType ? SUBTYPE_LABEL[op.subType] ?? op.subType : (isIncome ? 'Приход' : 'Расход')}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {proj || account || op.paymentNumber || '—'}
                                  </div>
                                </div>
                                <div
                                  className={`text-right font-semibold whitespace-nowrap ${
                                    isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {isIncome ? '+' : '−'} {formatMoney(op.amount)} ₽
                                </div>
                              </div>
                              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                                {time && <span className="text-gray-500 dark:text-gray-400">{time}</span>}
                                {site && <span className="text-gray-500 dark:text-gray-400 truncate">{site}</span>}
                                {status && (
                                  <span className={`px-1.5 py-0.5 rounded font-medium ${status.color}`}>
                                    {status.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Десктоп: таблица или сетка карточек */}
        {viewMode === 'table' ? (
        <div className="hidden sm:block overflow-x-auto">
          <table className="table-auto w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-4 py-2 text-left whitespace-nowrap">{t('№ документа')}</th>
                <th className="px-4 py-2 text-left">{t('Тип')}</th>
                <th className="px-4 py-2 text-left">{t('Категория')}</th>
                <th className="px-4 py-2 text-left">{t('Назначение')}</th>
                <th className="px-4 py-2 text-right">{t('Сумма')}</th>
                <th className="px-4 py-2 text-left whitespace-nowrap">{t('Дата/время')}</th>
                <th className="px-4 py-2 text-left">{t('Проект / Объект')}</th>
                <th className="px-4 py-2 text-left">{t('Счёт / Способ')}</th>
                <th className="px-4 py-2 text-center">{t('Док.')}</th>
                <th className="px-4 py-2 text-left">{t('Статус')}</th>
                <th className="px-4 py-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-gray-500">
                    Загрузка…
                  </td>
                </tr>
              ) : filteredOps.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-gray-500">
                    Нет операций по выбранным фильтрам
                  </td>
                </tr>
              ) : (
                filteredOps.map((op) => {
                  const isIncome = op.direction === 'income';
                  const status = STATUS_LABEL[Number(op.status ?? 0)];
                  return (
                    <tr
                      key={op.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer"
                      onClick={() => setSelectedOp(op)}
                    >
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
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[260px]">
                        <div className="truncate" title={op.description ?? ''}>
                          {op.description || <span className="text-gray-400">—</span>}
                        </div>
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
                          <span className="text-xs">{t('На руки')}</span>
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
                      <td className="px-4 py-3 text-center">
                        {op.paymentNumber ? (
                          <span className="inline-flex items-center text-violet-500" title={`Документ ${op.paymentNumber}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
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
                      <td className="px-4 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === op.id ? null : op.id); }}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                          aria-label={t('Действия')}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>
                        {openMenuId === op.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-2 top-10 z-20 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm text-left"
                          >
                            <button
                              onClick={() => { setSelectedOp(op); setOpenMenuId(null); }}
                              className="w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-left"
                            >
                              Открыть
                            </button>
                            <button
                              onClick={() => { setEditingOperation(op); setModalOpen(true); setOpenMenuId(null); }}
                              className="w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-left"
                            >
                              Редактировать
                            </button>
                            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                            <button
                              onClick={() => handleDeleteOperation(op.id)}
                              className="w-full px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-left"
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredOps.length > 0 && !loading && (
              <tfoot className="bg-gray-50 dark:bg-gray-900/30 border-t-2 border-gray-200 dark:border-gray-700">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Итого за период
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">+ {formatMoney(totals.income)} ₽</div>
                    <div className="text-xs text-red-600 dark:text-red-400">− {formatMoney(totals.expense)} ₽</div>
                    <div className={`text-sm font-bold mt-0.5 ${totals.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      = {formatMoney(totals.net)} ₽
                    </div>
                  </td>
                  <td colSpan={6}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        ) : (
        <div className="hidden sm:block p-4">
          {loading ? (
            <div className="py-6 text-center text-gray-500">{t('Загрузка…')}</div>
          ) : filteredOps.length === 0 ? (
            <div className="py-6 text-center text-gray-500">{t('Нет операций по выбранным фильтрам')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOps.map((op) => {
                const isIncome = op.direction === 'income';
                const status = STATUS_LABEL[Number(op.status ?? 0)];
                const proj = projectName(op.projectId);
                const site = siteName(op.constructionSiteId);
                return (
                  <div
                    key={op.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedOp(op)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            {isIncome ? 'Приход' : 'Расход'}
                          </span>
                          {status && (
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {op.subType ? SUBTYPE_LABEL[op.subType] ?? op.subType : (isIncome ? 'Приход' : 'Расход')}
                        </div>
                        <div className="text-xs font-mono text-gray-400 dark:text-gray-500 truncate">
                          {op.paymentNumber ?? '—'}
                        </div>
                      </div>
                      <div
                        className={`text-right font-bold text-lg whitespace-nowrap ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {isIncome ? '+' : '−'} {formatMoney(op.amount)} ₽
                      </div>
                    </div>
                    <dl className="grid grid-cols-1 gap-1.5 text-xs">
                      <div>
                        <dt className="text-gray-400 dark:text-gray-500">{t('Дата')}</dt>
                        <dd className="text-gray-700 dark:text-gray-300">
                          {formatDateTime(op.paymentDatetime ?? op.paymentDate)}
                        </dd>
                      </div>
                      {(proj || site) && (
                        <div>
                          <dt className="text-gray-400 dark:text-gray-500">{t('Проект / Объект')}</dt>
                          <dd className="text-gray-700 dark:text-gray-300 truncate">
                            {proj || '—'}{site ? ` · ${site}` : ''}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-gray-400 dark:text-gray-500">{t('Счёт / Способ')}</dt>
                        <dd className="text-gray-700 dark:text-gray-300 truncate">
                          {op.cashLocation === 'hand'
                            ? 'На руки'
                            : op.paymentAccount
                              ? `${op.paymentAccount.name}${op.paymentAccount.bankName ? ` · ${op.paymentAccount.bankName}` : ''}`
                              : '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
        </>
        )}
      </div>

      <FinanceOperationModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingOperation(null); }}
        onCreated={() => {
          loadOperations();
          setEditingOperation(null);
        }}
        defaultProjectId={projectFilter || null}
        defaultConstructionSiteId={siteFilter || null}
        operation={editingOperation}
      />

      <FinanceOperationDrawer
        operation={selectedOp}
        projectName={projectName}
        siteName={siteName}
        onClose={() => setSelectedOp(null)}
        onEdit={(op) => {
          setEditingOperation(op);
          setModalOpen(true);
        }}
        onDelete={async (id) => {
          await handleDeleteOperation(id);
          setSelectedOp(null);
        }}
        onStatusChanged={() => {
          loadOperations();
          setSelectedOp(null);
        }}
      />

      {showFinancialReport && docFlowProjectId !== '' && (
        <FinancialReportModal
          projectId={Number(docFlowProjectId)}
          onClose={() => setShowFinancialReport(false)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  hint,
  sign,
}: {
  label: string;
  value: number;
  color: 'emerald' | 'red' | 'violet';
  hint?: string;
  sign?: '+' | '−' | boolean;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    violet: 'text-violet-600 dark:text-violet-400',
  };
  const prefix =
    sign === '+' ? '+ ' :
    sign === '−' ? '− ' :
    sign === true ? (value > 0 ? '+ ' : value < 0 ? '− ' : '') :
    '';
  const displayValue = sign === true ? Math.abs(value) : value;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 min-w-0">
      <div className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">{label}</div>
      <div className={`mt-1 text-lg sm:text-xl lg:text-2xl font-bold leading-tight break-words tabular-nums ${colorMap[color]}`}>
        {prefix}{formatMoney(displayValue)} ₽
      </div>
      {hint && <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</div>}
    </div>
  );
}

function ExpenseDonut({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const t = useT();
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        <span className="text-xs text-gray-400">{formatMoney(total)} ₽</span>
      </div>
      {data.length === 0 ? (
        <div className="text-sm text-gray-400 py-10 text-center flex-1">{t('Нет расходов')}</div>
      ) : (
        <div className="flex items-center gap-3 flex-1">
          <div className="w-32 h-32 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={36} outerRadius={56} paddingAngle={2}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `${formatMoney(Number(v) || 0)} ₽`}
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, color: '#f3f4f6', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 min-w-0 space-y-1 text-sm">
            {data.slice(0, 5).map((d, i) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <li key={d.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="truncate text-gray-700 dark:text-gray-300">{d.name}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{pct}%</span>
                </li>
              );
            })}
            {data.length > 5 && (
              <li className="text-xs text-gray-400 pl-4">+ ещё {data.length - 5}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
