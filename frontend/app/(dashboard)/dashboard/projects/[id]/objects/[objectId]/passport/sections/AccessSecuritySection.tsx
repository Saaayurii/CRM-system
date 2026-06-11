'use client';

/**
 * Passport section 2 — "Доступ и безопасность".
 *
 * The whole section lives in `passport.access` (AccessSectionData). Every card
 * edits its own slice of a single local copy of the access object; on save the
 * merged object is persisted with `savePassportSection('access', merged)` —
 * a whole-section replace.
 */

import React, { useRef, useState } from 'react';
import type { PassportCtx } from '../usePassport';
import type {
  AccessSectionData, AccessKey, AccessCode, AccessPass, AccessContact,
  AccessRestrictions, AccessSchemeStep,
} from '../types';
import { newId } from '../types';
import {
  Card, Grid, InfoRow, EditableTable, DataTable, EditToggle, EditableColumn,
  TextInput, TextArea, Select, GhostBtn, IconBtn, AddBtn, TrashIcon, EmptyState,
} from '../primitives';
import { useT } from '@/lib/i18n';

const ADD_INFO_MAX = 1000;

export default function AccessSecuritySection({ ctx }: { ctx: PassportCtx }) {
  const t = useT();
  const access: AccessSectionData = ctx.passport.access || {};

  /** Merge a partial patch into the full access object and persist it. */
  const saveAccess = (patch: Partial<AccessSectionData>) =>
    ctx.savePassportSection('access', { ...access, ...patch });

  const keys = access.keys || [];
  const passes = access.passes || [];
  const totalKeys = keys.reduce((s, k) => s + (Number(k.count) || 0), 0);

  return (
    <div className="space-y-5">
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Данные о ключах, кодах, пропусках и правилах доступа.
        </p>
      </Card>

      <Grid cols={2}>
        <KeysCard access={access} saveAccess={saveAccess} totalKeys={totalKeys} count={keys.length} />
        <CodesCard access={access} saveAccess={saveAccess} />
        <PassesCard access={access} saveAccess={saveAccess} />
        <RestrictionsCard access={access} saveAccess={saveAccess} />
        <ContactsCard access={access} saveAccess={saveAccess} />
        <SchemeCard ctx={ctx} access={access} saveAccess={saveAccess} />
      </Grid>

      <AdditionalInfoCard access={access} saveAccess={saveAccess} />
    </div>
  );
}

/* Generic editable-list card: holds a draft array, toggles edit/view. */
function ListCard<T extends { id: string }>({
  title, status, rows, columns, makeEmpty, addLabel, onSave, viewColumns, emptyText, footer,
}: {
  title: string;
  status?: React.ReactNode;
  rows: T[];
  columns: EditableColumn<T>[];
  makeEmpty: () => T;
  addLabel?: string;
  onSave: (rows: T[]) => Promise<void>;
  viewColumns: { key?: keyof T; label: string; render?: (r: T) => React.ReactNode; width?: string }[];
  emptyText?: string;
  footer?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<T[]>(rows);

  const start = () => { setDraft(rows); setEditing(true); };
  const cancel = () => { setDraft(rows); setEditing(false); };
  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title={title}
      status={status}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {editing ? (
        <EditableTable rows={draft} columns={columns} onChange={setDraft} makeEmpty={makeEmpty} addLabel={addLabel} />
      ) : (
        <DataTable rows={rows} columns={viewColumns} empty={emptyText} />
      )}
      {footer}
    </Card>
  );
}

/* ───────────────────── Ключи ───────────────────── */

