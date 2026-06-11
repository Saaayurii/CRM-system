'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

interface Movement {
  id: number;
  movementType?: string | null;
  quantity: string | number;
  unit?: string | null;
  movementDate: string;
  notes?: string | null;
  batchNumber?: string | null;
  material?: { id: number; name: string; unit?: string | null } | null;
  warehouse?: { id: number; name: string } | null;
  fromWarehouse?: { id: number; name: string } | null;
  toWarehouse?: { id: number; name: string } | null;
  performedBy?: { id: number; name: string } | null;
}

interface Warehouse { id: number; name: string }
interface Material { id: number; name: string; unit?: string | null }

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  in:       { label: 'Приход',      cls: 'bg-green-100 text-green-700' },
  out:      { label: 'Расход',      cls: 'bg-red-100 text-red-700' },
  transfer: { label: 'Перемещение', cls: 'bg-blue-100 text-blue-700' },
  adjust:   { label: 'Корректировка', cls: 'bg-yellow-100 text-yellow-700' },
  loss:     { label: 'Списание',    cls: 'bg-gray-200 text-gray-700' },
};

function fmt(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return '—'; }
}

export default function MovementsTab() {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [items, setItems] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    movementType: 'in',
    materialId: '',
    quantity: '',
    unit: '',
    warehouseId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [moveRes, whRes, matRes] = await Promise.all([
        api.get('/warehouse-movements'),
        api.get('/warehouses').catch(() => ({ data: [] })),
        api.get('/materials').catch(() => ({ data: [] })),
      ]);
      const list: Movement[] = Array.isArray(moveRes.data) ? moveRes.data
        : moveRes.data?.movements || moveRes.data?.data || [];
      setItems(list);
      const wh: Warehouse[] = Array.isArray(whRes.data) ? whRes.data
        : whRes.data?.warehouses || whRes.data?.data || [];
      setWarehouses(wh);
      const mt: Material[] = Array.isArray(matRes.data) ? matRes.data
        : matRes.data?.materials || matRes.data?.data || [];
      setMaterials(mt);
    } catch { setItems([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const selectedMaterial = useMemo(
    () => materials.find((m) => String(m.id) === form.materialId),
    [materials, form.materialId],
  );

  const handleCreate = async () => {
    if (!form.materialId) return addToast('error', 'Выберите материал');
    if (!form.quantity || Number(form.quantity) <= 0) return addToast('error', 'Укажите количество');
    if (form.movementType === 'transfer' && (!form.fromWarehouseId || !form.toWarehouseId)) {
      return addToast('error', 'Укажите оба склада для перемещения');
    }
    if (form.movementType !== 'transfer' && !form.warehouseId) {
      return addToast('error', 'Укажите склад');
    }
    setSaving(true);
    try {
      const body: any = {
        movementType: form.movementType,
        materialId: Number(form.materialId),
        quantity: Number(form.quantity),
        unit: form.unit || selectedMaterial?.unit || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (form.movementType === 'transfer') {
        body.fromWarehouseId = Number(form.fromWarehouseId);
        body.toWarehouseId = Number(form.toWarehouseId);
        body.warehouseId = Number(form.toWarehouseId);
      } else {
        body.warehouseId = Number(form.warehouseId);
      }
      await api.post('/warehouse-movements', body);
      addToast('success', 'Движение зафиксировано');
      setShowCreate(false);
      setForm({ movementType: 'in', materialId: '', quantity: '', unit: '', warehouseId: '', fromWarehouseId: '', toWarehouseId: '', notes: '' });
      await load();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Не удалось сохранить движение');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('История перемещений')}</h2>
          <p className="text-xs text-gray-500">{t('Приходы, расходы и перемещения материалов между складами')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-sm bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
        >
          + Движение
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">{t('Загрузка...')}</div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">{t('Движений пока нет')}</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-gray-900/20">
              <tr>
                <th className="px-4 py-2.5 text-left">{t('Дата')}</th>
                <th className="px-4 py-2.5 text-left">{t('Тип')}</th>
                <th className="px-4 py-2.5 text-left">{t('Материал')}</th>
                <th className="px-4 py-2.5 text-right">{t('Кол-во')}</th>
                <th className="px-4 py-2.5 text-left">{t('Откуда → Куда')}</th>
                <th className="px-4 py-2.5 text-left">{t('Кто')}</th>
                <th className="px-4 py-2.5 text-left">{t('Комментарий')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {items.map((m) => {
                const t = TYPE_LABEL[String(m.movementType || '').toLowerCase()];
                const where = m.movementType === 'transfer'
                  ? `${m.fromWarehouse?.name || '—'} → ${m.toWarehouse?.name || '—'}`
                  : (m.warehouse?.name || '—');
                return (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                    <td className="px-4 py-2.5 text-gray-500">{fmt(m.movementDate)}</td>
                    <td className="px-4 py-2.5">
                      {t ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${t.cls}`}>{t.label}</span>
                         : <span className="text-gray-400">{m.movementType || '—'}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-100">{m.material?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                      {Number(m.quantity)} {m.unit || m.material?.unit || ''}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{where}</td>
                    <td className="px-4 py-2.5 text-gray-500">{m.performedBy?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{m.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => !saving && setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('Новое движение')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('Тип')}</label>
                <select
                  value={form.movementType}
                  onChange={(e) => setForm({ ...form, movementType: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <option value="in">{t('Приход')}</option>
                  <option value="out">{t('Расход')}</option>
                  <option value="transfer">{t('Перемещение')}</option>
                  <option value="adjust">{t('Корректировка')}</option>
                  <option value="loss">{t('Списание')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('Материал *')}</label>
                <select
                  value={form.materialId}
                  onChange={(e) => setForm({ ...form, materialId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <option value="">{t('— выберите —')}</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} {m.unit ? `(${m.unit})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('Количество *')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('Ед.')}</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder={selectedMaterial?.unit || ''}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                  />
                </div>
              </div>
              {form.movementType === 'transfer' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('Откуда *')}</label>
                    <select
                      value={form.fromWarehouseId}
                      onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <option value="">—</option>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('Куда *')}</label>
                    <select
                      value={form.toWarehouseId}
                      onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <option value="">—</option>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('Склад *')}</label>
                  <select
                    value={form.warehouseId}
                    onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    <option value="">{t('— выберите —')}</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('Комментарий')}</label>
                <textarea
                  value={form.notes}
                  rows={2}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button disabled={saving} onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Отмена
              </button>
              <button disabled={saving} onClick={handleCreate} className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
