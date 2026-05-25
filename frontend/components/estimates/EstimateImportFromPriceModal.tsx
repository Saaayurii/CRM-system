'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface PriceItem {
  id: number;
  categoryId?: number | null;
  parentId?: number | null;
  name: string;
  unit?: string | null;
  prices: { projectCategoryId: number; price: number | string }[];
  modifiers?: PriceItem[];
}

interface PriceCategory {
  id: number;
  name: string;
}

interface ProjectCategory {
  id: number;
  name: string;
}

interface PriceList {
  projectCategories: ProjectCategory[];
  categories: PriceCategory[];
  items: PriceItem[];
}

interface Chosen {
  priceItemId: number;
  name: string;
  unit?: string | null;
  price: number;
}

export default function EstimateImportFromPriceModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (chosen: Chosen[]) => void | Promise<void>;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [data, setData] = useState<PriceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pcId, setPcId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Map<number, Chosen>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<PriceList>('/price-list');
        setData(data);
        if (data.projectCategories.length > 0) setPcId(data.projectCategories[0].id);
      } catch {
        addToast('error', 'Не удалось загрузить прайс');
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const flatItems = useMemo(() => {
    if (!data) return [] as PriceItem[];
    const list: PriceItem[] = [];
    for (const it of data.items) {
      list.push(it);
      for (const m of it.modifiers ?? []) list.push(m);
    }
    return list;
  }, [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return flatItems;
    const q = search.trim().toLowerCase();
    return flatItems.filter((it) => it.name.toLowerCase().includes(q));
  }, [flatItems, search]);

  const categoryById = useMemo(() => {
    const m = new Map<number, string>();
    data?.categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [data]);

  const priceOf = (it: PriceItem): number => {
    if (!pcId) {
      const p = it.prices[0];
      return p ? Number(p.price) : 0;
    }
    const p = it.prices.find((pp) => pp.projectCategoryId === pcId);
    return p ? Number(p.price) : 0;
  };

  const toggle = (it: PriceItem) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(it.id)) {
        next.delete(it.id);
      } else {
        next.set(it.id, {
          priceItemId: it.id,
          name: it.name,
          unit: it.unit,
          price: priceOf(it),
        });
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await onPick(Array.from(selected.values()));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Добавить позиции из Прайса</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700/60 flex gap-2 flex-wrap items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию…"
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            autoFocus
          />
          {data && data.projectCategories.length > 0 && (
            <select
              value={pcId ?? ''}
              onChange={(e) => setPcId(e.target.value === '' ? null : Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {data.projectCategories.map((pc) => (
                <option key={pc.id} value={pc.id}>{pc.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
              {flatItems.length === 0 ? 'Прайс пуст — заполните его на вкладке «Компания»' : 'Ничего не найдено'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {filtered.map((it) => {
                const checked = selected.has(it.id);
                const price = priceOf(it);
                const cat = it.categoryId ? categoryById.get(it.categoryId) : null;
                return (
                  <li
                    key={it.id}
                    className={`py-2 px-2 -mx-2 flex items-center gap-3 cursor-pointer rounded transition-colors ${
                      checked ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                    onClick={() => toggle(it)}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(it)}
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 dark:text-gray-100">
                        {it.parentId && <span className="text-violet-400 mr-1">└</span>}
                        {it.name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {cat && <>{cat} · </>}
                        {it.unit || ''}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {price.toLocaleString('ru-RU')} ₽
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Выбрано: {selected.size}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={selected.size === 0 || submitting}
              className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
            >
              {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Добавить{selected.size > 0 && ` (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
