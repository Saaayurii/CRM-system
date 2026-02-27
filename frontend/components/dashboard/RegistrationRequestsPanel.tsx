'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

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

export default function RegistrationRequestsPanel() {
  const addToast = useToastStore((s) => s.addToast);
  const [requests, setRequests] = useState<RegRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [approveState, setApproveState] = useState<{ id: number; roleId: number } | null>(null);
  const [rejectState, setRejectState] = useState<{ id: number; reason: string } | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
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
  }

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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Заявки на регистрацию</h3>
        </div>
        <div className="p-5 flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Заявки на регистрацию
          {requests.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-violet-500 rounded-full">
              {requests.length}
            </span>
          )}
        </h3>
      </div>
      <div className="p-5">
        {requests.length === 0 ? (
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

                  {/* Action buttons — show only if no modal open for this item */}
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

                {/* Approve inline form */}
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

                {/* Reject inline form */}
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
    </div>
  );
}
