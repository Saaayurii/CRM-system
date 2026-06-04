'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import type { PriceUnit } from '@/lib/price/types';

const INPUT =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500';

export default function UnitsModal({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const addToast = useToastStore((s) => s.addToast);
  const [items, setItems] = useState<PriceUnit[]>([]);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<PriceUnit[]>('/price-units');
      setItems(data);
    } catch {
      addToast('error', 'Не удалось загрузить единицы');
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      await api.post('/price-units', { name: name.trim(), shortName: shortName.trim() || null });
      setName('');
      setShortName('');
      await load();
      onChanged?.();
      addToast('success', 'Добавлено');
    } catch {
      addToast('error', 'Не удалось добавить');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить единицу измерения?')) return;
    try {
      await api.delete(`/price-units/${id}`);
      await load();
      onChanged?.();
    } catch {
      addToast('error', 'Не удалось удалить');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Единицы измерения</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} className={INPUT} placeholder="Название (отверстие)" />
            <input value={shortName} onChange={(e) => setShortName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} className={`${INPUT} w-28`} placeholder="шт." />
            <button onClick={create} disabled={saving || !name.trim()} className="px-3 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg whitespace-nowrap">+</button>
          </div>
          {items.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">Пока пусто</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <span className="text-sm text-gray-800 dark:text-gray-100">{u.name}{u.shortName ? <span className="text-gray-400"> ({u.shortName})</span> : null}</span>
                  <button onClick={() => remove(u.id)} className="p-1 text-gray-400 hover:text-red-500">✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
