'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useDownloadPdf } from '@/lib/hooks/useDownloadPdf';
import { FAB_REGISTER_EVENT, FAB_ACTION_EVENT } from '@/components/ui/QuickActionsButton';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
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

type WarehouseKind = 'eq' | 'mat';
type EditState =
  | { mode: 'create'; kind: WarehouseKind }
  | { mode: 'edit'; kind: WarehouseKind; id: number }
  | null;
type DeleteState = { kind: WarehouseKind; id: number; name: string } | null;
type ViewMode = 'table' | 'cards';

const emptyForm = { name: '', address: '', code: '', warehouseType: '' };
const VIEW_STORAGE_KEY = 'warehouseViewMode';

export default function WarehousesTab() {
  const addToast = useToastStore((s) => s.addToast);
  const [eq, setEq] = useState<EqWarehouse[]>([]);
  const [mat, setMat] = useState<MatWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryFor, setInventoryFor] = useState<EqWarehouse | null>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { download: downloadPdf, loading: pdfLoading } = useDownloadPdf();

  // По умолчанию: карточки на мобильном, таблица на десктопе (если нет сохранённого выбора)
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(VIEW_STORAGE_KEY) : null;
    if (stored === 'table' || stored === 'cards') {
      setViewMode(stored as ViewMode);
    } else if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setViewMode('cards');
    }
  }, []);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') localStorage.setItem(VIEW_STORAGE_KEY, mode);
  };

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

  const openCreate = (kind: WarehouseKind) => {
    setForm(emptyForm);
    setEditState({ mode: 'create', kind });
  };

  // Register "create" actions into the global FAB (bottom-right "+")
  useEffect(() => {
    const actions = [
      { id: 'eq', label: 'Склад оборудования' },
      { id: 'mat', label: 'Склад материалов' },
    ];
    window.dispatchEvent(new CustomEvent(FAB_REGISTER_EVENT, { detail: { actions } }));
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.id;
      if (id === 'eq' || id === 'mat') openCreate(id as WarehouseKind);
    };
    window.addEventListener(FAB_ACTION_EVENT, handler);
    return () => {
      window.removeEventListener(FAB_ACTION_EVENT, handler);
      window.dispatchEvent(new CustomEvent(FAB_REGISTER_EVENT, { detail: { actions: [] } }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close settings dropdown on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  const exportEqPdf = () => {
    setSettingsOpen(false);
    downloadPdf('eq-warehouses', 'Склады оборудования', eq.map((w) => ({
      Название: w.name || '—',
      Адрес: w.address || '—',
      Единиц: String(Array.isArray(w.equipment) ? w.equipment.length : 0),
    })));
  };

  const exportMatPdf = () => {
    setSettingsOpen(false);
    downloadPdf('warehouses', 'Склады материалов', mat.map((w) => ({
      Название: w.name || '—',
      Код: w.code || '—',
      Тип: w.warehouseType || '—',
      Адрес: w.address || '—',
      Кладовщик: w.warehouseKeeper?.name || '—',
    })));
  };

  const openEditEq = (w: EqWarehouse) => {
    setForm({ name: w.name || '', address: w.address || '', code: '', warehouseType: '' });
    setEditState({ mode: 'edit', kind: 'eq', id: w.id });
  };

  const openEditMat = (w: MatWarehouse) => {
    setForm({
      name: w.name || '',
      address: w.address || '',
      code: w.code || '',
      warehouseType: w.warehouseType || '',
    });
    setEditState({ mode: 'edit', kind: 'mat', id: w.id });
  };

  const closeModal = () => {
    if (saving) return;
    setEditState(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!editState) return;
    if (!form.name.trim()) {
      addToast('error', 'Укажите название');
      return;
    }
    setSaving(true);
    try {
      const isEq = editState.kind === 'eq';
      const basePath = isEq ? '/eq-warehouses' : '/warehouses';
      const body = isEq
        ? { name: form.name.trim(), address: form.address.trim() || undefined }
        : {
            name: form.name.trim(),
            code: form.code.trim() || undefined,
            address: form.address.trim() || undefined,
            warehouseType: form.warehouseType.trim() || undefined,
          };

      if (editState.mode === 'create') {
        await api.post(basePath, body);
        addToast('success', 'Склад создан');
      } else {
        await api.put(`${basePath}/${editState.id}`, body);
        addToast('success', 'Склад обновлён');
      }
      setEditState(null);
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Ошибка сохранения склада');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteState) return;
    setDeleting(true);
    try {
      const basePath = deleteState.kind === 'eq' ? '/eq-warehouses' : '/warehouses';
      await api.delete(`${basePath}/${deleteState.id}`);
      addToast('success', 'Склад удалён');
      setDeleteState(null);
      await load();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Не удалось удалить склад');
    } finally {
      setDeleting(false);
    }
  };

  const EditIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );

  const DeleteIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  return (
    <div className="space-y-8">
      {/* Global controls: view toggle + settings (PDF exports) */}
      <div className="flex items-center justify-end gap-2">
        <ViewToggle value={viewMode} onChange={handleViewChange} />
        <div ref={settingsRef} className="relative">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            title="Настройки и экспорт"
            aria-label="Настройки и экспорт"
          >
            <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {settingsOpen && (
            <div className="absolute right-0 mt-1 w-60 z-30 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1">
              <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-gray-400">Экспорт в PDF</div>
              <button
                onClick={exportEqPdf}
                disabled={pdfLoading || eq.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Склады оборудования
              </button>
              <button
                onClick={exportMatPdf}
                disabled={pdfLoading || mat.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Склады материалов
              </button>
            </div>
          )}
        </div>
      </div>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Склады оборудования</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Места хранения инструмента и оборудования</p>
        </div>
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">Загрузка...</div>
        ) : eq.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">Складов оборудования нет</div>
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-gray-900/20">
                  <tr>
                    <th className="text-left px-4 py-2.5">Название</th>
                    <th className="text-left px-4 py-2.5">Адрес</th>
                    <th className="text-right px-4 py-2.5">Единиц</th>
                    <th className="text-right px-4 py-2.5 w-56">Действия</th>
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
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1 items-center">
                          <button
                            onClick={() => setInventoryFor(w)}
                            className="px-2 py-1 text-xs rounded bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50 transition-colors"
                            title="Запустить инвентаризацию"
                          >
                            Инвентаризация
                          </button>
                          <button
                            onClick={() => openEditEq(w)}
                            className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                            title="Редактировать"
                          >
                            {EditIcon}
                          </button>
                          <button
                            onClick={() => setDeleteState({ kind: 'eq', id: w.id, name: w.name })}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Удалить"
                          >
                            {DeleteIcon}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {eq.map((w) => (
              <div key={w.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-gray-800 dark:text-gray-100 truncate min-w-0">{w.name}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditEq(w)} className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors" title="Редактировать">{EditIcon}</button>
                    <button onClick={() => setDeleteState({ kind: 'eq', id: w.id, name: w.name })} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">{DeleteIcon}</button>
                  </div>
                </div>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-400 dark:text-gray-500">Адрес</dt>
                    <dd className="text-gray-700 dark:text-gray-300 text-right truncate">{w.address || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-400 dark:text-gray-500">Единиц</dt>
                    <dd className="text-gray-700 dark:text-gray-300">{Array.isArray(w.equipment) ? w.equipment.length : 0}</dd>
                  </div>
                </dl>
                <button
                  onClick={() => setInventoryFor(w)}
                  className="mt-1 px-2 py-1.5 text-xs rounded bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50 transition-colors"
                >
                  Инвентаризация
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Склады материалов</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Места хранения расходных материалов и комплектующих</p>
        </div>
        {loading ? null : mat.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center text-gray-500">Складов материалов нет</div>
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-400 bg-gray-50 dark:bg-gray-900/20">
                  <tr>
                    <th className="text-left px-4 py-2.5">Название</th>
                    <th className="text-left px-4 py-2.5">Код</th>
                    <th className="text-left px-4 py-2.5">Тип</th>
                    <th className="text-left px-4 py-2.5">Адрес</th>
                    <th className="text-left px-4 py-2.5">Кладовщик</th>
                    <th className="text-right px-4 py-2.5 w-px">Действия</th>
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
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1 items-center">
                          <button
                            onClick={() => openEditMat(w)}
                            className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                            title="Редактировать"
                          >
                            {EditIcon}
                          </button>
                          <button
                            onClick={() => setDeleteState({ kind: 'mat', id: w.id, name: w.name })}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Удалить"
                          >
                            {DeleteIcon}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mat.map((w) => (
              <div key={w.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 dark:text-gray-100 truncate">{w.name}</div>
                    {w.code && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{w.code}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditMat(w)} className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors" title="Редактировать">{EditIcon}</button>
                    <button onClick={() => setDeleteState({ kind: 'mat', id: w.id, name: w.name })} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">{DeleteIcon}</button>
                  </div>
                </div>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-400 dark:text-gray-500">Тип</dt>
                    <dd className="text-gray-700 dark:text-gray-300 text-right truncate">{w.warehouseType || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-400 dark:text-gray-500">Адрес</dt>
                    <dd className="text-gray-700 dark:text-gray-300 text-right truncate">{w.address || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-400 dark:text-gray-500">Кладовщик</dt>
                    <dd className="text-gray-700 dark:text-gray-300 text-right truncate">{w.warehouseKeeper?.name || '—'}</dd>
                  </div>
                </dl>
              </div>
            ))}
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

      <DeleteConfirmModal
        open={!!deleteState}
        loading={deleting}
        onClose={() => !deleting && setDeleteState(null)}
        onConfirm={handleDelete}
      />

      {editState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editState.mode === 'create' ? 'Новый склад' : 'Редактирование склада'}{' '}
              {editState.kind === 'eq' ? 'оборудования' : 'материалов'}
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
              {editState.kind === 'mat' && (
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
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Отмена
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg"
              >
                {saving ? 'Сохранение...' : editState.mode === 'create' ? 'Создать' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg shrink-0">
      <button
        onClick={() => onChange('table')}
        className={`p-1.5 rounded transition-colors ${value === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
        title="Таблица"
        aria-label="Таблица"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      <button
        onClick={() => onChange('cards')}
        className={`p-1.5 rounded transition-colors ${value === 'cards' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
        title="Карточки"
        aria-label="Карточки"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
    </div>
  );
}
