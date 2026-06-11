'use client';

/**
 * Passport section 6 — "Обслуживание и гарантия".
 *
 * Top: 4 computed Stat tiles. Then cards for equipment, schedule, contractors,
 * warranties, work history, a status Donut and documents. The whole
 * `maintenance` object is kept in local state and replaced via
 * `ctx.savePassportSection('maintenance', ...)`.
 */

import React, { useRef, useState } from 'react';
import type { PassportCtx } from '../usePassport';
import type {
  MaintenanceSectionData, EquipmentItem, MaintenancePlan,
  MaintenanceContractor, WarrantyItem, WorkHistoryItem, PassportFile,
} from '../types';
import { EQUIPMENT_STATUS_LABEL, newId } from '../types';
import {
  Card, Grid, Stat, Donut, TextInput, EditToggle, GhostBtn, EmptyState,
  FileChip, EditableTable, DataTable, EditableColumn, Pill,
} from '../primitives';
import { useT } from '@/lib/i18n';

/* ───────────────────────── helpers ───────────────────────── */

const EQUIP_STATUS_OPTIONS = [
  { value: 'ok', label: EQUIPMENT_STATUS_LABEL.ok },
  { value: 'service', label: EQUIPMENT_STATUS_LABEL.service },
  { value: 'warranty', label: EQUIPMENT_STATUS_LABEL.warranty },
  { value: 'overdue', label: EQUIPMENT_STATUS_LABEL.overdue },
];

