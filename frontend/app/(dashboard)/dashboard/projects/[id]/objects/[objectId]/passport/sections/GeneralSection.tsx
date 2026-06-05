'use client';

/**
 * Passport section 1 — "Общая информация".
 *
 * Splits its saves: core site fields (name/address/areaSize/description) go to
 * `ctx.saveCore`, everything else lives inside `passport.general` and is saved
 * via `ctx.savePassportSection('general', ...)` (whole-section replace).
 */

import React, { useRef, useState } from 'react';
import type { PassportCtx } from '../usePassport';
import type { GeneralSectionData, PartyContact } from '../types';
import {
  Card, FieldGroup, Field, TextInput, TextArea, Select, EditToggle,
  GhostBtn, IconBtn, TrashIcon, EmptyState,
} from '../primitives';

/* ───────────────────────── helpers ───────────────────────── */

const OBJECT_TYPE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Квартира', label: 'Квартира' },
  { value: 'Дом', label: 'Дом' },
  { value: 'Офис', label: 'Офис' },
  { value: 'Склад', label: 'Склад' },
  { value: 'Помещение', label: 'Помещение' },
  { value: 'Другое', label: 'Другое' },
];

const PURPOSE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Жилое', label: 'Жилое' },
  { value: 'Коммерческое', label: 'Коммерческое' },
  { value: 'Производственное', label: 'Производственное' },
  { value: 'Другое', label: 'Другое' },
];

