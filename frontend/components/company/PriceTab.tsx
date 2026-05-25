'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface ProjectCategory {
  id: number;
  name: string;
  sortOrder?: number;
}

interface PriceCategory {
  id: number;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

interface PriceItemPrice {
  id?: number;
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
  sortOrder?: number;
  prices: PriceItemPrice[];
  modifiers?: PriceItem[];
}

interface PriceListResponse {
  projectCategories: ProjectCategory[];
  categories: PriceCategory[];
  items: PriceItem[];
}

const INPUT_CLS =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500';

const TINY_INPUT_CLS =
  'w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500';

function fmtMoney(v: unknown) {
  if (v === null || v === undefined || v === '') return '';
  const num = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(num)) return String(v);
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function PriceTab() {
  const addToast = useToastStore((st) => st.addToast);

  const [data, setData] = useState<PriceListResponse>({
    projectCategories: [],
    categories: [],
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PriceItem | 'new' | null>(null);
  const [managingProjectCats, setManagingProjectCats] = useState(false);
  const [managingCats, setManagingCats] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: resp } = await api.get<PriceListResponse>('/price-list');
      setData(resp);
    } catch {
      addToast('error', 'Не удалось загрузить прайс');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<number | null, PriceItem[]>();
    for (const it of data.items) {
      const key = it.categoryId ?? null;
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return map;
  }, [data.items]);

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить позицию прайса?')) return;
    try {
      await api.delete(`/price-items/${id}`);
      addToast('success', 'Позиция удалена');
      load();
    } catch {
      addToast('error', 'Не удалось удалить');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Прайс-лист компании. Категории проектов формируют колонки цен.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setManagingProjectCats(true)}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Колонки цен ({data.projectCategories.length})
          </button>
          <button
            onClick={() => setManagingCats(true)}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Категории ({data.categories.length})
          </button>
          <button
            onClick={() => setEditing('new')}
            className="px-4 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Добавить позицию
          </button>
        </div>
      </div>

      {data.projectCategories.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300">
          Сначала добавьте хотя бы одну категорию проектов — она станет колонкой цены в прайсе.
        </div>
      )}

