'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/utils';
import api from '@/lib/api';

export interface DrawerOperation {
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

interface Props {
  operation: DrawerOperation | null;
  projectName: (id?: number | null) => string | null;
  siteName: (id?: number | null) => string | null;
  onClose: () => void;
  onEdit: (op: DrawerOperation) => void;
  onDelete: (id: number) => void;
  onStatusChanged: () => void;
}

const SUBTYPE_LABEL: Record<string, string> = {
  advance: 'Аванс',
  payment: 'Оплата (возмещение)',
  refund: 'Возврат',
  bill: 'Оплата счетов',
  material: 'Оплата материалов',
  advance_disbursement: 'Авансирование',
  payroll: 'Расчёт',
};

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  1: { label: 'Проведён', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  2: { label: 'Отменён', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

function fmtDt(value?: string | null) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return value;
  }
}

function fmtDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('ru-RU');
  } catch {
    return value;
  }
}

// ─── Печатные формы ──────────────────────────────────────────────────────────

function printHtml(html: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

function buildDocHtml(
  title: string,
  docNumber: string,
  date: string,
  rows: { label: string; value: string }[],
  amount: string,
  note: string,
) {
  const rowsHtml = rows
    .map(
      (r) => `<tr>
      <td style="padding:6px 10px;border:1px solid #ccc;color:#555;width:160px;font-size:12px">${r.label}</td>
      <td style="padding:6px 10px;border:1px solid #ccc;font-size:13px;font-weight:500">${r.value}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${title} ${docNumber}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: Arial, sans-serif; color: #111; font-size: 13px; }
  .header { margin-bottom: 24px; }
  .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #555; }
  .amount-box { border: 2px solid #111; padding: 12px 18px; display: inline-block; margin: 16px 0; border-radius: 4px; }
  .amount-box .label { font-size: 11px; text-transform: uppercase; color: #555; margin-bottom: 4px; }
  .amount-box .value { font-size: 22px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  .signatures { margin-top: 32px; display: flex; gap: 60px; }
  .sig { flex: 1; }
  .sig-line { border-bottom: 1px solid #111; margin-top: 28px; }
  .sig-label { font-size: 11px; color: #555; margin-top: 4px; }
  .footer-note { margin-top: 20px; font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print { button { display: none; } }
</style>
</head>
<body>
<div style="text-align:right;margin-bottom:16px">
  <button onclick="window.print()" style="padding:8px 16px;background:#5b21b6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨 Печать</button>
</div>
<div class="header">
  <div class="title">${title}</div>
  <div class="subtitle">№ ${docNumber} &nbsp;|&nbsp; от ${date}</div>
</div>
<div class="amount-box">
  <div class="label">Сумма</div>
  <div class="value">${amount}</div>
</div>
<table>${rowsHtml}</table>
${note ? `<p style="margin-top:16px;font-size:12px;color:#555">Примечание: ${note}</p>` : ''}
<div class="signatures">
  <div class="sig">
    <div class="sig-line"></div>
    <div class="sig-label">Руководитель / подпись</div>
  </div>
  <div class="sig">
    <div class="sig-line"></div>
    <div class="sig-label">Бухгалтер / подпись</div>
  </div>
  <div class="sig">
    <div class="sig-line"></div>
    <div class="sig-label">Кассир / подпись</div>
  </div>
</div>
<div class="footer-note">Документ сформирован автоматически. Требует подписи уполномоченного лица.</div>
</body>
</html>`;
}

function printPKO(op: DrawerOperation, proj: string | null, account: string | null) {
  const docTitle = 'Приходный кассовый ордер (ПКО)';
  const docNum = op.paymentNumber ?? `${op.id}`;
  const date = fmtDate(op.paymentDatetime ?? op.paymentDate);
  const amount = `${formatMoney(op.amount)} ₽`;
  const rows: { label: string; value: string }[] = [
    { label: 'Вид поступления', value: op.subType ? SUBTYPE_LABEL[op.subType] ?? op.subType : '—' },
    { label: 'Принято от', value: proj ?? '—' },
    { label: 'Кому / счёт', value: account ?? 'Касса (на руки)' },
    { label: 'Назначение', value: op.description ?? '—' },
    { label: 'Дата операции', value: fmtDt(op.paymentDatetime ?? op.paymentDate) },
  ];
  if (proj) rows.push({ label: 'Проект', value: proj });
  printHtml(buildDocHtml(docTitle, docNum, date, rows, amount, op.description ?? ''));
}

function printRKO(op: DrawerOperation, proj: string | null, account: string | null) {
  const docTitle = 'Расходный кассовый ордер (РКО)';
  const docNum = op.paymentNumber ?? `${op.id}`;
  const date = fmtDate(op.paymentDatetime ?? op.paymentDate);
  const amount = `${formatMoney(op.amount)} ₽`;
  const rows: { label: string; value: string }[] = [
    { label: 'Категория расхода', value: op.subType ? SUBTYPE_LABEL[op.subType] ?? op.subType : '—' },
    { label: 'Выдано', value: proj ?? '—' },
    { label: 'Со счёта / кассы', value: account ?? 'Касса (на руки)' },
    { label: 'Основание', value: op.description ?? '—' },
    { label: 'Дата операции', value: fmtDt(op.paymentDatetime ?? op.paymentDate) },
  ];
  printHtml(buildDocHtml(docTitle, docNum, date, rows, amount, op.description ?? ''));
}

function printReceipt(op: DrawerOperation, proj: string | null, account: string | null) {
  const isIncome = op.direction === 'income';
  const docTitle = 'Квитанция / подтверждение операции';
  const docNum = op.paymentNumber ?? `${op.id}`;
  const date = fmtDate(op.paymentDatetime ?? op.paymentDate);
  const amount = `${isIncome ? '+' : '−'} ${formatMoney(op.amount)} ₽`;
  const rows: { label: string; value: string }[] = [
    { label: 'Тип', value: isIncome ? 'Приход' : 'Расход' },
    { label: 'Категория', value: op.subType ? SUBTYPE_LABEL[op.subType] ?? op.subType : '—' },
    { label: 'Проект', value: proj ?? '—' },
    { label: 'Счёт / способ', value: account ?? 'Касса (на руки)' },
    { label: 'Описание', value: op.description ?? '—' },
    { label: 'Дата/время', value: fmtDt(op.paymentDatetime ?? op.paymentDate) },
    { label: 'Статус', value: STATUS_MAP[Number(op.status ?? 0)]?.label ?? '—' },
  ];
  printHtml(buildDocHtml(docTitle, docNum, date, rows, amount, op.description ?? ''));
}

// ─── Компонент ───────────────────────────────────────────────────────────────

export default function FinanceOperationDrawer({
  operation: op,
  projectName,
  siteName,
  onClose,
  onEdit,
  onDelete,
  onStatusChanged,
}: Props) {
  const [statusLoading, setStatusLoading] = useState(false);

  if (!op) return null;

  const isIncome = op.direction === 'income';
  const status = STATUS_MAP[Number(op.status ?? 0)];
  const proj = projectName(op.projectId);
  const site = siteName(op.constructionSiteId);
  const accountLabel =
    op.cashLocation === 'hand'
      ? 'Касса (на руки)'
      : op.paymentAccount?.name ?? null;
  const bankLabel = op.paymentAccount?.bankName ?? null;

  async function changeStatus(s: number) {
    if (statusLoading) return;
    setStatusLoading(true);
    try {
      await api.put(`/payments/${op!.id}`, { status: s });
      onStatusChanged();
    } catch {
      /* ignore */
    } finally {
      setStatusLoading(false);
    }
  }

  function Field({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
      <div>
        <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</dt>
        <dd className="text-sm text-gray-800 dark:text-gray-100">{value || '—'}</dd>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="min-w-0">
            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {op.paymentNumber ?? `#${op.id}`}
            </div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              {op.subType ? SUBTYPE_LABEL[op.subType] ?? op.subType : isIncome ? 'Приход' : 'Расход'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Amount hero */}
          <div className={`px-5 py-5 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className={`text-3xl font-bold tracking-tight ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {isIncome ? '+' : '−'} {formatMoney(op.amount)} ₽
            </div>
            <div className="mt-2 flex items-center flex-wrap gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${isIncome ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'}`}>
                {isIncome ? 'Приход' : 'Расход'}
              </span>
              {op.subType && (
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-white/70 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                  {SUBTYPE_LABEL[op.subType] ?? op.subType}
                </span>
              )}
              {status && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                  {status.label}
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
              Реквизиты
            </h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field
                label="Дата / время"
                value={fmtDt(op.paymentDatetime ?? op.paymentDate)}
              />
              <Field
                label="Счёт / способ"
                value={
                  accountLabel ? (
                    <span>
                      {accountLabel}
                      {bankLabel && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{bankLabel}</span>
                      )}
                    </span>
                  ) : null
                }
              />
              <Field
                label="Проект"
                value={proj}
              />
              <Field
                label="Объект"
                value={site}
              />
              {op.description && (
                <div className="col-span-2">
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Назначение / комментарий</dt>
                  <dd className="text-sm text-gray-800 dark:text-gray-100">{op.description}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Documents section */}
          <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
              Документы
            </h3>
            <div className="space-y-2">
              {isIncome ? (
                <DocButton
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  title="Приходный кассовый ордер (ПКО)"
                  description="Форма КО-1 — подтверждение приёма наличных"
                  onClick={() => printPKO(op, proj, accountLabel)}
                />
              ) : (
                <DocButton
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  title="Расходный кассовый ордер (РКО)"
                  description="Форма КО-2 — подтверждение выдачи наличных"
                  onClick={() => printRKO(op, proj, accountLabel)}
                />
              )}
              <DocButton
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
                title="Квитанция"
                description="Подтверждение операции для контрагента"
                onClick={() => printReceipt(op, proj, accountLabel)}
              />
            </div>
          </div>

          {/* Status change */}
          <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
              Изменить статус
            </h3>
            <div className="flex gap-2 flex-wrap">
              {([0, 1, 2] as const).map((s) => {
                const info = STATUS_MAP[s];
                const isCurrent = Number(op.status ?? 0) === s;
                return (
                  <button
                    key={s}
                    onClick={() => !isCurrent && changeStatus(s)}
                    disabled={statusLoading || isCurrent}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:cursor-not-allowed ${
                      isCurrent
                        ? `${info.color} border-transparent`
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-400'
                    }`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3">
          <button
            onClick={() => onEdit(op)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Редактировать
          </button>
          <button
            onClick={() => {
              if (confirm('Удалить операцию?')) onDelete(op.id);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-red-600 dark:text-red-400 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Удалить
          </button>
        </div>
      </div>
    </>
  );
}

function DocButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:border-violet-300 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left"
    >
      <div className="shrink-0 w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center text-violet-500 mt-0.5">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>
      </div>
      <div className="ml-auto shrink-0 self-center text-gray-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      </div>
    </button>
  );
}
