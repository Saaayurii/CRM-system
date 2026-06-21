'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

interface Template { id: number; name: string; checklistItems?: any; }
interface Point { code?: string; name: string; templates: string[]; }

function extractPoints(items: any): Array<{ code?: string; name: string }> {
  if (!Array.isArray(items)) return [];
  const out: Array<{ code?: string; name: string }> = [];
  const pushPoint = (p: any) => {
    if (typeof p === 'string') { out.push({ name: p }); return; }
    const name = p?.name || p?.title || p?.label || p?.text || p?.description || p?.code;
    if (name) out.push({ code: p?.code ?? p?.id, name: String(name) });
  };
  for (const el of items) {
    const nested = el?.items || el?.points || el?.children;
    if (Array.isArray(nested)) nested.forEach(pushPoint);
    else pushPoint(el);
  }
  return out;
}

export default function ControlPointsPage() {
  const t = useT();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/inspection-templates', { params: { limit: 200 } })
      .then(({ data }) => setTemplates(data?.data || data?.items || (Array.isArray(data) ? data : [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const points = useMemo<Point[]>(() => {
    const map = new Map<string, Point>();
    for (const tpl of templates) {
      for (const p of extractPoints(tpl.checklistItems)) {
        const key = (p.code || p.name).toLowerCase();
        const ex = map.get(key);
        if (ex) { if (!ex.templates.includes(tpl.name)) ex.templates.push(tpl.name); }
        else map.set(key, { code: p.code, name: p.name, templates: [tpl.name] });
      }
    }
    return Array.from(map.values());
  }, [templates]);

  const filtered = q.trim()
    ? points.filter((p) => `${p.code ?? ''} ${p.name}`.toLowerCase().includes(q.toLowerCase()))
    : points;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span><span className="text-gray-700 dark:text-gray-200">{t('Пункты контроля')}</span>
      </nav>

      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('Пункты контроля')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Библиотека контрольных пунктов из шаблонов инспекций')}</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Поиск пунктов…')}
          className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 w-64 max-w-full"
        />
      </div>

      {loading ? (
        <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-400">
          {points.length === 0 ? t('В шаблонах инспекций пока нет пунктов контроля') : t('Ничего не найдено')}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left px-5 py-3 font-medium w-32">{t('Код')}</th>
                <th className="text-left px-5 py-3 font-medium">{t('Контрольный пункт')}</th>
                <th className="text-left px-5 py-3 font-medium">{t('Шаблоны')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{p.code || '—'}</td>
                  <td className="px-5 py-3 text-gray-800 dark:text-gray-100">{p.name}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.templates.map((tn, ti) => (
                        <span key={ti} className="px-2 py-0.5 rounded text-xs bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300">{tn}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700">
            {t('Всего пунктов')}: {filtered.length}
          </div>
        </div>
      )}
    </div>
  );
}
