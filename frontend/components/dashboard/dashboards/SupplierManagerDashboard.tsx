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

const ORDER_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Черновик', color: 'gray' },
  1: { label: 'Отправлен', color: 'blue' },
  2: { label: 'Подтверждён', color: 'green' },
  3: { label: 'Доставлен', color: 'purple' },
  4: { label: 'Отменён', color: 'red' },
};

const REQUEST_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Ожидает', color: 'yellow' },
  1: { label: 'Одобрена', color: 'green' },
  2: { label: 'Отклонена', color: 'red' },
  3: { label: 'Выдана', color: 'blue' },
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937', border: 'none', borderRadius: '8px',
  color: '#f3f4f6', fontSize: '12px', padding: '8px 12px',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  'Черновик': '#9ca3af', 'Отправлен': '#3b82f6', 'Подтверждён': '#10b981',
  'Доставлен': '#8b5cf6', 'Отменён': '#ef4444',
};

const MATERIAL_CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

export default function SupplierManagerDashboard({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [materialsByCategory, setMaterialsByCategory] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [suppRes, ordRes, reqRes, matRes] = await Promise.allSettled([
      api.get('/suppliers', { params: { limit: 200 } }),
      api.get('/supplier-orders', { params: { limit: 200 } }),
      api.get('/material-requests', { params: { limit: 200 } }),
      api.get('/materials', { params: { limit: 200 } }),
    ]);

    const allSuppliers = suppRes.status === 'fulfilled' ? extractArray(suppRes.value.data) : [];
    const allOrders = ordRes.status === 'fulfilled' ? extractArray(ordRes.value.data) : [];
    const allRequests = reqRes.status === 'fulfilled' ? extractArray(reqRes.value.data) : [];
    const allMaterials = matRes.status === 'fulfilled' ? extractArray(matRes.value.data) : [];

    setSuppliers(allSuppliers);
    setOrders(allOrders);
    setRequests(allRequests);
    setMaterials(allMaterials);

    // Orders by status chart
    const statusCounts: Record<string, number> = {};
    allOrders.forEach((o: any) => {
      const s = ORDER_STATUS_MAP[Number(o.status)];
      const label = s?.label || 'Другое';
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });
    setOrdersByStatus(Object.entries(statusCounts).map(([name, value]) => ({
      name, value, color: ORDER_STATUS_COLORS[name] || '#6b7280',
    })));

    // Materials by category chart
    const catCounts: Record<string, number> = {};
    allMaterials.forEach((m: any) => {
      const cat = m.category || m.type || 'Без категории';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    setMaterialsByCategory(Object.entries(catCounts).map(([name, value], i) => ({
      name, value, color: MATERIAL_CATEGORY_COLORS[i % MATERIAL_CATEGORY_COLORS.length],
    })));

    setLoading(false);
  }

  const activeOrders = orders.filter((o: any) => [1, 2].includes(Number(o.status)));
  const pendingRequests = requests.filter((r: any) => Number(r.status) === 0);

  const statCards = [
    { label: 'Поставщики', value: suppliers.length, icon: 'suppliers', color: 'blue' },
    { label: 'Заказы (активные)', value: activeOrders.length, icon: 'orders', color: 'green' },
    { label: 'Заявки (ожидающие)', value: pendingRequests.length, icon: 'requests', color: 'yellow' },
    { label: 'Материалы', value: materials.length, icon: 'materials', color: 'purple' },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    suppliers: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    orders: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    requests: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    materials: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${c.bg} flex items-center justify-center ${c.text}`}>
                  {iconMap[card.icon]}
                </div>
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
          { href: '/dashboard/supplier/suppliers', label: 'Поставщики', desc: 'Управление поставщиками', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          { href: '/dashboard/supplier/orders', label: 'Заказы', desc: 'Заказы поставщикам', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
          { href: '/dashboard/supplier/materials', label: 'Материалы', desc: 'Каталог материалов', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
          { href: '/dashboard/supplier/requests', label: 'Заявки', desc: 'Заявки на материалы', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
            <div className={`w-10 h-10 rounded-lg ${a.bg} flex items-center justify-center ${a.text}`}>{a.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent orders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Последние заказы</h3>
            <Link href="/dashboard/supplier/orders" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Все заказы</Link>
          </div>
          <div className="p-5">
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет заказов</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                      <th className="pb-2 font-medium">Поставщик</th>
                      <th className="pb-2 font-medium">Статус</th>
                      <th className="pb-2 font-medium text-right">Сумма</th>
                      <th className="pb-2 font-medium text-right">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map((o: any) => {
                      const st = ORDER_STATUS_MAP[Number(o.status)];
                      return (
                        <tr key={o.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[160px]">{o.supplier?.name || o.orderNumber || `#${o.id}`}</td>
                          <td className="py-2.5">{st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}</td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{o.totalAmount != null ? `${Number(o.totalAmount).toLocaleString('ru-RU')} ₽` : '—'}</td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{fmtDate(o.orderDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Material requests */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Заявки на материалы</h3>
            <Link href="/dashboard/supplier/requests" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Все заявки</Link>
          </div>
          <div className="p-5">
            {requests.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет заявок</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                      <th className="pb-2 font-medium">Материал</th>
                      <th className="pb-2 font-medium">Кол-во</th>
                      <th className="pb-2 font-medium">Статус</th>
                      <th className="pb-2 font-medium text-right">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.slice(0, 8).map((r: any) => {
                      const st = REQUEST_STATUS_MAP[Number(r.status)];
                      return (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[160px]">{r.material?.name || r.requestNumber || `#${r.id}`}</td>
                          <td className="py-2.5 text-gray-600 dark:text-gray-300">{r.quantity ?? '—'}</td>
                          <td className="py-2.5">{st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}</td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">{fmtDate(r.createdAt)}</td>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Заказы по статусам</h3>
          <div className="h-64">
            {ordersByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByStatus} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                  <Bar dataKey="value" name="Заказы" radius={[4, 4, 0, 0]}>
                    {ordersByStatus.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Материалы по категориям</h3>
          <div className="h-64">
            {materialsByCategory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={materialsByCategory} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {materialsByCategory.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} formatter={(value: string) => <span className="text-gray-600 dark:text-gray-400">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
