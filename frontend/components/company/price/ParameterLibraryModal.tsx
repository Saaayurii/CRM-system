'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import {
  INFLUENCE_LABELS,
  type InfluenceType,
  type LibraryParameter,
  type LibraryParameterValue,
  type SelectionType,
} from '@/lib/price/types';

const INPUT =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500';

interface Draft {
  id?: number;
  name: string;
  selectionType: SelectionType;
  values: LibraryParameterValue[];
}

export default function ParameterLibraryModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged?: () => void;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [list, setList] = useState<LibraryParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<LibraryParameter[]>('/price-parameters');
      setList(data);
    } catch {
      addToast('error', 'Не удалось загрузить параметры');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => setDraft({ name: '', selectionType: 'single', values: [] });
  const startEdit = (p: LibraryParameter) =>
    setDraft({
      id: p.id,
      name: p.name,
      selectionType: p.selectionType,
      values: p.values.map((v) => ({ ...v, influenceValue: Number(v.influenceValue) })),
    });

  const save = async () => {
    if (!draft || !draft.name.trim()) {
      addToast('error', 'Укажите название параметра');
      return;
    }
    const payload = {
      name: draft.name.trim(),
      selectionType: draft.selectionType,
      values: draft.values
        .filter((v) => v.name.trim())
        .map((v, i) => ({
          name: v.name.trim(),
          influenceType: v.influenceType,
          influenceValue: Number(v.influenceValue || 0),
          sortOrder: i,
        })),
    };
    try {
      setSaving(true);
      if (draft.id) await api.put(`/price-parameters/${draft.id}`, payload);
      else await api.post('/price-parameters', payload);
      addToast('success', 'Параметр сохранён');
      setDraft(null);
      await load();
      onChanged?.();
    } catch {
      addToast('error', 'Не удалось сохранить параметр');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить параметр из библиотеки?')) return;
    try {
      await api.delete(`/price-parameters/${id}`);
      addToast('success', 'Удалено');
      await load();
      onChanged?.();
    } catch {
      addToast('error', 'Не удалось удалить');
    }
  };

  const setValue = (idx: number, patch: Partial<LibraryParameterValue>) =>
    setDraft((d) => (d ? { ...d, values: d.values.map((v, i) => (i === idx ? { ...v, ...patch } : v)) } : d));
  const addValue = () =>
    setDraft((d) => (d ? { ...d, values: [...d.values, { name: '', influenceType: 'coefficient', influenceValue: 1 }] } : d));
  const removeValue = (idx: number) =>
    setDraft((d) => (d ? { ...d, values: d.values.filter((_, i) => i !== idx) } : d));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Библиотека параметров</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Параметры переиспользуются во всех услугах прайса.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
          {/* список */}
          <div className="p-4 space-y-2">
            <button onClick={startNew} className="w-full px-3 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg">
              + Создать параметр
            </button>
            {loading ? (
              <p className="text-center text-sm text-gray-400 py-6">Загрузка…</p>
            ) : list.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">Параметров пока нет</p>
            ) : (
              <ul className="space-y-1">
                {list.map((p) => (
                  <li key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${draft?.id === p.id ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}>
                    <button onClick={() => startEdit(p)} className="flex-1 text-left">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{p.name}</span>
                      <span className="block text-xs text-gray-400">{p.selectionType === 'single' ? 'Один вариант' : 'Несколько'} · {p.values.length} знач.</span>
                    </button>
                    <button onClick={() => remove(p.id)} className="p-1 text-gray-400 hover:text-red-500" title="Удалить">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* редактор параметра */}
          <div className="p-4">
            {!draft ? (
              <p className="text-center text-sm text-gray-400 py-10">Выберите параметр или создайте новый</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Название параметра *</label>
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={INPUT} placeholder="Например: Материал стены" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Тип выбора</label>
                  <select value={draft.selectionType} onChange={(e) => setDraft({ ...draft, selectionType: e.target.value as SelectionType })} className={INPUT}>
                    <option value="single">Один вариант</option>
                    <option value="multi">Несколько вариантов</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Значения</span>
                  <button onClick={addValue} className="text-xs font-medium text-violet-600 dark:text-violet-400">+ Добавить значение</button>
                </div>
                <div className="space-y-2">
                  {draft.values.map((v, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                      <input value={v.name} onChange={(e) => setValue(i, { name: e.target.value })} className={`${INPUT} col-span-12 sm:col-span-5`} placeholder="Значение" />
                      <select value={v.influenceType} onChange={(e) => setValue(i, { influenceType: e.target.value as InfluenceType })} className={`${INPUT} col-span-7 sm:col-span-4`}>
                        {(Object.keys(INFLUENCE_LABELS) as InfluenceType[]).map((t) => <option key={t} value={t}>{INFLUENCE_LABELS[t]}</option>)}
                      </select>
                      <input value={v.influenceType === 'none' ? '' : String(v.influenceValue)} disabled={v.influenceType === 'none'} onChange={(e) => setValue(i, { influenceValue: Number(e.target.value) })} className={`${INPUT} col-span-4 sm:col-span-2 disabled:opacity-40`} inputMode="decimal" />
                      <button onClick={() => removeValue(i)} className="col-span-1 p-1 text-gray-400 hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setDraft(null)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Отмена</button>
                  <button onClick={save} disabled={saving} className="px-4 py-1.5 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg">Сохранить</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
