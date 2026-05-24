'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import InventoryStartModal from './InventoryStartModal';

interface EqWarehouse {
  id: number;
  name: string;
  address?: string | null;
  equipment?: Array<{ id: number }>;
}

interface MatWarehouse {
  id: number;
  name: string;
  code?: string | null;
  address?: string | null;
  warehouseType?: string | null;
  warehouseKeeper?: { id: number; name: string } | null;
  isActive?: boolean;
}

export default function WarehousesTab() {
  const addToast = useToastStore((s) => s.addToast);
  const [eq, setEq] = useState<EqWarehouse[]>([]);
  const [mat, setMat] = useState<MatWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryFor, setInventoryFor] = useState<EqWarehouse | null>(null);
  const [showCreate, setShowCreate] = useState<null | 'eq' | 'mat'>(null);
  const [form, setForm] = useState({ name: '', address: '', code: '', warehouseType: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eqRes, matRes] = await Promise.all([
        api.get('/eq-warehouses').catch(() => ({ data: [] })),
        api.get('/warehouses').catch(() => ({ data: [] })),
      ]);
      const eqList: EqWarehouse[] = Array.isArray(eqRes.data) ? eqRes.data
        : eqRes.data?.warehouses || eqRes.data?.data || [];
      const matList: MatWarehouse[] = Array.isArray(matRes.data) ? matRes.data
        : matRes.data?.warehouses || matRes.data?.data || [];
      setEq(eqList);
      setMat(matList);
    } catch (e: any) {
      setError(e?.message || 'Не удалось загрузить склады');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      addToast('error', 'Укажите название');
      return;
    }
    setSaving(true);
    try {
      if (showCreate === 'eq') {
        await api.post('/eq-warehouses', { name: form.name.trim(), address: form.address.trim() || undefined });
      } else {
        await api.post('/warehouses', {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          address: form.address.trim() || undefined,
          warehouseType: form.warehouseType.trim() || undefined,
        });
      }
      addToast('success', 'Склад создан');
      setShowCreate(null);
      setForm({ name: '', address: '', code: '', warehouseType: '' });
      await load();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Ошибка создания склада');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Склады оборудования</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Места хранения инструмента и оборудования</p>
          </div>
          <button
            onClick={() => { setShowCreate('eq'); setForm({ name: '', address: '', code: '', warehouseType: '' }); }}
            className="px-3 py-1.5 text-sm bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
          >
            + Склад оборудования
          </button>
        </div>
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">Загрузка...</div>
        ) : eq.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">Складов оборудования нет</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-gray-900/20">
                <tr>
                  <th className="text-left px-4 py-2.5">Название</th>
                  <th className="text-left px-4 py-2.5">Адрес</th>
                  <th className="text-right px-4 py-2.5">Единиц</th>
                  <th className="text-center px-4 py-2.5 w-48">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {eq.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">{w.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{w.address || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                      {Array.isArray(w.equipment) ? w.equipment.length : 0}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => setInventoryFor(w)}
                        className="px-3 py-1 text-xs text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors"
                      >
                        Запустить инвентаризацию
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Склады материалов</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Места хранения расходных материалов и комплектующих</p>
          </div>
          <button
            onClick={() => { setShowCreate('mat'); setForm({ name: '', address: '', code: '', warehouseType: '' }); }}
            className="px-3 py-1.5 text-sm bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
          >
            + Склад материалов
          </button>
        </div>
        {loading ? null : mat.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">Складов материалов нет</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-gray-900/20">
                <tr>
                  <th className="text-left px-4 py-2.5">Название</th>
                  <th className="text-left px-4 py-2.5">Код</th>
                  <th className="text-left px-4 py-2.5">Тип</th>
                  <th className="text-left px-4 py-2.5">Адрес</th>
                  <th className="text-left px-4 py-2.5">Кладовщик</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {mat.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">{w.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{w.code || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{w.warehouseType || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{w.address || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{w.warehouseKeeper?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error && <div className="text-sm text-red-500">{error}</div>}

      {inventoryFor && (
        <InventoryStartModal
          warehouse={inventoryFor}
          onClose={() => setInventoryFor(null)}
          onCreated={() => { setInventoryFor(null); addToast('success', 'Инвентаризация создана'); }}
        />
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => !saving && setShowCreate(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Новый склад {showCreate === 'eq' ? 'оборудования' : 'материалов'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Название *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                  placeholder="Например, Главный склад"
                />
              </div>
              {showCreate === 'mat' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Код</label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                      placeholder="WH-01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Тип</label>
                    <input
                      value={form.warehouseType}
                      onChange={(e) => setForm({ ...form, warehouseType: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                      placeholder="общий / расходники / опасные"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Адрес</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                disabled={saving}
                onClick={() => setShowCreate(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Отмена
              </button>
              <button
                disabled={saving}
                onClick={handleCreate}
                className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg"
              >
                {saving ? 'Сохранение...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
