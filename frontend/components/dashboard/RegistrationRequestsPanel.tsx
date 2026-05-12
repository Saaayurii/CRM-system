'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';

const ROLE_OPTIONS: { value: number; label: string }[] = [
  { value: 10, label: 'Рабочий' },
  { value: 9, label: 'Инспектор' },
  { value: 8, label: 'Бухгалтер' },
  { value: 7, label: 'Кладовщик' },
  { value: 6, label: 'Снабженец' },
  { value: 5, label: 'Прораб' },
  { value: 4, label: 'Менеджер проектов' },
  { value: 3, label: 'HR Менеджер' },
  { value: 2, label: 'Администратор' },
];

interface RegRequest {
  id: number;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  status: number;
  createdAt: string;
}

interface MemberInvite {
  id: number;
  token: string;
  note: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  usedByUserName: string | null;
  createdAt: string;
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return String(v);
  }
}

function fmt(v: string | null | undefined) {
  if (!v) return '—';
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getInviteStatus(inv: MemberInvite): { label: string; color: string } {
  if (inv.usedAt) return { label: 'Использован', color: 'bg-gray-500/20 text-gray-500' };
  if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return { label: 'Истёк', color: 'bg-red-500/20 text-red-600 dark:text-red-400' };
  return { label: 'Активен', color: 'bg-green-500/20 text-green-700 dark:text-green-400' };
}

export default function RegistrationRequestsPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const canManageInvites = user?.roleId === 1 || user?.roleId === 2 || user?.roleId === 3;

  const [tab, setTab] = useState<'requests' | 'invites'>('requests');

  // Requests state
  const [requests, setRequests] = useState<RegRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [approveState, setApproveState] = useState<{ id: number; roleId: number } | null>(null);
  const [rejectState, setRejectState] = useState<{ id: number; reason: string } | null>(null);

  // Invites state
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteNote, setInviteNote] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newlyCreatedLink, setNewlyCreatedLink] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/registration-requests', { params: { status: 0 } });
      const arr = Array.isArray(data) ? data : (data?.data || data?.items || []);
      setRequests(arr);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const { data } = await api.get('/auth/member-invites');
      setInvites(Array.isArray(data) ? data : []);
    } catch {
      addToast('error', 'Не удалось загрузить инвайты');
    } finally {
      setInvitesLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (tab === 'invites' && canManageInvites) {
      loadInvites();
    }
  }, [tab, canManageInvites, loadInvites]);

  async function handleApprove(id: number, roleId: number) {
    setActionLoading(id);
    try {
      await api.put(`/auth/registration-requests/${id}/approve`, { roleId });
      addToast('success', 'Заявка одобрена, пользователь создан');
      setApproveState(null);
      loadRequests();
    } catch {
      addToast('error', 'Ошибка при одобрении заявки');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: number, reason: string) {
    setActionLoading(id);
    try {
      await api.put(`/auth/registration-requests/${id}/reject`, { reason: reason || undefined });
      addToast('success', 'Заявка отклонена');
      setRejectState(null);
      loadRequests();
    } catch {
      addToast('error', 'Ошибка при отклонении заявки');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateInvite() {
    setCreating(true);
    try {
      const { data } = await api.post('/auth/member-invites', {
        note: inviteNote || undefined,
        expiresInHours,
      });
      const link = `${baseUrl}/auth/register?ref=${data.token}`;
      setNewlyCreatedLink(link);
      navigator.clipboard.writeText(link).catch(() => {});
      setInviteNote('');
      loadInvites();
    } catch {
      addToast('error', 'Ошибка при создании инвайта');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeInvite(token: string) {
    if (!confirm('Отозвать этот инвайт?')) return;
    try {
      await api.delete(`/auth/member-invites/${token}`);
      addToast('success', 'Инвайт отозван');
      setInvites((prev) => prev.filter((i) => i.token !== token));
    } catch {
      addToast('error', 'Ошибка при отзыве инвайта');
    }
  }

  function copyInviteLink(token: string) {
    const link = `${baseUrl}/auth/register?ref=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
      {/* Header with tabs */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-4">
        <button
          onClick={() => setTab('requests')}
          className={`text-sm font-semibold transition-colors ${tab === 'requests' ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
          Заявки на регистрацию
          {!loading && requests.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-violet-500 rounded-full">
              {requests.length}
            </span>
          )}
        </button>
        {canManageInvites && (
          <button
            onClick={() => setTab('invites')}
            className={`text-sm font-semibold transition-colors ${tab === 'invites' ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            Инвайт-ссылки
          </button>
        )}
      </div>

      {/* Requests tab */}
      {tab === 'requests' && (
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Нет ожидающих заявок</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{req.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {req.email}
                        {req.phone && <span> &middot; {req.phone}</span>}
                        {req.birthDate && <span> &middot; {fmtDate(req.birthDate)}</span>}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Подана: {fmtDate(req.createdAt)}
                      </p>
                    </div>

                    {approveState?.id !== req.id && rejectState?.id !== req.id && (
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <button
                          onClick={() => setApproveState({ id: req.id, roleId: 10 })}
                          disabled={actionLoading === req.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60 transition-colors disabled:opacity-50"
                        >
                          Одобрить
                        </button>
                        <button
                          onClick={() => setRejectState({ id: req.id, reason: '' })}
                          disabled={actionLoading === req.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>

                  {approveState?.id === req.id && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <select
                        className="form-select text-xs py-1.5 rounded-lg"
                        value={approveState.roleId}
                        onChange={(e) => setApproveState({ ...approveState, roleId: Number(e.target.value) })}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleApprove(req.id, approveState.roleId)}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === req.id ? 'Сохранение...' : 'Подтвердить'}
                      </button>
                      <button
                        onClick={() => setApproveState(null)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  )}

                  {rejectState?.id === req.id && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        className="form-input text-xs py-1.5 rounded-lg flex-1 min-w-[150px]"
                        placeholder="Причина отказа (необязательно)"
                        value={rejectState.reason}
                        onChange={(e) => setRejectState({ ...rejectState, reason: e.target.value })}
                      />
                      <button
                        onClick={() => handleReject(req.id, rejectState.reason)}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === req.id ? 'Сохранение...' : 'Отклонить'}
                      </button>
                      <button
                        onClick={() => setRejectState(null)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invites tab */}
      {tab === 'invites' && canManageInvites && (
        <div className="p-5 space-y-4">
          {/* Create form */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-36">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Заметка</label>
              <input
                className="form-input w-full text-sm py-1.5"
                placeholder="Для кого / зачем"
                value={inviteNote}
                onChange={(e) => setInviteNote(e.target.value)}
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Срок действия</label>
              <select
                className="form-select w-full text-sm py-1.5"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
              >
                <option value={24}>24 часа</option>
                <option value={72}>3 дня</option>
                <option value={168}>7 дней</option>
                <option value={720}>30 дней</option>
                <option value={0}>Без ограничений</option>
              </select>
            </div>
            <button
              onClick={handleCreateInvite}
              disabled={creating}
              className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {creating ? 'Создаю...' : '+ Создать ссылку'}
            </button>
          </div>

          {/* Newly created link banner */}
          {newlyCreatedLink && (
            <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">Ссылка создана — скопируйте и отправьте сотруднику</span>
                <button onClick={() => setNewlyCreatedLink(null)} className="text-violet-400 hover:text-violet-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={newlyCreatedLink}
                  className="flex-1 text-xs bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-500/30 rounded px-2 py-1.5 text-gray-700 dark:text-gray-200 select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()} />
                <button
                  onClick={() => { navigator.clipboard.writeText(newlyCreatedLink); setCopiedToken('new'); setTimeout(() => setCopiedToken(null), 2000); }}
                  className="shrink-0 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                  {copiedToken === 'new' ? '✓ Скопировано' : 'Копировать'}
                </button>
              </div>
            </div>
          )}

          {/* Invite list */}
          {invitesLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Нет инвайт-ссылок. Создайте ссылку и поделитесь ей с сотрудником — название компании заполнится автоматически.
            </p>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => {
                const st = getInviteStatus(inv);
                const isActive = !inv.usedAt && (!inv.expiresAt || new Date(inv.expiresAt) >= new Date());
                return (
                  <div key={inv.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                        {inv.note && (
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{inv.note}</span>
                        )}
                      </div>
                      {isActive && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[280px] sm:max-w-xs font-mono">
                            {`${baseUrl}/auth/register?ref=${inv.token}`}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                        <span>Создан: {fmt(inv.createdAt)}</span>
                        {inv.expiresAt && <span>Истекает: {fmt(inv.expiresAt)}</span>}
                        {inv.usedAt && (
                          <span>Использован: {fmt(inv.usedAt)}{inv.usedByUserName ? ` (${inv.usedByUserName})` : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isActive && (
                        <button
                          onClick={() => copyInviteLink(inv.token)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                        >
                          {copiedToken === inv.token ? 'Скопировано!' : 'Копировать ссылку'}
                        </button>
                      )}
                      {isActive && (
                        <button
                          onClick={() => handleRevokeInvite(inv.token)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
      )}
    </div>
  );
}
