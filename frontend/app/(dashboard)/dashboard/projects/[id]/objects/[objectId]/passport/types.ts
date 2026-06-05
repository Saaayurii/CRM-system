/**
 * Object Technical Passport ("Технический паспорт объекта") type system.
 *
 * The whole passport is stored as a single JSONB blob on the ConstructionSite
 * (`site.passport`) and edited section-by-section through
 * `PATCH /construction-sites/:id/passport` (see usePassport.ts).
 *
 * Every list item carries a string `id` (we generate `crypto.randomUUID()` or
 * `Date.now()` on the client) so React keys / edits stay stable.
 */

/* ─────────────────────────── Core site row ─────────────────────────── */

export interface ObjectSite {
  id: number;
  name: string;
  code?: string;
  siteType?: string;
  address?: string;
  description?: string;
  status?: number;
  foremanId?: number;
  startDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  areaSize?: number;
  projectId?: number;
  createdAt?: string;
  photos?: string[];
  passport?: ObjectPassport;
  passportHistory?: PassportHistoryEntry[];
}

/* ─────────────────────────── Passport root ─────────────────────────── */

export interface ObjectPassport {
  general?: GeneralSectionData;
  access?: AccessSectionData;
  engineering?: EngineeringSectionData;
  infrastructure?: InfrastructureSectionData;
  security?: SecuritySectionData;
  maintenance?: MaintenanceSectionData;
  contacts?: ContactItem[];
}

/** Top-level keys that can be PATCHed. */
export type PassportSectionKey =
  | 'general'
  | 'access'
  | 'engineering'
  | 'infrastructure'
  | 'security'
  | 'maintenance'
  | 'contacts';

export interface PassportHistoryEntry {
  id: number | string;
  userId?: number;
  userName?: string | null;
  section: string;
  changedAt: string;
}

/* A file reference stored inside the passport JSON (link only). */
export interface PassportFile {
  id: string;
  title: string;
  fileUrl: string;
  fileType?: string;   // PDF, DWG, XLSX...
  size?: string;       // human readable "1,2 МБ"
  addedAt?: string;
}

/* ───────────────────── 1. General information ───────────────────── */

export interface PartyContact {
  name?: string;
  phone?: string;
  email?: string;
  emergencyPhone?: string;
}

export interface GeneralSectionData {
  objectType?: string;     // Квартира / Дом / Офис / Склад...
  purpose?: string;        // Жилое / Коммерческое / Производственное
  floor?: number;
  totalFloors?: number;
  yearBuilt?: number;
  ceilingHeight?: number;
  roomCount?: number;
  owner?: PartyContact;
  managementCompany?: PartyContact;
  photoUrl?: string;
}

/* ───────────────────── 2. Access & security ───────────────────── */

export interface AccessKey {
  id: string;
  description?: string;   // Основной комплект
  location?: string;      // У собственника
  count?: number;
  responsible?: string;   // Иванов И.И.
  note?: string;
}
export interface AccessCode {
  id: string;
  type?: string;          // Домофон (подъезд)
  code?: string;          // 1234
  note?: string;          // Панель Commax
}
export interface AccessPass {
  id: string;
  type?: string;          // Пропуск в паркинг
  number?: string;        // №001
  validUntil?: string;    // 31.12.2026
  note?: string;          // Основной
}
export interface AccessContact {
  id: string;
  type?: string;          // Управляющая компания / Аварийная служба...
  org?: string;           // УК «Комфорт Сервис»
  phone?: string;
  note?: string;
}
export interface AccessSchemeStep {
  id: string;
  order: number;
  title: string;          // Вход в подъезд
  detail?: string;        // Домофон (код 1234)
}
export interface AccessRestrictions {
  accessTime?: string;        // 08:00 – 21:00
  weekendWork?: string;       // Запрещена / Разрешена
  noisyWork?: string;         // Разрешены / Запрещены
  approvalNeeded?: boolean;
  approver?: string;          // Иванов И.И.
  specialConditions?: string; // Согласовывать работы с УК за 1 день до начала.
}
export interface AccessSectionData {
  keys?: AccessKey[];
  codes?: AccessCode[];
  passes?: AccessPass[];
  restrictions?: AccessRestrictions;
  contacts?: AccessContact[];
  scheme?: AccessSchemeStep[];
  schemeUrl?: string;
  additionalInfo?: string;
}

/* ───────────────────── 3. Engineering systems ───────────────────── */

export type SystemStatus = 'active' | 'inactive' | 'maintenance' | 'fault';

export interface KeyVal { id: string; label: string; value: string; }