function KeysCard({ access, saveAccess, totalKeys, count }: {
  access: AccessSectionData;
  saveAccess: (patch: Partial<AccessSectionData>) => Promise<void>;
  totalKeys: number;
  count: number;
}) {
  const t = useT();
  const rows = access.keys || [];
  const columns: EditableColumn<AccessKey>[] = [
    { key: 'description', label: 'Описание', placeholder: 'Основной комплект' },
    { key: 'location', label: 'Где находится', placeholder: 'У собственника' },
    { key: 'count', label: 'Кол-во', type: 'number', width: '80px' },
    { key: 'responsible', label: 'Ответственный' },
    { key: 'note', label: 'Примечание' },
  ];
  return (
    <ListCard<AccessKey>
      title={t('Ключи')}
      rows={rows}
      columns={columns}
      makeEmpty={() => ({ id: newId() })}
      addLabel="Добавить комплект"
      onSave={(keys) => saveAccess({ keys })}
      viewColumns={[
        { key: 'description', label: 'Описание' },
        { key: 'location', label: 'Где находится' },
        { key: 'count', label: 'Кол-во' },
        { key: 'responsible', label: 'Ответственный' },
        { key: 'note', label: 'Примечание' },
      ]}
      emptyText="Нет ключей"
      footer={
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Всего комплектов: <span className="font-semibold text-gray-800 dark:text-gray-100">{totalKeys || count}</span>
        </div>
      }
    />
  );
}

/* ───────────────────── Коды доступа ───────────────────── */

function CodesCard({ access, saveAccess }: {
  access: AccessSectionData;
  saveAccess: (patch: Partial<AccessSectionData>) => Promise<void>;
}) {
  const t = useT();
  const rows = access.codes || [];
  const columns: EditableColumn<AccessCode>[] = [
    { key: 'type', label: 'Тип доступа', placeholder: 'Домофон (подъезд)' },
    { key: 'code', label: 'Код', placeholder: '1234' },
    { key: 'note', label: 'Примечание' },
  ];
  return (
    <ListCard<AccessCode>
      title={t('Коды доступа')}
      rows={rows}
      columns={columns}
      makeEmpty={() => ({ id: newId() })}
      addLabel="Добавить код"
      onSave={(codes) => saveAccess({ codes })}
      viewColumns={[
        { key: 'type', label: 'Тип доступа' },
        { key: 'code', label: 'Код' },
        { key: 'note', label: 'Примечание' },
      ]}
      emptyText="Нет кодов доступа"
    />
  );
}

/* ───────────────────── Пропуски и брелоки ───────────────────── */

function PassesCard({ access, saveAccess }: {
  access: AccessSectionData;
  saveAccess: (patch: Partial<AccessSectionData>) => Promise<void>;
}) {
  const t = useT();
  const rows = access.passes || [];
  const columns: EditableColumn<AccessPass>[] = [
    { key: 'type', label: 'Тип', placeholder: 'Пропуск в паркинг' },
    { key: 'number', label: 'Номер', placeholder: '№001' },
    { key: 'validUntil', label: 'Срок действия', placeholder: '31.12.2026' },
    { key: 'note', label: 'Примечание' },
  ];
  return (
    <ListCard<AccessPass>
      title={t('Пропуски и брелоки')}
      rows={rows}
      columns={columns}
      makeEmpty={() => ({ id: newId() })}
      addLabel="Добавить пропуск"
      onSave={(passes) => saveAccess({ passes })}
      viewColumns={[
        { key: 'type', label: 'Тип' },
        { key: 'number', label: 'Номер' },
        { key: 'validUntil', label: 'Срок действия' },
        { key: 'note', label: 'Примечание' },
      ]}
      emptyText="Нет пропусков"
      footer={
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Всего пропусков и брелоков: <span className="font-semibold text-gray-800 dark:text-gray-100">{rows.length}</span>
        </div>
      }
    />
  );
}

/* ───────────────────── Контакты для доступа ───────────────────── */

