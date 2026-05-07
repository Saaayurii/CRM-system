'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Company {
  id: number;
  name: string;
  subdomain?: string;
  logoUrl?: string;
  status: number;
  createdAt: string;
  userCount?: number;
}

const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Активна', color: 'text-green-600 bg-green-100 dark:bg-green-500/20 dark:text-green-400' },
  0: { label: 'Неактивна', color: 'text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400' },
  2: { label: 'Заблокирована', color: 'text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400' },
};

function fmt(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CompaniesPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | null>(null);

  useEffect(() => {
    if (user && !user.isGlobalAdmin) router.replace('/admin');
  }, [user, router]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/accounts');
      const list: any[] = data?.data || data?.accounts || data || [];
      setCompanies(list.map((a) => ({
        id: a.id,
        name: a.name,
        subdomain: a.subdomain,
        logoUrl: a.logoUrl || a.logo_url,
        status: a.status ?? 1,
        createdAt: a.createdAt || a.created_at || '',
        userCount: a.userCount ?? a._count?.users,
      })));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const filtered = companies
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.subdomain?.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => statusFilter === null || c.status === statusFilter);

  const handleToggleStatus = async (company: Company) => {
    const newStatus = company.status === 1 ? 2 : 1;
    try {
      await api.put(`/accounts/${company.id}`, { status: newStatus });
      setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, status: newStatus } : c));
    } catch { /* silent */ }
  };

  if (!user?.isGlobalAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Компании</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{companies.length} зарегистрировано</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          className="form-input flex-1 max-w-xs"
        />
        <div className="flex gap-2">
          {([null, 1, 0, 2] as (number | null)[]).map((s) => (
            <button
              key={String(s)}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-violet-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s === null ? 'Все' : STATUS_LABEL[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-16">Компании не найдены</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Компания</th>
                  <th className="py-3 px-4 text-left font-semibold">Поддомен</th>
                  <th className="py-3 px-4 text-left font-semibold">Пользователи</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                  <th className="py-3 px-4 text-left font-semibold">Создана</th>
                  <th className="py-3 px-4 text-center font-semibold w-24">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filtered.map((company) => {
                  const statusInfo = STATUS_LABEL[company.status] ?? STATUS_LABEL[0];
                  return (
                    <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                            {company.logoUrl
                              ? <img src={company.logoUrl} alt="" className="w-full h-full object-cover" />
                              : <span className="text-sm font-bold text-gray-500 dark:text-gray-300">{company.name[0]?.toUpperCase()}</span>}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-100">{company.name}</p>
                            <p className="text-xs text-gray-400">ID: {company.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{company.subdomain || '—'}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{company.userCount ?? '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{fmt(company.createdAt)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(company)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            company.status === 1
                              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'
                          }`}
                        >
                          {company.status === 1 ? 'Заблокировать' : 'Активировать'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
