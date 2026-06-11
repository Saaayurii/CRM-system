'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { calcPrice, type Selections } from '@/lib/price/calcPrice';
import {
  INFLUENCE_LABELS,
  ROUNDING_OPTIONS,
  type CalcMethod,
  type InfluenceType,
  type LibraryParameter,
  type ParamGroup,
  type PriceItem,
  type PriceStatus,
  type PriceUnit,
  type SelectionType,
} from '@/lib/price/types';
import AddParameterPicker from './AddParameterPicker';
import { useT } from '@/lib/i18n';

interface PriceCategory {
  id: number;
  name: string;
}

const INPUT =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500';
const LABEL = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

function fmtMoney(v: number) {
  return v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function emptyGroup(): ParamGroup {
  return { name: '', selectionType: 'single', isRequired: true, affectsPrice: true, options: [] };
}

export default function PriceItemEditor({ itemId }: { itemId: number | null }) {
  const t = useT();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // основная информация
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<PriceStatus>('draft');
  const [calcMethod, setCalcMethod] = useState<CalcMethod>('formula');
  const [rounding, setRounding] = useState(0);

  // параметры
  const [groups, setGroups] = useState<ParamGroup[]>([]);
  const [activeGroupIdx, setActiveGroupIdx] = useState<number | null>(null);

  // справочники
  const [categories, setCategories] = useState<PriceCategory[]>([]);
  const [units, setUnits] = useState<PriceUnit[]>([]);
  const [library, setLibrary] = useState<LibraryParameter[]>([]);
  const [picking, setPicking] = useState(false);

  // предпросмотр
  const [selections, setSelections] = useState<Selections>(new Map());

  const loadRefData = useCallback(async () => {
    const [cats, us, lib] = await Promise.all([
      api.get<PriceCategory[]>('/price-categories').then((r) => r.data).catch(() => []),
      api.get<PriceUnit[]>('/price-units').then((r) => r.data).catch(() => []),
      api.get<LibraryParameter[]>('/price-parameters').then((r) => r.data).catch(() => []),
    ]);
    setCategories(cats);
    setUnits(us);
    setLibrary(lib);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await loadRefData();
      if (itemId != null) {
        const { data } = await api.get<PriceItem>(`/price-items/${itemId}`);
        setName(data.name ?? '');
        setCategoryId(data.categoryId ?? '');
        setUnit(data.unit ?? '');
        setBasePrice(data.basePrice != null ? String(data.basePrice) : '');
        setCost(data.cost != null ? String(data.cost) : '');
        setDescription(data.description ?? '');
        setStatus((data.status as PriceStatus) ?? 'active');
        setCalcMethod((data.calcMethod as CalcMethod) ?? 'formula');
        setRounding(data.rounding ?? 0);
        const gs = (data.paramGroups ?? []).map((g) => ({
          ...g,
          options: (g.options ?? []).map((o) => ({ ...o, influenceValue: Number(o.influenceValue) })),
        }));
        setGroups(gs);
        setActiveGroupIdx(gs.length ? 0 : null);
      } else {
        setStatus('draft');
        setCalcMethod('formula');
      }
    } catch {
      addToast('error', 'Не удалось загрузить позицию');
    } finally {
      setLoading(false);
    }
  }, [itemId, loadRefData, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── мутации групп ── */
  const updateGroup = (idx: number, patch: Partial<ParamGroup>) =>
    setGroups((gs) => gs.map((g, i) => (i === idx ? { ...g, ...patch } : g)));

  const moveGroup = (idx: number, dir: -1 | 1) =>
    setGroups((gs) => {
      const ni = idx + dir;
      if (ni < 0 || ni >= gs.length) return gs;
      const next = [...gs];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      setActiveGroupIdx(ni);
      return next;
    });

  const removeGroup = (idx: number) =>
    setGroups((gs) => {
      const next = gs.filter((_, i) => i !== idx);
      setActiveGroupIdx(next.length ? Math.max(0, idx - 1) : null);
      return next;
    });

  const addGroupFromLibrary = (param: LibraryParameter) => {
    const g: ParamGroup = {
      sourceParameterId: param.id,
      name: param.name,
      selectionType: param.selectionType,
      isRequired: true,
      affectsPrice: true,
      options: param.values.map((v) => ({
        name: v.name,
        influenceType: v.influenceType,
        influenceValue: Number(v.influenceValue),
      })),
    };
    setGroups((gs) => [...gs, g]);
    setActiveGroupIdx(groups.length);
    setPicking(false);
  };

  const addBlankGroup = () => {
    setGroups((gs) => [...gs, emptyGroup()]);
    setActiveGroupIdx(groups.length);
    setPicking(false);
  };

  /* ── мутации опций активной группы ── */
  const active = activeGroupIdx != null ? groups[activeGroupIdx] : null;

  const updateOption = (oi: number, patch: Partial<ParamGroup['options'][number]>) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === activeGroupIdx
          ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) }
          : g,
      ),
    );

  const addOption = () =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === activeGroupIdx
          ? { ...g, options: [...g.options, { name: '', influenceType: 'coefficient' as InfluenceType, influenceValue: 1 }] }
          : g,
      ),
    );

  const removeOption = (oi: number) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === activeGroupIdx ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g,
      ),
    );

  /* ── живой предпросмотр ── */
  const preview = useMemo(
    () =>
      calcPrice(
        Number(basePrice || 0),
        rounding,
        groups,
        selections,
        (_g, gi) => gi,
        (_g, gi, oi) => gi * 1000 + oi,
      ),
    [basePrice, rounding, groups, selections],
  );

  const toggleSelection = (gi: number, oi: number, single: boolean) => {
    const key = gi;
    const okey = gi * 1000 + oi;
    setSelections((prev) => {
      const next = new Map(prev);
      const cur = next.get(key) ?? [];
      if (single) {
        next.set(key, cur.includes(okey) ? [] : [okey]);
      } else {
        next.set(key, cur.includes(okey) ? cur.filter((k) => k !== okey) : [...cur, okey]);
      }
      return next;
    });
  };

  /* ── сохранение ── */
  const handleSave = async () => {
    if (!name.trim()) {
      addToast('error', 'Укажите название услуги');
      return;
    }
    const payload: Record<string, unknown> = {
      name: name.trim(),
      categoryId: categoryId === '' ? null : Number(categoryId),
      unit: unit || null,
      description: description || null,
      cost: cost === '' ? null : Number(cost),
      basePrice: basePrice === '' ? null : Number(basePrice),
      status,
      calcMethod,
      rounding,
      paramGroups:
        calcMethod === 'formula'
          ? groups.map((g, gi) => ({
              sourceParameterId: g.sourceParameterId ?? null,
              name: g.name.trim(),
              selectionType: g.selectionType,
              isRequired: g.isRequired,
              affectsPrice: g.affectsPrice,
              sortOrder: gi,
              options: g.options.map((o, oi) => ({
                name: o.name.trim(),
                influenceType: o.influenceType,
                influenceValue: Number(o.influenceValue || 0),
                sortOrder: oi,
              })),
            }))
          : [],
    };
    try {
      setSaving(true);
      if (itemId != null) await api.put(`/price-items/${itemId}`, payload);
      else await api.post('/price-items', payload);
      addToast('success', 'Услуга сохранена');
      router.push('/dashboard/company?tab=price');
    } catch {
      addToast('error', 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => router.push('/dashboard/company?tab=price')}
            className="text-xs text-gray-500 hover:text-violet-500 mb-1"
          >
            ← Прайс
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {name || 'Новая услуга'}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {status === 'active' ? 'Активна' : 'Черновик'}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PriceStatus)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="draft">{t('Черновик')}</option>
            <option value="active">{t('Активна')}</option>
          </select>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Левая колонка */}
        <div className="lg:col-span-4 space-y-5">
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('Основная информация')}</h2>
            <div>
              <label className={LABEL}>{t('Название позиции *')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder={t('Например: Сверление стены')} />
            </div>
            <div>
              <label className={LABEL}>{t('Категория')}</label>
              <select value={categoryId === '' ? '' : String(categoryId)} onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))} className={INPUT}>
                <option value="">{t('— без категории —')}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>{t('Единица измерения')}</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={INPUT}
                list="price-units-list"
                placeholder={t('отверстие (шт.)')}
              />
              <datalist id="price-units-list">
                {units.map((u) => <option key={u.id} value={u.shortName ? `${u.name} (${u.shortName})` : u.name} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>{t('Базовая цена, ₽')}</label>
                <input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={INPUT} inputMode="decimal" placeholder="1000" />
              </div>
              <div>
                <label className={LABEL}>{t('Себестоимость, ₽')}</label>
                <input value={cost} onChange={(e) => setCost(e.target.value)} className={INPUT} inputMode="decimal" placeholder="600" />
              </div>
            </div>
            <div>
              <label className={LABEL}>{t('Описание')}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={INPUT} />
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('Настройки расчёта цены')}</h2>
            <div>
              <label className={LABEL}>{t('Способ расчёта')}</label>
              <select value={calcMethod} onChange={(e) => setCalcMethod(e.target.value as CalcMethod)} className={INPUT}>
                <option value="formula">{t('По формуле (база + коэффициенты + доплаты)')}</option>
                <option value="columns">{t('По колонкам категорий проектов')}</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>{t('Округление')}</label>
              <select value={rounding} onChange={(e) => setRounding(Number(e.target.value))} className={INPUT}>
                {ROUNDING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-lg p-3 text-xs text-violet-800 dark:text-violet-300">
              <p className="font-medium mb-1">{t('Как считается цена')}</p>
              Итоговая цена = (Базовая цена × Коэффициенты) + Доплаты. Коэффициенты и доплаты задаются в вариантах параметров.
            </div>
          </section>

          {/* Предпросмотр цены */}
          {calcMethod === 'formula' && groups.length > 0 && (
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-3">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('Предпросмотр цены')}</h2>
              {groups.map((g, gi) => (
                <div key={gi}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{g.name || 'Параметр'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.options.map((o, oi) => {
                      const okey = gi * 1000 + oi;
                      const on = (selections.get(gi) ?? []).includes(okey);
                      return (
                        <button
                          key={oi}
                          onClick={() => toggleSelection(gi, oi, g.selectionType === 'single')}
                          className={`px-2 py-1 text-xs rounded-md border ${on ? 'bg-violet-500 text-white border-violet-500' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
                        >
                          {o.name || '—'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('Итоговая цена')}</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{fmtMoney(preview.price)} ₽</span>
              </div>
              {preview.missingRequired.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Не выбрано: {preview.missingRequired.join(', ')}
                </p>
              )}
            </section>
          )}
        </div>

        {/* Правая колонка — параметры */}
        <div className="lg:col-span-8 space-y-5">
          {calcMethod === 'columns' ? (
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6 text-sm text-gray-500 dark:text-gray-400">
              Для этой позиции выбран расчёт «по колонкам категорий проектов». Цены задаются на вкладке
              «Прайс» в таблице. Параметры доступны только для способа «По формуле».
            </section>
          ) : (
            <>
              <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('Параметры (группы модификаторов)')}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Параметры определяют варианты услуги и влияют на итоговую цену.')}</p>
                  </div>
                  <button
                    onClick={() => setPicking(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg whitespace-nowrap"
                  >
                    + Добавить группу параметров
                  </button>
                </div>

                {groups.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
                    Параметров пока нет. Добавьте первый параметр из библиотеки или создайте новый.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {groups.map((g, gi) => (
                      <li
                        key={gi}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${
                          gi === activeGroupIdx
                            ? 'border-violet-400 bg-violet-50/60 dark:bg-violet-500/10'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                        }`}
                        onClick={() => setActiveGroupIdx(gi)}
                      >
                        <span className="text-gray-400 text-xs font-mono w-5 text-center">{gi + 1}</span>
                        <span className="flex-1 font-medium text-sm text-gray-800 dark:text-gray-100">{g.name || '(без названия)'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{g.selectionType === 'single' ? 'Один вариант' : 'Несколько'}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${g.isRequired ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                          {g.isRequired ? 'Обязательно' : 'Необязательно'}
                        </span>
                        <span className="text-xs text-gray-400">{g.options.length} вар.</span>
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => moveGroup(gi, -1)} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" disabled={gi === 0}>↑</button>
                          <button onClick={() => moveGroup(gi, 1)} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" disabled={gi === groups.length - 1}>↓</button>
                          <button onClick={() => removeGroup(gi)} className="p-1 text-gray-400 hover:text-red-500" title={t('Удалить')}>✕</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {active && activeGroupIdx != null && (
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('Редактирование группы параметров')}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL}>{t('Название группы *')}</label>
                      <input value={active.name} onChange={(e) => updateGroup(activeGroupIdx, { name: e.target.value })} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>{t('Тип выбора')}</label>
                      <select value={active.selectionType} onChange={(e) => updateGroup(activeGroupIdx, { selectionType: e.target.value as SelectionType })} className={INPUT}>
                        <option value="single">{t('Один вариант')}</option>
                        <option value="multi">{t('Несколько вариантов')}</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>{t('Обязательность')}</label>
                      <select value={active.isRequired ? '1' : '0'} onChange={(e) => updateGroup(activeGroupIdx, { isRequired: e.target.value === '1' })} className={INPUT}>
                        <option value="1">{t('Обязательно')}</option>
                        <option value="0">{t('Необязательно')}</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={active.affectsPrice} onChange={(e) => updateGroup(activeGroupIdx, { affectsPrice: e.target.checked })} className="rounded text-violet-500 focus:ring-violet-500" />
                    Влияет на цену
                  </label>

                  <div className="flex items-center justify-between pt-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Варианты параметра')}</h3>
                    <button onClick={addOption} className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700">{t('+ Добавить вариант')}</button>
                  </div>
                  {active.options.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">{t('Добавьте хотя бы один вариант.')}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-400 px-1">
                        <span className="col-span-6">{t('Название варианта')}</span>
                        <span className="col-span-3">{t('Тип влияния')}</span>
                        <span className="col-span-2">{t('Значение')}</span>
                        <span className="col-span-1" />
                      </div>
                      {active.options.map((o, oi) => (
                        <div key={oi} className="grid grid-cols-12 gap-2 items-center">
                          <input value={o.name} onChange={(e) => updateOption(oi, { name: e.target.value })} className={`${INPUT} col-span-12 sm:col-span-6`} placeholder={t('Например: Бетон')} />
                          <select value={o.influenceType} onChange={(e) => updateOption(oi, { influenceType: e.target.value as InfluenceType })} className={`${INPUT} col-span-7 sm:col-span-3`}>
                            {(Object.keys(INFLUENCE_LABELS) as InfluenceType[]).map((t) => <option key={t} value={t}>{INFLUENCE_LABELS[t]}</option>)}
                          </select>
                          <input
                            value={o.influenceType === 'none' ? '' : String(o.influenceValue)}
                            disabled={o.influenceType === 'none'}
                            onChange={(e) => updateOption(oi, { influenceValue: Number(e.target.value) })}
                            className={`${INPUT} col-span-4 sm:col-span-2 disabled:opacity-40`}
                            inputMode="decimal"
                          />
                          <button onClick={() => removeOption(oi)} className="col-span-1 p-1.5 text-gray-400 hover:text-red-500" title={t('Удалить вариант')}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-violet-600 dark:text-violet-400">
                    Коэффициент 1.00 = без изменения цены. Например, 1.50 = цена увеличивается на 50%. Доплата прибавляется к итогу в рублях.
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {picking && (
        <AddParameterPicker
          library={library}
          onPickLibrary={addGroupFromLibrary}
          onCreateBlank={addBlankGroup}
          onClose={() => setPicking(false)}
          onLibraryChanged={loadRefData}
        />
      )}
    </div>
  );
}
