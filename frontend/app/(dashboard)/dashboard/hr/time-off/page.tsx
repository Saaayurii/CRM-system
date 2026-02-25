'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCrudData } from '@/lib/hooks/useCrudData';
import { ADMIN_MODULES } from '@/lib/admin/modulesConfig';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import EntityFormModal from '@/components/admin/EntityFormModal';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';

function StatusBadge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
}

function fmtDate(v: unknown): string {
  if (!v) return '—';
  try {
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return String(v);
  }
}

const STATUS_MAP: Record<string | number, { label: string; color: string }> = {
  0: { label: 'Ожидает', color: 'yellow' },
  1: { label: 'Одобрен', color: 'green' },
  2: { label: 'Отклонён', color: 'red' },
  pending: { label: 'Ожидает', color: 'yellow' },
  approved: { label: 'Одобрен', color: 'green' },
  rejected: { label: 'Отклонён', color: 'red' },
};

const REQUEST_TYPE_MAP: Record<string, string> = {
  vacation: 'Отпуск',
  sick: 'Больничный',
  personal: 'Личные',
};

const config = ADMIN_MODULES.leaves;

export default function HRTimeOffPage() {
  const crud = useCrudData<Record<string, unknown>>({ apiEndpoint: config.apiEndpoint });
  const addToast = useToastStore((s) => s.addToast);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);

  async function handleAction(id: number, status: number) {
    setActionLoading(id);
    try {
      await api.put(`/time-off-requests/${id}`, { status });
      addToast('success', status === 1 ? 'Заявка одобрена' : 'Заявка отклонена');
      crud.refetch();
    } catch {
      addToast('error', 'Ошибка при обновлении заявки');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard" className="text-sm text-violet-500 hover:text-violet-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Назад к панели управления
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Отпуска и отсутствия</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
        >
          + Новая заявка
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск по сотруднику..."
          value={crud.search}
          onChange={(e) => crud.setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {crud.loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : crud.data.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Нет заявок</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Сотрудник</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Тип</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Начало</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Окончание</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Дней</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {crud.data.map((row) => {
                  const id = row.id as number;
                  const status = row.status;
                  const isPending = status === 0 || status === 'pending';
                  const st = STATUS_MAP[String(status ?? '')];
                  const userName = (row as any).user?.name;
                  return (
                    <tr key={id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{id}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 font-medium">
                        {userName || `ID: ${row.userId}`}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {REQUEST_TYPE_MAP[String(row.requestType ?? '')] || String(row.requestType ?? '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(row.startDate)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(row.endDate)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{String(row.daysCount ?? '—')}</td>
                      <td className="px-4 py-3">
                        {st ? <StatusBadge label={st.label} color={st.color} /> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleAction(id, 1)}
                                disabled={actionLoading === id}
                                className="px-2.5 py-1 text-xs font-medium rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 transition-colors disabled:opacity-50"
                              >
                                Одобрить
                              </button>
                              <button
                                onClick={() => handleAction(id, 2)}
                                disabled={actionLoading === id}
                                className="px-2.5 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 transition-colors disabled:opacity-50"
                              >
                                Отклонить
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors"
                          >
                            Удалить
                          </button>
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

      {/* Pagination */}
      {crud.total > crud.limit && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Всего: {crud.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => crud.setPage(Math.max(1, crud.page - 1))}
              disabled={crud.page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-600 dark:text-gray-300"
            >
              Назад
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300">
              {crud.page} / {Math.ceil(crud.total / crud.limit)}
            </span>
            <button
              onClick={() => crud.setPage(crud.page + 1)}
              disabled={crud.page >= Math.ceil(crud.total / crud.limit)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-600 dark:text-gray-300"
            >
              Далее
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      <EntityFormModal
        open={showCreate}
        title="Новая заявка на отпуск"
        fields={config.formFields}
        onSubmit={async (data) => {
          const result = await crud.createItem(data);
          if (result) setShowCreate(false);
        }}
        onClose={() => setShowCreate(false)}
        loading={crud.saving}
      />

      {/* Delete confirm */}
      <DeleteConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await crud.deleteItem(deleteTarget.id as number);
            setDeleteTarget(null);
          }
        }}
        loading={crud.saving}
      />
    </div>
  );
}
