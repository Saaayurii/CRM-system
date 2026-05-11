'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useToastStore } from '@/stores/toastStore';
import { useDownloadPdf } from '@/lib/hooks/useDownloadPdf';
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
  1: { label: 'Активна',       color: 'text-green-600 bg-green-100 dark:bg-green-500/20 dark:text-green-400' },
  0: { label: 'Неактивна',     color: 'text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400' },
  2: { label: 'Заблокирована', color: 'text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400' },
};

function fmt(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type ViewMode = 'table' | 'grid';

// ── Edit modal ────────────────────────────────────────────────
function EditCompanyModal({ company, onClose, onSaved }: {
  company: Company;
  onClose: () => void;
  onSaved: (updated: Company) => void;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [form, setForm] = useState({ name: company.name, subdomain: company.subdomain ?? '', status: company.status });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/accounts/${company.id}`, {
        name: form.name,
        subdomain: form.subdomain || undefined,
        status: form.status,
      });
      addToast('success', 'Компания обновлена');
      onSaved({ ...company, ...form, subdomain: form.subdomain || undefined });
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
            {company.logoUrl
              ? <img src={company.logoUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-sm font-bold text-gray-500 dark:text-gray-300">{company.name[0]?.toUpperCase()}</span>}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Редактировать компанию</h2>
            <p className="text-xs text-gray-400">ID: {company.id}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
            <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Поддомен</label>
            <input type="text" value={form.subdomain} onChange={(e) => set('subdomain', e.target.value)} className={inputCls} placeholder="example" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Статус</label>
            <select value={form.status} onChange={(e) => set('status', Number(e.target.value))} className={inputCls}>
              <option value={1}>Активна</option>
              <option value={0}>Неактивна</option>
              <option value={2}>Заблокирована</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function CompaniesPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { download: downloadPdf, loading: pdfLoading } = useDownloadPdf();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('adminCompaniesView') as ViewMode) || 'table';
    return 'table';
  });

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
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const filtered = companies
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.subdomain?.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => statusFilter === null || c.status === statusFilter);

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('adminCompaniesView', mode);
  };

  const handleSaved = (updated: Company) => {
    setCompanies((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    setEditingCompany(null);
  };

  const handleToggleStatus = async (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = company.status === 1 ? 2 : 1;
    try {
      await api.put(`/accounts/${company.id}`, { status: newStatus });
      setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, status: newStatus } : c));
    } catch { /* silent */ }
  };

  if (!user?.isGlobalAdmin) return null;

  const pdfRows = filtered.map((c) => ({
    Название: c.name,
    'ID': c.id,
    Поддомен: c.subdomain || '—',
    Пользователи: c.userCount ?? '—',
    Статус: STATUS_LABEL[c.status]?.label ?? '—',
    Создана: fmt(c.createdAt),
  }));

  // ── Avatar helper ──
  const Avatar = ({ company }: { company: Company }) => (
    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
      {company.logoUrl
        ? <img src={company.logoUrl} alt="" className="w-full h-full object-cover" />
        : <span className="text-sm font-bold text-gray-500 dark:text-gray-300">{company.name[0]?.toUpperCase()}</span>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Компании</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{companies.length} зарегистрировано</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button onClick={() => handleViewMode('table')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`} title="Таблица">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button onClick={() => handleViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`} title="Карточки">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>

          {/* PDF */}
          <button
            onClick={() => downloadPdf('companies', 'Компании', pdfRows)}
            disabled={pdfLoading || filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfLoading ? 'PDF...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию..." className="form-input flex-1 max-w-xs" />
        <div className="flex gap-2">
          {([null, 1, 0, 2] as (number | null)[]).map((s) => (
            <button key={String(s)} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-violet-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              {s === null ? 'Все' : STATUS_LABEL[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs flex items-center justify-center py-16">
          <svg className="animate-spin w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs py-16 text-center text-sm text-gray-400">Компании не найдены</div>
      ) : viewMode === 'table' ? (
        /* ── Table view ── */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Компания</th>
                  <th className="py-3 px-4 text-left font-semibold">Поддомен</th>
                  <th className="py-3 px-4 text-left font-semibold">Пользователи</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                  <th className="py-3 px-4 text-left font-semibold">Создана</th>
                  <th className="py-3 px-4 text-center font-semibold w-28">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filtered.map((company) => {
                  const statusInfo = STATUS_LABEL[company.status] ?? STATUS_LABEL[0];
                  return (
                    <tr key={company.id}
                      onClick={() => setEditingCompany(company)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors cursor-pointer">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar company={company} />
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
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleStatus(company, e)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            company.status === 1
                              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'
                          }`}>
                          {company.status === 1 ? 'Заблокировать' : 'Активировать'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Grid view ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((company) => {
            const statusInfo = STATUS_LABEL[company.status] ?? STATUS_LABEL[0];
            return (
              <div key={company.id}
                onClick={() => setEditingCompany(company)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <Avatar company={company} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{company.name}</p>
                    <p className="text-xs text-gray-400">ID: {company.id}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div>
                    <dt className="text-gray-400">Поддомен</dt>
                    <dd className="text-gray-700 dark:text-gray-300 truncate">{company.subdomain || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Пользователи</dt>
                    <dd className="text-gray-700 dark:text-gray-300">{company.userCount ?? '—'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-gray-400">Создана</dt>
                    <dd className="text-gray-700 dark:text-gray-300">{fmt(company.createdAt)}</dd>
                  </div>
                </dl>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditingCompany(company)}
                    className="text-xs text-violet-500 hover:text-violet-600 font-medium">
                    Редактировать
                  </button>
                  <button onClick={(e) => handleToggleStatus(company, e)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      company.status === 1
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'
                    }`}>
                    {company.status === 1 ? 'Заблокировать' : 'Активировать'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editingCompany && (
        <EditCompanyModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
