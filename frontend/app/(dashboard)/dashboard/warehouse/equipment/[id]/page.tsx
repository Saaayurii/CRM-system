'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import EntityFormModal from '@/components/admin/EntityFormModal';
import EquipmentMoveModal from '@/components/warehouse/EquipmentMoveModal';
import { ADMIN_MODULES } from '@/lib/admin/modulesConfig';
import { useT } from '@/lib/i18n';

interface Equipment {
  id: number;
  name: string;
  equipmentType?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  status?: number | null;
  warehouseId?: number | null;
  warehouse?: { id: number; name: string } | null;
  currentLocation?: string | null;
  notes?: string | null;
}

interface MaintenanceEntry {
  id: number;
  equipmentId: number;
  maintenanceDate: string;
  maintenanceType?: string | null;
  description?: string | null;
  cost?: number | null;
}

const EQUIPMENT_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Доступно',         color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  1: { label: 'В работе',         color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  2: { label: 'На обслуживании', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  3: { label: 'Неисправно',      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  vehicle:   'Транспорт',
  tool:      'Инструмент',
  machinery: 'Спецтехника',
};

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const equipmentId = Number(id);
  const addToast = useToastStore((s) => s.addToast);

  const [eq, setEq] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<MaintenanceEntry[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/equipment/${equipmentId}`);
      setEq(data);
    } catch {
      addToast('error', 'Не удалось загрузить оборудование');
    } finally {
      setLoading(false);
    }
    try {
      const { data } = await api.get('/equipment-maintenance', { params: { equipmentId, limit: 200 } });
      const arr: MaintenanceEntry[] = Array.isArray(data) ? data : (data?.data || data?.items || []);
      const sorted = arr
        .filter((m) => m.equipmentId === equipmentId)
        .toSorted((a, b) => new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime());
      setHistory(sorted);
    } catch {
      setHistory([]);
    }
  }, [equipmentId, addToast]);

  useEffect(() => { refetch(); }, [refetch]);

  // QR — ссылка на эту же страницу
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/dashboard/warehouse/equipment/${equipmentId}`;
    QRCode.toDataURL(url, { width: 220, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [equipmentId]);

  const handleEditSubmit = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.put(`/equipment/${equipmentId}`, data);
      addToast('success', 'Изменения сохранены');
      setShowEditModal(false);
      refetch();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join(', ') : (msg || 'Ошибка сохранения'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="sm:flex sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            {eq?.name || (loading ? 'Загрузка…' : 'Оборудование')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Карточка единицы оборудования
          </p>
        </div>
        <Link href="/dashboard/warehouse" className="text-sm text-violet-500 hover:text-violet-600">
          &larr; К списку оборудования
        </Link>
      </div>

      {loading || !eq ? (
        <div className="py-20 text-center text-sm text-gray-400">{t('Загрузка карточки…')}</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Левая карточка — данные */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{eq.name}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMoveModal(true)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    Переместить
                  </button>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Редактировать
                  </button>
                </div>
              </div>
              <div className="p-5 flex flex-col sm:flex-row gap-6">
                {/* QR */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  {qrDataUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt="QR" className="w-28 h-28 rounded-lg" />
                      <a href={qrDataUrl} download={`equipment-${eq.id}.png`}
                        className="text-xs text-violet-500 hover:text-violet-600 dark:text-violet-400">
                        Скачать
                      </a>
                    </>
                  ) : (
                    <div className="w-28 h-28 bg-gray-100 dark:bg-gray-900/40 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-300 dark:text-gray-600">{t('QR код')}</span>
                    </div>
                  )}
                </div>
                {/* Поля */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'Серийный №', value: eq.serialNumber },
                    { label: 'Тип', value: eq.equipmentType ? (EQUIPMENT_TYPE_LABELS[eq.equipmentType] ?? eq.equipmentType) : null },
                    { label: 'Бренд / Производитель', value: eq.manufacturer },
                    { label: 'Модель', value: eq.model },
                    { label: 'Дата поступления', value: eq.purchaseDate ? new Date(eq.purchaseDate).toLocaleDateString('ru-RU') : null },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">{label}</dt>
                      <dd className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{value || '—'}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">{t('Текущий склад')}</dt>
                    <dd className="mt-0.5">
                      {eq.currentLocation || eq.warehouse?.name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {eq.currentLocation || eq.warehouse?.name}
                        </span>
                      ) : <span className="text-sm text-gray-400">—</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">{t('Статус')}</dt>
                    <dd className="mt-0.5">
                      {eq.status != null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EQUIPMENT_STATUS[eq.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                          {EQUIPMENT_STATUS[eq.status]?.label ?? eq.status}
                        </span>
                      ) : <span className="text-sm text-gray-400">—</span>}
                    </dd>
                  </div>
                </div>
              </div>
              {eq.notes && (
                <div className="px-5 pb-5">
                  <dt className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('Примечания')}</dt>
                  <dd className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3">{eq.notes}</dd>
                </div>
              )}
            </div>

            {/* Правая карточка — история */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('История обслуживания')}</h3>
              </div>
              {history.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">{t('Нет записей истории')}</div>
              ) : (
                <div className="px-5 py-4 overflow-y-auto max-h-[480px]">
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-5">
                      {history.map((m) => (
                        <div key={m.id} className="relative flex gap-3 pl-8">
                          <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-violet-500 border-2 border-white dark:border-gray-800 z-10" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              {m.maintenanceType && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                  {m.maintenanceType}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                {new Date(m.maintenanceDate).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                            {m.description && <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{m.description}</p>}
                            {m.cost != null && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Стоимость:{' '}
                                <span className="font-medium text-gray-600 dark:text-gray-300">
                                  {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(m.cost)}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditModal && eq && (
        <EntityFormModal
          open
          title={`Редактировать: ${eq.name}`}
          fields={ADMIN_MODULES.equipment.formFields}
          initialData={eq as unknown as Record<string, unknown>}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
          loading={saving}
        />
      )}

      {showMoveModal && eq && (
        <EquipmentMoveModal
          equipment={eq}
          onClose={() => setShowMoveModal(false)}
          onMoved={() => { setShowMoveModal(false); refetch(); }}
        />
      )}
    </div>
  );
}
