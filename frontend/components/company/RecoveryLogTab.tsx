'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface RecoveryLogEntry {
  id: number;
  userId: number;
  email: string;
  userName: string | null;
  roleId: number | null;
  accountName: string | null;
  method: string;
  ipAddress: string | null;
  userAgent: string | null;
  recoveredAt: string;
}

const ROLE_NAMES: Record<number, string> = {
  1: 'Супер-админ',
  2: 'Админ',
  3: 'HR-менеджер',
  4: 'Менеджер проекта',
  5: 'Прораб',
  6: 'Снабженец',
  7: 'Кладовщик',
  8: 'Бухгалтер',
  9: 'Инспектор',
  10: 'Рабочий',
  15: 'Клиентский портал',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function RecoveryLogTab() {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<RecoveryLogEntry[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/auth/account-recovery-log');
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      addToast('error', 'Не удалось загрузить журнал восстановлений');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-48">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Восстановления доступа
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Кто и когда восстанавливал пароль через почту в этой компании.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Пока никто не восстанавливал доступ.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                <th className="px-4 py-3 font-medium">Сотрудник</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium">Способ</th>
                <th className="px-4 py-3 font-medium">Когда</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-gray-50 dark:border-gray-800 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 dark:text-gray-100">
                      {e.userName || '—'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{e.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {e.roleId != null ? ROLE_NAMES[e.roleId] || `Роль #${e.roleId}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.method === 'phone'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                      }`}
                    >
                      {e.method === 'phone' ? 'Телефон' : 'Email'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(e.recoveredAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {e.ipAddress || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
