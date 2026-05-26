'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useIsClient } from '@/hooks/useIsClient';
import ClientFormModal, { ClientDTO } from '@/components/clients/ClientFormModal';
import ClientPortalAccessModal from '@/components/admin/ClientPortalAccessModal';

type Tab = 'clients' | 'accesses' | 'invites';
type ViewMode = 'table' | 'grid';

interface ClientRow extends ClientDTO {
  id: number;
  createdAt?: string;
}

interface PortalAccess {
  id: number;
  clientId: number;
  projectId: number;
  accessToken: string | null;
  login: string | null;
  userId: number | null;
  canViewProgress: boolean;
  canViewPhotos: boolean;
  canViewDocuments: boolean;
  canViewFinancials: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface ClientInvite {
  id: number;
  token: string;
  projectId: number | null;
  projectName: string | null;
  note: string | null;
  canViewProgress: boolean;
  canViewPhotos: boolean;
  canViewDocuments: boolean;
  canViewFinancials: boolean;
  expiresAt: string | null;
  usedAt: string | null;
  usedByClientId: number | null;
  usedByCompanyName: string | null;
  usedByPersonName: string | null;
  createdAt: string;
}

const CLIENT_TYPE_LABEL: Record<string, string> = {
  individual: 'Физ. лицо',
  company: 'Компания',
  government: 'Гос. орган',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active: { label: 'Активен', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  inactive: { label: 'Неактивен', cls: 'bg-gray-500/15 text-gray-600 dark:text-gray-400' },
  blocked: { label: 'Заблокирован', cls: 'bg-red-500/15 text-red-700 dark:text-red-300' },
};

function clientName(c: ClientDTO | null | undefined): string {
  if (!c) return '—';
  return (
    c.companyName ||
    [c.lastName, c.firstName, c.middleName].filter(Boolean).join(' ') ||
    c.email ||
    '—'
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function fmt(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function inviteStatus(inv: ClientInvite): { label: string; cls: string } {
  if (inv.usedAt) return { label: 'Использован', cls: 'bg-gray-500/15 text-gray-500' };
  if (inv.expiresAt && new Date(inv.expiresAt) < new Date())
    return { label: 'Истёк', cls: 'bg-red-500/15 text-red-700 dark:text-red-300' };
  return { label: 'Активен', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
}

// ──────────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [tab, setTab] = useState<Tab>('clients');
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">Клиенты</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          База заказчиков, доступы к клиентскому порталу и инвайт-ссылки
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {([
          ['clients', 'Клиенты'],
          ['accesses', 'Доступы к порталу'],
          ['invites', 'Инвайт-ссылки'],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === k
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'clients' && <ClientsListPanel />}
      {tab === 'accesses' && <PortalAccessesPanel />}
      {tab === 'invites' && <ClientInvitesPanel />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tab 1: Clients
// ──────────────────────────────────────────────────────────────────────────

function ClientsListPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const isReadOnly = useIsClient();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('table');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState<ClientRow | null>(null);
  const [portalClient, setPortalClient] = useState<ClientRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', { params: { limit: 200 } });
      const arr: ClientRow[] = data?.data || data?.clients || (Array.isArray(data) ? data : []) || [];
      setClients(arr);
    } catch {
      setClients([]);
      addToast('error', 'Не удалось загрузить клиентов');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const name = clientName(c).toLowerCase();
      return (
        name.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.inn ?? '').toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/clients/${deleting.id}`);
      addToast('success', 'Клиент удалён');
      setDeleting(null);
      load();
    } catch {
      addToast('error', 'Не удалось удалить клиента');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, email, телефону, ИНН..."
            className="form-input w-full pl-9"
          />
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-100 dark:bg-gray-700/40">
          <button
            onClick={() => setView('table')}
            className={`p-1.5 rounded transition-colors ${view === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Таблица"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Карточки"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Создать
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            {search ? 'Ничего не найдено' : 'Клиентов пока нет. Создайте первого или отправьте инвайт-ссылку.'}
          </div>
        ) : view === 'table' ? (
          <ClientsTable
            rows={filtered}
            isReadOnly={isReadOnly}
            onEdit={(r) => {
              setEditing(r);
              setFormOpen(true);
            }}
            onDelete={(r) => setDeleting(r)}
            onPortal={(r) => setPortalClient(r)}
          />
        ) : (
          <ClientsGrid
            rows={filtered}
            isReadOnly={isReadOnly}
            onEdit={(r) => {
              setEditing(r);
              setFormOpen(true);
            }}
            onDelete={(r) => setDeleting(r)}
            onPortal={(r) => setPortalClient(r)}
          />
        )}
      </div>

      <ClientFormModal
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      {portalClient && (
        <ClientPortalAccessModal
          clientId={portalClient.id}
          clientName={clientName(portalClient)}
          onClose={() => {
            setPortalClient(null);
            load();
          }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-5 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Удалить клиента?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {clientName(deleting)} — это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setDeleting(null)}
                className="px-3.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                className="px-3.5 py-1.5 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientsTable({
  rows,
  isReadOnly,
  onEdit,
  onDelete,
  onPortal,
}: {
  rows: ClientRow[];
  isReadOnly: boolean;
  onEdit: (r: ClientRow) => void;
  onDelete: (r: ClientRow) => void;
  onPortal: (r: ClientRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/30 text-xs uppercase">
          <tr>
            <th className="py-3 px-4 text-left font-semibold text-gray-500 dark:text-gray-400">Клиент</th>
            <th className="py-3 px-4 text-left font-semibold text-gray-500 dark:text-gray-400">Контакты</th>
            <th className="py-3 px-4 text-left font-semibold text-gray-500 dark:text-gray-400">Статус</th>
            <th className="py-3 px-4 text-right font-semibold text-gray-500 dark:text-gray-400">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {rows.map((c) => {
            const name = clientName(c);
            const status = STATUS_BADGE[c.status ?? 'active'] ?? STATUS_BADGE.active;
            return (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-xs font-bold">
                      {initials(name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 dark:text-gray-100 truncate">{name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {CLIENT_TYPE_LABEL[c.clientType ?? ''] ?? '—'}
                        {c.inn ? <span className="ml-1.5">· ИНН {c.inn}</span> : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-xs space-y-0.5">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="block text-violet-600 dark:text-violet-400 hover:underline truncate">
                        {c.email}
                      </a>
                    ) : null}
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="block text-gray-700 dark:text-gray-300 hover:underline">
                        {c.phone}
                      </a>
                    ) : null}
                    {!c.email && !c.phone ? <span className="text-gray-400">—</span> : null}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                    {status.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1.5">
                    {!isReadOnly && (
                      <button
                        onClick={() => onPortal(c)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                        title="Доступ к порталу"
                      >
                        Доступ
                      </button>
                    )}
                    {!isReadOnly && (
                      <button
                        onClick={() => onEdit(c)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Редактировать"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {!isReadOnly && (
                      <button
                        onClick={() => onDelete(c)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        title="Удалить"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ClientsGrid({
  rows,
  isReadOnly,
  onEdit,
  onDelete,
  onPortal,
}: {
  rows: ClientRow[];
  isReadOnly: boolean;
  onEdit: (r: ClientRow) => void;
  onDelete: (r: ClientRow) => void;
  onPortal: (r: ClientRow) => void;
}) {
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {rows.map((c) => {
        const name = clientName(c);
        const status = STATUS_BADGE[c.status ?? 'active'] ?? STATUS_BADGE.active;
        return (
          <div
            key={c.id}
            className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700/50 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-sm font-bold">
                {initials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">{name}</div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {CLIENT_TYPE_LABEL[c.clientType ?? ''] ?? '—'}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs space-y-1">
              {c.email ? (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 truncate">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${c.email}`} className="truncate hover:text-violet-600 dark:hover:text-violet-400">
                    {c.email}
                  </a>
                </div>
              ) : null}
              {c.phone ? (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11 11 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${c.phone}`} className="hover:text-violet-600 dark:hover:text-violet-400">{c.phone}</a>
                </div>
              ) : null}
              {c.inn ? (
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <span className="text-gray-400">ИНН</span>
                  <span className="font-mono">{c.inn}</span>
                </div>
              ) : null}
            </div>

            {!isReadOnly && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200 dark:border-gray-700/60">
                <button
                  onClick={() => onPortal(c)}
                  className="flex-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50"
                >
                  Доступ
                </button>
                <button
                  onClick={() => onEdit(c)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                >
                  Изменить
                </button>
                <button
                  onClick={() => onDelete(c)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tab 2: Portal accesses
// ──────────────────────────────────────────────────────────────────────────

function PortalAccessesPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const [accesses, setAccesses] = useState<PortalAccess[]>([]);
  const [clients, setClients] = useState<Record<number, ClientRow>>({});
  const [projects, setProjects] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accResp, cliResp, prjResp] = await Promise.all([
        api.get('/client-portal-access', { params: { limit: 200 } }),
        api.get('/clients', { params: { limit: 500 } }),
        api.get('/projects', { params: { limit: 500 } }),
      ]);
      const accList: PortalAccess[] = accResp.data?.data || accResp.data?.items || [];
      const cliList: ClientRow[] = cliResp.data?.data || cliResp.data?.clients || [];
      const prjList: { id: number; name: string }[] =
        prjResp.data?.data || prjResp.data?.projects || [];

      setAccesses(accList);
      setClients(Object.fromEntries(cliList.map((c) => [c.id, c])));
      setProjects(Object.fromEntries(prjList.map((p) => [p.id, p.name])));
    } catch {
      addToast('error', 'Не удалось загрузить доступы');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (id: number) => {
    if (!confirm('Отозвать доступ к порталу?')) return;
    try {
      await api.delete(`/client-portal-access/${id}`);
      addToast('success', 'Доступ отозван');
      setAccesses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      addToast('error', 'Не удалось отозвать доступ');
    }
  };

  const handleCopy = (token: string, id: number) => {
    const link = `${baseUrl}/portal/magic?token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Выданные доступы</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Все клиенты, у которых уже есть учётная запись в портале (логин/пароль или magic-ссылка)
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-gray-400">Загрузка...</div>
      ) : accesses.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">
          Нет выданных доступов. Откройте карточку клиента и нажмите «Доступ».
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {accesses.map((a) => {
            const c = clients[a.clientId];
            const cname = clientName(c);
            const pname = projects[a.projectId] ?? `Проект #${a.projectId}`;
            return (
              <div key={a.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-xs font-bold">
                  {initials(cname)}
                </div>
                <div className="flex-1 min-w-48">
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{cname}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Проект: <span className="text-gray-700 dark:text-gray-300">{pname}</span>
                    {a.login ? (
                      <span className="ml-2">
                        Логин: <span className="font-mono text-gray-700 dark:text-gray-300">{a.login}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {a.login && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        логин/пароль
                      </span>
                    )}
                    {a.accessToken && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">
                        magic-ссылка
                      </span>
                    )}
                    {a.canViewFinancials && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        + финансы
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Выдан: {fmt(a.createdAt)}
                    {a.lastLoginAt ? ` · Последний вход: ${fmt(a.lastLoginAt)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {a.accessToken && (
                    <button
                      onClick={() => handleCopy(a.accessToken!, a.id)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400"
                    >
                      {copied === a.id ? '✓ Скопировано' : 'Magic-ссылка'}
                    </button>
                  )}
                  <button
                    onClick={() => handleRevoke(a.id)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    Отозвать
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tab 3: Invites
// ──────────────────────────────────────────────────────────────────────────

function ClientInvitesPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const canManage = user?.roleId !== 15;
  const [invites, setInvites] = useState<ClientInvite[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Create form state
  const [projectId, setProjectId] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(168);
  const [canViewProgress, setCanViewProgress] = useState(true);
  const [canViewPhotos, setCanViewPhotos] = useState(true);
  const [canViewDocuments, setCanViewDocuments] = useState(true);
  const [canViewFinancials, setCanViewFinancials] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invResp, prjResp] = await Promise.all([
        api.get('/client-invites'),
        api.get('/projects', { params: { limit: 500 } }),
      ]);
      setInvites(Array.isArray(invResp.data) ? invResp.data : []);
      setProjects(prjResp.data?.data || prjResp.data?.projects || []);
    } catch {
      addToast('error', 'Не удалось загрузить инвайты');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (canManage) load();
  }, [load, canManage]);

  const handleCreate = async () => {
    if (!projectId) {
      addToast('error', 'Выберите проект');
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/client-invites', {
        projectId: Number(projectId),
        note: note || undefined,
        expiresInHours,
        canViewProgress,
        canViewPhotos,
        canViewDocuments,
        canViewFinancials,
      });
      const link = `${baseUrl}/auth/client-invite?ref=${data.token}`;
      setNewLink(link);
      navigator.clipboard.writeText(link).catch(() => {});
      addToast('success', 'Инвайт создан и скопирован');
      setNote('');
      load();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Не удалось создать инвайт');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (token: string) => {
    if (!confirm('Отозвать инвайт?')) return;
    try {
      await api.delete(`/client-invites/${token}`);
      addToast('success', 'Инвайт отозван');
      setInvites((prev) => prev.filter((i) => i.token !== token));
    } catch {
      addToast('error', 'Не удалось отозвать инвайт');
    }
  };

  const copyLink = (token: string) => {
    const link = `${baseUrl}/auth/client-invite?ref=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (!canManage) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center text-sm text-gray-400">
        Управление инвайтами доступно только сотрудникам компании
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Новый инвайт для клиента</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Клиент сам заполнит данные при первом входе. После регистрации получит роль «Клиент» и доступ к выбранному проекту.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Проект <span className="text-red-500">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
              className="form-select w-full"
            >
              <option value="">— Выберите проект —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Срок действия
            </label>
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(Number(e.target.value))}
              className="form-select w-full"
            >
              <option value={24}>24 часа</option>
              <option value={72}>3 дня</option>
              <option value={168}>7 дней</option>
              <option value={720}>30 дней</option>
              <option value={0}>Без ограничений</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Заметка (для кого / зачем)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='Напр.: "Заказчик объекта Сосенки"'
            className="form-input w-full"
          />
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Что увидит клиент:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              ['Прогресс работ', canViewProgress, setCanViewProgress],
              ['Фотоотчёт', canViewPhotos, setCanViewPhotos],
              ['Документы', canViewDocuments, setCanViewDocuments],
              ['Финансы', canViewFinancials, setCanViewFinancials],
            ].map(([label, value, setter], idx) => (
              <label
                key={idx}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  value
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                  className="sr-only"
                />
                {value ? '✓' : '○'} {label as string}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={creating || !projectId}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-medium rounded-lg"
          >
            {creating ? 'Создаём...' : '+ Сгенерировать ссылку'}
          </button>
        </div>

        {newLink && (
          <div className="mt-4 p-3 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30">
            <div className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1.5">
              Ссылка создана — скопирована в буфер обмена
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={newLink}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 text-xs bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-500/30 rounded px-2 py-1.5 text-gray-700 dark:text-gray-200"
              />
              <button
                onClick={() => navigator.clipboard.writeText(newLink)}
                className="shrink-0 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs rounded-lg"
              >
                Копировать
              </button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Все инвайт-ссылки</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Загрузка...</div>
        ) : invites.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Инвайтов пока нет</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {invites.map((inv) => {
              const st = inviteStatus(inv);
              const isActive = !inv.usedAt && (!inv.expiresAt || new Date(inv.expiresAt) >= new Date());
              return (
                <div key={inv.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-48">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                      {inv.note && (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{inv.note}</span>
                      )}
                      {inv.projectName && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">· {inv.projectName}</span>
                      )}
                    </div>
                    {isActive && (
                      <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-md">
                        {`${baseUrl}/auth/client-invite?ref=${inv.token}`}
                      </div>
                    )}
                    <div className="flex gap-3 mt-1 text-[10px] text-gray-400 dark:text-gray-500 flex-wrap">
                      <span>Создан: {fmt(inv.createdAt)}</span>
                      {inv.expiresAt && <span>Истекает: {fmt(inv.expiresAt)}</span>}
                      {inv.usedAt && (
                        <span>
                          Использован: {fmt(inv.usedAt)}
                          {inv.usedByCompanyName || inv.usedByPersonName
                            ? ` (${inv.usedByCompanyName || inv.usedByPersonName})`
                            : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive && (
                      <button
                        onClick={() => copyLink(inv.token)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400"
                      >
                        {copied === inv.token ? '✓ Скопировано' : 'Копировать'}
                      </button>
                    )}
                    {isActive && (
                      <button
                        onClick={() => handleRevoke(inv.token)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        Отозвать
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
