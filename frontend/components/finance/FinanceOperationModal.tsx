'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { formatMoney, parseMoney } from '@/lib/utils';

type Direction = 'income' | 'expense';

interface SubTypeOption {
  value: string;
  label: string;
  hint?: string;
}

const INCOME_SUBTYPES: SubTypeOption[] = [
  { value: 'advance', label: 'Аванс', hint: 'Баланс, из которого спишутся будущие траты' },
  { value: 'payment', label: 'Оплата (возмещение)', hint: 'Оплата по выставленному счёту/акту' },
  { value: 'refund', label: 'Возврат', hint: 'Возврат ранее уплаченных средств' },
];

const EXPENSE_SUBTYPES: SubTypeOption[] = [
  { value: 'bill', label: 'Оплата счетов', hint: 'Интернет, связь, аренда и т.п.' },
  { value: 'material', label: 'Оплата материалов', hint: 'Закупка материалов на проект' },
  { value: 'advance_disbursement', label: 'Авансирование', hint: 'Подотчётные средства' },
  { value: 'payroll', label: 'Расчёт', hint: 'Оплата труда, премии' },
];

interface ProjectOpt { id: number; name: string }
interface SiteOpt { id: number; address?: string; name?: string; projectId?: number }
interface PaymentAccountOpt { id: number; name: string; bankName?: string | null }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultProjectId?: number | null;
  defaultConstructionSiteId?: number | null;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function nowLocal(): string {
  // datetime-local в формате YYYY-MM-DDTHH:mm
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function FinanceOperationModal({
  open,
  onClose,
  onCreated,
  defaultProjectId,
  defaultConstructionSiteId,
}: Props) {
  const [direction, setDirection] = useState<Direction>('income');
  const [subType, setSubType] = useState<string>('payment');
  const [amount, setAmount] = useState<string>('');
  const [datetime, setDatetime] = useState<string>(nowLocal());
  const [projectId, setProjectId] = useState<number | null>(defaultProjectId ?? null);
  const [siteId, setSiteId] = useState<number | null>(defaultConstructionSiteId ?? null);
  const [cashLocation, setCashLocation] = useState<'hand' | 'company' | ''>('');
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [sites, setSites] = useState<SiteOpt[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccountOpt[]>([]);

  const amountInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return;
    setDirection('income');
    setSubType('payment');
    setAmount('');
    setDatetime(nowLocal());
    setProjectId(defaultProjectId ?? null);
    setSiteId(defaultConstructionSiteId ?? null);
    setCashLocation('');
    setPaymentAccountId(null);
    setDescription('');
    setError(null);
    setSaving(false);
    setTimeout(() => amountInputRef.current?.focus(), 50);
  }, [open, defaultProjectId, defaultConstructionSiteId]);

  // Подгрузка справочников при открытии
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          api.get('/projects', { params: { limit: 200 } }).catch(() => ({ data: { data: [] } })),
          api
            .get('/payment-accounts', { params: { limit: 200 } })
            .catch(() => ({ data: { data: [] } })),
        ]);
        const ps = Array.isArray(pRes.data) ? pRes.data : (pRes.data?.data ?? []);
        const as = Array.isArray(aRes.data) ? aRes.data : (aRes.data?.data ?? []);
        setProjects(ps.map((p: any) => ({ id: p.id, name: p.name ?? p.title ?? `#${p.id}` })));
        setAccounts(as.map((a: any) => ({ id: a.id, name: a.name, bankName: a.bankName ?? a.bank_name })));
      } catch {
        /* no-op */
      }
    })();
  }, [open]);

  // Подгрузка объектов выбранного проекта
  useEffect(() => {
    if (!open || !projectId) {
      setSites([]);
      return;
    }
    (async () => {
      try {
        const res = await api.get('/construction-sites', { params: { projectId, limit: 200 } });
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
    })();
  }, [open, projectId]);

  // При смене направления — сбросить subType на дефолт
  useEffect(() => {
    setSubType(direction === 'income' ? 'payment' : 'bill');
  }, [direction]);

  const subTypes = direction === 'income' ? INCOME_SUBTYPES : EXPENSE_SUBTYPES;

  const isValid = useMemo(() => {
    if (parseMoney(amount) <= 0) return false;
    if (!direction || !subType) return false;
    if (cashLocation === 'company' && !paymentAccountId) return false;
    return true;
  }, [amount, direction, subType, cashLocation, paymentAccountId]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        direction,
        subType,
        amount: parseMoney(amount),
        paymentDatetime: new Date(datetime).toISOString(),
        paymentDate: datetime.slice(0, 10),
        cashLocation: cashLocation || undefined,
        paymentAccountId: paymentAccountId || undefined,
        projectId: projectId || undefined,
        constructionSiteId: siteId || undefined,
        description: description.trim() || undefined,
        status: 1, // создаём сразу проведённым
      };
      await api.post('/payments', body);
      onCreated();
      onClose();
    } catch (e: any) {
      const message =
        e?.response?.data?.message ??
        (Array.isArray(e?.response?.data?.errors) ? e.response.data.errors.join(', ') : null) ??
        e?.message ??
        'Не удалось создать операцию';
      setError(typeof message === 'string' ? message : 'Не удалось создать операцию');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Новая финансовая операция
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Тип операции */}
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Тип
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('income')}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  direction === 'income'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                Приход
              </button>
              <button
                type="button"
                onClick={() => setDirection('expense')}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  direction === 'expense'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                Расход
              </button>
            </div>
          </div>

          {/* Подтип */}
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              {direction === 'income' ? 'Как учитываем поступление' : 'Категория расхода'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {subTypes.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setSubType(st.value)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                    subType === st.value
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{st.label}</div>
                  {st.hint && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{st.hint}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Сумма + дата/время */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                Сумма, ₽
              </label>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  // оставить только цифры/пробел/запятую/точку, форматируем на лету
                  const raw = e.target.value.replace(/[^\d.,\s]/g, '');
                  const num = parseMoney(raw);
                  // если введено только число — форматируем; если есть незавершённое — сохраняем как есть
                  if (raw.endsWith(',') || raw.endsWith('.')) {
                    setAmount(formatMoney(num) + (raw.endsWith(',') ? ',' : '.'));
                  } else {
                    setAmount(num > 0 ? formatMoney(num) : raw);
                  }
                }}
                placeholder="0"
                className="form-input w-full text-lg font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                Дата и время
              </label>
              <input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                className="form-input w-full"
              />
            </div>
          </div>

          {/* Способ поступления (только для приходов) */}
          {direction === 'income' && (
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Куда поступили
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCashLocation('hand');
                    setPaymentAccountId(null);
                  }}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    cashLocation === 'hand'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  На руки
                </button>
                <button
                  type="button"
                  onClick={() => setCashLocation('company')}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    cashLocation === 'company'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  На фирму
                </button>
              </div>
              {cashLocation === 'company' && (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                    Счёт (банк)
                  </label>
                  <select
                    value={paymentAccountId ?? ''}
                    onChange={(e) =>
                      setPaymentAccountId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="form-select w-full"
                  >
                    <option value="">Выберите счёт…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.bankName ? ` — ${a.bankName}` : ''}
                      </option>
                    ))}
                  </select>
                  {!accounts.length && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Нет ни одного платёжного счёта — создайте в разделе «Финансы → Счета».
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Проект и объект */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                Проект
              </label>
              <select
                value={projectId ?? ''}
                onChange={(e) => {
                  setProjectId(e.target.value ? Number(e.target.value) : null);
                  setSiteId(null);
                }}
                className="form-select w-full"
              >
                <option value="">Без привязки</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                Объект
              </label>
              <select
                value={siteId ?? ''}
                onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : null)}
                disabled={!projectId}
                className="form-select w-full disabled:opacity-50"
              >
                <option value="">{projectId ? 'Без привязки' : 'Сначала выберите проект'}</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.address ?? s.name ?? `#${s.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Описание */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
              Комментарий
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Краткое описание операции"
              className="form-textarea w-full"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className={`btn-sm text-white disabled:opacity-50 ${
              direction === 'income'
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {saving ? 'Сохранение…' : direction === 'income' ? 'Зафиксировать приход' : 'Зафиксировать расход'}
          </button>
        </div>
      </div>
    </div>
  );
}