      {data.items.length === 0 && data.projectCategories.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          В прайсе ещё нет позиций
        </div>
      )}

      {data.items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-300">Название</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Ед.</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Себест.</th>
                  {data.projectCategories.map((pc) => (
                    <th
                      key={pc.id}
                      className="text-right px-3 py-2 font-medium text-violet-700 dark:text-violet-300 whitespace-nowrap"
                    >
                      {pc.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 w-1" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[null, ...data.categories.map((c) => c.id as number | null)].map((catId) => {
                  const cat = catId === null ? null : data.categories.find((c) => c.id === catId);
                  const list = itemsByCategory.get(catId) ?? [];
                  if (list.length === 0) return null;
                  return (
                    <FragmentRows
                      key={String(catId)}
                      heading={cat?.name ?? 'Без категории'}
                      colSpan={4 + data.projectCategories.length}
                      items={list}
                      projectCategories={data.projectCategories}
                      onEdit={setEditing}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing !== null && (
        <PriceItemModal
          item={editing === 'new' ? null : editing}
          categories={data.categories}
          projectCategories={data.projectCategories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {managingProjectCats && (
        <ProjectCategoriesModal
          items={data.projectCategories}
          onClose={() => setManagingProjectCats(false)}
          onChanged={load}
        />
      )}

      {managingCats && (
        <CategoriesModal
          items={data.categories}
          onClose={() => setManagingCats(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function FragmentRows({
  heading,
  colSpan,
  items,
  projectCategories,
  onEdit,
  onDelete,
}: {
  heading: string;
  colSpan: number;
  items: PriceItem[];
  projectCategories: ProjectCategory[];
  onEdit: (it: PriceItem) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <>
      <tr className="bg-gray-50/50 dark:bg-gray-700/30">
        <td colSpan={colSpan} className="px-3 py-2 text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">
          {heading}
        </td>
      </tr>
      {items.map((it) => (
        <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <td className="px-3 py-2 text-gray-800 dark:text-gray-100">
            <div className="font-medium">{it.name}</div>
            {it.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{it.description}</div>
            )}
            {it.modifiers && it.modifiers.length > 0 && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                + модификаторов: {it.modifiers.length}
              </div>
            )}
          </td>
          <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{it.unit || ''}</td>
          <td className="px-3 py-2 text-gray-600 dark:text-gray-300 text-right whitespace-nowrap">{fmtMoney(it.cost)}</td>
          {projectCategories.map((pc) => {
            const p = it.prices.find((pp) => pp.projectCategoryId === pc.id);
            return (
              <td
                key={pc.id}
                className="px-3 py-2 text-gray-800 dark:text-gray-100 text-right whitespace-nowrap font-medium"
              >
                {p ? fmtMoney(p.price) : <span className="text-gray-300 dark:text-gray-600">—</span>}
              </td>
            );
          })}
          <td className="px-2 py-2 whitespace-nowrap">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(it)}
                className="p-1.5 text-gray-500 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors"
                title="Редактировать"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.4-9.6a2 2 0 0 1 2.8 2.8L11.8 15 8 16l1-3.8 9.6-9.8z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(it.id)}
                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                title="Удалить"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function PriceItemModal({
  item,
  categories,
  projectCategories,
  onClose,
  onSaved,
}: {
  item: PriceItem | null;
  categories: PriceCategory[];
  projectCategories: ProjectCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const addToast = useToastStore((st) => st.addToast);
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [cost, setCost] = useState<string>(item?.cost != null ? String(item.cost) : '');
  const [categoryId, setCategoryId] = useState<number | ''>(item?.categoryId ?? '');
  const [prices, setPrices] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {};
    for (const pc of projectCategories) {
      const existing = item?.prices.find((p) => p.projectCategoryId === pc.id);
      m[pc.id] = existing ? String(existing.price) : '';
    }
    return m;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('error', 'Укажите название');
      return;
    }
    const payload = {
      name: name.trim(),
      description: description || null,
      unit: unit || null,
      cost: cost === '' ? null : Number(cost),
      categoryId: categoryId === '' ? null : Number(categoryId),
      prices: projectCategories
        .map((pc) => ({ projectCategoryId: pc.id, raw: prices[pc.id] }))
        .filter((p) => p.raw !== '' && p.raw !== undefined && !Number.isNaN(Number(p.raw)))
        .map((p) => ({ projectCategoryId: p.projectCategoryId, price: Number(p.raw) })),
    };
    try {
      setSaving(true);
      if (item) {
        await api.put(`/price-items/${item.id}`, payload);
      } else {
        await api.post('/price-items', payload);
      }
      addToast('success', 'Сохранено');
      onSaved();
    } catch {
      addToast('error', 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

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
            {item ? 'Редактирование позиции' : 'Новая позиция прайса'}
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Название</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Описание</label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={INPUT_CLS}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Категория</label>
              <select
                value={categoryId === '' ? '' : String(categoryId)}
                onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                className={INPUT_CLS}
              >
                <option value="">— без категории —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ед. изм.</label>
              <input value={unit ?? ''} onChange={(e) => setUnit(e.target.value)} className={INPUT_CLS} placeholder="м², м³, шт..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Себестоимость</label>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className={INPUT_CLS}
                inputMode="decimal"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Цены по категориям проектов</label>
            {projectCategories.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">Сначала добавьте хотя бы одну категорию проектов в управлении колонками цен.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projectCategories.map((pc) => (
                  <div key={pc.id}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{pc.name}</label>
                    <input
                      value={prices[pc.id] ?? ''}
                      onChange={(e) => setPrices((p) => ({ ...p, [pc.id]: e.target.value }))}
                      className={INPUT_CLS}
                      inputMode="decimal"
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCategoriesModal({
  items,
  onClose,
  onChanged,
}: {
  items: ProjectCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <SimpleListModal<ProjectCategory>
      title="Колонки цен (категории проектов)"
      description="Каждая категория проекта формирует отдельную колонку цены в прайсе. Например: Квартира, Офис, Коммерческий объект."
      items={items}
      endpoint="/price-project-categories"
      placeholder="Например: Квартира"
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}

function CategoriesModal({
  items,
  onClose,
  onChanged,
}: {
  items: PriceCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <SimpleListModal<PriceCategory>
      title="Категории прайс-листа"
      description="Группировка позиций внутри прайса. Например: Демонтаж, Электрика, Бурение."
      items={items}
      endpoint="/price-categories"
      placeholder="Например: Демонтаж"
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}

function SimpleListModal<T extends { id: number; name: string }>({
  title,
  description,
  items,
  endpoint,
  placeholder,
  onClose,
  onChanged,
}: {
  title: string;
  description: string;
  items: T[];
  endpoint: string;
  placeholder: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const addToast = useToastStore((st) => st.addToast);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      await api.post(endpoint, { name: newName.trim() });
      setNewName('');
      onChanged();
      addToast('success', 'Добавлено');
    } catch {
      addToast('error', 'Не удалось добавить');
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: number, name: string) => {
    try {
      await api.put(`${endpoint}/${id}`, { name });
      onChanged();
    } catch {
      addToast('error', 'Не удалось сохранить');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить?')) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      onChanged();
      addToast('success', 'Удалено');
    } catch {
      addToast('error', 'Не удалось удалить');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>

          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              className={INPUT_CLS}
              placeholder={placeholder}
            />
            <button
              onClick={create}
              disabled={saving || !newName.trim()}
              className="px-3 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg whitespace-nowrap"
            >
              Добавить
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">Пока пусто</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((it) => (
                <SimpleListRow
                  key={it.id}
                  item={it}
                  onSave={(name) => update(it.id, name)}
                  onDelete={() => remove(it.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

function SimpleListRow<T extends { id: number; name: string }>({
  item,
  onSave,
  onDelete,
}: {
  item: T;
  onSave: (name: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const dirty = name !== item.name;
  return (
    <li className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => dirty && name.trim() && onSave(name.trim())}
        className={TINY_INPUT_CLS}
      />
      <button
        onClick={onDelete}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
        title="Удалить"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
        </svg>
      </button>
    </li>
  );
}
