'use client';

/**
 * Passport section 4 — "Инфраструктура и сети".
 *
 * Grid of cards (internet / network & wifi / servers / video / telephony /
 * ip access / documents). The whole `infrastructure` object is kept in local
 * state per card and replaced via `ctx.savePassportSection('infrastructure', ...)`.
 */

import React, { useRef, useState } from 'react';
import type { PassportCtx } from '../usePassport';
import type {
  InfrastructureSectionData, EngineeringSubsystem,
  WifiNetwork, NetworkDevice, CameraItem, SipAccount,
  KeyVal, PassportFile, SystemStatus,
} from '../types';
import { SYSTEM_STATUS_LABEL, newId } from '../types';
import {
  Card, Grid, FieldGroup, Field, InfoRow, StatusDot, TextInput, Select,
  EditToggle, GhostBtn, IconBtn, TrashIcon, EmptyState, FileChip,
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
const ACTIVE_OPTIONS = [
  { value: 'active', label: SYSTEM_STATUS_LABEL.active },
  { value: 'inactive', label: SYSTEM_STATUS_LABEL.inactive },
];

function num(v: string): number | undefined {
  if (v === '' || v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
function str(v: number | undefined | null): string {
  return v === undefined || v === null ? '' : String(v);
}
function humanSize(bytes: number): string {
  if (!bytes) return '';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let v = bytes; let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1).replace('.', ',')} ${units[i]}`;
}

/* Masked password in view mode with show/hide toggle. */
function SecretValue({ value }: { value?: string }) {
  const [shown, setShown] = useState(false);
  if (!value) return <>—</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono">{shown ? value : '••••••'}</span>
      <button type="button" onClick={() => setShown((v) => !v)} className="text-xs text-violet-500 hover:underline">
        {shown ? 'Скрыть' : 'Показать'}
      </button>
    </span>
  );
}

/* ───────────────────────── component ───────────────────────── */

export default function InfrastructureSection({ ctx }: { ctx: PassportCtx }) {
  const infra: InfrastructureSectionData = ctx.passport.infrastructure || {};

  return (
    <div className="space-y-5">
      <Grid cols={3}>
        <InternetCard ctx={ctx} infra={infra} />
        <NetworkWifiCard ctx={ctx} infra={infra} />
        <ServersCard ctx={ctx} infra={infra} />
      </Grid>
      <VideoCard ctx={ctx} infra={infra} />
      <TelephonyCard ctx={ctx} infra={infra} />
      <IpAccessCard ctx={ctx} infra={infra} />
      <DocumentsCard ctx={ctx} infra={infra} />
    </div>
  );
}

/* ───────────────────── Интернет и провайдер ───────────────────── */

const INTERNET_DEFAULT_LABELS = [
  'Провайдер', 'Тип подключения', 'Тарифный план', 'Номер договора',
  'Дата подключения', 'Абонентский номер', 'Статус', 'Дата окончания договора',
];

function InternetCard({ ctx, infra }: { ctx: PassportCtx; infra: InfrastructureSectionData }) {
  const net: EngineeringSubsystem = infra.internet || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialFields = (): KeyVal[] =>
    net.fields && net.fields.length > 0
      ? net.fields
      : INTERNET_DEFAULT_LABELS.map((label) => ({ id: newId(), label, value: '' }));

  const [status, setStatus] = useState<string>(net.status || '');
  const [fields, setFields] = useState<KeyVal[]>(initialFields());

  const reset = () => { setStatus(net.status || ''); setFields(initialFields()); };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: InfrastructureSectionData = {
        ...infra,
        internet: {
          status: (status || undefined) as SystemStatus | undefined,
          fields: fields.filter((f) => f.label.trim() || f.value.trim()),
        },
      };
      await ctx.savePassportSection('infrastructure', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const visibleFields = (net.fields || []).filter((f) => f.label.trim());
  const fieldColumns: EditableColumn<KeyVal>[] = [
    { key: 'label', label: 'Параметр', placeholder: 'Провайдер' },
    { key: 'value', label: 'Значение' },
  ];

  return (
    <Card
      title="Интернет и провайдер"
      status={!editing && net.status ? <StatusDot status={net.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        visibleFields.length > 0
          ? <dl>{visibleFields.map((f) => <InfoRow key={f.id} label={f.label} value={f.value} />)}</dl>
          : <EmptyState text="Нет данных" />
      ) : (
        <div className="space-y-4">
          <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <EditableTable
            rows={fields}
            columns={fieldColumns}
            onChange={setFields}
            makeEmpty={() => ({ id: newId(), label: '', value: '' })}
            addLabel="Добавить параметр"
          />
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Сеть и Wi-Fi ───────────────────── */

function NetworkWifiCard({ ctx, infra }: { ctx: PassportCtx; infra: InfrastructureSectionData }) {
  const nw = infra.networkWifi || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(nw.status || '');
  const [routerModel, setRouterModel] = useState(nw.routerModel || '');
  const [routerIp, setRouterIp] = useState(nw.routerIp || '');
  const [firmware, setFirmware] = useState(nw.firmware || '');
  const [routerLocation, setRouterLocation] = useState(nw.routerLocation || '');
  const [wifi, setWifi] = useState<WifiNetwork[]>(nw.wifi || []);

  const reset = () => {
    setStatus(nw.status || '');
    setRouterModel(nw.routerModel || '');
    setRouterIp(nw.routerIp || '');
    setFirmware(nw.firmware || '');
    setRouterLocation(nw.routerLocation || '');
    setWifi(nw.wifi || []);
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: InfrastructureSectionData = {
        ...infra,
        networkWifi: {
          status: (status || undefined) as SystemStatus | undefined,
          routerModel: routerModel.trim() || undefined,
          routerIp: routerIp.trim() || undefined,
          firmware: firmware.trim() || undefined,
          routerLocation: routerLocation.trim() || undefined,
          wifi: wifi.filter((w) => (w.ssid || '').trim()),
        },
      };
      await ctx.savePassportSection('infrastructure', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const wifiColumns: EditableColumn<WifiNetwork>[] = [
    { key: 'ssid', label: 'SSID', placeholder: 'MyWiFi' },
    { key: 'type', label: 'Тип', placeholder: 'Основная' },
    { key: 'password', label: 'Пароль' },
    { key: 'band', label: 'Диапазон', placeholder: '5 ГГц' },
  ];

  return (
    <Card
      title="Сеть и Wi-Fi"
      status={!editing && nw.status ? <StatusDot status={nw.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <div className="space-y-4">
          <FieldGroup>
            <Field label="Модель" value={nw.routerModel} />
            <Field label="IP-адрес" value={nw.routerIp} />
            <Field label="Версия ПО" value={nw.firmware} />
            <Field label="Расположение" value={nw.routerLocation} />
          </FieldGroup>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Wi-Fi сети</p>
            <DataTable
              rows={nw.wifi || []}
              empty="Wi-Fi сети не добавлены"
              columns={[
                { key: 'ssid', label: 'SSID' },
                { key: 'type', label: 'Тип' },
                { label: 'Пароль', render: (w) => <SecretValue value={w.password} /> },
                { key: 'band', label: 'Диапазон' },
              ]}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <TextInput label="Модель" value={routerModel} onChange={setRouterModel} />
            <TextInput label="IP-адрес" value={routerIp} onChange={setRouterIp} placeholder="192.168.1.1" />
            <TextInput label="Версия ПО" value={firmware} onChange={setFirmware} />
            <TextInput label="Расположение" value={routerLocation} onChange={setRouterLocation} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Wi-Fi сети</p>
            <EditableTable
              rows={wifi}
              columns={wifiColumns}
              onChange={setWifi}
              makeEmpty={() => ({ id: newId(), ssid: '' })}
              addLabel="Добавить сеть"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Серверы и оборудование ───────────────────── */

function ServersCard({ ctx, infra }: { ctx: PassportCtx; infra: InfrastructureSectionData }) {
  const srv = infra.servers || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(srv.status || '');
  const [devices, setDevices] = useState<NetworkDevice[]>(srv.devices || []);

  const reset = () => { setStatus(srv.status || ''); setDevices(srv.devices || []); };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: InfrastructureSectionData = {
        ...infra,
        servers: {
          status: (status || undefined) as SystemStatus | undefined,
          devices: devices.filter((d) => (d.name || '').trim()),
        },
      };
      await ctx.savePassportSection('infrastructure', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const columns: EditableColumn<NetworkDevice>[] = [
    { key: 'name', label: 'Устройство', placeholder: 'NAS Synology' },
    { key: 'ip', label: 'IP-адрес' },
    { key: 'role', label: 'Роль', placeholder: 'Хранилище' },
    { key: 'status', label: 'Статус', type: 'select', options: ONLINE_OPTIONS },
  ];

  return (
    <Card
      title="Серверы и оборудование"
      status={!editing && srv.status ? <StatusDot status={srv.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <DataTable
          rows={srv.devices || []}
          empty="Устройства не добавлены"
          columns={[
            { key: 'name', label: 'Устройство' },
            { key: 'ip', label: 'IP-адрес' },
            { key: 'role', label: 'Роль' },
            { label: 'Статус', render: (d) => <StatusDot status={d.status} /> },
          ]}
        />
      ) : (
        <div className="space-y-4">
          <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <EditableTable
            rows={devices}
            columns={columns}
            onChange={setDevices}
            makeEmpty={() => ({ id: newId(), name: '', status: 'online' })}
            addLabel="Добавить устройство"
          />
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Видеонаблюдение ───────────────────── */

function VideoCard({ ctx, infra }: { ctx: PassportCtx; infra: InfrastructureSectionData }) {
  const video = infra.video || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(video.status || '');
  const [nvrModel, setNvrModel] = useState(video.nvrModel || '');
  const [nvrIp, setNvrIp] = useState(video.nvrIp || '');
  const [channels, setChannels] = useState(str(video.channels));
  const [location, setLocation] = useState(video.location || '');
  const [cameras, setCameras] = useState<CameraItem[]>(video.cameras || []);

  const reset = () => {
    setStatus(video.status || '');
    setNvrModel(video.nvrModel || '');
    setNvrIp(video.nvrIp || '');
    setChannels(str(video.channels));
    setLocation(video.location || '');
    setCameras(video.cameras || []);
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: InfrastructureSectionData = {
        ...infra,
        video: {
          status: (status || undefined) as SystemStatus | undefined,
          nvrModel: nvrModel.trim() || undefined,
          nvrIp: nvrIp.trim() || undefined,
          channels: num(channels),
          location: location.trim() || undefined,
          cameras: cameras.filter((c) => (c.name || '').trim()).map((c, i) => ({ ...c, index: i + 1 })),
        },
      };
      await ctx.savePassportSection('infrastructure', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const columns: EditableColumn<CameraItem>[] = [
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
            <Field label="Регистратор (NVR)" value={video.nvrModel} />
            <Field label="IP-адрес" value={video.nvrIp} />
            <Field label="Каналы" value={video.channels} />
            <Field label="Расположение" value={video.location} />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <TextInput label="Регистратор (NVR)" value={nvrModel} onChange={setNvrModel} />
            <TextInput label="IP-адрес" value={nvrIp} onChange={setNvrIp} placeholder="192.168.1.10" />
            <TextInput label="Каналы" value={channels} onChange={setChannels} type="number" />
            <TextInput label="Расположение" value={location} onChange={setLocation} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Камеры</p>
            <EditableTable
              rows={cameras}
              columns={columns}
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

/* ───────────────────── Телефония и связь ───────────────────── */

function TelephonyCard({ ctx, infra }: { ctx: PassportCtx; infra: InfrastructureSectionData }) {
  const tel = infra.telephony || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(tel.status || '');
  const [provider, setProvider] = useState(tel.provider || '');
  const [type, setType] = useState(tel.type || '');
  const [contract, setContract] = useState(tel.contract || '');
  const [sip, setSip] = useState<SipAccount[]>(tel.sip || []);
  const [devices, setDevices] = useState<NetworkDevice[]>(tel.devices || []);

  const reset = () => {
    setStatus(tel.status || '');
    setProvider(tel.provider || '');
    setType(tel.type || '');
    setContract(tel.contract || '');
    setSip(tel.sip || []);
    setDevices(tel.devices || []);
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: InfrastructureSectionData = {
        ...infra,
        telephony: {
          status: (status || undefined) as SystemStatus | undefined,
          provider: provider.trim() || undefined,
          type: type.trim() || undefined,
          contract: contract.trim() || undefined,
          sip: sip.filter((s) => (s.number || '').trim()),
          devices: devices.filter((d) => (d.name || '').trim()),
        },
      };
      await ctx.savePassportSection('infrastructure', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const sipColumns: EditableColumn<SipAccount>[] = [
    { key: 'number', label: 'Номер', placeholder: '+7 (___) ___-__-__' },
    { key: 'purpose', label: 'Назначение', placeholder: 'Основной' },
    { key: 'status', label: 'Статус', type: 'select', options: ACTIVE_OPTIONS },
  ];
  const deviceColumns: EditableColumn<NetworkDevice>[] = [
    { key: 'name', label: 'Оборудование', placeholder: 'IP-телефон' },
    { key: 'ip', label: 'IP-адрес' },
    { key: 'role', label: 'Роль' },
    { key: 'status', label: 'Статус', type: 'select', options: ONLINE_OPTIONS },
  ];

  return (
    <Card
      title="Телефония и связь"
      status={!editing && tel.status ? <StatusDot status={tel.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <div className="space-y-4">
          <FieldGroup>
            <Field label="Провайдер" value={tel.provider} />
            <Field label="Тип связи" value={tel.type} />
            <Field label="Номер договора" value={tel.contract} />
          </FieldGroup>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">SIP-аккаунты</p>
            <DataTable
              rows={tel.sip || []}
              empty="SIP-аккаунты не добавлены"
              columns={[
                { key: 'number', label: 'Номер' },
                { key: 'purpose', label: 'Назначение' },
                { label: 'Статус', render: (s) => <StatusDot status={s.status} /> },
              ]}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Оборудование</p>
            <DataTable
              rows={tel.devices || []}
              empty="Оборудование не добавлено"
              columns={[
                { key: 'name', label: 'Оборудование' },
                { key: 'ip', label: 'IP-адрес' },
                { key: 'role', label: 'Роль' },
                { label: 'Статус', render: (d) => <StatusDot status={d.status} /> },
              ]}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <TextInput label="Провайдер" value={provider} onChange={setProvider} />
            <TextInput label="Тип связи" value={type} onChange={setType} placeholder="IP-телефония" />
            <TextInput label="Номер договора" value={contract} onChange={setContract} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">SIP-аккаунты</p>
            <EditableTable
              rows={sip}
              columns={sipColumns}
              onChange={setSip}
              makeEmpty={() => ({ id: newId(), number: '', status: 'active' })}
              addLabel="Добавить SIP-аккаунт"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Оборудование</p>
            <EditableTable
              rows={devices}
              columns={deviceColumns}
              onChange={setDevices}
              makeEmpty={() => ({ id: newId(), name: '', status: 'online' })}
              addLabel="Добавить оборудование"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── IP-адреса и доступы ───────────────────── */

function IpAccessCard({ ctx, infra }: { ctx: PassportCtx; infra: InfrastructureSectionData }) {
  const ip = infra.ipAccess || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<string>(ip.status || '');
  const [ipv4, setIpv4] = useState(ip.ipv4 || '');
  const [ipv6, setIpv6] = useState(ip.ipv6 || '');
  const [ddns, setDdns] = useState(ip.ddns || '');
  const [vpnServer, setVpnServer] = useState(ip.vpnServer || '');
  const [vpnPort, setVpnPort] = useState(ip.vpnPort || '');
  const [vpnStatus, setVpnStatus] = useState(ip.vpnStatus || '');
  const [devices, setDevices] = useState<NetworkDevice[]>(ip.devices || []);

  const reset = () => {
    setStatus(ip.status || '');
    setIpv4(ip.ipv4 || '');
    setIpv6(ip.ipv6 || '');
    setDdns(ip.ddns || '');
    setVpnServer(ip.vpnServer || '');
    setVpnPort(ip.vpnPort || '');
    setVpnStatus(ip.vpnStatus || '');
    setDevices(ip.devices || []);
  };
  const start = () => { reset(); setEditing(true); };
  const cancel = () => { reset(); setEditing(false); };

  const save = async () => {
    setSaving(true);
    try {
      const next: InfrastructureSectionData = {
        ...infra,
        ipAccess: {
          status: (status || undefined) as SystemStatus | undefined,
          ipv4: ipv4.trim() || undefined,
          ipv6: ipv6.trim() || undefined,
          ddns: ddns.trim() || undefined,
          vpnServer: vpnServer.trim() || undefined,
          vpnPort: vpnPort.trim() || undefined,
          vpnStatus: vpnStatus.trim() || undefined,
          devices: devices.filter((d) => (d.name || '').trim()),
        },
      };
      await ctx.savePassportSection('infrastructure', next);
      setEditing(false);
    } catch {
      /* toast handled in ctx */
    } finally {
      setSaving(false);
    }
  };

  const deviceColumns: EditableColumn<NetworkDevice>[] = [
    { key: 'name', label: 'Устройство', placeholder: 'Роутер' },
    { key: 'ip', label: 'IP-адрес' },
    { key: 'login', label: 'Логин' },
    { key: 'password', label: 'Пароль' },
  ];

  return (
    <Card
      title="IP-адреса и доступы"
      status={!editing && ip.status ? <StatusDot status={ip.status} /> : undefined}
      actions={<EditToggle editing={editing} onEdit={start} onCancel={cancel} onSave={save} saving={saving} />}
    >
      {!editing ? (
        <div className="space-y-4">
          <FieldGroup>
            <Field label="IPv4" value={ip.ipv4} />
            <Field label="IPv6" value={ip.ipv6} />
            <Field label="DDNS" value={ip.ddns} />
            <Field label="VPN сервер" value={ip.vpnServer} />
            <Field label="Порт" value={ip.vpnPort} />
            <Field label="Статус" value={ip.vpnStatus} />
          </FieldGroup>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Доступы к устройствам</p>
            <DataTable
              rows={ip.devices || []}
              empty="Доступы не добавлены"
              columns={[
                { key: 'name', label: 'Устройство' },
                { key: 'ip', label: 'IP-адрес' },
                { key: 'login', label: 'Логин' },
                { label: 'Пароль', render: (d) => <SecretValue value={d.password} /> },
              ]}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
            <TextInput label="IPv4" value={ipv4} onChange={setIpv4} placeholder="92.118.x.x" />
            <TextInput label="IPv6" value={ipv6} onChange={setIpv6} />
            <TextInput label="DDNS" value={ddns} onChange={setDdns} />
            <TextInput label="VPN сервер" value={vpnServer} onChange={setVpnServer} />
            <TextInput label="Порт" value={vpnPort} onChange={setVpnPort} />
            <TextInput label="Статус VPN" value={vpnStatus} onChange={setVpnStatus} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Доступы к устройствам</p>
            <EditableTable
              rows={devices}
              columns={deviceColumns}
              onChange={setDevices}
              makeEmpty={() => ({ id: newId(), name: '' })}
              addLabel="Добавить доступ"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────── Документы и схемы ───────────────────── */

function DocumentsCard({ ctx, infra }: { ctx: PassportCtx; infra: InfrastructureSectionData }) {
  const docs = infra.documents || [];
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
        await ctx.savePassportSection('infrastructure', { ...infra, documents: [...docs, doc] });
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
      await ctx.savePassportSection('infrastructure', { ...infra, documents: docs.filter((d) => d.id !== id) });
    } catch {
      /* toast handled in ctx */
    }
  };

  return (
    <Card
      title="Документы и схемы"
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
