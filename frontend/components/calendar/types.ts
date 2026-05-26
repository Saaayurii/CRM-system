export type CalendarSource =
  | 'calendar'
  | 'tasks'
  | 'inspections'
  | 'timeoff'
  | 'attendance'
  | 'projects'
  | 'external';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'timeline';

export interface FeedEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color?: string;
  sourceType: string;
  sourceId?: number | string;
  projectId?: number;
  taskId?: number;
  userId?: number;
  status?: string;
  url?: string;
  editable?: boolean;
  extendedProps?: Record<string, any>;
}

export interface CustomEventType {
  id: number;
  code: string;
  name: string;
  colorHex?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
}

export const SOURCE_LABELS: Record<string, string> = {
  calendar: 'События',
  tasks: 'Задачи',
  inspections: 'Инспекции',
  timeoff: 'Отпуска',
  attendance: 'Табель',
  projects: 'Вехи проектов',
  external: 'Внешние',
};

export const SOURCE_COLORS: Record<string, string> = {
  calendar: '#3b82f6',
  tasks: '#f59e0b',
  inspections: '#10b981',
  timeoff: '#a855f7',
  attendance: '#64748b',
  projects: '#0ea5e9',
  external: '#ea4335',
};

// Точная палитра по фактическому sourceType из бэка (calendar-feed возвращает
// 'manual' / 'task' / 'inspection' / 'time_off' / 'project' / 'external_*'),
// плюс универсальные синонимы.
export const TYPE_META: Record<
  string,
  { label: string; color: string; icon: 'event' | 'task' | 'inspection' | 'time_off' | 'milestone' | 'external' }
> = {
  manual:          { label: 'Событие',  color: '#3b82f6', icon: 'event' },
  calendar:        { label: 'Событие',  color: '#3b82f6', icon: 'event' },
  task:            { label: 'Задача',   color: '#f59e0b', icon: 'task' },
  tasks:           { label: 'Задача',   color: '#f59e0b', icon: 'task' },
  inspection:      { label: 'Инспекция',color: '#10b981', icon: 'inspection' },
  inspections:     { label: 'Инспекция',color: '#10b981', icon: 'inspection' },
  time_off:        { label: 'Отпуск',   color: '#a855f7', icon: 'time_off' },
  timeoff:         { label: 'Отпуск',   color: '#a855f7', icon: 'time_off' },
  attendance:      { label: 'Табель',   color: '#64748b', icon: 'time_off' },
  project:         { label: 'Веха',     color: '#0ea5e9', icon: 'milestone' },
  projects:        { label: 'Веха',     color: '#0ea5e9', icon: 'milestone' },
  external_google: { label: 'Google',   color: '#ea4335', icon: 'external' },
  external_yandex: { label: 'Яндекс',   color: '#ffcc00', icon: 'external' },
  external_apple:  { label: 'Apple',    color: '#0f172a', icon: 'external' },
};

export function resolveTypeMeta(sourceType?: string) {
  if (!sourceType) return TYPE_META.manual;
  return TYPE_META[sourceType] || TYPE_META.manual;
}

const PREFIX_RE = /^\[[^\]]+\]\s*/;
const PROJECT_START_RE = /^▶\s*Старт:\s*/;
const PROJECT_END_RE = /^■\s*Финиш:\s*/;

/** Убирает технические префиксы вроде "[Задача]", "▶ Старт:" из заголовка. */
export function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(PROJECT_START_RE, '')
    .replace(PROJECT_END_RE, '')
    .replace(PREFIX_RE, '')
    .trim();
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent' | undefined;

export function normalizePriority(p: any): Priority {
  if (!p) return undefined;
  const s = String(p).toLowerCase();
  if (s === 'low' || s === 'низкий' || s === '1') return 'low';
  if (s === 'medium' || s === 'средний' || s === '2') return 'medium';
  if (s === 'high' || s === 'высокий' || s === '3') return 'high';
  if (s === 'urgent' || s === 'критичный' || s === '4') return 'urgent';
  return undefined;
}

export const PRIORITY_COLOR: Record<Exclude<Priority, undefined>, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  urgent: '#dc2626',
};

/** Считает события «просроченными»: дедлайн в прошлом, статус не done/completed. */
export function isOverdueEvent(ev: FeedEvent, now = new Date()): boolean {
  if (ev.sourceType !== 'task') return false;
  const status = String(ev.status || ev.extendedProps?.status || '').toLowerCase();
  if (['done', 'completed', 'closed', 'выполнено', 'завершено'].includes(status)) return false;
  const due = new Date(ev.end || ev.start);
  return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
}

export function isoDateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
