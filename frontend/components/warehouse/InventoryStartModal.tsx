'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface Equipment {
  id: number;
  name: string;
  serialNumber?: string | null;
  equipmentType?: string | null;
  status?: number;
}

interface Warehouse {
  id: number;
  name: string;
}

interface Props {
  warehouse: Warehouse;
  onClose: () => void;
  onCreated?: () => void;
}

export default function InventoryStartModal({ warehouse, onClose, onCreated }: Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(`Инвентаризация ${warehouse.name} — ${new Date().toLocaleDateString('ru-RU')}`);
  const [marks, setMarks] = useState<Record<number, { isFound: boolean; notes: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/equipment');
        const all: Equipment[] = Array.isArray(data) ? data : data?.equipment || data?.data || [];
        const filtered = all.filter((e: any) => Number(e.warehouseId) === warehouse.id);
        setEquipment(filtered);
        const init: Record<number, { isFound: boolean; notes: string }> = {};
        filtered.forEach((e) => { init[e.id] = { isFound: true, notes: '' }; });
        setMarks(init);
      } catch {
        addToast('error', 'Не удалось загрузить оборудование');
      } finally {
        setLoading(false);
      }
    })();
  }, [warehouse.id, addToast]);

  const toggle = (id: number, isFound: boolean) =>
    setMarks((m) => ({ ...m, [id]: { ...(m[id] || { isFound: true, notes: '' }), isFound } }));

  const setNote = (id: number, notes: string) =>
    setMarks((m) => ({ ...m, [id]: { ...(m[id] || { isFound: true, notes: '' }), notes } }));

  const found = equipment.filter((e) => marks[e.id]?.isFound !== false).length;
  const missing = equipment.length - found;

  const handleSave = async (complete: boolean) => {
    if (equipment.length === 0) {
      addToast('error', 'На складе нет оборудования для инвентаризации');
      return;
    }
    setSaving(true);
    try {
      const { data: session } = await api.post('/inventory-sessions', {
        name: name.trim(),
        status: complete ? 2 : 1,
        scheduledDate: new Date().toISOString().slice(0, 10),
        completedDate: complete ? new Date().toISOString().slice(0, 10) : undefined,
      });
      const sessionId = session?.id || session?.data?.id;
      if (!sessionId) throw new Error('Не удалось создать сессию');

      // Add items in parallel batches
      await Promise.all(
        equipment.map((e) =>
          api.post(`/inventory-sessions/${sessionId}/items`, {
            equipmentId: e.id,
            warehouseId: warehouse.id,
            expectedStatus: e.status,
            actualStatus: e.status,
            isFound: marks[e.id]?.isFound !== false,
            notes: marks[e.id]?.notes || undefined,
          }),
        ),
      );
      addToast('success', complete ? 'Инвентаризация завершена' : 'Инвентаризация сохранена');
      onCreated?.();
      onClose();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => !saving && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-full overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Инвентаризация: {warehouse.name}</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
            placeholder="Название сессии"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Загрузка...</div>
          ) : equipment.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              На складе нет оборудования. Сначала добавьте оборудование на этот склад.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-4 text-xs mb-2">
                <span className="text-green-600">Найдено: {found}</span>
                <span className="text-red-600">Не найдено: {missing}</span>
                <span className="text-gray-500">Всего: {equipment.length}</span>
              </div>
              {equipment.map((e) => {
                const mark = marks[e.id] || { isFound: true, notes: '' };
                return (
                  <div key={e.id} className="flex items-start gap-3 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => toggle(e.id, true)}
                        className={`px-2 py-1 text-xs rounded ${mark.isFound ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                      >
                        Найдено
                      </button>
                      <button
                        onClick={() => toggle(e.id, false)}
                        className={`px-2 py-1 text-xs rounded ${!mark.isFound ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                      >
                        Нет
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{e.name}</div>
                      <div className="text-xs text-gray-500">
                        {e.equipmentType && <span>{e.equipmentType}</span>}
                        {e.serialNumber && <span> · S/N {e.serialNumber}</span>}
                      </div>
                      {!mark.isFound && (
                        <input
                          value={mark.notes}
                          onChange={(ev) => setNote(e.id, ev.target.value)}
                          placeholder="Комментарий"
                          className="mt-2 w-full px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Отмена
          </button>
          <button
            disabled={saving || loading || equipment.length === 0}
            onClick={() => handleSave(false)}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg disabled:opacity-50"
          >
            Сохранить черновик
          </button>
          <button
            disabled={saving || loading || equipment.length === 0}
            onClick={() => handleSave(true)}
            className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg"
          >
            Завершить
          </button>
        </div>
      </div>
    </div>
  );
}
