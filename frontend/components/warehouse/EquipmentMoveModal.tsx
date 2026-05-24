'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface Equipment {
  id: number;
  name: string;
  warehouseId?: number | null;
  warehouse?: { id: number; name: string } | null;
}

interface Warehouse { id: number; name: string }

export default function EquipmentMoveModal({
  equipment,
  onClose,
  onMoved,
}: {
  equipment: Equipment;
  onClose: () => void;
  onMoved?: () => void;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [targetId, setTargetId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/eq-warehouses');
        const list: Warehouse[] = Array.isArray(data) ? data : data?.warehouses || data?.data || [];
        setWarehouses(list);
      } catch { setWarehouses([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const currentId = equipment.warehouseId ?? equipment.warehouse?.id ?? null;
  const currentName = equipment.warehouse?.name
    || warehouses.find((w) => w.id === currentId)?.name
    || '—';

  const handleMove = async () => {
    if (!targetId) return addToast('error', 'Выберите целевой склад');
    if (Number(targetId) === currentId) return addToast('error', 'Это тот же склад');
    setSaving(true);
    try {
      const newLocation = warehouses.find((w) => w.id === Number(targetId))?.name;
      await api.put(`/equipment/${equipment.id}`, {
        warehouseId: Number(targetId),
        currentLocation: newLocation,
        notes: notes.trim() || undefined,
      });
      addToast('success', 'Оборудование перемещено');
      onMoved?.();
      onClose();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Не удалось переместить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => !saving && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Переместить: {equipment.name}</h3>
        <p className="text-xs text-gray-500 mb-4">Текущий склад: <span className="font-medium text-gray-700 dark:text-gray-200">{currentName}</span></p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Целевой склад *</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              <option value="">{loading ? 'Загрузка...' : '— выберите —'}</option>
              {warehouses.filter((w) => w.id !== currentId).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Комментарий</label>
            <textarea
              value={notes}
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
              placeholder="Причина перемещения, акт-приёмка и т.п."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button disabled={saving} onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Отмена
          </button>
          <button disabled={saving || loading || !targetId} onClick={handleMove} className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg">
            {saving ? 'Сохранение...' : 'Переместить'}
          </button>
        </div>
      </div>
    </div>
  );
}
