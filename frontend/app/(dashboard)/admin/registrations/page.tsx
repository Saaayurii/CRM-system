'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { AxiosError } from 'axios';

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
  rejectReason?: string;
  reviewedBy?: number | null;
  reviewedAt?: string;
  reviewer?: { id: number; name: string; roleId?: number } | null;
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

type Tab = 'pending' | 'history';

export default function RegistrationsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<RegRequest[]>([]);
  const [history, setHistory] = useState<RegRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [approveState, setApproveState] = useState<{ id: number; roleId: number } | null>(null);
  const [rejectState, setRejectState] = useState<{ id: number; reason: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    loadPending();
    loadHistory();
    const id = setInterval(() => { loadPending(true); loadHistory(true); }, 5_000);
    return () => clearInterval(id);
  }, []);

  async function loadPending(silent = false) {
    if (!silent) setLoadingPending(true);
    try {
      const { data } = await api.get('/auth/registration-requests', { params: { status: 0 } });
      const arr = Array.isArray(data) ? data : (data?.data || data?.items || []);
      setPending(arr);
    } catch {
      setPending([]);
    } finally {
      if (!silent) setLoadingPending(false);
    }
  }

  async function loadHistory(silent = false) {
    if (!silent) setLoadingHistory(true);
    try {
      const [res1, res2] = await Promise.all([
        api.get('/auth/registration-requests', { params: { status: 1 } }),
        api.get('/auth/registration-requests', { params: { status: 2 } }),
      ]);
      const extract = (d: any) => Array.isArray(d) ? d : (d?.data || d?.items || []);
      setHistory([...extract(res1.data), ...extract(res2.data)].sort(
        (a, b) => new Date(b.reviewedAt || b.createdAt).getTime() - new Date(a.reviewedAt || a.createdAt).getTime()
      ));
    } catch {
      setHistory([]);
    } finally {
      if (!silent) setLoadingHistory(false);
    }
  }

  function extractApiError(err: unknown, fallback: string): string {
    const e = err as AxiosError<{ message?: string | string[] }>;
    const msg = e?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join('; ');
    return msg || fallback;
  }

  async function handleApprove(id: number, roleId: number) {
    setActionLoading(id);
    try {
      await api.put(`/auth/registration-requests/${id}/approve`, { roleId });
      addToast('success', 'Заявка одобрена, пользователь создан');
      setApproveState(null);
      loadPending();
      loadHistory();
    } catch (err) {
      addToast('error', extractApiError(err, 'Ошибка при одобрении заявки'));
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
      loadPending();
      loadHistory();
    } catch (err) {
      addToast('error', extractApiError(err, 'Ошибка при отклонении заявки'));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      const rows = history.map((r) => ({
        name: r.name,
        email: r.email,
        status: r.status === 1 ? 'Одобрена' : 'Отклонена',
        reviewer: reviewerLabel(r),
        reviewedAt: fmtDate(r.reviewedAt),
        rejectReason: r.rejectReason || '—',
      }));
      const { data: genData } = await api.post('/documents/pdf/generate-list', {
        entityType: 'registration-requests',
        title: 'Заявки на регистрацию — История',
        rows,
      });
      const { data: blob } = await api.get(
        `/documents/pdf/download/${genData.filename}`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = genData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', 'PDF скачан');
    } catch {
      addToast('error', 'Не удалось сформировать PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  function reviewerLabel(r: RegRequest): string {
    if (r.reviewer) {
      if (r.reviewer.roleId === 1) return 'Супер-Админ';
      return r.reviewer.name;
    }
    if (r.reviewedBy) return `Пользователь #${r.reviewedBy}`;
    return '—';
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Заявки на регистрацию</h1>

      {/* Tabs + PDF button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'pending'
                ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Ожидающие
            {pending.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-violet-500 rounded-full">
                {pending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'history'
                ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            История
          </button>
        </div>

        {tab === 'history' && history.length > 0 && (
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfLoading ? 'Формирование...' : 'Скачать PDF'}
          </button>
        )}
      </div>

      {/* Pending tab */}
      {tab === 'pending' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
          <div className="p-5">
            {loadingPending ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
              </div>
            ) : pending.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Нет ожидающих заявок</p>
            ) : (
              <div className="space-y-3">
                {pending.map((req) => (
                  <div key={req.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
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
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Нет рассмотренных заявок</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700/60">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Имя</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Статус</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Рассмотрел</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Дата</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Причина отказа</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((req) => (
                    <tr key={req.id} className="border-b border-gray-50 dark:border-gray-700/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                      <td className="px-5 py-3 text-gray-800 dark:text-gray-100 font-medium">{req.name}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{req.email}</td>
                      <td className="px-5 py-3">
                        {req.status === 1 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                            Одобрена
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            Отклонена
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{reviewerLabel(req)}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{fmtDate(req.reviewedAt)}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{req.rejectReason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