const EQUIP_PILL_COLOR: Record<string, string> = {
  service: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  warranty: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ok: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

/** Defensive date parser: handles dd.mm.yyyy and ISO; returns null if unparseable. */
function parseDate(v: string | undefined | null): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const ddmmyyyy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

const OVERDUE_STATUS_HINTS = ['просроч', 'overdue'];

export default function MaintenanceSection({ ctx }: { ctx: PassportCtx }) {
  const t = useT();
  const maintenance: MaintenanceSectionData = ctx.passport.maintenance || {};

  const equipment = maintenance.equipment || [];
  const warranties = maintenance.warranties || [];
  const schedule = maintenance.schedule || [];

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const totalEquipment = equipment.length;
  const onService = equipment.filter((e) => e.status === 'service').length;
  const expiringSoon = warranties.filter((w) => {
    const d = parseDate(w.warrantyUntil);
    return d ? d >= now && d <= in30 : false;
  }).length;
  const overdue = (() => {
    const eqOverdue = equipment.filter((e) => e.status === 'overdue').length;
    const planOverdue = schedule.filter((p) => {
      const statusHit = OVERDUE_STATUS_HINTS.some((h) => (p.status || '').toLowerCase().includes(h));
      const d = parseDate(p.nextVisit);
      const dateHit = d ? d < now : false;
      return statusHit || dateHit;
    }).length;
    return eqOverdue + planOverdue;
  })();

  return (
    <div className="space-y-5">
      <Grid cols={4}>
        <Stat label={t('Всего оборудования')} value={totalEquipment} />
        <Stat label={t('На обслуживании')} value={onService} accent="text-blue-500" />
        <Stat label={t('Истекает в ближайшие 30 дней')} value={expiringSoon} accent="text-orange-500" />
        <Stat label={t('Просрочено')} value={overdue} accent="text-red-500" />
      </Grid>

      <EquipmentCard ctx={ctx} maintenance={maintenance} />
      <ScheduleCard ctx={ctx} maintenance={maintenance} />
      <ContractorsCard ctx={ctx} maintenance={maintenance} />
      <WarrantiesCard ctx={ctx} maintenance={maintenance} />
      <WorkHistoryCard ctx={ctx} maintenance={maintenance} />
      <StatusDonutCard equipment={equipment} />
      <DocumentsCard ctx={ctx} maintenance={maintenance} />
    </div>
  );
}

/* ───────────────────── Оборудование и системы ───────────────────── */

function EquipmentCard({ ctx, maintenance }: { ctx: PassportCtx; maintenance: MaintenanceSectionData }) {
  const t = useT();
  const items = maintenance.equipment || [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<EquipmentItem[]>(items);

  const reset = () => setRows(maintenance.equipment || []);
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: MaintenanceSectionData = {
        ...maintenance,
        equipment: rows.filter((r) => (r.name || '').trim()),
      };
      await ctx.savePassportSection('maintenance', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const columns: EditableColumn<EquipmentItem>[] = [
    { key: 'name', label: 'Наименование', placeholder: 'Газовый котёл' },
    { key: 'category', label: 'Категория' },
    { key: 'model', label: 'Модель' },
    { key: 'serial', label: 'Серийный номер' },
    { key: 'status', label: 'Статус', type: 'select', options: EQUIP_STATUS_OPTIONS },
  ];

  return (
    <Card
      title={t('Оборудование и системы')}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <DataTable
          rows={items}
          empty="Оборудование не добавлено"
          columns={[
            { key: 'name', label: 'Наименование' },
            { key: 'category', label: 'Категория' },
            { key: 'model', label: 'Модель' },
            { key: 'serial', label: 'Серийный номер' },
            {
              label: 'Статус',
              render: (r) => r.status
                ? <Pill label={EQUIPMENT_STATUS_LABEL[r.status] || r.status} color={EQUIP_PILL_COLOR[r.status]} />
                : '—',
            },
          ]}
        />
      ) : (
        <EditableTable
          rows={rows}
          columns={columns}
          onChange={setRows}
          makeEmpty={() => ({ id: newId(), name: '', status: 'ok' })}
          addLabel="Добавить оборудование"
        />
      )}
    </Card>
  );
}

/* ───────────────────── Плановое обслуживание ───────────────────── */

function ScheduleCard({ ctx, maintenance }: { ctx: PassportCtx; maintenance: MaintenanceSectionData }) {
  const t = useT();
  const items = maintenance.schedule || [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<MaintenancePlan[]>(items);

  const reset = () => setRows(maintenance.schedule || []);
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: MaintenanceSectionData = {
        ...maintenance,
        schedule: rows.filter((r) => (r.equipment || '').trim() || (r.workType || '').trim()),
      };
      await ctx.savePassportSection('maintenance', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const columns: EditableColumn<MaintenancePlan>[] = [
    { key: 'equipment', label: 'Оборудование' },
    { key: 'workType', label: 'Тип работ', placeholder: 'Техническое обслуживание' },
    { key: 'frequency', label: 'Периодичность', placeholder: '1 раз в год' },
    { key: 'nextVisit', label: 'Следующий визит' },
    { key: 'status', label: 'Статус', placeholder: 'Запланировано' },
  ];

  return (
    <Card
      title={t('Плановое обслуживание')}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <DataTable
          rows={items}
          empty="Планы обслуживания не добавлены"
          columns={[
            { key: 'equipment', label: 'Оборудование' },
            { key: 'workType', label: 'Тип работ' },
            { key: 'frequency', label: 'Периодичность' },
            { key: 'nextVisit', label: 'Следующий визит' },
            { key: 'status', label: 'Статус' },
          ]}
        />
      ) : (
        <EditableTable
          rows={rows}
          columns={columns}
          onChange={setRows}
          makeEmpty={() => ({ id: newId() })}
          addLabel="Добавить план"
        />
      )}
    </Card>
  );
}

/* ───────────────────── Подрядчики и контакты ───────────────────── */

function ContractorsCard({ ctx, maintenance }: { ctx: PassportCtx; maintenance: MaintenanceSectionData }) {
  const t = useT();
  const items = maintenance.contractors || [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<MaintenanceContractor[]>(items);

  const reset = () => setRows(maintenance.contractors || []);
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: MaintenanceSectionData = {
        ...maintenance,
        contractors: rows.filter((r) => (r.org || '').trim()),
      };
      await ctx.savePassportSection('maintenance', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const columns: EditableColumn<MaintenanceContractor>[] = [
    { key: 'org', label: 'Организация', placeholder: 'ООО «ТеплоСервис»' },
    { key: 'specialization', label: 'Специализация' },
    { key: 'phone', label: 'Телефон' },
    { key: 'email', label: 'Email' },
  ];

  return (
    <Card
      title={t('Подрядчики и контакты')}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <DataTable
          rows={items}
          empty="Подрядчики не добавлены"
          columns={[
            { key: 'org', label: 'Организация' },
            { key: 'specialization', label: 'Специализация' },
            { key: 'phone', label: 'Телефон' },
            { key: 'email', label: 'Email' },
          ]}
        />
      ) : (
        <EditableTable
          rows={rows}
          columns={columns}
          onChange={setRows}
          makeEmpty={() => ({ id: newId(), org: '' })}
          addLabel="Добавить подрядчика"
        />
      )}
    </Card>
  );
}

/* ───────────────────── Гарантии ───────────────────── */

function WarrantiesCard({ ctx, maintenance }: { ctx: PassportCtx; maintenance: MaintenanceSectionData }) {
  const t = useT();
  const items = maintenance.warranties || [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<WarrantyItem[]>(items);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const reset = () => setRows(maintenance.warranties || []);
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: MaintenanceSectionData = {
        ...maintenance,
        warranties: rows.filter((r) => (r.equipment || '').trim() || (r.manufacturer || '').trim()),
      };
      await ctx.savePassportSection('maintenance', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const update = (id: string, patch: Partial<WarrantyItem>) =>
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r));
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const add = () => setRows((rs) => [...rs, { id: newId() }]);

  const handleFile = async (id: string, file: File | undefined) => {
    if (!file) return;
    setUploadingId(id);
    try {
      const url = await ctx.uploadFile(file);
      if (url) update(id, { fileUrl: url, fileTitle: file.name });
    } catch {
      /* toast handled in ctx */
    } finally {
      setUploadingId(null);
      const inp = fileInputs.current[id];
      if (inp) inp.value = '';
    }
  };

  return (
    <Card
      title={t('Гарантии')}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <DataTable
          rows={items}
          empty="Гарантии не добавлены"
          columns={[
            { key: 'equipment', label: 'Оборудование' },
            { key: 'manufacturer', label: 'Производитель' },
            { key: 'warrantyUntil', label: 'Гарантия до' },
            {
              label: 'Документ',
              render: (r) => r.fileUrl
                ? <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">{r.fileTitle || 'Открыть'}</a>
                : (r.fileTitle || '—'),
            },
          ]}
        />
      ) : (
        <div className="space-y-3">
          {rows.length === 0 && <EmptyState text="Гарантии не добавлены" />}
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end border-b border-gray-100 dark:border-gray-700/40 pb-3">
              <TextInput label={t('Оборудование')} value={r.equipment || ''} onChange={(v) => update(r.id, { equipment: v })} />
              <TextInput label={t('Производитель')} value={r.manufacturer || ''} onChange={(v) => update(r.id, { manufacturer: v })} />
              <TextInput label={t('Гарантия до')} value={r.warrantyUntil || ''} onChange={(v) => update(r.id, { warrantyUntil: v })} placeholder="31.12.2026" />
              <div className="flex items-end gap-2">
                <TextInput label={t('Документ')} value={r.fileTitle || ''} onChange={(v) => update(r.id, { fileTitle: v })} className="flex-1" />
                <input
                  ref={(el) => { fileInputs.current[r.id] = el; }}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFile(r.id, e.target.files?.[0])}
                />
                <GhostBtn onClick={() => fileInputs.current[r.id]?.click()} disabled={uploadingId === r.id}>
                  {uploadingId === r.id ? '...' : 'Файл'}
                </GhostBtn>
                <button type="button" onClick={() => remove(r.id)} className="px-2 py-1.5 text-xs text-gray-400 hover:text-red-500">×</button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
          >
            + Добавить гарантию
          </button>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── История работ ───────────────────── */

function WorkHistoryCard({ ctx, maintenance }: { ctx: PassportCtx; maintenance: MaintenanceSectionData }) {
  const t = useT();
  const items = maintenance.workHistory || [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<WorkHistoryItem[]>(items);

  const reset = () => setRows(maintenance.workHistory || []);
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: MaintenanceSectionData = {
        ...maintenance,
        workHistory: rows.filter((r) => (r.date || '').trim() || (r.equipment || '').trim() || (r.workType || '').trim()),
      };
      await ctx.savePassportSection('maintenance', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const columns: EditableColumn<WorkHistoryItem>[] = [
    { key: 'date', label: 'Дата', placeholder: '01.06.2026' },
    { key: 'equipment', label: 'Оборудование' },
    { key: 'workType', label: 'Тип работ' },
    { key: 'performer', label: 'Исполнитель' },
    { key: 'fileTitle', label: 'Документ' },
  ];

  return (
    <Card
      title={t('История работ')}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <DataTable
          rows={items}
          empty="История работ пуста"
          columns={[
            { key: 'date', label: 'Дата' },
            { key: 'equipment', label: 'Оборудование' },
            { key: 'workType', label: 'Тип работ' },
            { key: 'performer', label: 'Исполнитель' },
            {
              label: 'Документ',
              render: (r) => r.fileUrl
                ? <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">{r.fileTitle || 'Открыть'}</a>
                : (r.fileTitle || '—'),
            },
          ]}
        />
      ) : (
        <EditableTable
          rows={rows}
          columns={columns}
          onChange={setRows}
          makeEmpty={() => ({ id: newId() })}
          addLabel="Добавить запись"
        />
      )}
    </Card>
  );
}

/* ───────────────────── Статус обслуживания (Donut) ───────────────────── */

function StatusDonutCard({ equipment }: { equipment: EquipmentItem[] }) {
  const t = useT();
  const counts = { service: 0, warranty: 0, overdue: 0, ok: 0 };
  for (const e of equipment) {
    if (e.status && e.status in counts) counts[e.status as keyof typeof counts]++;
  }
  const data = [
    { label: EQUIPMENT_STATUS_LABEL.service, value: counts.service, color: '#3b82f6' },
    { label: EQUIPMENT_STATUS_LABEL.warranty, value: counts.warranty, color: '#22c55e' },
    { label: EQUIPMENT_STATUS_LABEL.overdue, value: counts.overdue, color: '#ef4444' },
    { label: EQUIPMENT_STATUS_LABEL.ok, value: counts.ok, color: '#16a34a' },
  ].filter((d) => d.value > 0);

  return (
    <Card title={t('Статус обслуживания')}>
      {data.length > 0 ? <Donut data={data} /> : <EmptyState text="Нет данных по оборудованию" />}
    </Card>
  );
}

/* ───────────────────── Документы и шаблоны ───────────────────── */

function DocumentsCard({ ctx, maintenance }: { ctx: PassportCtx; maintenance: MaintenanceSectionData }) {
  const t = useT();
  const docs = maintenance.documents || [];
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await ctx.uploadFile(file);
      if (url) {
        const doc: PassportFile = {
          id: newId(),
          title: file.name,
          fileUrl: url,
          fileType: (file.name.split('.').pop() || '').toUpperCase() || undefined,
          size: humanSize(file.size),
          addedAt: new Date().toISOString(),
        };
        await ctx.savePassportSection('maintenance', { ...maintenance, documents: [...docs, doc] });
      }
    } catch {
      /* toast handled in ctx */
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeDoc = async (id: string) => {
    try {
      await ctx.savePassportSection('maintenance', { ...maintenance, documents: docs.filter((d) => d.id !== id) });
    } catch {
      /* toast handled in ctx */
    }
  };

  return (
    <Card
      title={t('Документы и шаблоны')}
      actions={
        <GhostBtn onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Загрузка...' : 'Добавить документ'}
        </GhostBtn>
      }
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
      {docs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {docs.map((d) => (
            <FileChip key={d.id} title={d.title} fileType={d.fileType} size={d.size} fileUrl={d.fileUrl} onDelete={() => removeDoc(d.id)} />
          ))}
        </div>
      ) : <EmptyState text="Документы не загружены" />}
    </Card>
  );
}

function humanSize(bytes: number): string {
  if (!bytes) return '';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let v = bytes; let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1).replace('.', ',')} ${units[i]}`;
}