function ContactsCard({ access, saveAccess }: {
  access: AccessSectionData;
  saveAccess: (patch: Partial<AccessSectionData>) => Promise<void>;
}) {
  const t = useT();
  const rows = access.contacts || [];
  const columns: EditableColumn<AccessContact>[] = [
    { key: 'type', label: 'Тип контакта', placeholder: 'Аварийная служба' },
    { key: 'org', label: 'Организация / ФИО' },
    { key: 'phone', label: 'Телефон' },
    { key: 'note', label: 'Примечание' },
  ];
  return (
    <ListCard<AccessContact>
      title={t('Контакты для доступа и аварийные службы')}
      rows={rows}
      columns={columns}
      makeEmpty={() => ({ id: newId() })}
      addLabel="Добавить контакт"
      onSave={(contacts) => saveAccess({ contacts })}
      viewColumns={[
        { key: 'type', label: 'Тип контакта' },
        { key: 'org', label: 'Организация / ФИО' },
        { key: 'phone', label: 'Телефон' },
        { key: 'note', label: 'Примечание' },
      ]}
      emptyText="Нет контактов"
    />
  );
}

/* ───────────────────── Ограничения доступа ───────────────────── */

const WEEKEND_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Разрешена', label: 'Разрешена' },
  { value: 'Запрещена', label: 'Запрещена' },
];
const NOISY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Разрешены', label: 'Разрешены' },
  { value: 'Запрещены', label: 'Запрещены' },
];

