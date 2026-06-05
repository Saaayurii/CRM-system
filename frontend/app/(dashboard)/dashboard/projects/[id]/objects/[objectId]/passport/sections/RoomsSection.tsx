'use client';

/**
 * Passport section — "Помещения".
 *
 * Reuses the BuildingObjects API (`/objects`) instead of the passport JSONB:
 * the "rooms" are real BuildingObject rows attached to this construction site.
 */

import React, { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import type { PassportCtx } from '../usePassport';
import {
  Card, SectionHeader, PrimaryBtn, GhostBtn, IconBtn, DataTable, EmptyState,
  TextInput, TextArea, Select, Pill, PencilIcon, TrashIcon, PlusIcon,
} from '../primitives';

/* ───────────────────────── types & helpers ───────────────────────── */

interface BuildingObject {
  id: number;
  name: string;
  objectType?: string;
  classification?: string;
  parentId?: number | null;
  floorNumber?: number | null;
  description?: string;
  parameters?: { area?: number; ceiling_height?: number; [k: string]: any };
}

const OBJECT_TYPE_OPTIONS = [
  { value: 'room', label: 'Помещение' },
  { value: 'floor', label: 'Этаж' },
  { value: 'section', label: 'Секция' },
  { value: 'apartment', label: 'Квартира' },
  { value: 'building', label: 'Здание' },
  { value: 'custom', label: 'Другое' },
];
const OBJECT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  OBJECT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

function num(v: string): number | undefined {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
function str(v: number | null | undefined): string {
  return v === undefined || v === null ? '' : String(v);
}

/* ───────────────────────── form state ───────────────────────── */

interface FormState {
  name: string;
  objectType: string;
  classification: string;
  parentId: string;
  floorNumber: string;
  description: string;
  area: string;
  ceilingHeight: string;
}

const emptyForm: FormState = {
  name: '', objectType: 'room', classification: '', parentId: '',
  floorNumber: '', description: '', area: '', ceilingHeight: '',
};

function toForm(o: BuildingObject): FormState {
  return {
    name: o.name || '',
    objectType: o.objectType || 'room',
    classification: o.classification || '',
    parentId: o.parentId != null ? String(o.parentId) : '',
    floorNumber: str(o.floorNumber),
    description: o.description || '',
    area: str(o.parameters?.area),
    ceilingHeight: str(o.parameters?.ceiling_height),
  };
}

/* ───────────────────────── component ───────────────────────── */

export default function RoomsSection({ ctx, onCountChange }: { ctx: PassportCtx; onCountChange: (n: number) => void }) {
  const addToast = useToastStore((s) => s.addToast);
  const [rooms, setRooms] = useState<BuildingObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/objects', { params: { constructionSiteId: ctx.objectId, limit: 200 } });
      const arr: BuildingObject[] = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
      setRooms(arr);
      onCountChange(arr.length);
    } catch {
      addToast('error', 'Не удалось загрузить помещения');
    } finally {
      setLoading(false);
    }
    // onCountChange/addToast are stable enough for this load lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.objectId]);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (o: BuildingObject) => { setForm(toForm(o)); setEditingId(o.id); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const save = async () => {
    if (!form.name.trim()) {
      addToast('error', 'Укажите название помещения');
      return;
    }
    setSaving(true);
    const parameters: Record<string, any> = {};
    const area = num(form.area);
    const ceiling = num(form.ceilingHeight);
    if (area !== undefined) parameters.area = area;
    if (ceiling !== undefined) parameters.ceiling_height = ceiling;

    const body: Record<string, any> = {
      name: form.name.trim(),
      objectType: form.objectType || undefined,
      classification: form.classification.trim() || undefined,
      parentId: form.parentId ? Number(form.parentId) : undefined,
      constructionSiteId: ctx.objectId,
      projectId: ctx.projectId,
      floorNumber: num(form.floorNumber),
      description: form.description.trim() || undefined,
      parameters,
    };

    try {
      if (editingId != null) {
        await api.put(`/objects/${editingId}`, body);
        addToast('success', 'Помещение обновлено');
      } else {
        await api.post('/objects', body);
        addToast('success', 'Помещение добавлено');
      }
      cancel();
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка при сохранении'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (o: BuildingObject) => {
    if (!confirm(`Удалить помещение «${o.name}»?`)) return;
    try {
      await api.delete(`/objects/${o.id}`);
      addToast('success', 'Помещение удалено');
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка при удалении'));
    }
  };

  const parentName = (id?: number | null) => {
    if (id == null) return '';
    const p = rooms.find((r) => r.id === id);
    return p?.name || '';
  };

  // Parent options: exclude the row being edited to avoid self-reference.
  const parentOptions = [
    { value: '', label: '— Без родителя' },
    ...rooms.filter((r) => r.id !== editingId).map((r) => ({ value: String(r.id), label: r.name })),
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Помещения"
        subtitle="Комнаты, этажи, секции и их параметры"
        right={
          !showForm
            ? <PrimaryBtn onClick={openCreate}><PlusIcon className="w-4 h-4" />Добавить помещение</PrimaryBtn>
            : undefined
        }
      />

      {showForm && (
        <Card title={editingId != null ? 'Редактирование помещения' : 'Новое помещение'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <TextInput label="Название *" value={form.name} onChange={(v) => set('name', v)} placeholder="Напр. Спальня" />
            <Select label="Тип" value={form.objectType} onChange={(v) => set('objectType', v)} options={OBJECT_TYPE_OPTIONS} />
            <TextInput label="Классификация" value={form.classification} onChange={(v) => set('classification', v)} placeholder="спальня / кухня / санузел" />
            <Select label="Родитель" value={form.parentId} onChange={(v) => set('parentId', v)} options={parentOptions} />
            <TextInput label="Этаж" value={form.floorNumber} onChange={(v) => set('floorNumber', v)} type="number" />
            <TextInput label="Площадь, м²" value={form.area} onChange={(v) => set('area', v)} type="number" />
            <TextInput label="Высота потолка, м" value={form.ceilingHeight} onChange={(v) => set('ceilingHeight', v)} type="number" />
            <TextArea label="Описание" value={form.description} onChange={(v) => set('description', v)} rows={2} className="sm:col-span-2 xl:col-span-3" />
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <GhostBtn onClick={cancel} disabled={saving}>Отмена</GhostBtn>
            <PrimaryBtn onClick={save} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</PrimaryBtn>
          </div>
        </Card>
      )}

      <Card title={`Список помещений (${rooms.length})`}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState text="Помещения ещё не добавлены" />
        ) : (
          <DataTable<BuildingObject>
            rows={rooms}
            columns={[
              { label: 'Название', render: (r) => <span className="font-medium text-gray-800 dark:text-gray-100">{r.name}</span> },
              { label: 'Тип', render: (r) => <Pill label={OBJECT_TYPE_LABEL[r.objectType || ''] || r.objectType || '—'} /> },
              { label: 'Классификация', render: (r) => r.classification || '—' },
              { label: 'Родитель', render: (r) => parentName(r.parentId) || '—' },
              { label: 'Этаж', render: (r) => (r.floorNumber ?? '—') },
              { label: 'Площадь, м²', render: (r) => (r.parameters?.area ?? '—') },
              { label: 'Высота, м', render: (r) => (r.parameters?.ceiling_height ?? '—') },
              {
                label: '', width: '80px', render: (r) => (
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn title="Редактировать" onClick={() => openEdit(r)}><PencilIcon className="w-4 h-4" /></IconBtn>
                    <IconBtn danger title="Удалить" onClick={() => remove(r)}><TrashIcon className="w-4 h-4" /></IconBtn>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
