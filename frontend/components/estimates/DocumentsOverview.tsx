'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Stats {
  priceItemsCount: number;
  estimatesCount: number;
  paymentsCount: number;
}

interface Estimate {
  id: number;
  name: string;
  article: string;
  status: number;
  docNumber?: string | null;
  totalAmount: number | string;
  markupPercent: number | string;
}

export default function DocumentsOverview({
  projectId,
  onCreateEstimate,
  onOpenFinancialReport,
}: {
  projectId: number;
  onCreateEstimate: () => void;
  onOpenFinancialReport: () => void;
}) {
  const [stats, setStats] = useState<Stats>({
    priceItemsCount: 0,
    estimatesCount: 0,
    paymentsCount: 0,
  });
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [priceList, estimatesData, paymentsData] = await Promise.all([
          api.get('/price-list').catch(() => ({ data: null })),
          api.get('/estimates', { params: { projectId } }).catch(() => ({ data: [] })),
          api.get('/payments', { params: { projectId, limit: 1 } }).catch(() => ({ data: { total: 0 } })),
        ]);
        const priceItems = priceList.data?.items ?? [];
        const ests = Array.isArray(estimatesData.data) ? estimatesData.data : [];
        const paymentsCount =
          paymentsData.data?.total ??
          (Array.isArray(paymentsData.data) ? paymentsData.data.length : 0);
        setStats({
          priceItemsCount: priceItems.length,
          estimatesCount: ests.length,
          paymentsCount,
        });
        setEstimates(ests);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
          Документооборот проекта
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Как формируются документы — от прайс-листа компании и платежей проекта до итоговых PDF.
        </p>
      </div>

      {/* ─── Поток смет ─────────────────────────────────────── */}
      <FlowSection
        title="Сметы → Документы"
        description="Прайс компании используется как источник позиций. Из позиций строится Смета. Из сметы выгружаются три формы документов."
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_2fr] gap-3 items-stretch">
          <SourceCard
            icon={<IconPrice />}
            title="Прайс компании"
            subtitle={`Позиций: ${stats.priceItemsCount}`}
            link="/dashboard/company?tab=price"
            color="violet"
          />
          <Arrow />
          <SourceCard
            icon={<IconEstimate />}
            title="Сметы проекта"
            subtitle={`Создано: ${stats.estimatesCount}`}
            onClick={onCreateEstimate}
            action="Создать смету"
            color="emerald"
          />
          <Arrow />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <PdfCard
              title="Сводный расчёт"
              description="Краткая форма для заказчика"
              color="violet"
            />
            <PdfCard
              title="КС-2"
              description="Гос-форма Госкомстат №100"
              color="indigo"
            />
            <PdfCard
              title="Акт приёмки"
              description="Упрощённый акт"
              color="blue"
            />
          </div>
        </div>

        {estimates.length > 0 && (
          <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Сметы проекта
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {estimates.map((e) => {
                const total = num(e.totalAmount) * (1 + num(e.markupPercent) / 100);
                return (
                  <li key={e.id} className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusBadge(e.status)}`}>
                        {statusLabel(e.status)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{e.article}</span>
                      <span className="text-sm text-gray-800 dark:text-gray-100 truncate">
                        {e.docNumber && <span className="text-gray-400 mr-1">№{e.docNumber}</span>}
                        {e.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {fmtMoney(total)} ₽
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </FlowSection>

      {/* ─── Поток финансовых отчётов ─────────────────────── */}
      <FlowSection
        title="Платежи → Финансовые отчёты"
        description="Все приходы и расходы проекта сводятся в два типа PDF-отчётов."
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_2fr] gap-3 items-stretch">
          <SourceCard
            icon={<IconPayment />}
            title="Платежи проекта"
            subtitle={`Записей: ${stats.paymentsCount}`}
            color="amber"
          />
          <Arrow />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <PdfCard
              title="Детализация баланса"
              description="Приход / Расход / Баланс + разбивка по статьям"
              onClick={onOpenFinancialReport}
              color="emerald"
            />
            <PdfCard
              title="Ведомость по статье"
              description="Платежи по конкретной статье"
              onClick={onOpenFinancialReport}
              color="rose"
            />
          </div>
        </div>
      </FlowSection>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Sub-components
 * ════════════════════════════════════════════════════════════ */

function FlowSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4">
      <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{title}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      {children}
    </div>
  );
}

const COLORS: Record<string, { bg: string; iconBg: string; text: string }> = {
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30',
    iconBg: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    iconBg: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    iconBg: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30',
    iconBg: 'bg-indigo-500',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    iconBg: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
    iconBg: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
  },
};

function SourceCard({
  icon,
  title,
  subtitle,
  link,
  onClick,
  action,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  link?: string;
  onClick?: () => void;
  action?: string;
  color: keyof typeof COLORS;
}) {
  const c = COLORS[color];
  const inner = (
    <div className={`flex flex-col h-full rounded-xl border ${c.bg} p-4`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 ${c.iconBg} rounded-lg flex items-center justify-center text-white`}>
          {icon}
        </div>
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      {action && (
        <button
          onClick={onClick}
          className={`mt-auto text-xs font-medium ${c.text} hover:underline self-start`}
        >
          + {action}
        </button>
      )}
    </div>
  );
  if (link) {
    return (
      <Link href={link} className="block h-full">
        {inner}
      </Link>
    );
  }
  if (onClick && !action) {
    return (
      <button onClick={onClick} className="text-left h-full w-full">
        {inner}
      </button>
    );
  }
  return inner;
}

function PdfCard({
  title,
  description,
  onClick,
  color,
}: {
  title: string;
  description: string;
  onClick?: () => void;
  color: keyof typeof COLORS;
}) {
  const c = COLORS[color];
  const content = (
    <div className={`flex flex-col h-full rounded-lg border ${c.bg} p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <svg className={`w-4 h-4 ${c.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{title}</p>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="text-left h-full w-full">
        {content}
      </button>
    );
  }
  return content;
}

function Arrow() {
  return (
    <div className="hidden lg:flex items-center justify-center">
      <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
      </svg>
    </div>
  );
}

function IconPrice() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function IconEstimate() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconPayment() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  );
}

/* ── small helpers ── */
function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtMoney(v: number): string {
  return v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function statusLabel(s: number): string {
  return ['Черновик', 'Активная', 'Подписана', 'Отменена'][s] ?? 'Неизвестно';
}
function statusBadge(s: number): string {
  return [
    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ][s] ?? 'bg-gray-100 text-gray-700';
}
