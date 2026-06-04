'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { calcPrice, type Selections } from '@/lib/price/calcPrice';
import {
  INFLUENCE_LABELS,
  type InfluenceType,
  type LibraryParameter,
  type ParamGroup,
  type SelectionType,
} from '@/lib/price/types';
import AddParameterPicker from './AddParameterPicker';

interface PriceCategory {
  id: number;
  name: string;
}

const INPUT =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500';
const LABEL = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

type Mode = 'stepped' | 'inline';
type Step = 1 | 2 | 3;

export default function CreateServiceWizard({
  categories,
  onClose,
  onCreated,
}: {
  categories: PriceCategory[];
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const addToast = useToastStore((s) => s.addToast);

  const [mode, setMode] = useState<Mode>('stepped');
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');

  const [groups, setGroups] = useState<ParamGroup[]>([]);
  const [library, setLibrary] = useState<LibraryParameter[]>([]);
  const [picking, setPicking] = useState(false);
  const [selections, setSelections] = useState<Selections>(new Map());

  const loadLib = useCallback(async () => {
    const lib = await api.get<LibraryParameter[]>('/price-parameters').then((r) => r.data).catch(() => []);
    setLibrary(lib);
  }, []);
  useEffect(() => {
    loadLib();
  }, [loadLib]);

  const addFromLibrary = (p: LibraryParameter) => {
    setGroups((gs) => [
      ...gs,
      {
        sourceParameterId: p.id,
        name: p.name,
        selectionType: p.selectionType,
        isRequired: true,
        affectsPrice: true,
        options: p.values.map((v) => ({ name: v.name, influenceType: v.influenceType, influenceValue: Number(v.influenceValue) })),
      },
    ]);
    setPicking(false);
  };
  const addBlank = () => {
    setGroups((gs) => [...gs, { name: 'Новый параметр', selectionType: 'single', isRequired: true, affectsPrice: true, options: [] }]);
    setPicking(false);
  };

  const updateGroup = (gi: number, patch: Partial<ParamGroup>) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const removeGroup = (gi: number) => setGroups((gs) => gs.filter((_, i) => i !== gi));
  const addOption = (gi: number) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, options: [...g.options, { name: '', influenceType: 'coefficient' as InfluenceType, influenceValue: 1 }] } : g)));
  const updateOption = (gi: number, oi: number, patch: Partial<ParamGroup['options'][number]>) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : g)));
  const removeOption = (gi: number, oi: number) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g)));

  // итоговое название для inline-режима: «Сверление стены {Материал} {Диаметр}»
  const composedName = useMemo(() => {
    if (mode !== 'inline') return name;
    const tokens = groups.map((g) => `{${g.name}}`).join(' ');
    return [name.trim(), tokens].filter(Boolean).join(' ');
  }, [mode, name, groups]);

  const preview = useMemo(
    () => calcPrice(Number(basePrice || 0), 0, groups, selections, (_g, gi) => gi, (_g, gi, oi) => gi * 1000 + oi),
    [basePrice, groups, selections],
  );
  const toggleSel = (gi: number, oi: number, single: boolean) =>
    setSelections((prev) => {
      const next = new Map(prev);
      const key = gi;
      const okey = gi * 1000 + oi;
      const cur = next.get(key) ?? [];
      if (single) next.set(key, cur.includes(okey) ? [] : [okey]);
      else next.set(key, cur.includes(okey) ? cur.filter((k) => k !== okey) : [...cur, okey]);
      return next;
    });

  const save = async () => {
    const finalName = (mode === 'inline' ? composedName : name).trim();
    if (!finalName) {
      addToast('error', 'Укажите название услуги');
      return;
    }
    const payload = {
      name: finalName,
      categoryId: categoryId === '' ? null : Number(categoryId),
      unit: unit || null,
      cost: cost === '' ? null : Number(cost),
      basePrice: basePrice === '' ? null : Number(basePrice),
      description: description || null,
      status: 'draft',
      calcMethod: 'formula',
      rounding: 0,
      paramGroups: groups.map((g, gi) => ({
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
      })),
    };
    try {
      setSaving(true);
      const { data } = await api.post<{ id: number }>('/price-items', payload);
      addToast('success', 'Услуга создана');
      onCreated(data.id);
    } catch {
      addToast('error', 'Не удалось создать услугу');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Создание услуги с параметрами</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Шаг {step} из 3</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs">
              <button onClick={() => setMode('stepped')} className={`px-2.5 py-1.5 ${mode === 'stepped' ? 'bg-violet-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}>По шагам</button>
              <button onClick={() => setMode('inline')} className={`px-2.5 py-1.5 ${mode === 'inline' ? 'bg-violet-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}>В названии</button>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
          {/* main */}
          <div className="md:col-span-2 overflow-y-auto p-5 space-y-4 border-r border-gray-100 dark:border-gray-700">
            {step === 1 && (
              <>
                <h4 className="font-medium text-gray-800 dark:text-gray-100">Основная информация</h4>
                <div>
                  <label className={LABEL}>{mode === 'inline' ? 'Базовое название (без параметров) *' : 'Название услуги *'}</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="Сверление стены" />
                  {mode === 'inline' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Параметры подставляются в название автоматически: <span className="text-violet-600 dark:text-violet-400">{composedName || '…'}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Категория</label>
                    <select value={categoryId === '' ? '' : String(categoryId)} onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))} className={INPUT}>
                      <option value="">— без категории —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Единица измерения</label>
                    <input value={unit} onChange={(e) => setUnit(e.target.value)} className={INPUT} placeholder="отверстие (шт.)" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Базовая цена, ₽</label>
                    <input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={INPUT} inputMode="decimal" placeholder="1000" />
                  </div>
                  <div>
                    <label className={LABEL}>Себестоимость, ₽</label>
                    <input value={cost} onChange={(e) => setCost(e.target.value)} className={INPUT} inputMode="decimal" placeholder="600" />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Описание</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={INPUT} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800 dark:text-gray-100">Параметры услуги</h4>
                  <button onClick={() => setPicking(true)} className="px-3 py-1.5 text-xs font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg">+ Добавить параметр</button>
                </div>
                {groups.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">Добавьте параметры из библиотеки или создайте новые.</p>
                ) : (
                  <div className="space-y-3">
                    {groups.map((g, gi) => (
                      <div key={gi} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input value={g.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} className={`${INPUT} flex-1`} placeholder="Название параметра" />
                          <select value={g.selectionType} onChange={(e) => updateGroup(gi, { selectionType: e.target.value as SelectionType })} className={`${INPUT} w-40`}>
                            <option value="single">Один вариант</option>
                            <option value="multi">Несколько</option>
                          </select>
                          <button onClick={() => removeGroup(gi)} className="p-2 text-gray-400 hover:text-red-500">✕</button>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <input type="checkbox" checked={g.isRequired} onChange={(e) => updateGroup(gi, { isRequired: e.target.checked })} className="rounded text-violet-500" /> Обязательно
                          <input type="checkbox" checked={g.affectsPrice} onChange={(e) => updateGroup(gi, { affectsPrice: e.target.checked })} className="rounded text-violet-500 ml-3" /> Влияет на цену
                        </label>
                        <div className="space-y-1.5">
                          {g.options.map((o, oi) => (
                            <div key={oi} className="grid grid-cols-12 gap-1.5 items-center">
                              <input value={o.name} onChange={(e) => updateOption(gi, oi, { name: e.target.value })} className={`${INPUT} col-span-6`} placeholder="Значение" />
                              <select value={o.influenceType} onChange={(e) => updateOption(gi, oi, { influenceType: e.target.value as InfluenceType })} className={`${INPUT} col-span-3`}>
                                {(Object.keys(INFLUENCE_LABELS) as InfluenceType[]).map((t) => <option key={t} value={t}>{INFLUENCE_LABELS[t]}</option>)}
                              </select>
                              <input value={o.influenceType === 'none' ? '' : String(o.influenceValue)} disabled={o.influenceType === 'none'} onChange={(e) => updateOption(gi, oi, { influenceValue: Number(e.target.value) })} className={`${INPUT} col-span-2 disabled:opacity-40`} inputMode="decimal" />
                              <button onClick={() => removeOption(gi, oi)} className="col-span-1 p-1 text-gray-400 hover:text-red-500">✕</button>
                            </div>
                          ))}
                          <button onClick={() => addOption(gi)} className="text-xs text-violet-600 dark:text-violet-400">+ Добавить значение</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <h4 className="font-medium text-gray-800 dark:text-gray-100">Услуга готова</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Услуга <span className="font-medium">«{mode === 'inline' ? composedName : name}»</span> с {groups.length} параметрами будет создана как черновик. После создания откроется редактор для тонкой настройки.
                </p>
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg p-3 text-sm text-green-800 dark:text-green-300">
                  ✓ Готово к сохранению
                </div>
              </>
            )}
          </div>

          {/* preview */}
          <div className="overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/30">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Предпросмотр услуги</p>
            <p className="font-medium text-gray-800 dark:text-gray-100">{(mode === 'inline' ? composedName : name) || 'Новая услуга'}</p>
            <div className="mt-3 space-y-2">
              {groups.map((g, gi) => (
                <div key={gi}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{g.name || 'Параметр'}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {g.options.length === 0 ? (
                      <span className="text-xs text-gray-400">значения не заданы</span>
                    ) : (
                      g.options.map((o, oi) => {
                        const okey = gi * 1000 + oi;
                        const on = (selections.get(gi) ?? []).includes(okey);
                        return (
                          <button key={oi} onClick={() => toggleSel(gi, oi, g.selectionType === 'single')} className={`px-2 py-0.5 text-xs rounded border ${on ? 'bg-violet-500 text-white border-violet-500' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                            {o.name || '—'}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
            {Number(basePrice) > 0 && groups.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-500">Цена</span>
                <span className="text-base font-bold text-green-600 dark:text-green-400">{preview.price.toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={() => (step === 1 ? onClose() : setStep((s) => (s - 1) as Step))}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {step === 1 ? 'Отмена' : 'Назад'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  addToast('error', 'Укажите название');
                  return;
                }
                setStep((s) => (s + 1) as Step);
              }}
              className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
            >
              Далее
            </button>
          ) : (
            <button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Создать услугу
            </button>
          )}
        </div>

        {picking && (
          <AddParameterPicker library={library} onPickLibrary={addFromLibrary} onCreateBlank={addBlank} onClose={() => setPicking(false)} />
        )}
      </div>
    </div>
  );
}
