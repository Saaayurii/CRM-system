'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';

interface Invite {
  id: number;
  token: string;
  note: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  usedByAccountId: number | null;
  usedByAccountName: string | null;
  createdAt: string;
}

function fmt(v: string | null | undefined) {
  if (!v) return '—';
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getStatus(inv: Invite): { label: string; color: string } {
  if (inv.usedAt) return { label: 'Использован', color: 'bg-gray-500/20 text-gray-500' };
  if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return { label: 'Истёк', color: 'bg-red-500/20 text-red-600 dark:text-red-400' };
  return { label: 'Активен', color: 'bg-green-500/20 text-green-700 dark:text-green-400' };
}

export default function InvitesPage() {
  const addToast = useToastStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/invites');
      setInvites(Array.isArray(data) ? data : []);
    } catch {
      addToast('error', 'Не удалось загрузить инвайты');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post('/auth/invites', { note: note || undefined, expiresInHours });
      setNote('');
      addToast('success', 'Инвайт создан');
      load();
    } catch {
      addToast('error', 'Ошибка при создании инвайта');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (token: string) => {
    if (!confirm('Отозвать этот инвайт?')) return;
    try {
      await api.delete(`/auth/invites/${token}`);
      addToast('success', 'Инвайт отозван');
      setInvites((prev) => prev.filter((i) => i.token !== token));
    } catch {
      addToast('error', 'Ошибка при отзыве инвайта');
    }
  };

  const copyLink = (token: string) => {
    const link = `${baseUrl}/auth/register-company?invite=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  if (user?.roleId !== 1) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-500">Доступ только для суперадмина</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Инвайт-ссылки</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Регистрация компании доступна только по одноразовой инвайт-ссылке
        </p>
      </div>

      {/* Create form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Создать инвайт</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Заметка (необязательно)</label>
            <input
              className="form-input w-full"
              placeholder="Для кого / зачем"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Срок действия</label>
            <select
              className="form-select w-full"
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
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {creating ? 'Создаю...' : 'Создать'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Все инвайты</h2>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">Загрузка...</div>
        ) : invites.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">Инвайтов пока нет</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/30">
                  <th className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400">Заметка</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400">Статус</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400">Создан</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400">Истекает</th>
                  <th className="py-3 px-4 text-left font-semibold text-gray-600 dark:text-gray-400">Использован / Кем</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600 dark:text-gray-400">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {invites.map((inv) => {
                  const st = getStatus(inv);
                  const isActive = !inv.usedAt && (!inv.expiresAt || new Date(inv.expiresAt) >= new Date());
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {inv.note || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{fmt(inv.createdAt)}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{fmt(inv.expiresAt)}</td>
                      <td className="py-3 px-4 text-xs">
                        {inv.usedAt ? (
                          <div>
                            <div className="text-gray-500 dark:text-gray-400">{fmt(inv.usedAt)}</div>
                            {inv.usedByAccountName && (
                              <div className="text-gray-700 dark:text-gray-300 font-medium mt-0.5">{inv.usedByAccountName}</div>
                            )}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isActive && (
                            <button
                              onClick={() => copyLink(inv.token)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                            >
                              {copiedToken === inv.token ? 'Скопировано!' : 'Копировать ссылку'}
                            </button>
                          )}
                          {isActive && (
                            <button
                              onClick={() => handleRevoke(inv.token)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              Отозвать
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
        )}
      </div>
    </div>
  );
}
