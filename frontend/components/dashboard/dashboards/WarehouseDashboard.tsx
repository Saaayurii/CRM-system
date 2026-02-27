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

const REQUEST_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Ожидает', color: 'yellow' },
  1: { label: 'Одобрена', color: 'green' },
  2: { label: 'Отклонена', color: 'red' },
  3: { label: 'Выдана', color: 'blue' },
};

const EQUIP_STATUS_MAP: Record<string, { label: string; color: string }> = {
  available: { label: 'Доступно', color: 'green' },
  in_use: { label: 'В использовании', color: 'blue' },
  maintenance: { label: 'На обслуживании', color: 'yellow' },
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#1f2937', border: 'none', borderRadius: '8px',
  color: '#f3f4f6', fontSize: '12px', padding: '8px 12px',
};

const REQUEST_STATUS_COLORS: Record<string, string> = {
  'Ожидает': '#f59e0b', 'Одобрена': '#10b981', 'Отклонена': '#ef4444', 'Выдана': '#3b82f6',
};

const EQUIP_STATUS_COLORS: Record<string, string> = {
  'Доступно': '#10b981', 'В использовании': '#3b82f6', 'На обслуживании': '#f59e0b',
};

export default function WarehouseDashboard({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [requestsByStatus, setRequestsByStatus] = useState<any[]>([]);
  const [equipByStatus, setEquipByStatus] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [matRes, reqRes, equipRes] = await Promise.allSettled([
      api.get('/materials', { params: { limit: 200 } }),
      api.get('/material-requests', { params: { limit: 200 } }),
      api.get('/equipment', { params: { limit: 200 } }),
    ]);

    const allMaterials = matRes.status === 'fulfilled' ? extractArray(matRes.value.data) : [];
    const allRequests = reqRes.status === 'fulfilled' ? extractArray(reqRes.value.data) : [];
    const allEquipment = equipRes.status === 'fulfilled' ? extractArray(equipRes.value.data) : [];

    setMaterials(allMaterials);
    setRequests(allRequests);
    setEquipment(allEquipment);

    // Requests by status
    const reqCounts: Record<string, number> = {};
    allRequests.forEach((r: any) => {
      const s = REQUEST_STATUS_MAP[Number(r.status)];
      const label = s?.label || 'Другое';
      reqCounts[label] = (reqCounts[label] || 0) + 1;
    });
    setRequestsByStatus(Object.entries(reqCounts).map(([name, value]) => ({
      name, value, color: REQUEST_STATUS_COLORS[name] || '#6b7280',
    })));

    // Equipment by status
    const eqCounts: Record<string, number> = {};
    allEquipment.forEach((e: any) => {
      const s = EQUIP_STATUS_MAP[String(e.status ?? '')];
      const label = s?.label || 'Другое';
      eqCounts[label] = (eqCounts[label] || 0) + 1;
    });
    setEquipByStatus(Object.entries(eqCounts).map(([name, value]) => ({
      name, value, color: EQUIP_STATUS_COLORS[name] || '#6b7280',
    })));

    setLoading(false);
  }

  const pendingRequests = requests.filter((r: any) => Number(r.status) === 0);

  const statCards = [
    { label: 'Материалы', value: materials.length, icon: 'materials', color: 'blue' },
    { label: 'Заявки (ожидающие)', value: pendingRequests.length, icon: 'requests', color: 'yellow' },
    { label: 'Оборудование', value: equipment.length, icon: 'equipment', color: 'green' },
    { label: 'На обслуживании', value: equipment.filter((e: any) => e.status === 'maintenance').length, icon: 'maintenance', color: 'purple' },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    materials: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    requests: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    equipment: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    maintenance: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
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
          { href: '/dashboard/warehouse/materials', label: 'Материалы', desc: 'Складской учёт', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
          { href: '/dashboard/warehouse/equipment', label: 'Оборудование', desc: 'Техника и инструменты', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
          { href: '/dashboard/warehouse/requests', label: 'Заявки', desc: 'Заявки на материалы', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
          { href: '/dashboard/warehouse/maintenance', label: 'Обслуживание', desc: 'Обслуживание техники', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 hover:ring-1 hover:ring-violet-500/20 transition-all">
            <div className={`w-10 h-10 rounded-lg ${a.bg} flex items-center justify-center ${a.text}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Последние заявки</h3>
            <Link href="/dashboard/warehouse/requests" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Все заявки</Link>
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
                          <td className="py-2.5 text-gray-800 dark:text-gray-100 font-medium truncate max-w-[160px]">{r.material?.name || `#${r.id}`}</td>
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

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Оборудование</h3>
            <Link href="/dashboard/warehouse/equipment" className="text-xs text-violet-500 hover:text-violet-600 font-medium">Всё оборудование</Link>
          </div>
          <div className="p-5">
            {equipment.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет оборудования</p>
            ) : (
              <div className="space-y-3">
                {equipment.slice(0, 8).map((e: any) => {
                  const st = EQUIP_STATUS_MAP[String(e.status ?? '')];
                  return (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{e.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{e.type || e.location || '—'}</p>
                      </div>
                      {st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400 text-xs">—</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Заявки по статусам</h3>
          <div className="h-64">
            {requestsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestsByStatus} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
                  <Bar dataKey="value" name="Заявки" radius={[4, 4, 0, 0]}>
                    {requestsByStatus.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Оборудование по статусам</h3>
          <div className="h-64">
            {equipByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">Нет данных</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={equipByStatus} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {equipByStatus.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
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
