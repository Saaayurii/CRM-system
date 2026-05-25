export type CalendarSource =
  | 'calendar'
  | 'tasks'
  | 'inspections'
  | 'timeoff'
  | 'attendance'
  | 'projects'
  | 'external';

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
  calendar: 'События календаря',
  tasks: 'Задачи (дедлайны)',
  inspections: 'Инспекции',
  timeoff: 'Отпуска / больничные',
  attendance: 'Табель',
  projects: 'Вехи проектов',
  external: 'Внешние календари',
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
