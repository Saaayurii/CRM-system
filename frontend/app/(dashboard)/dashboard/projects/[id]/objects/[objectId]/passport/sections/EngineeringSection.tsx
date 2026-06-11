'use client';

/**
 * Passport section 3 — "Инженерные системы".
 *
 * Internal sub-tabs (Электроснабжение / Водоснабжение / Отопление / Газоснабжение /
 * Вентиляция и кондиционирование / Слаботочные системы / Узлы и оборудование).
 * Each subsystem card keeps its slice in local state and replaces the whole
 * `engineering` object via `ctx.savePassportSection('engineering', ...)`.
 */

import React, { useRef, useState } from 'react';
import type { PassportCtx } from '../usePassport';
import type {
  EngineeringSectionData, EngineeringSubsystem, EngineeringNode,
  KeyVal, PassportFile, SystemStatus,
} from '../types';
import { SYSTEM_STATUS_LABEL, newId } from '../types';
import {
  Card, FieldGroup, Field, InfoRow, StatusDot, TextInput, Select,
  EditToggle, GhostBtn, AddBtn, IconBtn, TrashIcon, EmptyState, FileChip,
  EditableTable, DataTable, EditableColumn,
} from '../primitives';
import { useT } from '@/lib/i18n';

/* ───────────────────────── helpers ───────────────────────── */

const STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: 'active', label: SYSTEM_STATUS_LABEL.active },
  { value: 'inactive', label: SYSTEM_STATUS_LABEL.inactive },
  { value: 'maintenance', label: SYSTEM_STATUS_LABEL.maintenance },
  { value: 'fault', label: SYSTEM_STATUS_LABEL.fault },
];