/** Generic engineering subsystem: a status + free-form spec rows + supplier + files. */
export interface EngineeringSubsystem {
  status?: SystemStatus;
  fields?: KeyVal[];                 // arbitrary spec rows (Напряжение / Фазность / ...)
  supplierName?: string;
  supplierContract?: string;
  supplierPhone?: string;
  schemeUrl?: string;
  photoUrl?: string;
  note?: string;
}
export interface EngineeringNode {
  id: string;
  name: string;          // Электрощит распределительный
  model?: string;        // Schneider Electric Pragma
  location?: string;     // Прихожая
  serial?: string;
  installDate?: string;
  condition?: string;    // Исправно / Требует замены
}
export interface EngineeringSectionData {
  electrical?: EngineeringSubsystem;
  water?: EngineeringSubsystem;
  heating?: EngineeringSubsystem;
  gas?: EngineeringSubsystem;
  ventilation?: EngineeringSubsystem;
  lowVoltage?: EngineeringSubsystem;
  nodes?: EngineeringNode[];
  documents?: PassportFile[];
}

/* ───────────────────── 4. Infrastructure & network ───────────────────── */

export interface NetworkDevice {
  id: string;
  name: string;          // NAS (Synology DS920+)
  ip?: string;
  role?: string;         // Хранилище / Виртуализация
  status?: string;       // online | offline
  login?: string;
  password?: string;
}
export interface WifiNetwork {
  id: string;
  ssid: string;
  type?: string;         // Основная / Гостевая / Устройства
  password?: string;
  band?: string;         // 2.4 / 5 ГГц
}
export interface CameraItem {
  id: string;
  index?: number;
  name: string;          // Входная дверь
  location?: string;
  ip?: string;
  status?: string;       // online | offline
}
export interface SipAccount {
  id: string;
  number: string;
  purpose?: string;      // Основной / Запасной
  status?: string;       // active | inactive
}
export interface InfrastructureSectionData {
  internet?: EngineeringSubsystem;      // provider, plan, contract...
  networkWifi?: {
    status?: SystemStatus;
    routerModel?: string;
    routerIp?: string;
    firmware?: string;
    routerLocation?: string;
    wifi?: WifiNetwork[];
  };
  servers?: { status?: SystemStatus; devices?: NetworkDevice[] };
  video?: {
    status?: SystemStatus;
    nvrModel?: string;
    nvrIp?: string;
    channels?: number;
    location?: string;
    cameras?: CameraItem[];
  };
  telephony?: {
    status?: SystemStatus;
    provider?: string;
    type?: string;
    contract?: string;
    sip?: SipAccount[];
    devices?: NetworkDevice[];
  };
  ipAccess?: {
    status?: SystemStatus;
    ipv4?: string;
    ipv6?: string;
    ddns?: string;
    vpnServer?: string;
    vpnPort?: string;
    vpnStatus?: string;
    devices?: NetworkDevice[];
  };
  documents?: PassportFile[];
}

/* ───────────────────── 5. Security & guarding ───────────────────── */

export interface SecurityZone { id: string; name: string; }
export interface SecuritySubsystem {
  status?: SystemStatus;
  system?: string;        // Ajax Hub 2 Plus
  serial?: string;
  installDate?: string;
  serviceCompany?: string;
  contact?: string;
  contract?: string;
  lastService?: string;
  nextService?: string;
  fields?: KeyVal[];
  photoUrl?: string;
}
export interface AccessPoint {
  id: string;
  index?: number;
  name: string;
  location?: string;
  status?: string;       // online | offline
}
export interface SecuritySectionData {
  alarm?: SecuritySubsystem & { zones?: SecurityZone[] };
  fireSafety?: SecuritySubsystem;
  video?: SecuritySubsystem & { cameras?: CameraItem[]; archiveDays?: number };
  accessControl?: SecuritySubsystem & { points?: AccessPoint[]; controller?: string };
  physicalSecurity?: {
    status?: SystemStatus;
    org?: string;
    form?: string;          // Пультовая охрана
    contract?: string;
    manager?: string;
    phone?: string;
    mode?: string;          // Круглосуточно
    postName?: string;
    postSchedule?: string;
  };
  emergencyContacts?: AccessContact[];
  documents?: PassportFile[];
}

/* ───────────────────── 6. Maintenance & warranty ───────────────────── */

export interface EquipmentItem {
  id: string;
  name: string;
  category?: string;       // Отопление / Климат / Бытовая техника
  model?: string;
  serial?: string;
  status?: string;       // service | warranty | overdue | ok
}
export interface MaintenancePlan {
  id: string;
  equipment?: string;
  workType?: string;       // Техническое обслуживание
  frequency?: string;      // 1 раз в год
  nextVisit?: string;
  status?: string;         // Запланировано
}
export interface MaintenanceContractor {
  id: string;
  org: string;             // ООО «ТеплоСервис»
  specialization?: string; // Обслуживание котла
  phone?: string;
  email?: string;
}
export interface WarrantyItem {
  id: string;
  equipment?: string;
  manufacturer?: string;
  warrantyUntil?: string;
  fileUrl?: string;
  fileTitle?: string;
}
export interface WorkHistoryItem {
  id: string;
  date?: string;
  equipment?: string;
  workType?: string;
  performer?: string;
  fileUrl?: string;
  fileTitle?: string;
}
export interface MaintenanceSectionData {
  equipment?: EquipmentItem[];
  schedule?: MaintenancePlan[];
  contractors?: MaintenanceContractor[];
  warranties?: WarrantyItem[];
  workHistory?: WorkHistoryItem[];
  documents?: PassportFile[];
}