function RestrictionsCard({ access, saveAccess }: {
  access: AccessSectionData;
  saveAccess: (patch: Partial<AccessSectionData>) => Promise<void>;
}) {
  const t = useT();
  const r: AccessRestrictions = access.restrictions || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [accessTime, setAccessTime] = useState(r.accessTime || '');
  const [weekendWork, setWeekendWork] = useState(r.weekendWork || '');
  const [noisyWork, setNoisyWork] = useState(r.noisyWork || '');
  const [approvalNeeded, setApprovalNeeded] = useState(!!r.approvalNeeded);
  const [approver, setApprover] = useState(r.approver || '');
  const [specialConditions, setSpecialConditions] = useState(r.specialConditions || '');

  const reset = () => {
    setAccessTime(r.accessTime || '');
    setWeekendWork(r.weekendWork || '');
    setNoisyWork(r.noisyWork || '');
    setApprovalNeeded(!!r.approvalNeeded);
    setApprover(r.approver || '');
    setSpecialConditions(r.specialConditions || '');
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };
  const save = async () => {
    setSaving(true);
    try {
      const restrictions: AccessRestrictions = {
        accessTime: accessTime.trim() || undefined,
        weekendWork: weekendWork || undefined,
        noisyWork: noisyWork || undefined,
        approvalNeeded,
        approver: approver.trim() || undefined,
        specialConditions: specialConditions.trim() || undefined,
      };
      await saveAccess({ restrictions });
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title={t('Ограничения доступа')}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <dl>
          <InfoRow label={t('Время доступа')} value={r.accessTime} />
          <InfoRow label={t('Работа в выходные')} value={r.weekendWork} />
          <InfoRow label={t('Шумные работы')} value={r.noisyWork} />
          <InfoRow label={t('Требуется согласование')} value={r.approvalNeeded ? 'Да' : 'Нет'} />
          <InfoRow label={t('Ответственный за согласование')} value={r.approver} />
          <InfoRow label={t('Особые условия')} value={r.specialConditions} />
        </dl>
      ) : (
        <div className="space-y-3">
          <TextInput label={t('Время доступа')} value={accessTime} onChange={setAccessTime} placeholder="08:00 – 21:00" />
          <Select label={t('Работа в выходные')} value={weekendWork} onChange={setWeekendWork} options={WEEKEND_OPTIONS} />
          <Select label={t('Шумные работы')} value={noisyWork} onChange={setNoisyWork} options={NOISY_OPTIONS} />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" className="form-checkbox" checked={approvalNeeded} onChange={(e) => setApprovalNeeded(e.target.checked)} />
            Требуется согласование
          </label>
          <TextInput label={t('Ответственный за согласование')} value={approver} onChange={setApprover} />
          <TextArea label={t('Особые условия')} value={specialConditions} onChange={setSpecialConditions} rows={3} />
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Схема доступа на объект ───────────────────── */

function SchemeCard({ ctx, access, saveAccess }: {
  ctx: PassportCtx;
  access: AccessSectionData;
  saveAccess: (patch: Partial<AccessSectionData>) => Promise<void>;
}) {
  const t = useT();
  const steps = access.scheme || [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AccessSchemeStep[]>(steps);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => { setDraft(steps); setEditing(true); };
  const cancel = () => { setDraft(steps); setEditing(false); };
  const save = async () => {
    setSaving(true);
    try {
      const ordered = draft.map((s, i) => ({ ...s, order: i + 1 }));
      await saveAccess({ scheme: ordered });
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const updateStep = (id: string, patch: Partial<AccessSchemeStep>) =>
    setDraft((d) => d.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeStep = (id: string) => setDraft((d) => d.filter((s) => s.id !== id));
  const addStep = () => setDraft((d) => [...d, { id: newId(), order: d.length + 1, title: '' }]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await ctx.uploadFile(file);
      if (url) await saveAccess({ schemeUrl: url });
    } catch {
      /* toast handled in ctx */
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const removeScheme = async () => {
    setBusy(true);
    try {
      const next = { ...access };
      delete next.schemeUrl;
      await ctx.savePassportSection('access', next);
    } catch {
      /* toast handled in ctx */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={t('Схема доступа на объект')}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        steps.length ? (
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.id} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 text-xs font-semibold flex items-center justify-center">{s.order}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{s.title || '—'}</p>
                  {s.detail && <p className="text-xs text-gray-500 dark:text-gray-400">{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState text="Схема не заполнена" />
        )
      ) : (
        <div className="space-y-2">
          {draft.map((s, i) => (
            <div key={s.id} className="flex items-start gap-2">
              <span className="shrink-0 w-6 h-6 mt-2 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 text-xs font-semibold flex items-center justify-center">{i + 1}</span>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <TextInput value={s.title} onChange={(v) => updateStep(s.id, { title: v })} placeholder={t('Этап')} />
                <TextInput value={s.detail || ''} onChange={(v) => updateStep(s.id, { detail: v })} placeholder={t('Описание')} />
              </div>
              <IconBtn danger title={t('Удалить')} onClick={() => removeStep(s.id)}><TrashIcon className="w-4 h-4" /></IconBtn>
            </div>
          ))}
          <AddBtn onClick={addStep}>{t('Добавить этап')}</AddBtn>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 flex items-center gap-2 flex-wrap">
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
        <GhostBtn onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Загрузка...' : access.schemeUrl ? 'Заменить схему' : 'Загрузить схему'}
        </GhostBtn>
        {access.schemeUrl && (
          <>
            <a href={access.schemeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-600 dark:text-violet-400 hover:underline truncate">
              Открыть схему
            </a>
            <IconBtn danger title={t('Удалить схему')} onClick={removeScheme}><TrashIcon className="w-4 h-4" /></IconBtn>
          </>
        )}
      </div>
    </Card>
  );
}

/* ───────────────────── Дополнительная информация ───────────────────── */

function AdditionalInfoCard({ access, saveAccess }: {
  access: AccessSectionData;
  saveAccess: (patch: Partial<AccessSectionData>) => Promise<void>;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState(access.additionalInfo || '');

  const reset = () => setText(access.additionalInfo || '');
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };
  const save = async () => {
    setSaving(true);
    try {
      await saveAccess({ additionalInfo: text.trim() || undefined });
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title={t('Дополнительная информация')}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        access.additionalInfo
          ? <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{access.additionalInfo}</p>
          : <EmptyState text="Нет дополнительной информации" />
      ) : (
        <div className="space-y-1">
          <TextArea
            value={text.slice(0, ADD_INFO_MAX)}
            onChange={(v) => setText(v.slice(0, ADD_INFO_MAX))}
            rows={4}
            placeholder={t('Дополнительная информация...')}
          />
          <div className="text-right text-xs text-gray-400">{text.length}/{ADD_INFO_MAX}</div>
        </div>
      )}
    </Card>
  );
}
