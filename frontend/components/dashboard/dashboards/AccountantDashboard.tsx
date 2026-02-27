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

const PAYMENT_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Ожидает', color: 'yellow' },
  1: { label: 'Проведён', color: 'green' },
  2: { label: 'Отменён', color: 'red' },
};

const PAYROLL_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Черновик', color: 'gray' },
  1: { label: 'Одобрен', color: 'blue' },
  2: { label: 'Выплачен', color: 'green' },
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937', border: 'none', borderRadius: '8px',
  color: '#f3f4f6', fontSize: '12px', padding: '8px 12px',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  'Ожидает': '#f59e0b', 'Проведён': '#10b981', 'Отменён': '#ef4444',
};

export default function AccountantDashboard({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [acts, setActs] = useState<any[]>([]);
  const [paymentsByStatus, setPaymentsByStatus] = useState<any[]>([]);
  const [paymentsByMonth, setPaymentsByMonth] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [payRes, budRes, payrollRes, actRes] = await Promise.allSettled([
      api.get('/payments', { params: { limit: 200 } }),
      api.get('/budgets', { params: { limit: 200 } }),
      api.get('/payroll', { params: { limit: 200 } }),
      api.get('/acts', { params: { limit: 200 } }),
    ]);

    const allPayments = payRes.status === 'fulfilled' ? extractArray(payRes.value.data) : [];
    const allBudgets = budRes.status === 'fulfilled' ? extractArray(budRes.value.data) : [];
    const allPayrolls = payrollRes.status === 'fulfilled' ? extractArray(payrollRes.value.data) : [];
    const allActs = actRes.status === 'fulfilled' ? extractArray(actRes.value.data) : [];

    setPayments(allPayments);
    setBudgets(allBudgets);
    setPayrolls(allPayrolls);
    setActs(allActs);

    // Payments by status
    const statusCounts: Record<string, number> = {};
    allPayments.forEach((p: any) => {
      const s = PAYMENT_STATUS_MAP[Number(p.status)];
      const label = s?.label || 'Другое';
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });
    setPaymentsByStatus(Object.entries(statusCounts).map(([name, value]) => ({
      name, value, color: PAYMENT_STATUS_COLORS[name] || '#6b7280',
    })));

    // Payments by month
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const monthSums: Record<string, number> = {};
    allPayments.forEach((p: any) => {
      if (p.paymentDate && Number(p.status) === 1) {
        const d = new Date(p.paymentDate);
        if (!isNaN(d.getTime())) {
          const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
          monthSums[key] = (monthSums[key] || 0) + Number(p.amount || 0);
        }
      }
    });
    setPaymentsByMonth(Object.entries(monthSums).slice(-6).map(([name, value]) => ({ name, value })));

    setLoading(false);
  }

  const pendingPayrolls = payrolls.filter((p: any) => Number(p.status) === 0 || Number(p.status) === 1);

  const statCards = [
    { label: 'Платежи', value: payments.length, icon: 'payments', color: 'blue' },
    { label: 'Бюджеты', value: budgets.length, icon: 'budgets', color: 'green' },
    { label: 'Зарплаты (ожидающие)', value: pendingPayrolls.length, icon: 'salaries', color: 'yellow' },
    { label: 'Акты', value: acts.length, icon: 'acts', color: 'purple' },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    payments: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    budgets: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    salaries: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    acts: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
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
          { href: '/dashboard/accountant/payments', label: 'Платежи', desc: 'Управление платежами' },
          { href: '/dashboard/accountant/budgets', label: 'Бюджеты', desc: 'Бюджеты проектов' },
          { href: '/dashboard/accountant/salaries', label: 'Зарплаты', desc: 'Начисление зарплат' },
          { href: '/dashboard/accountant/acts', label: 'Акты', desc: 'Акты и документы' },
        ].map((a, i) => {
          const colors = ['bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400', 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400', 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'];
          return (
            <Link key={a.href} href={a.href} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[i]}`}>
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
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Последние платежи</h3>
            <Link href="/dashboard/accountant/payments" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Все платежи</Link>
          </div>
          <div className="p-5">
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет платежей</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                      <th className="pb-2 font-medium">Описание</th>
                      <th className="pb-2 font-medium">Статус</th>
                      <th className="pb-2 font-medium text-right">Сумма</th>
                      <th className="pb-2 font-medium text-right">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 8).map((p: any) => {
                      const st = PAYMENT_STATUS_MAP[Number(p.status)];
                      return (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[160px]">{p.description || p.paymentNumber || `#${p.id}`}</td>
                          <td className="py-2.5">{st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}</td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{p.amount != null ? `${Number(p.amount).toLocaleString('ru-RU')} ₽` : '—'}</td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{fmtDate(p.paymentDate)}</td>
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
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Зарплаты</h3>
            <Link href="/dashboard/accountant/salaries" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Все зарплаты</Link>
          </div>
          <div className="p-5">
            {payrolls.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет записей</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                      <th className="pb-2 font-medium">Сотрудник</th>
                      <th className="pb-2 font-medium">Период</th>
                      <th className="pb-2 font-medium">Статус</th>
                      <th className="pb-2 font-medium text-right">Итого</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.slice(0, 8).map((p: any) => {
                      const st = PAYROLL_STATUS_MAP[Number(p.status)];
                      return (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[140px]">{p.user?.name || `#${p.userId ?? p.id}`}</td>
                          <td className="py-2.5 text-gray-600 dark:text-gray-300">{p.payrollPeriod || '—'}</td>
                          <td className="py-2.5">{st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}</td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{p.totalAmount != null ? `${Number(p.totalAmount).toLocaleString('ru-RU')} ₽` : '—'}</td>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Платежи по статусам</h3>
          <div className="h-64">
            {paymentsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentsByStatus} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                  <Bar dataKey="value" name="Платежи" radius={[4, 4, 0, 0]}>
                    {paymentsByStatus.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Суммы по месяцам</h3>
          <div className="h-64">
            {paymentsByMonth.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentsByMonth} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} formatter={(v: any) => [`${Number(v ?? 0).toLocaleString('ru-RU')} ₽`, 'Сумма']} />
                  <Bar dataKey="value" name="Сумма" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
