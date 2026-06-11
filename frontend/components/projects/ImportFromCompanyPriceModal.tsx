'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

interface ProjectCategory {
  id: number;
  name: string;
}

interface PriceCategory {
  id: number;
  name: string;
}

interface PriceItemPrice {
  projectCategoryId: number;
  price: number | string;
}

interface PriceItem {
  id: number;
  categoryId?: number | null;
  parentId?: number | null;
  name: string;
  description?: string | null;
  unit?: string | null;
  cost?: number | string | null;
  prices: PriceItemPrice[];
  modifiers?: PriceItem[];
}

interface PriceListResponse {
  projectCategories: ProjectCategory[];
  categories: PriceCategory[];
  items: PriceItem[];
}

interface ImportRow {
  id: number;
  name: string;
  unit: string | null;
  description: string | null;
  categoryName: string | null;
  price: number | null;
}

function fmtMoney(v: number | null) {
  if (v === null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function ImportFromCompanyPriceModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);

  const [data, setData] = useState<PriceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: resp } = await api.get<PriceListResponse>('/price-list');
        setData(resp);
        if (resp.projectCategories.length > 0) setCategoryId(resp.projectCategories[0].id);
      } catch {
        addToast('error', 'Не удалось загрузить прайс компании');
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const rows = useMemo<ImportRow[]>(() => {
    if (!data) return [];
    const catName = (id?: number | null) =>
      id == null ? null : data.categories.find((c) => c.id === id)?.name ?? null;
    const priceFor = (it: PriceItem): number | null => {
      if (categoryId != null) {
        const p = it.prices?.find((pp) => pp.projectCategoryId === categoryId);
        if (p != null && p.price !== '' && p.price != null) {
          const n = Number(p.price);
          if (Number.isFinite(n)) return n;
        }
      }
      return null;
    };
    const out: ImportRow[] = [];
    for (const it of data.items) {
      out.push({
        id: it.id,
        name: it.name,
        unit: it.unit ?? null,
        description: it.description ?? null,
        categoryName: catName(it.categoryId),
        price: priceFor(it),
      });
      for (const mod of it.modifiers ?? []) {
        out.push({
          id: mod.id,
          name: `${it.name} — ${mod.name}`,
          unit: mod.unit ?? it.unit ?? null,
          description: mod.description ?? null,
          categoryName: catName(mod.categoryId ?? it.categoryId),
          price: priceFor(mod),
        });
      }
    }
    return out;
  }, [data, categoryId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ImportRow[]>();
    for (const r of filtered) {
      const key = r.categoryName ?? 'Без категории';
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((r) => next.delete(r.id));
      else filtered.forEach((r) => next.add(r.id));
      return next;
    });

  const handleImport = async () => {
    const chosen = rows.filter((r) => selected.has(r.id));
    if (chosen.length === 0) return;
    setImporting(true);
    let ok = 0;
    try {
      for (const r of chosen) {
        const payload: Record<string, unknown> = {
          name: r.name,
          ...(r.unit ? { unit: r.unit } : {}),
          ...(r.categoryName ? { category: r.categoryName } : {}),
          ...(r.description ? { description: r.description } : {}),
          ...(r.price != null ? { estimatedCost: r.price } : {}),
        };
        await api.post('/work-templates', payload);
        ok++;
      }
      addToast('success', `Импортировано позиций: ${ok}`);
      onImported();
      onClose();
    } catch {
      if (ok > 0) {
        addToast('error', `Импортировано ${ok}, остальные с ошибкой`);
        onImported();
      } else {
        addToast('error', 'Ошибка импорта');
      }
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Импорт из прайса компании
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            В прайсе компании ещё нет позиций. Добавьте их в разделе «Компания → Прайс».
          </div>
        ) : (
          <>
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  Категория цен
                </label>
                {data.projectCategories.length > 0 ? (
                  <select
                    value={categoryId ?? ''}
                    onChange={(e) => setCategoryId(e.target.value === '' ? null : Number(e.target.value))}
                    className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {data.projectCategories.map((pc) => (
                      <option key={pc.id} value={pc.id}>{pc.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    В прайсе компании нет колонок цен — позиции импортируются без цены.
                  </span>
                )}
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('Поиск по названию...')}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-700 dark:text-gray-200"
                />
              </div>
              {filtered.length > 0 && (
                <button
                  onClick={toggleAllVisible}
                  className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                >
                  {allVisibleSelected ? 'Снять выделение' : 'Выбрать все'} ({filtered.length})
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">{t('Ничего не найдено')}</p>
              ) : (
                <div className="space-y-4">
                  {grouped.map(([cat, list]) => (
                    <div key={cat}>
                      <p className="text-xs uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1.5">
                        {cat}
                      </p>
                      <div className="space-y-1">
                        {list.map((r) => {
                          const checked = selected.has(r.id);
                          return (
                            <label
                              key={r.id}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 group"
                            >
                              <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} className="sr-only" />
                              <span
                                className={`flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                                  checked
                                    ? 'bg-violet-600 border-violet-600'
                                    : 'bg-transparent border-gray-400 dark:border-gray-600 group-hover:border-violet-400'
                                }`}
                              >
                                {checked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{r.name}</span>
                                {r.description && (
                                  <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">{r.description}</span>
                                )}
                              </span>
                              {r.unit && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{r.unit}</span>
                              )}
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap w-24 text-right">
                                {fmtMoney(r.price)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Выбрано: {selectedCount}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || selectedCount === 0}
                  className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                >
                  {importing && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Добавить {selectedCount > 0 ? `${selectedCount} ` : ''}в проект
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
