'use client';

/**
 * Passport section 5 — "Безопасность и охрана".
 *
 * Renders a grid of cards (alarm / fire / video / access control / physical
 * security / emergency contacts / documents). The whole `security` object is
 * kept in local state and replaced via `ctx.savePassportSection('security', ...)`.
 */

import React, { useRef, useState } from 'react';
import type { PassportCtx } from '../usePassport';
import type {
  SecuritySectionData, SecuritySubsystem, SecurityZone, AccessPoint,
  CameraItem, AccessContact, KeyVal, PassportFile, SystemStatus,
} from '../types';
import { SYSTEM_STATUS_LABEL, newId } from '../types';
import {
  Card, FieldGroup, Field, InfoRow, StatusDot, Pill, TextInput, Select,
  EditToggle, GhostBtn, AddBtn, IconBtn, TrashIcon, EmptyState, FileChip,
  EditableTable, DataTable, EditableColumn,
} from '../primitives';

/* ───────────────────────── helpers ───────────────────────── */

const STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: 'active', label: SYSTEM_STATUS_LABEL.active },
  { value: 'inactive', label: SYSTEM_STATUS_LABEL.inactive },
  { value: 'maintenance', label: SYSTEM_STATUS_LABEL.maintenance },
  { value: 'fault', label: SYSTEM_STATUS_LABEL.fault },
];

const ONLINE_OPTIONS = [
  { value: 'online', label: SYSTEM_STATUS_LABEL.online },
  { value: 'offline', label: SYSTEM_STATUS_LABEL.offline },
];