function humanSize(bytes: number): string {
  if (!bytes) return '';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let v = bytes; let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1).replace('.', ',')} ${units[i]}`;
}

/* Reusable spec-rows editor (label / value). */
function KeyValEditor({ fields, onChange, title = 'Параметры' }: { fields: KeyVal[]; onChange: (f: KeyVal[]) => void; title?: string }) {
  const columns: EditableColumn<KeyVal>[] = [
    { key: 'label', label: 'Параметр', placeholder: 'Напряжение' },
    { key: 'value', label: 'Значение', placeholder: '380 В' },
  ];
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{title}</p>
      <EditableTable
        rows={fields}
        columns={columns}
        onChange={onChange}
        makeEmpty={() => ({ id: newId(), label: '', value: '' })}
        addLabel="Добавить параметр"
      />
    </div>
  );
}

/* Upload / clear a single linked file (schema / photo). */
function FileSlot({ ctx, label, url, onChange }: {
  ctx: PassportCtx; label: string; url?: string; onChange: (url: string | undefined) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await ctx.uploadFile(file);
      if (uploaded) onChange(uploaded);
    } catch {
      /* toast handled in ctx */
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      <GhostBtn onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? 'Загрузка...' : label}</GhostBtn>
      {url && (
        <>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-500 hover:underline truncate max-w-[140px]">{t('Открыть')}</a>
          <IconBtn danger title={t('Удалить')} onClick={() => onChange(undefined)}><TrashIcon className="w-4 h-4" /></IconBtn>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── component ───────────────────────── */

type SubKey = 'electrical' | 'water' | 'heating' | 'gas' | 'ventilation' | 'lowVoltage';

const SUB_TABS: { key: SubKey | 'nodes'; label: string }[] = [
  { key: 'electrical', label: 'Электроснабжение' },
  { key: 'water', label: 'Водоснабжение' },
  { key: 'heating', label: 'Отопление' },
  { key: 'gas', label: 'Газоснабжение' },
  { key: 'ventilation', label: 'Вентиляция и кондиционирование' },
  { key: 'lowVoltage', label: 'Слаботочные системы' },
  { key: 'nodes', label: 'Узлы и оборудование' },
];

const SUB_TITLE: Record<SubKey, string> = {
  electrical: 'Электроснабжение',
  water: 'Водоснабжение',
  heating: 'Отопление',
  gas: 'Газоснабжение',
  ventilation: 'Вентиляция и кондиционирование',
  lowVoltage: 'Слаботочные системы',
};

const SUB_DEFAULT_FIELDS: Record<SubKey, string[]> = {
  electrical: ['Напряжение', 'Фазность', 'Выделенная мощность', 'Тип счётчика'],
  water: ['Источник', 'Тип труб', 'Счётчик ХВС', 'Счётчик ГВС'],
  heating: ['Тип системы', 'Источник тепла', 'Теплоноситель', 'Радиаторы'],
  gas: ['Источник газа', 'Тип труб', 'Счётчик газа', 'Оборудование'],
  ventilation: ['Тип вентиляции', 'Кондиционирование', 'Производительность', 'Фильтрация'],
  lowVoltage: ['Интернет', 'Телефония', 'ТВ', 'Домофон'],
};

export default function EngineeringSection({ ctx }: { ctx: PassportCtx }) {
  const t = useT();
  const engineering: EngineeringSectionData = ctx.passport.engineering || {};
  const [tab, setTab] = useState<SubKey | 'nodes'>('electrical');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-violet-500 text-white'
                : 'text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-violet-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'nodes' && (
        <SubsystemCard
          key={tab}
          ctx={ctx}
          engineering={engineering}
          subKey={tab}
          title={SUB_TITLE[tab]}
          defaultLabels={SUB_DEFAULT_FIELDS[tab]}
        />
      )}
      {tab === 'nodes' && <NodesCard ctx={ctx} engineering={engineering} />}

      <DocumentsCard ctx={ctx} engineering={engineering} />
    </div>
  );
}

/* ───────────────────── Generic subsystem ───────────────────── */

function SubsystemCard({ ctx, engineering, subKey, title, defaultLabels }: {
  ctx: PassportCtx; engineering: EngineeringSectionData; subKey: SubKey; title: string; defaultLabels: string[];
}) {
  const t = useT();
  const sub: EngineeringSubsystem = engineering[subKey] || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialFields = (): KeyVal[] =>
    sub.fields && sub.fields.length > 0
      ? sub.fields
      : defaultLabels.map((label) => ({ id: newId(), label, value: '' }));

  const [status, setStatus] = useState<string>(sub.status || '');
  const [fields, setFields] = useState<KeyVal[]>(initialFields());
  const [supplierName, setSupplierName] = useState(sub.supplierName || '');
  const [supplierContract, setSupplierContract] = useState(sub.supplierContract || '');
  const [supplierPhone, setSupplierPhone] = useState(sub.supplierPhone || '');
  const [schemeUrl, setSchemeUrl] = useState<string | undefined>(sub.schemeUrl);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(sub.photoUrl);

  const reset = () => {
    setStatus(sub.status || '');
    setFields(initialFields());
    setSupplierName(sub.supplierName || '');
    setSupplierContract(sub.supplierContract || '');
    setSupplierPhone(sub.supplierPhone || '');
    setSchemeUrl(sub.schemeUrl);
    setPhotoUrl(sub.photoUrl);
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: EngineeringSectionData = {
        ...engineering,
        [subKey]: {
          status: (status || undefined) as SystemStatus | undefined,
          fields: fields.filter((f) => f.label.trim() || f.value.trim()),
          supplierName: supplierName.trim() || undefined,
          supplierContract: supplierContract.trim() || undefined,
          supplierPhone: supplierPhone.trim() || undefined,
          schemeUrl: schemeUrl || undefined,
          photoUrl: photoUrl || undefined,
        },
      };
      await ctx.savePassportSection('engineering', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const visibleFields = (sub.fields || []).filter((f) => f.label.trim());

  return (
    <Card
      title={title}
      status={!editing && sub.status ? <StatusDot status={sub.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('Характеристики')}</p>
            {visibleFields.length > 0 ? (
              <dl>{visibleFields.map((f) => <InfoRow key={f.id} label={f.label} value={f.value} />)}</dl>
            ) : <EmptyState text="Нет данных" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('Поставщик / Обслуживание')}</p>
            <FieldGroup>
              <Field label={t('Поставщик / Организация')} value={sub.supplierName} />
              <Field label={t('Договор №')} value={sub.supplierContract} />
              <Field label={t('Телефон')} value={sub.supplierPhone} />
            </FieldGroup>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {sub.schemeUrl ? (
              <a href={sub.schemeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-500 hover:underline">{t('Схема →')}</a>
            ) : <span className="text-xs text-gray-400">{t('Схема не загружена')}</span>}
            {sub.photoUrl ? (
              <a href={sub.photoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-500 hover:underline">{t('Фото узла →')}</a>
            ) : <span className="text-xs text-gray-400">{t('Фото узла не загружено')}</span>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Select label={t('Статус')} value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>
          <KeyValEditor fields={fields} onChange={setFields} title={t('Характеристики')} />
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t('Поставщик / Обслуживание')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <TextInput label={t('Поставщик / Организация')} value={supplierName} onChange={setSupplierName} />
              <TextInput label={t('Договор №')} value={supplierContract} onChange={setSupplierContract} />
              <TextInput label={t('Телефон')} value={supplierPhone} onChange={setSupplierPhone} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <FileSlot ctx={ctx} label={t('Схема')} url={schemeUrl} onChange={setSchemeUrl} />
            <FileSlot ctx={ctx} label={t('Фото узла')} url={photoUrl} onChange={setPhotoUrl} />
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Узлы и оборудование ───────────────────── */

function NodesCard({ ctx, engineering }: { ctx: PassportCtx; engineering: EngineeringSectionData }) {
  const t = useT();
  const nodes = engineering.nodes || [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<EngineeringNode[]>(nodes);

  const reset = () => setRows(engineering.nodes || []);
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: EngineeringSectionData = {
        ...engineering,
        nodes: rows.filter((r) => (r.name || '').trim()),
      };
      await ctx.savePassportSection('engineering', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const columns: EditableColumn<EngineeringNode>[] = [
    { key: 'name', label: 'Наименование', placeholder: 'Электрощит распределительный' },
    { key: 'model', label: 'Модель' },
    { key: 'location', label: 'Расположение' },
    { key: 'serial', label: 'Серийный номер' },
    { key: 'installDate', label: 'Дата установки' },
    { key: 'condition', label: 'Состояние', placeholder: 'Исправно' },
  ];

  return (
    <Card
      title={t('Узлы и оборудование')}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <DataTable
          rows={nodes}
          empty="Узлы и оборудование не добавлены"
          columns={[
            { key: 'name', label: 'Наименование' },
            { key: 'model', label: 'Модель' },
            { key: 'location', label: 'Расположение' },
            { key: 'serial', label: 'Серийный номер' },
            { key: 'installDate', label: 'Дата установки' },
            { key: 'condition', label: 'Состояние' },
          ]}
        />
      ) : (
        <EditableTable
          rows={rows}
          columns={columns}
          onChange={setRows}
          makeEmpty={() => ({ id: newId(), name: '' })}
          addLabel="Добавить узел"
        />
      )}
    </Card>
  );
}

/* ───────────────────── Документы по инженерным системам ───────────────────── */

function DocumentsCard({ ctx, engineering }: { ctx: PassportCtx; engineering: EngineeringSectionData }) {
  const t = useT();
  const docs = engineering.documents || [];
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
        await ctx.savePassportSection('engineering', { ...engineering, documents: [...docs, doc] });
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
      await ctx.savePassportSection('engineering', { ...engineering, documents: docs.filter((d) => d.id !== id) });
    } catch {
      /* toast handled in ctx */
    }
  };

  return (
    <Card
      title={t('Документы по инженерным системам')}
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
