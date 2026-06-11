'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import type { NormCategory } from '@/lib/wiki/constants';
import { useT } from '@/lib/i18n';

interface Props {
  categories: NormCategory[];
  onClose: () => void;
  onChanged: () => void;
}

export default function NormCategoryManagerModal({ categories, onClose, onChanged }: Props) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [items, setItems] = useState<NormCategory[]>(categories);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [editing, setEditing] = useState<NormCategory | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setItems(categories), [categories]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const reload = async () => {
    const { data } = await api.get('/norm-categories');
    setItems(data?.data || data || []);
    onChanged();
  };

  const resetForm = () => {
    setEditing(null);
    setName('');
    setIcon('');
    setParentId('');
  };

  const submit = async () => {
    if (!name.trim()) {
      addToast('error', 'Введите название категории');
      return;
    }
    setBusy(true);
    const payload: any = { name: name.trim(), icon: icon.trim() || undefined, parentId: parentId ? Number(parentId) : undefined };
    try {
      if (editing) await api.put(`/norm-categories/${editing.id}`, payload);
      else await api.post('/norm-categories', payload);
      addToast('success', editing ? 'Категория обновлена' : 'Категория создана');
      resetForm();
      await reload();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Не удалось сохранить категорию');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c: NormCategory) => {
    setEditing(c);
    setName(c.name);
    setIcon(c.icon || '');
    setParentId(c.parentId ? String(c.parentId) : '');
  };

  const remove = async (c: NormCategory) => {
    if (!confirm(`Удалить категорию «${c.name}»? Документы останутся без категории.`)) return;
    try {
      await api.delete(`/norm-categories/${c.id}`);
      addToast('success', 'Категория удалена');
      if (editing?.id === c.id) resetForm();
      await reload();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Не удалось удалить');
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
  const nameById = new Map(items.map((c) => [c.id, c.name]));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onMouseDown={onClose}>
      <div className="w-full max-w-2xl my-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold">{t('Категории нормативной базы')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">{t('Иконка')}</label>
              <input className={inputCls} value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📐" />
            </div>
            <div className="col-span-5">
              <label className="block text-xs text-gray-500 mb-1">{t('Название')}</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Бетонные работы')} />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">{t('Родитель')}</label>
              <select className={inputCls} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">{t('— корень —')}</option>
                {items.filter((c) => c.id !== editing?.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex gap-1">
              <button onClick={submit} disabled={busy} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50">
                {editing ? 'OK' : '+'}
              </button>
              {editing && (
                <button onClick={resetForm} className="px-2 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-lg">
            {items.length === 0 && <p className="p-4 text-sm text-gray-400">{t('Категорий пока нет.')}</p>}
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-6 text-center">{c.icon || '📁'}</span>
                <span className="flex-1">
                  {c.name}
                  {c.parentId && (
                    <span className="ml-2 text-xs text-gray-400">↳ {nameById.get(c.parentId) || '—'}</span>
                  )}
                  {typeof c.documentCount === 'number' && (
                    <span className="ml-2 text-xs text-gray-400">({c.documentCount})</span>
                  )}
                </span>
                <button onClick={() => startEdit(c)} className="text-violet-600 hover:underline text-xs">{t('Изм.')}</button>
                <button onClick={() => remove(c)} className="text-red-500 hover:underline text-xs">{t('Удал.')}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{t('Закрыть')}</button>
        </div>
      </div>
    </div>
  );
}