/* ───────────────────── 9. Contacts ───────────────────── */

export interface ContactItem {
  id: string;
  role?: string;           // Собственник / Прораб / Электрик...
  name?: string;
  org?: string;
  phone?: string;
  email?: string;
  note?: string;
}

/* ─────────────────────────── Label maps ─────────────────────────── */

export const SYSTEM_STATUS_LABEL: Record<string, string> = {
  active: 'Активно', inactive: 'Неактивно', maintenance: 'Обслуживание', fault: 'Неисправно',
  online: 'Онлайн', offline: 'Оффлайн',
};
export const SYSTEM_STATUS_COLOR: Record<string, string> = {
  active: 'text-green-500', inactive: 'text-gray-400',
  maintenance: 'text-orange-500', fault: 'text-red-500',
  online: 'text-green-500', offline: 'text-gray-400',
};

export const EQUIPMENT_STATUS_LABEL: Record<string, string> = {
  service: 'На обслуживании', warranty: 'Гарантия', overdue: 'Просрочено', ok: 'Исправно',
};
export const EQUIPMENT_STATUS_COLOR: Record<string, string> = {
  service: 'text-blue-500', warranty: 'text-green-500',
  overdue: 'text-red-500', ok: 'text-green-500',
};

export const SITE_STATUS_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'Планирование', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  1: { label: 'В работе', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  2: { label: 'Приостановлен', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  3: { label: 'Завершён', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
};

/* ─────────────────── Completion ("Заполненность паспорта") ─────────────────── */

export interface SectionMeta {
  key: string;
  label: string;
  subtitle: string;
}

/**
 * Rough "filled / total" estimator per section, used for the progress meter and
 * the per-section "X / Y" chips. Each section reports how many of its tracked
 * slots have data. The numbers are heuristic — they reward filling the passport.
 */
export function sectionCompletion(p: ObjectPassport | undefined, roomsCount: number, docsCount: number): Record<string, { done: number; total: number }> {
  const g = p?.general; const a = p?.access; const e = p?.engineering;
  const i = p?.infrastructure; const s = p?.security; const m = p?.maintenance;
  const c = p?.contacts;

  const has = (v: any) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
  const countTrue = (arr: any[]) => arr.filter(has).length;

  return {
    general: {
      done: countTrue([g?.objectType, g?.purpose, g?.floor, g?.yearBuilt, g?.ceilingHeight, g?.roomCount, g?.owner?.name, g?.managementCompany?.name]),
      total: 8,
    },
    access: {
      done: countTrue([a?.keys?.length, a?.codes?.length, a?.passes?.length, a?.restrictions?.accessTime, a?.contacts?.length, a?.scheme?.length]),
      total: 6,
    },
    engineering: {
      done: countTrue([e?.electrical?.status, e?.water?.status, e?.heating?.status, e?.gas?.status, e?.ventilation?.status, e?.lowVoltage?.status, e?.nodes?.length]),
      total: 7,
    },
    infrastructure: {
      done: countTrue([i?.internet?.status, i?.networkWifi?.status, i?.servers?.devices?.length, i?.video?.status, i?.telephony?.status, i?.ipAccess?.status]),
      total: 6,
    },
    security: {
      done: countTrue([s?.alarm?.status, s?.fireSafety?.status, s?.video?.status, s?.accessControl?.status, s?.physicalSecurity?.org, s?.emergencyContacts?.length]),
      total: 6,
    },
    rooms: { done: roomsCount > 0 ? 1 : 0, total: 1 },
    documents: { done: docsCount > 0 ? 1 : 0, total: 1 },
    maintenance: {
      done: countTrue([m?.equipment?.length, m?.schedule?.length, m?.contractors?.length, m?.warranties?.length, m?.workHistory?.length]),
      total: 5,
    },
    contacts: { done: (c?.length ?? 0) > 0 ? 1 : 0, total: 1 },
  };
}

export function overallCompletion(map: Record<string, { done: number; total: number }>): number {
  const totals = Object.values(map).reduce((acc, v) => ({ done: acc.done + Math.min(v.done, v.total), total: acc.total + v.total }), { done: 0, total: 0 });
  if (!totals.total) return 0;
  return Math.round((totals.done / totals.total) * 100);
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