function num(v: string): number | undefined {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
function str(v: number | undefined | null): string {
  return v === undefined || v === null ? '' : String(v);
}

export default function SecuritySection({ ctx }: { ctx: PassportCtx }) {
  const security: SecuritySectionData = ctx.passport.security || {};

  return (
    <div className="space-y-5">
      <AlarmCard ctx={ctx} security={security} />
      <FireSafetyCard ctx={ctx} security={security} />
      <VideoCard ctx={ctx} security={security} />
      <AccessControlCard ctx={ctx} security={security} />
      <PhysicalSecurityCard ctx={ctx} security={security} />
      <EmergencyContactsCard ctx={ctx} security={security} />
      <DocumentsCard ctx={ctx} security={security} />
    </div>
  );
}

/* ───────────────────── Охранная сигнализация ───────────────────── */

function AlarmCard({ ctx, security }: { ctx: PassportCtx; security: SecuritySectionData }) {
  const alarm = security.alarm || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(alarm.status || '');
  const [system, setSystem] = useState(alarm.system || '');
  const [serial, setSerial] = useState(alarm.serial || '');
  const [installDate, setInstallDate] = useState(alarm.installDate || '');
  const [serviceCompany, setServiceCompany] = useState(alarm.serviceCompany || '');
  const [contact, setContact] = useState(alarm.contact || '');
  const [contract, setContract] = useState(alarm.contract || '');
  const [lastService, setLastService] = useState(alarm.lastService || '');
  const [nextService, setNextService] = useState(alarm.nextService || '');
  const [zones, setZones] = useState<SecurityZone[]>(alarm.zones || []);

  const reset = () => {
    setStatus(alarm.status || '');
    setSystem(alarm.system || '');
    setSerial(alarm.serial || '');
    setInstallDate(alarm.installDate || '');
    setServiceCompany(alarm.serviceCompany || '');
    setContact(alarm.contact || '');
    setContract(alarm.contract || '');
    setLastService(alarm.lastService || '');
    setNextService(alarm.nextService || '');
    setZones(alarm.zones || []);
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: SecuritySectionData = {
        ...security,
        alarm: {
          status: (status || undefined) as SystemStatus | undefined,
          system: system.trim() || undefined,
          serial: serial.trim() || undefined,
          installDate: installDate.trim() || undefined,
          serviceCompany: serviceCompany.trim() || undefined,
          contact: contact.trim() || undefined,
          contract: contract.trim() || undefined,
          lastService: lastService.trim() || undefined,
          nextService: nextService.trim() || undefined,
          zones: zones.filter((z) => z.name.trim()),
        },
      };
      await ctx.savePassportSection('security', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Охранная сигнализация"
      status={!editing && alarm.status ? <StatusDot status={alarm.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <div className="space-y-4">
          <FieldGroup>
            <Field label="Система" value={alarm.system} />
            <Field label="Серийный номер" value={alarm.serial} />
            <Field label="Дата установки" value={alarm.installDate} />
            <Field label="Обслуживающая компания" value={alarm.serviceCompany} />
            <Field label="Контакт" value={alarm.contact} />
            <Field label="Договор" value={alarm.contract} />
            <Field label="Последнее обслуживание" value={alarm.lastService} />
            <Field label="Следующее ТО" value={alarm.nextService} />
          </FieldGroup>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Разделы / Зоны</p>
            {alarm.zones && alarm.zones.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {alarm.zones.map((z) => <Pill key={z.id} label={z.name} />)}
              </div>
            ) : <EmptyState text="Зоны не указаны" />}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <TextInput label="Система" value={system} onChange={setSystem} placeholder="Ajax Hub 2 Plus" />
            <TextInput label="Серийный номер" value={serial} onChange={setSerial} />
            <TextInput label="Дата установки" value={installDate} onChange={setInstallDate} placeholder="01.01.2024" />
            <TextInput label="Обслуживающая компания" value={serviceCompany} onChange={setServiceCompany} />
            <TextInput label="Контакт" value={contact} onChange={setContact} />
            <TextInput label="Договор" value={contract} onChange={setContract} />
            <TextInput label="Последнее обслуживание" value={lastService} onChange={setLastService} />
            <TextInput label="Следующее ТО" value={nextService} onChange={setNextService} />
          </div>
          <ZoneEditor zones={zones} onChange={setZones} />
        </div>
      )}
    </Card>
  );
}

function ZoneEditor({ zones, onChange }: { zones: SecurityZone[]; onChange: (z: SecurityZone[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const name = draft.trim();
    if (!name) return;
    onChange([...zones, { id: newId(), name }]);
    setDraft('');
  };
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Разделы / Зоны</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {zones.map((z) => (
          <span key={z.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {z.name}
            <button type="button" onClick={() => onChange(zones.filter((x) => x.id !== z.id))} className="text-gray-400 hover:text-red-500">×</button>
          </span>
        ))}
        {zones.length === 0 && <span className="text-xs text-gray-400">Зоны не указаны</span>}
      </div>
      <div className="flex items-center gap-2">
        <input
          className="form-input text-sm flex-1 max-w-xs"
          value={draft}
          placeholder="Название зоны"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <AddBtn onClick={add}>Добавить зону</AddBtn>
      </div>
    </div>
  );
}

/* ───────────────────── Пожарная безопасность ───────────────────── */

const FIRE_DEFAULT_LABELS = ['Датчики дыма', 'Извещатели', 'Оповещатели', 'Ручные извещатели'];

function FireSafetyCard({ ctx, security }: { ctx: PassportCtx; security: SecuritySectionData }) {
  const fire = security.fireSafety || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(fire.status || '');
  const [system, setSystem] = useState(fire.system || '');
  const [serial, setSerial] = useState(fire.serial || '');
  const [installDate, setInstallDate] = useState(fire.installDate || '');
  const [serviceCompany, setServiceCompany] = useState(fire.serviceCompany || '');
  const [contact, setContact] = useState(fire.contact || '');
  const [contract, setContract] = useState(fire.contract || '');
  const [lastService, setLastService] = useState(fire.lastService || '');
  const [nextService, setNextService] = useState(fire.nextService || '');
  const [fields, setFields] = useState<KeyVal[]>(
    fire.fields && fire.fields.length > 0
      ? fire.fields
      : FIRE_DEFAULT_LABELS.map((label) => ({ id: newId(), label, value: '' })),
  );

  const reset = () => {
    setStatus(fire.status || '');
    setSystem(fire.system || '');
    setSerial(fire.serial || '');
    setInstallDate(fire.installDate || '');
    setServiceCompany(fire.serviceCompany || '');
    setContact(fire.contact || '');
    setContract(fire.contract || '');
    setLastService(fire.lastService || '');
    setNextService(fire.nextService || '');
    setFields(fire.fields && fire.fields.length > 0
      ? fire.fields
      : FIRE_DEFAULT_LABELS.map((label) => ({ id: newId(), label, value: '' })));
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: SecuritySectionData = {
        ...security,
        fireSafety: {
          status: (status || undefined) as SystemStatus | undefined,
          system: system.trim() || undefined,
          serial: serial.trim() || undefined,
          installDate: installDate.trim() || undefined,
          serviceCompany: serviceCompany.trim() || undefined,
          contact: contact.trim() || undefined,
          contract: contract.trim() || undefined,
          lastService: lastService.trim() || undefined,
          nextService: nextService.trim() || undefined,
          fields: fields.filter((f) => f.label.trim() || f.value.trim()),
        },
      };
      await ctx.savePassportSection('security', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const visibleFields = (fire.fields || []).filter((f) => f.label.trim());

  return (
    <Card
      title="Пожарная безопасность"
      status={!editing && fire.status ? <StatusDot status={fire.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <div className="space-y-4">
          <FieldGroup>
            <Field label="Система" value={fire.system} />
            <Field label="Серийный номер" value={fire.serial} />
            <Field label="Дата установки" value={fire.installDate} />
            <Field label="Обслуживающая компания" value={fire.serviceCompany} />
            <Field label="Контакт" value={fire.contact} />
            <Field label="Договор" value={fire.contract} />
            <Field label="Последняя проверка" value={fire.lastService} />
            <Field label="Следующая проверка" value={fire.nextService} />
          </FieldGroup>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Оборудование</p>
            {visibleFields.length > 0 ? (
              <dl>{visibleFields.map((f) => <InfoRow key={f.id} label={f.label} value={f.value} />)}</dl>
            ) : <EmptyState text="Нет данных" />}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <TextInput label="Система" value={system} onChange={setSystem} />
            <TextInput label="Серийный номер" value={serial} onChange={setSerial} />
            <TextInput label="Дата установки" value={installDate} onChange={setInstallDate} />
            <TextInput label="Обслуживающая компания" value={serviceCompany} onChange={setServiceCompany} />
            <TextInput label="Контакт" value={contact} onChange={setContact} />
            <TextInput label="Договор" value={contract} onChange={setContract} />
            <TextInput label="Последняя проверка" value={lastService} onChange={setLastService} />
            <TextInput label="Следующая проверка" value={nextService} onChange={setNextService} />
          </div>
          <KeyValEditor fields={fields} onChange={setFields} />
        </div>
      )}
    </Card>
  );
}

function KeyValEditor({ fields, onChange }: { fields: KeyVal[]; onChange: (f: KeyVal[]) => void }) {
  const update = (id: string, key: 'label' | 'value', value: string) =>
    onChange(fields.map((f) => f.id === id ? { ...f, [key]: value } : f));
  const remove = (id: string) => onChange(fields.filter((f) => f.id !== id));
  const add = () => onChange([...fields, { id: newId(), label: '', value: '' }]);
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Оборудование</p>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            <input className="form-input text-sm flex-1" value={f.label} placeholder="Название" onChange={(e) => update(f.id, 'label', e.target.value)} />
            <input className="form-input text-sm w-32" value={f.value} placeholder="Значение" onChange={(e) => update(f.id, 'value', e.target.value)} />
            <IconBtn danger title="Удалить" onClick={() => remove(f.id)}><TrashIcon className="w-4 h-4" /></IconBtn>
          </div>
        ))}
      </div>
      <div className="mt-2"><AddBtn onClick={add}>Добавить строку</AddBtn></div>
    </div>
  );
}

/* ───────────────────── Видеонаблюдение ───────────────────── */

function VideoCard({ ctx, security }: { ctx: PassportCtx; security: SecuritySectionData }) {
  const video = security.video || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(video.status || '');
  const [system, setSystem] = useState(video.system || '');
  const [serial, setSerial] = useState(video.serial || '');
  const [installDate, setInstallDate] = useState(video.installDate || '');
  const [serviceCompany, setServiceCompany] = useState(video.serviceCompany || '');
  const [contact, setContact] = useState(video.contact || '');
  const [archiveDays, setArchiveDays] = useState(str(video.archiveDays));
  const [cameras, setCameras] = useState<CameraItem[]>(video.cameras || []);

  const reset = () => {
    setStatus(video.status || '');
    setSystem(video.system || '');
    setSerial(video.serial || '');
    setInstallDate(video.installDate || '');
    setServiceCompany(video.serviceCompany || '');
    setContact(video.contact || '');
    setArchiveDays(str(video.archiveDays));
    setCameras(video.cameras || []);
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: SecuritySectionData = {
        ...security,
        video: {
          status: (status || undefined) as SystemStatus | undefined,
          system: system.trim() || undefined,
          serial: serial.trim() || undefined,
          installDate: installDate.trim() || undefined,
          serviceCompany: serviceCompany.trim() || undefined,
          contact: contact.trim() || undefined,
          archiveDays: num(archiveDays),
          cameras: cameras.filter((c) => (c.name || '').trim()).map((c, i) => ({ ...c, index: i + 1 })),
        },
      };
      await ctx.savePassportSection('security', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const cameraColumns: EditableColumn<CameraItem>[] = [
    { key: 'name', label: 'Название', placeholder: 'Входная дверь' },
    { key: 'location', label: 'Местоположение' },
    { key: 'ip', label: 'IP-адрес' },
    { key: 'status', label: 'Статус', type: 'select', options: ONLINE_OPTIONS },
  ];

  return (
    <Card
      title="Видеонаблюдение"
      status={!editing && video.status ? <StatusDot status={video.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <div className="space-y-4">
          <FieldGroup>
            <Field label="Система" value={video.system} />
            <Field label="Серийный номер" value={video.serial} />
            <Field label="Дата установки" value={video.installDate} />
            <Field label="Обслуживающая компания" value={video.serviceCompany} />
            <Field label="Контакт" value={video.contact} />
            <Field label="Хранение архива (дней)" value={video.archiveDays} />
          </FieldGroup>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Камеры</p>
            <DataTable
              rows={video.cameras || []}
              empty="Камеры не добавлены"
              columns={[
                { label: '#', render: (c) => c.index ?? '—', width: '40px' },
                { key: 'name', label: 'Название' },
                { key: 'location', label: 'Местоположение' },
                { key: 'ip', label: 'IP-адрес' },
                { label: 'Статус', render: (c) => <StatusDot status={c.status} /> },
              ]}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <TextInput label="Система" value={system} onChange={setSystem} />
            <TextInput label="Серийный номер" value={serial} onChange={setSerial} />
            <TextInput label="Дата установки" value={installDate} onChange={setInstallDate} />
            <TextInput label="Обслуживающая компания" value={serviceCompany} onChange={setServiceCompany} />
            <TextInput label="Контакт" value={contact} onChange={setContact} />
            <TextInput label="Хранение архива (дней)" value={archiveDays} onChange={setArchiveDays} type="number" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Камеры</p>
            <EditableTable
              rows={cameras}
              columns={cameraColumns}
              onChange={setCameras}
              makeEmpty={() => ({ id: newId(), name: '', status: 'online' })}
              addLabel="Добавить камеру"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── СКУД и контроль доступа ───────────────────── */

function AccessControlCard({ ctx, security }: { ctx: PassportCtx; security: SecuritySectionData }) {
  const ac = security.accessControl || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(ac.status || '');
  const [system, setSystem] = useState(ac.system || '');
  const [controller, setController] = useState(ac.controller || '');
  const [serial, setSerial] = useState(ac.serial || '');
  const [installDate, setInstallDate] = useState(ac.installDate || '');
  const [serviceCompany, setServiceCompany] = useState(ac.serviceCompany || '');
  const [contact, setContact] = useState(ac.contact || '');
  const [points, setPoints] = useState<AccessPoint[]>(ac.points || []);

  const reset = () => {
    setStatus(ac.status || '');
    setSystem(ac.system || '');
    setController(ac.controller || '');
    setSerial(ac.serial || '');
    setInstallDate(ac.installDate || '');
    setServiceCompany(ac.serviceCompany || '');
    setContact(ac.contact || '');
    setPoints(ac.points || []);
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: SecuritySectionData = {
        ...security,
        accessControl: {
          status: (status || undefined) as SystemStatus | undefined,
          system: system.trim() || undefined,
          controller: controller.trim() || undefined,
          serial: serial.trim() || undefined,
          installDate: installDate.trim() || undefined,
          serviceCompany: serviceCompany.trim() || undefined,
          contact: contact.trim() || undefined,
          points: points.filter((p) => (p.name || '').trim()).map((p, i) => ({ ...p, index: i + 1 })),
        },
      };
      await ctx.savePassportSection('security', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const pointColumns: EditableColumn<AccessPoint>[] = [
    { key: 'name', label: 'Точка доступа', placeholder: 'Входная дверь' },
    { key: 'location', label: 'Местоположение' },
    { key: 'status', label: 'Статус', type: 'select', options: ONLINE_OPTIONS },
  ];

  return (
    <Card
      title="СКУД и контроль доступа"
      status={!editing && ac.status ? <StatusDot status={ac.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <div className="space-y-4">
          <FieldGroup>
            <Field label="Система" value={ac.system} />
            <Field label="Контроллер" value={ac.controller} />
            <Field label="Серийный номер" value={ac.serial} />
            <Field label="Дата установки" value={ac.installDate} />
            <Field label="Обслуживающая компания" value={ac.serviceCompany} />
            <Field label="Контакт" value={ac.contact} />
          </FieldGroup>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Точки доступа</p>
            <DataTable
              rows={ac.points || []}
              empty="Точки доступа не добавлены"
              columns={[
                { label: '#', render: (p) => p.index ?? '—', width: '40px' },
                { key: 'name', label: 'Точка доступа' },
                { key: 'location', label: 'Местоположение' },
                { label: 'Статус', render: (p) => <StatusDot status={p.status} /> },
              ]}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <TextInput label="Система" value={system} onChange={setSystem} />
            <TextInput label="Контроллер" value={controller} onChange={setController} />
            <TextInput label="Серийный номер" value={serial} onChange={setSerial} />
            <TextInput label="Дата установки" value={installDate} onChange={setInstallDate} />
            <TextInput label="Обслуживающая компания" value={serviceCompany} onChange={setServiceCompany} />
            <TextInput label="Контакт" value={contact} onChange={setContact} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Точки доступа</p>
            <EditableTable
              rows={points}
              columns={pointColumns}
              onChange={setPoints}
              makeEmpty={() => ({ id: newId(), name: '', status: 'online' })}
              addLabel="Добавить точку доступа"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Физическая охрана ───────────────────── */

function PhysicalSecurityCard({ ctx, security }: { ctx: PassportCtx; security: SecuritySectionData }) {
  const ps = security.physicalSecurity || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(ps.status || '');
  const [org, setOrg] = useState(ps.org || '');
  const [form, setForm] = useState(ps.form || '');
  const [contract, setContract] = useState(ps.contract || '');
  const [manager, setManager] = useState(ps.manager || '');
  const [phone, setPhone] = useState(ps.phone || '');
  const [mode, setMode] = useState(ps.mode || '');
  const [postName, setPostName] = useState(ps.postName || '');
  const [postSchedule, setPostSchedule] = useState(ps.postSchedule || '');

  const reset = () => {
    setStatus(ps.status || '');
    setOrg(ps.org || '');
    setForm(ps.form || '');
    setContract(ps.contract || '');
    setManager(ps.manager || '');
    setPhone(ps.phone || '');
    setMode(ps.mode || '');
    setPostName(ps.postName || '');
    setPostSchedule(ps.postSchedule || '');
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: SecuritySectionData = {
        ...security,
        physicalSecurity: {
          status: (status || undefined) as SystemStatus | undefined,
          org: org.trim() || undefined,
          form: form.trim() || undefined,
          contract: contract.trim() || undefined,
          manager: manager.trim() || undefined,
          phone: phone.trim() || undefined,
          mode: mode.trim() || undefined,
          postName: postName.trim() || undefined,
          postSchedule: postSchedule.trim() || undefined,
        },
      };
      await ctx.savePassportSection('security', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Физическая охрана"
      status={!editing && ps.status ? <StatusDot status={ps.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <FieldGroup>
          <Field label="Охранная организация" value={ps.org} />
          <Field label="Форма охраны" value={ps.form} />
          <Field label="Номер договора" value={ps.contract} />
          <Field label="Ответственный менеджер" value={ps.manager} />
          <Field label="Телефон" value={ps.phone} />
          <Field label="Режим охраны" value={ps.mode} />
          <Field label="Пост охраны" value={ps.postName} />
          <Field label="График работы" value={ps.postSchedule} />
        </FieldGroup>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <TextInput label="Охранная организация" value={org} onChange={setOrg} />
          <TextInput label="Форма охраны" value={form} onChange={setForm} placeholder="Пультовая охрана" />
          <TextInput label="Номер договора" value={contract} onChange={setContract} />
          <TextInput label="Ответственный менеджер" value={manager} onChange={setManager} />
          <TextInput label="Телефон" value={phone} onChange={setPhone} />
          <TextInput label="Режим охраны" value={mode} onChange={setMode} placeholder="Круглосуточно" />
          <TextInput label="Пост охраны" value={postName} onChange={setPostName} />
          <TextInput label="График работы" value={postSchedule} onChange={setPostSchedule} />
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Аварийные контакты ───────────────────── */

function EmergencyContactsCard({ ctx, security }: { ctx: PassportCtx; security: SecuritySectionData }) {
  const contacts = security.emergencyContacts || [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<AccessContact[]>(contacts);

  const reset = () => setRows(security.emergencyContacts || []);
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: SecuritySectionData = {
        ...security,
        emergencyContacts: rows.filter((r) => (r.type || '').trim() || (r.org || '').trim() || (r.phone || '').trim()),
      };
      await ctx.savePassportSection('security', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const columns: EditableColumn<AccessContact>[] = [
    { key: 'type', label: 'Тип / Служба', placeholder: 'Аварийная служба' },
    { key: 'org', label: 'Организация / ФИО' },
    { key: 'phone', label: 'Телефон' },
    { key: 'note', label: 'Примечание', placeholder: 'Круглосуточно' },
  ];

  return (
    <Card
      title="Аварийные контакты"
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <DataTable
          rows={contacts}
          empty="Контакты не добавлены"
          columns={[
            { key: 'type', label: 'Тип / Служба' },
            { key: 'org', label: 'Организация / ФИО' },
            { key: 'phone', label: 'Телефон' },
            { key: 'note', label: 'Примечание' },
          ]}
        />
      ) : (
        <EditableTable
          rows={rows}
          columns={columns}
          onChange={setRows}
          makeEmpty={() => ({ id: newId() })}
          addLabel="Добавить контакт"
        />
      )}
    </Card>
  );
}

/* ───────────────────── Документы и акты ───────────────────── */

function DocumentsCard({ ctx, security }: { ctx: PassportCtx; security: SecuritySectionData }) {
  const docs = security.documents || [];
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
        await ctx.savePassportSection('security', { ...security, documents: [...docs, doc] });
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
      await ctx.savePassportSection('security', { ...security, documents: docs.filter((d) => d.id !== id) });
    } catch {
      /* toast handled in ctx */
    }
  };

  return (
    <Card
      title="Документы и акты"
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
