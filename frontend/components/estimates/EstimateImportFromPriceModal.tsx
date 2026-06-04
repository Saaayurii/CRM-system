'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { calcPrice, type Selections } from '@/lib/price/calcPrice';
import type { ParamGroup } from '@/lib/price/types';

interface PriceItem {
  id: number;
  categoryId?: number | null;
  parentId?: number | null;
  name: string;
  unit?: string | null;
  calcMethod?: string;
  basePrice?: number | string | null;
  rounding?: number;
  prices: { projectCategoryId: number; price: number | string }[];
  modifiers?: PriceItem[];
  paramGroups?: ParamGroup[];
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

interface ChosenOption {
  groupId?: number;
  groupName: string;
  optionId?: number;
  optionName: string;
  influenceType: string;
  influenceValue: number;
}

interface Chosen {
  priceItemId: number;
  name: string;
  unit?: string | null;
  price: number;
  selectedOptions?: ChosenOption[];
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

  // параметрический конфиг: itemId → (groupId → optionId[])
  const [configItem, setConfigItem] = useState<number | null>(null);
  const [paramSel, setParamSel] = useState<Map<number, Selections>>(new Map());

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

  const isFormula = (it: PriceItem) => it.calcMethod === 'formula' && (it.paramGroups?.length ?? 0) > 0;

  const columnPriceOf = (it: PriceItem): number => {
    if (!pcId) {
      const p = it.prices[0];
      return p ? Number(p.price) : 0;
    }
    const p = it.prices.find((pp) => pp.projectCategoryId === pcId);
    return p ? Number(p.price) : 0;
  };

  const toggleColumns = (it: PriceItem) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(it.id)) next.delete(it.id);
      else next.set(it.id, { priceItemId: it.id, name: it.name, unit: it.unit, price: columnPriceOf(it) });
      return next;
    });
  };

  const toggleParam = (it: PriceItem, group: ParamGroup, optionId: number) => {
    setParamSel((prev) => {
      const next = new Map(prev);
      const sel = new Map(next.get(it.id) ?? []);
      const gid = group.id ?? 0;
      const cur = sel.get(gid) ?? [];
      if (group.selectionType === 'single') sel.set(gid, cur.includes(optionId) ? [] : [optionId]);
      else sel.set(gid, cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId]);
      next.set(it.id, sel);
      return next;
    });
  };

  const computeParam = (it: PriceItem) => {
    const sel = paramSel.get(it.id) ?? new Map<number, number[]>();
    return calcPrice(
      Number(it.basePrice || 0),
      it.rounding ?? 0,
      it.paramGroups ?? [],
      sel,
      (g) => g.id ?? 0,
      (g, _gi, oi) => g.options[oi].id ?? -1,
    );
  };

  const addParamItem = (it: PriceItem) => {
    const res = computeParam(it);
    if (res.missingRequired.length > 0) {
      addToast('error', `Не выбрано: ${res.missingRequired.join(', ')}`);
      return;
    }
    const suffix = res.breakdown.map((b) => b.optionName).join(', ');
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(it.id, {
        priceItemId: it.id,
        name: suffix ? `${it.name} — ${suffix}` : it.name,
        unit: it.unit,
        price: res.price,
        selectedOptions: res.breakdown.map((b) => ({
          groupId: b.groupId,
          groupName: b.groupName,
          optionId: b.optionId,
          optionName: b.optionName,
          influenceType: b.influenceType,
          influenceValue: b.influenceValue,
        })),
      });
      return next;
    });
    setConfigItem(null);
    addToast('success', 'Позиция добавлена в выбор');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Добавить позиции из Прайса</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
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
              title="Колонка цены для простых позиций"
            >
              {data.projectCategories.map((pc) => <option key={pc.id} value={pc.id}>{pc.name}</option>)}
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
                const formula = isFormula(it);
                const checked = selected.has(it.id);
                const cat = it.categoryId ? categoryById.get(it.categoryId) : null;
                const open = configItem === it.id;
                const liveRes = formula && (open || checked) ? computeParam(it) : null;
                const displayPrice = checked
                  ? selected.get(it.id)!.price
                  : formula
                    ? liveRes?.price ?? Number(it.basePrice || 0)
                    : columnPriceOf(it);
                const priceFrom = formula && !checked;
                return (
                  <li key={it.id} className={`py-2 ${checked ? 'bg-violet-50 dark:bg-violet-500/10 -mx-2 px-2 rounded' : ''}`}>
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => (formula ? setConfigItem(open ? null : it.id) : toggleColumns(it))}
                    >
                      {!formula && (
                        <input type="checkbox" checked={checked} onChange={() => toggleColumns(it)} className="shrink-0" onClick={(e) => e.stopPropagation()} />
                      )}
                      {formula && (
                        <span className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${checked ? 'bg-violet-500 border-violet-500 text-white' : 'border-gray-400 text-transparent'}`}>✓</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          {it.parentId && <span className="text-violet-400 mr-1">└</span>}
                          {it.name}
                          {formula && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">параметры</span>}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {cat && <>{cat} · </>}{it.unit || ''}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {priceFrom && <span className="text-xs text-gray-400 font-normal">от </span>}
                        {displayPrice.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>

                    {formula && open && (
                      <div className="mt-2 ml-7 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 space-y-2">
                        {(it.paramGroups ?? []).map((g) => {
                          const sel = paramSel.get(it.id)?.get(g.id ?? 0) ?? [];
                          return (
                            <div key={g.id}>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {g.name}{g.isRequired && <span className="text-red-400"> *</span>}
                                <span className="text-gray-400"> · {g.selectionType === 'single' ? 'один' : 'несколько'}</span>
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {g.options.map((o) => {
                                  const on = sel.includes(o.id ?? -1);
                                  return (
                                    <button
                                      key={o.id}
                                      onClick={(e) => { e.stopPropagation(); toggleParam(it, g, o.id ?? -1); }}
                                      className={`px-2 py-1 text-xs rounded-md border ${on ? 'bg-violet-500 text-white border-violet-500' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
                                    >
                                      {o.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">{(liveRes?.price ?? 0).toLocaleString('ru-RU')} ₽</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); addParamItem(it); }}
                            className="px-3 py-1.5 text-xs font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
                          >
                            {checked ? 'Обновить выбор' : 'Выбрать'}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Выбрано: {selected.size}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Отмена</button>
            <button onClick={handleSubmit} disabled={selected.size === 0 || submitting} className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2">
              {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Добавить{selected.size > 0 && ` (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
