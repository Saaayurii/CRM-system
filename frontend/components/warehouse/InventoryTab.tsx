'use client';

import { Fragment, useEffect, useState } from 'react';
import api from '@/lib/api';

interface InventoryItem {
  id: number;
  equipmentId: number;
  warehouseId?: number | null;
  isFound: boolean;
  notes?: string | null;
  equipment?: { id: number; name: string; serialNumber?: string | null };
  warehouse?: { id: number; name: string } | null;
}

interface Session {
  id: number;
  name: string;
  status: number;
  scheduledDate?: string | null;
  completedDate?: string | null;
  createdAt?: string;
  createdByUserId?: number | null;
  items?: InventoryItem[];
}

const STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Черновик',   cls: 'bg-gray-100 text-gray-600' },
  1: { label: 'В процессе', cls: 'bg-blue-100 text-blue-700' },
  2: { label: 'Завершена',  cls: 'bg-green-100 text-green-700' },
};

function fmt(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ru-RU'); } catch { return '—'; }
}

export default function InventoryTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inventory-sessions');
      const list: Session[] = Array.isArray(data) ? data : data?.data || data?.sessions || [];
      setSessions(list);
    } catch { setSessions([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Журнал инвентаризаций</h2>
          <p className="text-xs text-gray-500">Сессии инвентаризации оборудования. Чтобы запустить новую — откройте вкладку «Склады»</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">Загрузка...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">Инвентаризаций пока нет</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-gray-900/20">
              <tr>
                <th className="px-4 py-2.5 text-left">Название</th>
                <th className="px-4 py-2.5 text-left">Статус</th>
                <th className="px-4 py-2.5 text-left">Дата</th>
                <th className="px-4 py-2.5 text-right">Найдено</th>
                <th className="px-4 py-2.5 text-right">Не найдено</th>
                <th className="px-4 py-2.5 text-right">Всего</th>
                <th className="px-4 py-2.5 text-center w-32">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {sessions.map((s) => {
                const items = s.items || [];
                const found = items.filter((i) => i.isFound).length;
                const missing = items.length - found;
                const stat = STATUS[s.status] || STATUS[0];
                const isOpen = opened === s.id;
                return (
                  <Fragment key={s.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">{s.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${stat.cls}`}>{stat.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{fmt(s.completedDate || s.scheduledDate || s.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right text-green-600">{found}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">{missing}</td>
                      <td className="px-4 py-2.5 text-right">{items.length}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => setOpened(isOpen ? null : s.id)}
                          className="text-xs text-violet-600 hover:underline"
                        >
                          {isOpen ? 'Свернуть' : 'Отчёт'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${s.id}-detail`}>
                        <td colSpan={7} className="px-4 py-3 bg-gray-50 dark:bg-gray-900/20">
                          {items.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-2">Позиций нет</div>
                          ) : (
                            <table className="w-full text-xs">
                              <thead className="text-gray-400">
                                <tr>
                                  <th className="px-2 py-1 text-left">Оборудование</th>
                                  <th className="px-2 py-1 text-left">S/N</th>
                                  <th className="px-2 py-1 text-left">Склад</th>
                                  <th className="px-2 py-1 text-left">Найдено</th>
                                  <th className="px-2 py-1 text-left">Комментарий</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((i) => (
                                  <tr key={i.id}>
                                    <td className="px-2 py-1">{i.equipment?.name || `#${i.equipmentId}`}</td>
                                    <td className="px-2 py-1 text-gray-500">{i.equipment?.serialNumber || '—'}</td>
                                    <td className="px-2 py-1 text-gray-500">{i.warehouse?.name || '—'}</td>
                                    <td className={`px-2 py-1 ${i.isFound ? 'text-green-600' : 'text-red-600'}`}>
                                      {i.isFound ? 'Да' : 'Нет'}
                                    </td>
                                    <td className="px-2 py-1 text-gray-500">{i.notes || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
