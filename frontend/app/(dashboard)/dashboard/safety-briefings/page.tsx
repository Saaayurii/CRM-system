'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import CrudPage from '@/components/admin/CrudPage';
import { ADMIN_MODULES } from '@/lib/admin/modulesConfig';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

type Tab = 'journal' | 'reminders' | 'compliance';

interface ExpiringParticipant {
  id: number;
  userId: number;
  userName?: string | null;
  validUntil: string;
  signedAt?: string | null;
  briefing?: {
    id: number;
    title: string;
    briefingType: string;
    validityMonths?: number | null;
  } | null;
}

interface UserBriefingStatus {
  userId: number;
  userName: string;
  email?: string;
  validByType: Record<string, any>;
}

const TYPE_LABELS: Record<string, string> = {
  introductory: 'Вводный',
  primary: 'Первичный',
  repeat: 'Повторный',
  targeted: 'Целевой',
  unscheduled: 'Внеплановый',
};

const ALL_TYPES = ['introductory', 'primary', 'repeat', 'targeted', 'unscheduled'];

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(v?: string | null): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return v;
  }
}

function RemindersTab() {
  const t = useT();
  const [expiring, setExpiring] = useState<ExpiringParticipant[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ExpiringParticipant[]>('/safety-briefings/expiring-soon', {
        params: { days },
      });
      setExpiring(Array.isArray(data) ? data : []);
    } catch {
      addToast('error', 'Не удалось загрузить напоминания');
    } finally {
      setLoading(false);
    }
  }, [days, addToast]);

  useEffect(() => { load(); }, [load]);

  const overdue = expiring.filter((p) => daysUntil(p.validUntil) <= 0);
  const soon = expiring.filter((p) => daysUntil(p.validUntil) > 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('Показывать истекающие в течение')}</span>
        {[14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              days === d
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {d} дн.
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-8 text-center">{t('Загрузка…')}</div>
      ) : expiring.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-green-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm text-gray-500">Нет инструктажей, истекающих в ближайшие {days} дней</p>
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                Просроченные ({overdue.length})
              </h3>
              <BriefingParticipantList items={overdue} variant="overdue" />
            </div>
          )}
          {soon.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Истекают в ближайшее время ({soon.length})
              </h3>
              <BriefingParticipantList items={soon} variant="soon" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BriefingParticipantList({
  items,
  variant,
}: {
  items: ExpiringParticipant[];
  variant: 'overdue' | 'soon';
}) {
  const t = useT();
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t('Сотрудник')}</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t('Инструктаж')}</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t('Тип')}</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t('Действует до')}</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t('Осталось')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {items.map((p) => {
            const d = daysUntil(p.validUntil);
            return (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-2.5 font-medium">{p.userName || `#${p.userId}`}</td>
                <td className="px-4 py-2.5">
                  {p.briefing ? (
                    <Link
                      href={`/dashboard/safety-briefings/${p.briefing.id}`}
                      className="text-violet-600 hover:underline"
                    >
                      {p.briefing.title}
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                  {TYPE_LABELS[p.briefing?.briefingType ?? ''] || p.briefing?.briefingType || '—'}
                </td>
                <td className="px-4 py-2.5">{fmtDate(p.validUntil)}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`font-semibold ${
                      variant === 'overdue'
                        ? 'text-red-600 dark:text-red-400'
                        : d <= 7
                        ? 'text-orange-500'
                        : 'text-amber-500'
                    }`}
                  >
                    {variant === 'overdue' ? `${Math.abs(d)} дн. назад` : `${d} дн.`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ComplianceTab() {
  const t = useT();
  const [users, setUsers] = useState<{ id: number; firstName: string; lastName: string; email: string }[]>([]);
  const [statusMap, setStatusMap] = useState<Record<number, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: usersData } = await api.get('/users', { params: { limit: 100 } });
        const list: any[] = usersData.data || usersData.users || [];
        setUsers(list);

        const results = await Promise.allSettled(
          list.map((u) => api.get(`/safety-briefings/users/${u.id}/status`)),
        );

        const map: Record<number, Record<string, boolean>> = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            const vbt = r.value.data?.validByType || {};
            map[list[i].id] = Object.fromEntries(
              ALL_TYPES.map((t) => [t, !!vbt[t]]),
            );
          } else {
            map[list[i].id] = Object.fromEntries(ALL_TYPES.map((t) => [t, false]));
          }
        });
        setStatusMap(map);
      } catch {
        addToast('error', 'Не удалось загрузить данные соответствия');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  if (loading) {
    return <div className="text-sm text-gray-500 py-8 text-center">{t('Загрузка…')}</div>;
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Наличие актуальных подписей по каждому типу инструктажа. Зелёный — действующая подпись, серый — отсутствует или истекла.
      </p>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 dark:bg-gray-800">
                Сотрудник
              </th>
              {ALL_TYPES.map((t) => (
                <th key={t} className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                  {TYPE_LABELS[t]}
                </th>
              ))}
              <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">{t('Итого')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {users.map((u) => {
              const statuses = statusMap[u.id] || {};
              const validCount = Object.values(statuses).filter(Boolean).length;
              return (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-800">
                    <div className="font-medium">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  {ALL_TYPES.map((t) => (
                    <td key={t} className="text-center px-3 py-2.5">
                      {statuses[t] ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="text-center px-3 py-2.5">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        validCount === ALL_TYPES.length
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : validCount === 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {validCount}/{ALL_TYPES.length}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SafetyBriefingsPage() {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('journal');
  const [expiringCount, setExpiringCount] = useState<number | null>(null);

  useEffect(() => {
    api
      .get('/safety-briefings/expiring-soon', { params: { days: 14 } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setExpiringCount(list.length);
      })
      .catch(() => {});
  }, []);

  const TABS: { key: Tab; label: string; badge?: number | null }[] = [
    { key: 'journal', label: 'Журнал' },
    { key: 'reminders', label: 'Напоминания', badge: expiringCount ?? undefined },
    { key: 'compliance', label: 'Соответствие' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('Журнал инструктажей')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Электронный журнал инструктажей по безопасности с подписями участников
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-6">
          {TABS.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
              {badge != null && badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'journal' && (
        <CrudPage
          config={ADMIN_MODULES['safety-briefings']}
          onRowClick={(row) => router.push(`/dashboard/safety-briefings/${row.id}`)}
          onExtraAction={(actionKey, row) => {
            if (actionKey === 'open-detail') {
              router.push(`/dashboard/safety-briefings/${row.id}`);
            }
          }}
        />
      )}

      {tab === 'reminders' && <RemindersTab />}

      {tab === 'compliance' && <ComplianceTab />}
    </div>
  );
}