/** Convert a numeric string field to number | undefined. */
function num(v: string): number | undefined {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
function str(v: number | undefined | null): string {
  return v === undefined || v === null ? '' : String(v);
}

export default function GeneralSection({ ctx }: { ctx: PassportCtx }) {
  const general: GeneralSectionData = ctx.passport.general || {};

  return (
    <div className="space-y-5">
      <MainInfoCard ctx={ctx} general={general} />
      <OwnerUkCard ctx={ctx} general={general} />
      <DescriptionCard ctx={ctx} />
      <PhotoCard ctx={ctx} general={general} />
    </div>
  );
}

/* ───────────────────── Общая информация ───────────────────── */

function MainInfoCard({ ctx, general }: { ctx: PassportCtx; general: GeneralSectionData }) {
  const site = ctx.site;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Core fields (saved via saveCore)
  const [name, setName] = useState(site?.name || '');
  const [address, setAddress] = useState(site?.address || '');
  const [areaSize, setAreaSize] = useState(str(site?.areaSize));
  // Passport.general fields
  const [objectType, setObjectType] = useState(general.objectType || '');
  const [purpose, setPurpose] = useState(general.purpose || '');
  const [floor, setFloor] = useState(str(general.floor));
  const [totalFloors, setTotalFloors] = useState(str(general.totalFloors));
  const [yearBuilt, setYearBuilt] = useState(str(general.yearBuilt));
  const [ceilingHeight, setCeilingHeight] = useState(str(general.ceilingHeight));
  const [roomCount, setRoomCount] = useState(str(general.roomCount));

  const reset = () => {
    setName(site?.name || '');
    setAddress(site?.address || '');
    setAreaSize(str(site?.areaSize));
    setObjectType(general.objectType || '');
    setPurpose(general.purpose || '');
    setFloor(str(general.floor));
    setTotalFloors(str(general.totalFloors));
    setYearBuilt(str(general.yearBuilt));
    setCeilingHeight(str(general.ceilingHeight));
    setRoomCount(str(general.roomCount));
  };

  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const nextGeneral: GeneralSectionData = {
        ...general,
        objectType: objectType || undefined,
        purpose: purpose || undefined,
        floor: num(floor),
        totalFloors: num(totalFloors),
        yearBuilt: num(yearBuilt),
        ceilingHeight: num(ceilingHeight),
        roomCount: num(roomCount),
      };
      await ctx.saveCore({
        name: name.trim(),
        address: address.trim() || undefined,
        areaSize: num(areaSize),
      });
      await ctx.savePassportSection('general', nextGeneral);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Общая информация"
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <FieldGroup>
          <Field label="Название объекта" value={site?.name} />
          <Field label="Тип объекта" value={general.objectType} />
          <Field label="Назначение" value={general.purpose} />
          <Field label="Адрес" value={site?.address} />
          <Field label="Этаж" value={general.floor} />
          <Field label="Этажность" value={general.totalFloors} />
          <Field label="Площадь, м²" value={site?.areaSize} />
          <Field label="Год постройки" value={general.yearBuilt} />
          <Field label="Высота потолков, м" value={general.ceilingHeight} />
          <Field label="Количество комнат" value={general.roomCount} />
        </FieldGroup>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <TextInput label="Название объекта *" value={name} onChange={setName} placeholder="Название объекта" />
          <Select label="Тип объекта" value={objectType} onChange={setObjectType} options={OBJECT_TYPE_OPTIONS} />
          <Select label="Назначение" value={purpose} onChange={setPurpose} options={PURPOSE_OPTIONS} />
          <TextInput label="Адрес *" value={address} onChange={setAddress} placeholder="Адрес объекта" className="sm:col-span-2 xl:col-span-1" />
          <TextInput label="Этаж" value={floor} onChange={setFloor} type="number" />
          <TextInput label="Этажность" value={totalFloors} onChange={setTotalFloors} type="number" />
          <TextInput label="Площадь, м²" value={areaSize} onChange={setAreaSize} type="number" />
          <TextInput label="Год постройки" value={yearBuilt} onChange={setYearBuilt} type="number" />
          <TextInput label="Высота потолков, м" value={ceilingHeight} onChange={setCeilingHeight} type="number" />
          <TextInput label="Количество комнат" value={roomCount} onChange={setRoomCount} type="number" />
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Собственник + УК ───────────────────── */

function OwnerUkCard({ ctx, general }: { ctx: PassportCtx; general: GeneralSectionData }) {
  const owner: PartyContact = general.owner || {};
  const uk: PartyContact = general.managementCompany || {};

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ownerName, setOwnerName] = useState(owner.name || '');
  const [ownerPhone, setOwnerPhone] = useState(owner.phone || '');
  const [ownerEmail, setOwnerEmail] = useState(owner.email || '');
  const [ukName, setUkName] = useState(uk.name || '');
  const [ukPhone, setUkPhone] = useState(uk.phone || '');
  const [ukEmergency, setUkEmergency] = useState(uk.emergencyPhone || '');

  const reset = () => {
    setOwnerName(owner.name || '');
    setOwnerPhone(owner.phone || '');
    setOwnerEmail(owner.email || '');
    setUkName(uk.name || '');
    setUkPhone(uk.phone || '');
    setUkEmergency(uk.emergencyPhone || '');
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: GeneralSectionData = {
        ...general,
        owner: {
          name: ownerName.trim() || undefined,
          phone: ownerPhone.trim() || undefined,
          email: ownerEmail.trim() || undefined,
        },
        managementCompany: {
          name: ukName.trim() || undefined,
          phone: ukPhone.trim() || undefined,
          emergencyPhone: ukEmergency.trim() || undefined,
        },
      };
      await ctx.savePassportSection('general', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Собственник и управляющая компания"
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Собственник</p>
            <FieldGroup>
              <Field label="ФИО / Организация" value={owner.name} />
              <Field label="Телефон" value={owner.phone} />
              <Field label="E-mail" value={owner.email} />
            </FieldGroup>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Управляющая компания</p>
            <FieldGroup>
              <Field label="Название" value={uk.name} />
              <Field label="Телефон" value={uk.phone} />
              <Field label="Аварийная служба" value={uk.emergencyPhone} />
            </FieldGroup>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Собственник</p>
            <TextInput label="ФИО / Организация" value={ownerName} onChange={setOwnerName} />
            <TextInput label="Телефон" value={ownerPhone} onChange={setOwnerPhone} />
            <TextInput label="E-mail" value={ownerEmail} onChange={setOwnerEmail} type="email" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Управляющая компания</p>
            <TextInput label="Название" value={ukName} onChange={setUkName} />
            <TextInput label="Телефон" value={ukPhone} onChange={setUkPhone} />
            <TextInput label="Аварийная служба" value={ukEmergency} onChange={setUkEmergency} />
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Описание объекта ───────────────────── */

const DESC_MAX = 1000;

function DescriptionCard({ ctx }: { ctx: PassportCtx }) {
  const site = ctx.site;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState(site?.description || '');

  const reset = () => setDescription(site?.description || '');
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      await ctx.saveCore({ description: description.trim() || undefined });
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Описание объекта"
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        site?.description
          ? <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">{site.description}</p>
          : <EmptyState text="Описание не заполнено" />
      ) : (
        <div className="space-y-1">
          <TextArea
            value={description.slice(0, DESC_MAX)}
            onChange={(v) => setDescription(v.slice(0, DESC_MAX))}
            rows={5}
            placeholder="Описание объекта..."
          />
          <div className="text-right text-xs text-gray-400">{description.length}/{DESC_MAX}</div>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Фото объекта ───────────────────── */

function PhotoCard({ ctx, general }: { ctx: PassportCtx; general: GeneralSectionData }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await ctx.uploadFile(file);
      if (url) {
        await ctx.savePassportSection('general', { ...general, photoUrl: url });
      }
    } catch {
      /* toast handled in ctx */
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    setBusy(true);
    try {
      const next = { ...general };
      delete next.photoUrl;
      await ctx.savePassportSection('general', next);
    } catch {
      /* toast handled in ctx */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Фото объекта"
      actions={
        <div className="flex items-center gap-2">
          {general.photoUrl && (
            <IconBtn danger title="Удалить фото" onClick={removePhoto}><TrashIcon className="w-4 h-4" /></IconBtn>
          )}
          <GhostBtn onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'Загрузка...' : general.photoUrl ? 'Заменить фото' : 'Добавить фото'}
          </GhostBtn>
        </div>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files?.[0])}
      />
      {general.photoUrl ? (
        <a href={general.photoUrl} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={general.photoUrl}
            alt="Фото объекта"
            className="max-h-80 w-auto rounded-lg border border-gray-100 dark:border-gray-700/60 object-contain"
          />
        </a>
      ) : (
        <EmptyState text="Фото не загружено" />
      )}
    </Card>
  );
}
