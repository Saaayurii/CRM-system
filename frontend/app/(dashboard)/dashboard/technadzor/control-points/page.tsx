'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import Badge from '@/components/technadzor/Badge';

interface ControlPoint {
  id: number; code?: string; name: string; section?: string; subsection?: string;
  checkType?: string; criticality?: number; status?: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: 'Черновик', color: 'gray' },
  active: { label: 'Активен', color: 'green' },
  archived: { label: 'Архив', color: 'gray' },
};
const CRIT: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкая', color: 'green' }, 2: { label: 'Средняя', color: 'yellow' },
  3: { label: 'Высокая', color: 'orange' }, 4: { label: 'Критическая', color: 'red' },
};
const CHECK_LABEL: Record<string, string> = {
  visual: 'Визуальный', measuring: 'Измерительный', functional: 'Функциональный',
  documentary: 'Документальный', complex: 'Комплексный',
};

export default function ControlPointsPage() {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState<ControlPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/control-points', { params: { limit: 200 } });
      setItems(data?.data || data?.items || (Array.isArray(data) ? data : []));
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = q.trim()
    ? items.filter((p) => `${p.code ?? ''} ${p.name}`.toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span><span className="text-gray-700 dark:text-gray-200">{t('Пункты контроля')}</span>
      </nav>

      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('Пункты контроля')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Библиотека контрольных пунктов (конструктор чек-листов)')}</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Поиск пунктов…')} className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 w-56 max-w-full" />
          <Link href="/dashboard/technadzor/control-points/new" className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white whitespace-nowrap">+ {t('Создать пункт')}</Link>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
          <p className="text-sm text-gray-400 mb-3">{items.length === 0 ? t('Пунктов пока нет — создайте первый через конструктор') : t('Ничего не найдено')}</p>
          <Link href="/dashboard/technadzor/control-points/new" className="text-violet-600 dark:text-violet-400 hover:underline text-sm">+ {t('Создать пункт')}</Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left px-5 py-3 font-medium w-28">{t('Код')}</th>
                <th className="text-left px-5 py-3 font-medium">{t('Контрольный пункт')}</th>
                <th className="text-left px-5 py-3 font-medium">{t('Категория')}</th>
                <th className="text-left px-5 py-3 font-medium w-32">{t('Тип контроля')}</th>
                <th className="text-left px-5 py-3 font-medium w-28">{t('Критичность')}</th>
                <th className="text-left px-5 py-3 font-medium w-28">{t('Статус')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((p) => {
                const cr = p.criticality != null ? CRIT[p.criticality] : undefined;
                const st = STATUS_META[p.status || 'draft'] ?? STATUS_META.draft;
                return (
                  <tr key={p.id} onClick={() => router.push(`/dashboard/technadzor/control-points/new?id=${p.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer">
                    <td className="px-5 py-3 font-mono text-gray-500 dark:text-gray-400">{p.code || '—'}</td>
                    <td className="px-5 py-3 text-gray-800 dark:text-gray-100">{p.name}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{[p.section, p.subsection].filter(Boolean).join(' › ') || '—'}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{p.checkType ? t(CHECK_LABEL[p.checkType] || p.checkType) : '—'}</td>
                    <td className="px-5 py-3">{cr ? <Badge label={t(cr.label)} color={cr.color} /> : '—'}</td>
                    <td className="px-5 py-3"><Badge label={t(st.label)} color={st.color} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
