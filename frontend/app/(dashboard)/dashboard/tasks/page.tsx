'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import UserProfileModal from '@/components/chat/UserProfileModal';
import { useToastStore } from '@/stores/toastStore';
import TaskFormModal from '@/components/dashboard/TaskFormModal';
import { useOfflineData } from '@/hooks/useOfflineData';
import { useTaskNotifStore } from '@/stores/taskNotifStore';
import { FAB_CREATED_EVENT } from '@/components/ui/QuickActionsButton';
import { useT } from '@/lib/i18n';

interface Assignee {
  userId: number;
  userName?: string;
}

interface ChecklistItem {
  status?: number;
  checked?: boolean;
}

interface ChecklistGroup {
  id: string;
  items: ChecklistItem[];
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: number;
  priority: number;
  dueDate?: string;
  due_date?: string;
  updatedAt?: string;
  updated_at?: string;
  projectId?: number;
  project_id?: number;
  assignedToUserId?: number;
  assigned_to_user_id?: number;
  estimatedHours?: number;
  estimated_hours?: number;
  createdByUserId?: number;
  created_by_user_id?: number;
  createdAt?: string;
  created_at?: string;
  project?: { id: number; name: string };
  assignees?: Assignee[];
  assignedToUser?: { name: string; email: string };
  assigned_to_user?: { name: string; email: string };
  createdByUser?: { name: string; email: string };
  customFields?: { checklists?: ChecklistGroup[] };
  custom_fields?: { checklists?: ChecklistGroup[] };
}

interface Project {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  roleId?: number;
  phone?: string;
  avatarUrl?: string;
  avatar_url?: string;
}

interface TasksPageData {
  tasks: Task[];
  projects: Project[];
  users: User[];
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая',       color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'Назначена',   color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400' },
  2: { label: 'В работе',    color: 'bg-violet-500/20 text-violet-700 dark:text-violet-400' },
  3: { label: 'На проверке', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  4: { label: 'Завершена',   color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  5: { label: 'Отменена',    color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкий',      color: 'text-gray-500' },
  2: { label: 'Средний',     color: 'text-sky-500' },
  3: { label: 'Высокий',     color: 'text-yellow-500' },
  4: { label: 'Критический', color: 'text-red-500' },
};

interface DisplaySettings {
  colProject: boolean;
  colStatus: boolean;
  colPriority: boolean;
  colAssignee: boolean;
  colCreator: boolean;
  colDueDate: boolean;
  colUpdatedAt: boolean;
  showProgress: boolean;
  showCreatedDate: boolean;
  showOverdueBadge: boolean;
  highlightOverdue: boolean;
  showHistoryIcon: boolean;
  showActions: boolean;
  compactMode: boolean;
  hideCompleted: boolean;
  hideCancelled: boolean;
}

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  colProject: true,
  colStatus: true,
  colPriority: true,
  colAssignee: true,
  colCreator: true,
  colDueDate: true,
  colUpdatedAt: true,
  showProgress: true,
  showCreatedDate: true,
  showOverdueBadge: true,
  highlightOverdue: true,
  showHistoryIcon: true,
  showActions: true,
  compactMode: false,
  hideCompleted: false,
  hideCancelled: false,
};

const DISPLAY_SETTINGS_KEY = 'tasksDisplaySettings';

function loadDisplaySettings(): DisplaySettings {
  if (typeof window === 'undefined') return DEFAULT_DISPLAY_SETTINGS;
  try {
    const raw = localStorage.getItem(DISPLAY_SETTINGS_KEY);
    if (!raw) return DEFAULT_DISPLAY_SETTINGS;
    return { ...DEFAULT_DISPLAY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

function isTaskOverdue(t: Task): boolean {
  const due = t.dueDate || t.due_date;
  if (!due) return false;
  if (t.status === 4 || t.status === 5) return false;
  return new Date(due).getTime() < Date.now();
}

function getTaskProgress(t: Task): { done: number; total: number } {
  const cf = t.customFields || t.custom_fields;
  const lists: ChecklistGroup[] = cf?.checklists || [];
  let total = 0, done = 0;
  for (const g of lists) {
    for (const item of g.items || []) {
      total++;
      const st = typeof item.status === 'number' ? item.status : (item.checked ? 3 : 0);
      if (st === 3) done++;
    }
  }
  return { done, total };
}


/** Просто показывает имена исполнителей; клик на имя → профиль. */
function AssigneeTextCell({ task, users, onNameClick }: {
  task: Task;
  users: User[];
  onNameClick: (userId: number) => void;
}) {
  const t = useT();
  const displayAssignees = task.assignees || [];
  if (displayAssignees.length === 0) return <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {displayAssignees.map((a, i) => {
        const u = users.find((u) => u.id === a.userId);
        const name = a.userName || u?.name || u?.email || `#${a.userId}`;
        return (
          <button
            key={a.userId}
            onClick={(e) => { e.stopPropagation(); onNameClick(a.userId); }}
            className="text-xs text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:underline truncate text-left transition-colors max-w-[160px]"
            title={name}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

/** Фильтр-дропдаун в заголовке колонки. multi=true — мультивыбор (исполнитель). */
function ColumnUserFilter({ users, selectedIds, onChange, multi = false }: {
  users: User[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  multi?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = 224; // w-56
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setCoords({ top: r.bottom + 4, left });
    };
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const filtered = users.filter((u) =>
    !search || (u.name || '').toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: number) => {
    if (multi) {
      onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
      setOpen(false);
    }
  };

  const active = selectedIds.length > 0;

  return (
    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-0.5 ml-1 rounded px-0.5 transition-colors ${active ? 'text-violet-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
        title={t('Фильтр')}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {active && <span className="text-[9px] font-bold leading-none">{selectedIds.length}</span>}
      </button>
      {open && coords && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left }}
          onClick={(e) => e.stopPropagation()}
          className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[200] overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <input
              autoFocus
              type="text"
              placeholder={t('Поиск...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-violet-400 text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">{t('Не найдено')}</div>
            ) : filtered.map((u) => {
              const isSel = selectedIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggle(u.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${isSel ? 'bg-violet-50 dark:bg-violet-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/60'}`}
                >
                  <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{u.name || u.email}</span>
                  {multi && (
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSel ? 'bg-violet-500 border-violet-500' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isSel && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </span>
                  )}
                  {!multi && isSel && <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                </button>
              );
            })}
          </div>
          {active && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button onClick={() => onChange([])} className="text-[10px] text-red-500 hover:text-red-600 transition-colors">
                Сбросить
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

async function fetchTasksPageData(): Promise<TasksPageData> {
  const [tasksRes, projectsRes, usersRes] = await Promise.all([
    api.get('/tasks', { params: { limit: 500 } }),
    api.get('/projects', { params: { limit: 100 } }),
    api.get('/users', { params: { limit: 100 } }),
  ]);
  const allUsers: User[] = usersRes.data.data || usersRes.data.users || [];
  return {
    tasks: tasksRes.data.tasks || tasksRes.data.data || [],
    projects: projectsRes.data.projects || projectsRes.data.data || [],
    users: allUsers.filter((u) => u.roleId !== 15),
  };
}

type SortKey = 'title' | 'project' | 'status' | 'priority' | 'assignee' | 'creator' | 'dueDate' | 'updatedAt';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  const t = useT();
  return (
    <span className="inline-flex flex-col gap-px ml-1 align-middle">
      <svg
        className={`w-2.5 h-2.5 transition-colors ${active && dir === 'asc' ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600'}`}
        viewBox="0 0 10 6" fill="currentColor"
      >
        <path d="M5 0L10 6H0L5 0Z" />
      </svg>
      <svg
        className={`w-2.5 h-2.5 transition-colors ${active && dir === 'desc' ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600'}`}
        viewBox="0 0 10 6" fill="currentColor"
      >
        <path d="M5 6L0 0H10L5 6Z" />
      </svg>
    </span>
  );
}

const DISPLAY_SECTIONS: { title: string; items: { key: keyof DisplaySettings; label: string; hint?: string }[] }[] = [
  {
    title: 'Колонки таблицы',
    items: [
      { key: 'colProject',   label: 'Проект' },
      { key: 'colStatus',    label: 'Статус' },
      { key: 'colPriority',  label: 'Приоритет' },
      { key: 'colAssignee',  label: 'Исполнитель' },
      { key: 'colCreator',   label: 'Поставил' },
      { key: 'colDueDate',   label: 'Срок' },
      { key: 'colUpdatedAt', label: 'Изменён' },
    ],
  },
  {
    title: 'Элементы строк',
    items: [
      { key: 'showProgress',     label: 'Прогресс чек-листа',     hint: 'Полоска выполнения под названием' },
      { key: 'showCreatedDate',  label: 'Дата постановки',        hint: 'Мелкая дата под именем поставившего' },
      { key: 'showOverdueBadge', label: 'Метка «Просрочена»',     hint: 'Надпись рядом со сроком' },
      { key: 'highlightOverdue', label: 'Подсветка просроченных', hint: 'Красный фон строки' },
      { key: 'showHistoryIcon',  label: 'Иконка истории',         hint: 'Появляется при наведении на строку' },
      { key: 'showActions',      label: 'Кнопки действий',        hint: 'Редактировать и удалить' },
    ],
  },
  {
    title: 'Поведение',
    items: [
      { key: 'compactMode',   label: 'Компактный режим',          hint: 'Уже строки и мельче текст' },
      { key: 'hideCompleted', label: 'Скрыть завершённые задачи' },
      { key: 'hideCancelled', label: 'Скрыть отменённые задачи' },
    ],
  },
];

function TableSettingsModal({ settings, onChange, onClose }: {
  settings: DisplaySettings;
  onChange: (s: DisplaySettings) => void;
  onClose: () => void;
}) {
  const t = useT();
  const toggle = (key: keyof DisplaySettings) => onChange({ ...settings, [key]: !settings[key] });
  const isDefault = JSON.stringify(settings) === JSON.stringify(DEFAULT_DISPLAY_SETTINGS);

  // Перетаскиваемая панель без затемнения — таблица видна, изменения сразу заметны
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 480) : 100,
    y: 88,
  }));
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragOffset.current) return;
      e.preventDefault();
      setPos({
        x: Math.min(Math.max(8, e.clientX - dragOffset.current.dx), window.innerWidth - 80),
        y: Math.min(Math.max(8, e.clientY - dragOffset.current.dy), window.innerHeight - 60),
      });
    };
    const up = () => { dragOffset.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed z-[180] w-[26rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
      style={{ left: pos.x, top: pos.y, maxHeight: 'calc(100vh - 24px)' }}
    >
        <div
          onPointerDown={(e) => { dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; }}
          className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Настройки отображения')}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('Изменения применяются сразу • потяните за шапку, чтобы передвинуть')}</p>
          </div>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {DISPLAY_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{t(section.title)}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const checked = settings[item.key];
                  return (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item.key)}
                        className="sr-only"
                      />
                      <span className={`w-[18px] h-[18px] rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-violet-500 border-violet-500' : 'border-gray-300 dark:border-gray-600'}`}>
                        {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-gray-700 dark:text-gray-300">{t(item.label)}</span>
                        {item.hint && <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-px">{t(item.hint)}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-between">
          <button
            onClick={() => onChange({ ...DEFAULT_DISPLAY_SETTINGS })}
            disabled={isDefault}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
          >
            Сбросить по умолчанию
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
          >
            Готово
          </button>
        </div>
    </div>
  );
}

export default function TasksPage() {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const searchParams = useSearchParams();
  const router = useRouter();
  const markTasksRead = useTaskNotifStore((s) => s.markRead);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [openedFromChat, setOpenedFromChat] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('dashViewMode') as 'table' | 'grid') || 'table';
    return 'table';
  });
  const [quickCreateProjectId, setQuickCreateProjectId] = useState<number | undefined>(undefined);
  const historyCache = useRef<Record<number, any[]>>({});
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [historyTooltip, setHistoryTooltip] = useState<{ taskId: number; x: number; y: number; events: any[] } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [filterProject, setFilterProject] = useState<number | null>(null);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<number, Assignee[]>>({});
  const [filterAssigneeIds, setFilterAssigneeIds] = useState<number[]>([]);
  const [filterCreatorId, setFilterCreatorId] = useState<number[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(loadDisplaySettings);
  const [showTableSettings, setShowTableSettings] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(DISPLAY_SETTINGS_KEY, JSON.stringify(displaySettings)); } catch {}
  }, [displaySettings]);

  useEffect(() => { markTasksRead(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    if (showSettings) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  const { data, loading, error, refetch } =
    useOfflineData<TasksPageData>(fetchTasksPageData, 'tasks-page');

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.entity === 'task') refetch();
    };
    window.addEventListener(FAB_CREATED_EVENT, handler);
    return () => window.removeEventListener(FAB_CREATED_EVENT, handler);
  }, [refetch]);

  const tasks = data?.tasks ?? [];
  const users = data?.users ?? [];

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || !tasks.length) return;
    const task = tasks.find((t) => String(t.id) === editId);
    if (task) {
      setEditingTask(task);
      setShowModal(true);
      try {
        if (typeof window !== 'undefined' && sessionStorage.getItem('taskBackTo')) {
          setOpenedFromChat(true);
        }
      } catch {}
    }
  }, [tasks, searchParams]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const resolveAssigneeName = (userId: number, userName: string | null) => {
    if (userName) return userName;
    const u = users.find((u) => u.id === userId);
    return u?.name || u?.email || `#${userId}`;
  };

  const sortedTasks = useMemo(() => {
    const base = [...tasks].sort((a, b) => {
      if (a.status !== b.status) return a.status - b.status;
      return new Date(b.createdAt || b.created_at || '').getTime() -
             new Date(a.createdAt || a.created_at || '').getTime();
    });
    if (!sortKey) return base;
    return base.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title, 'ru');
      else if (sortKey === 'project') cmp = (a.project?.name || '').localeCompare(b.project?.name || '', 'ru');
      else if (sortKey === 'status') cmp = a.status - b.status;
      else if (sortKey === 'priority') cmp = a.priority - b.priority;
      else if (sortKey === 'dueDate') {
        const ad = a.dueDate || a.due_date || '';
        const bd = b.dueDate || b.due_date || '';
        cmp = ad < bd ? -1 : ad > bd ? 1 : 0;
      } else if (sortKey === 'assignee') {
        const aName = (a.assignees && a.assignees.length > 0)
          ? resolveAssigneeName(a.assignees[0].userId, a.assignees[0].userName ?? null)
          : (a.assignedToUser?.name || '');
        const bName = (b.assignees && b.assignees.length > 0)
          ? resolveAssigneeName(b.assignees[0].userId, b.assignees[0].userName ?? null)
          : (b.assignedToUser?.name || '');
        cmp = aName.localeCompare(bName, 'ru');
      } else if (sortKey === 'creator') {
        const aId = a.createdByUserId || a.created_by_user_id;
        const bId = b.createdByUserId || b.created_by_user_id;
        const aU = aId ? users.find((u) => u.id === aId) : null;
        const bU = bId ? users.find((u) => u.id === bId) : null;
        cmp = (aU?.name || '').localeCompare(bU?.name || '', 'ru');
      } else if (sortKey === 'updatedAt') {
        const au = a.updatedAt || a.updated_at || '';
        const bu = b.updatedAt || b.updated_at || '';
        cmp = au < bu ? -1 : au > bu ? 1 : 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tasks, sortKey, sortDir, users]);

  const filteredTasks = useMemo(() => {
    return sortedTasks.filter((t) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus !== null && t.status !== filterStatus) return false;
      if (filterProject !== null && (t.projectId || t.project_id) !== filterProject) return false;
      if (filterOverdue && !isTaskOverdue(t)) return false;
      if (filterAssigneeIds.length > 0) {
        const effective = assigneeOverrides[t.id] ?? t.assignees ?? [];
        if (!filterAssigneeIds.some((id) => effective.some((a) => a.userId === id))) return false;
      }
      if (filterCreatorId.length > 0) {
        const cId = t.createdByUserId || t.created_by_user_id;
        if (!cId || !filterCreatorId.includes(cId)) return false;
      }
      // Скрытие по настройкам отображения (если статус выбран фильтром явно — показываем)
      if (displaySettings.hideCompleted && t.status === 4 && filterStatus !== 4) return false;
      if (displaySettings.hideCancelled && t.status === 5 && filterStatus !== 5) return false;
      return true;
    });
  }, [sortedTasks, searchQuery, filterStatus, filterProject, filterOverdue, filterAssigneeIds, filterCreatorId, assigneeOverrides, displaySettings]);

  const hasActiveFilters = !!(searchQuery || filterStatus !== null || filterProject !== null || filterOverdue || filterAssigneeIds.length > 0 || filterCreatorId.length > 0);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus(null);
    setFilterProject(null);
    setFilterOverdue(false);
    setFilterAssigneeIds([]);
    setFilterCreatorId([]);
    setShowSearch(false);
    setShowFilter(false);
  };

  const exportCSV = () => {
    const headers = ['Название', 'Проект', 'Статус', 'Приоритет', 'Исполнитель', 'Поставил', 'Срок', 'Изменён'];
    const rows = filteredTasks.map((t) => {
      const status = STATUS_LABELS[t.status]?.label || '';
      const priority = PRIORITY_LABELS[t.priority]?.label || '';
      const assigneeName =
        t.assignees?.length
          ? t.assignees.map((a) => resolveAssigneeName(a.userId, a.userName ?? null)).join('; ')
          : t.assignedToUser?.name || t.assigned_to_user?.name || '—';
      const creatorId = t.createdByUserId || t.created_by_user_id;
      const creatorUser = creatorId ? users.find((u) => u.id === creatorId) : null;
      const creatorName = !creatorId || creatorUser?.roleId === 1 ? 'Система' : (creatorUser?.name || '—');
      return [
        t.title, t.project?.name || '—', status, priority,
        assigneeName, creatorName,
        formatDate(t.dueDate || t.due_date),
        formatDate(t.updatedAt || t.updated_at),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `задачи_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchTaskComments = async (taskId: number) => {
    if (historyCache.current[taskId]) return historyCache.current[taskId];
    const res = await api.get('/task-comments', { params: { taskId, limit: 200 } });
    const raw: any[] = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.comments || []);
    const sorted = raw.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    historyCache.current[taskId] = sorted;
    return sorted;
  };

  const showTaskHistory = (e: React.MouseEvent, taskId: number) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    tooltipTimer.current = setTimeout(async () => {
      try {
        const events = await fetchTaskComments(taskId);
        setHistoryTooltip({ taskId, x: rect.left, y: rect.bottom, events: [...events].reverse().slice(0, 3) });
      } catch {}
    }, 250);
  };
  const hideTaskHistory = () => {
    tooltipTimer.current = setTimeout(() => setHistoryTooltip(null), 150);
  };
  const keepTaskHistory = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  };

  const openTaskHistory = async (task: Task) => {
    setHistoryTask(task);
    setHistoryEvents([]);
    setHistoryLoading(true);
    setHistoryTooltip(null);
    try {
      const events = await fetchTaskComments(task.id);
      setHistoryEvents(events);
    } catch {
      setHistoryEvents([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCreate = (projectId?: number) => {
    setQuickCreateProjectId(projectId);
    setEditingTask(null);
    setShowModal(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setQuickCreateProjectId(undefined);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задачу?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/tasks/${id}`);
      addToast('success', 'Задача удалена');
      await refetch();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при удалении');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssigneesUpdated = (taskId: number, newAssignees: Assignee[]) => {
    setAssigneeOverrides((prev) => ({ ...prev, [taskId]: newAssignees }));
  };

  const handleSaved = async () => {
    setShowModal(false);
    setEditingTask(null);
    setQuickCreateProjectId(undefined);
    await refetch();
  };

  const ds = displaySettings;
  const cellPad = ds.compactMode ? 'py-1.5 px-3' : 'py-2.5 px-4';

  const COLUMNS: { key: SortKey | null; label: string }[] = [
    { key: 'title', label: 'Название' },
    ...(ds.colProject   ? [{ key: 'project' as SortKey,   label: 'Проект' }] : []),
    ...(ds.colStatus    ? [{ key: 'status' as SortKey,    label: 'Статус' }] : []),
    ...(ds.colPriority  ? [{ key: 'priority' as SortKey,  label: 'Приоритет' }] : []),
    ...(ds.colAssignee  ? [{ key: 'assignee' as SortKey,  label: 'Исполнитель' }] : []),
    ...(ds.colCreator   ? [{ key: 'creator' as SortKey,   label: 'Поставил' }] : []),
    ...(ds.colDueDate   ? [{ key: 'dueDate' as SortKey,   label: 'Срок' }] : []),
    ...(ds.colUpdatedAt ? [{ key: 'updatedAt' as SortKey, label: 'Изменён' }] : []),
    ...(ds.showActions  ? [{ key: null, label: '' }] : []),
  ];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">{t('Задачи')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Управление задачами проекта')}</p>
        </div>
        <div className="relative flex items-center gap-2 mt-3 sm:mt-0" ref={settingsRef}>
          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowSearch((v) => !v)}
              title={t('Поиск')}
              className={`relative p-2 rounded-lg transition-colors ${showSearch || searchQuery ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => handleCreate()}
              title={t('Создать задачу')}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => { setShowFilter((v) => !v); setShowSearch(false); }}
              title={t('Фильтры')}
              className={`relative p-2 rounded-lg transition-colors ${showFilter || filterStatus !== null || filterProject !== null || filterOverdue ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {(filterStatus !== null || filterProject !== null || filterOverdue) && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-500" />
              )}
            </button>
            {/* Settings button */}
            <div>
              <button
                onClick={() => setShowSettings((v) => !v)}
                title={t('Настройки и экспорт')}
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
          {showSettings && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-[200]">
                  <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('Вид')}</p>
                  <button
                    onClick={() => { setShowTableSettings(true); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Настроить таблицу
                  </button>
                  <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
                  <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('Экспорт')}</p>
                  <button
                    onClick={() => { window.print(); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Скачать PDF
                  </button>
                  <button
                    onClick={() => { exportCSV(); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Загрузить таблицу (CSV)
                  </button>
                  {hasActiveFilters && (
                    <>
                      <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
                      <button
                        onClick={() => { resetFilters(); setShowSettings(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Сбросить фильтры
                      </button>
                    </>
                  )}
                </div>
              )}
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => { setViewMode('table'); localStorage.setItem('dashViewMode', 'table'); }}
              className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title={t('Таблица')}
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => { setViewMode('grid'); localStorage.setItem('dashViewMode', 'grid'); }}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title={t('Карточки')}
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="mb-3 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 shadow-xs border border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder={t('Поиск по названию задачи...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Filter tabs — visible when filter is toggled */}
      {showFilter && <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => { setFilterStatus(null); setFilterOverdue(false); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterStatus === null && !filterOverdue ? 'bg-violet-500 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'}`}
          >
            Все
          </button>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { setFilterStatus(Number(k)); setFilterOverdue(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterStatus === Number(k) ? 'bg-violet-500 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'}`}
            >
              {v.label}
            </button>
          ))}
          <button
            onClick={() => { setFilterOverdue((v) => !v); setFilterStatus(null); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterOverdue ? 'bg-red-500 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700/50 hover:border-red-400 dark:hover:border-red-500'}`}
          >
            Просроченные
          </button>
        </div>
        {/* Project filter */}
        <select
          value={filterProject ?? ''}
          onChange={(e) => setFilterProject(e.target.value === '' ? null : Number(e.target.value))}
          className={`text-xs font-medium rounded-lg px-3 py-1.5 outline-none transition-colors border ${filterProject !== null ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'} focus:border-violet-400`}
        >
          <option value="">{t('Все проекты')}</option>
          {(data?.projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">{t('Загрузка...')}</div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-red-500">{error}</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
          {hasActiveFilters ? 'Задачи не найдены — попробуйте изменить фильтры' : 'Задачи не найдены'}
          {hasActiveFilters && (
            <div className="mt-3">
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t('Сбросить фильтры')}
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const status = STATUS_LABELS[task.status] || STATUS_LABELS[0];
            const priority = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS[2];
            const assignee = task.assignedToUser || task.assigned_to_user;
            const assigneeId = task.assignedToUserId || task.assigned_to_user_id;
            const resolvedUser = assigneeId ? users.find((u) => u.id === assigneeId) : null;
            const assigneeName =
              task.assignees && task.assignees.length > 0
                ? task.assignees.map((a) => resolveAssigneeName(a.userId, a.userName ?? null)).join(', ')
                : assignee?.name || assignee?.email || resolvedUser?.name || resolvedUser?.email || '—';
            const creatorId = task.createdByUserId || task.created_by_user_id;
            const creatorUser = creatorId ? users.find((u) => u.id === creatorId) : null;
            const creatorName = !creatorId || creatorUser?.roleId === 1 ? 'Система' : creatorUser?.name || creatorUser?.email || 'Система';
            const createdAt = task.createdAt || task.created_at;
            const overdue = isTaskOverdue(task);
            const rowOverdue = overdue && ds.highlightOverdue;
            const { done, total } = getTaskProgress(task);
            const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={task.id} className={`group/card border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow ${rowOverdue ? 'bg-red-50/70 dark:bg-red-900/10 border-red-300 dark:border-red-700/60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start gap-1.5">
                  <div className="font-semibold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 flex-1 leading-snug" onClick={() => handleEdit(task)}>
                    {task.title}
                  </div>
                  {ds.showHistoryIcon && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(task); setHistoryTooltip(null); }}
                      onMouseEnter={(e) => showTaskHistory(e, task.id)}
                      onMouseLeave={hideTaskHistory}
                      className="shrink-0 opacity-0 group-hover/card:opacity-60 hover:!opacity-100 p-0.5 text-gray-400 hover:text-violet-500 transition-all mt-0.5"
                      title={t('История задачи')}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </div>
                {ds.showProgress && total > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progressPct === 100 ? 'bg-green-500' : 'bg-violet-400'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{done}/{total}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                  <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {ds.colProject && <div><dt className="text-xs text-gray-400">{t('Проект')}</dt><dd className="text-xs text-gray-700 dark:text-gray-300 truncate">{task.project?.name || '—'}</dd></div>}
                  {ds.colDueDate && <div><dt className="text-xs text-gray-400">{t('Срок')}</dt><dd className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>{formatDate(task.dueDate || task.due_date)}</dd></div>}
                  {ds.colAssignee && <div className="col-span-2"><dt className="text-xs text-gray-400">{t('Исполнитель')}</dt><dd className="text-xs text-gray-700 dark:text-gray-300 truncate">{assigneeName}</dd></div>}
                  {ds.colCreator && <div className="col-span-2"><dt className="text-xs text-gray-400">{t('Поставил')}</dt><dd className="text-xs text-gray-700 dark:text-gray-300 truncate">{creatorName}{ds.showCreatedDate && createdAt && <span className="ml-1 text-gray-400">{formatDate(createdAt)}</span>}</dd></div>}
                </dl>
                {ds.showActions && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => handleEdit(task)} className="flex-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors text-center">{t('Изменить')}</button>
                    <button onClick={() => handleDelete(task.id)} disabled={deletingId === task.id} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors disabled:opacity-50">{deletingId === task.id ? '...' : 'Удалить'}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`table-auto w-full ${ds.compactMode ? 'text-xs' : 'text-sm'}`}>
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700/60">
                  {COLUMNS.map((col) => (
                    <th key={col.label} className={`${ds.compactMode ? 'py-2 px-3' : 'py-3 px-4'} text-left font-semibold`}>
                      <div className="inline-flex items-center">
                        {col.key ? (
                          <button
                            onClick={() => handleSort(col.key!)}
                            className="inline-flex items-center gap-0.5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors select-none"
                          >
                            {col.label}
                            <SortIcon active={sortKey === col.key} dir={sortDir} />
                          </button>
                        ) : col.label}
                        {col.key === 'assignee' && (
                          <ColumnUserFilter
                            users={users}
                            selectedIds={filterAssigneeIds}
                            onChange={setFilterAssigneeIds}
                            multi
                          />
                        )}
                        {col.key === 'creator' && (
                          <ColumnUserFilter
                            users={users}
                            selectedIds={filterCreatorId}
                            onChange={setFilterCreatorId}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filteredTasks.flatMap((task) => {
                  const status = STATUS_LABELS[task.status] || STATUS_LABELS[0];
                  const priority = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS[2];
                  const creatorId = task.createdByUserId || task.created_by_user_id;
                  const creatorUser = creatorId ? users.find((u) => u.id === creatorId) : null;
                  const isSystem = !creatorId || creatorUser?.roleId === 1;
                  const creatorName = isSystem ? 'Система' : (creatorUser?.name || creatorUser?.email || 'Система');
                  const updatedAt = task.updatedAt || task.updated_at;
                  const overdue = isTaskOverdue(task);
                  const rowOverdue = overdue && ds.highlightOverdue;
                  const { done, total } = getTaskProgress(task);
                  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <tr
                      key={task.id}
                      className={`group/row cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/20 ${rowOverdue ? 'bg-red-50/70 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}`}
                      onClick={() => handleEdit(task)}
                    >
                      {/* Название */}
                      <td className={`${cellPad} font-medium text-gray-800 dark:text-gray-100 max-w-[220px]`}>
                        <div className="flex items-center gap-1.5">
                          <div className="truncate flex-1">{task.title}</div>
                          {ds.showHistoryIcon && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openTaskHistory(task); }}
                              onMouseEnter={(e) => { e.stopPropagation(); showTaskHistory(e, task.id); }}
                              onMouseLeave={hideTaskHistory}
                              className="shrink-0 opacity-0 group-hover/row:opacity-60 hover:!opacity-100 p-0.5 text-gray-400 hover:text-violet-500 transition-all"
                              title={t('История задачи')}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {ds.showProgress && total > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-green-500' : 'bg-violet-400'}`} style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0">{done}/{total}</span>
                          </div>
                        )}
                      </td>
                      {/* Проект */}
                      {ds.colProject && (
                        <td className={`${cellPad} text-gray-600 dark:text-gray-400 whitespace-nowrap`}>
                          {task.project?.name || '—'}
                        </td>
                      )}
                      {/* Статус */}
                      {ds.colStatus && (
                        <td className={`${cellPad} whitespace-nowrap`}>
                          <span className={`inline-flex rounded-full ${ds.compactMode ? 'px-2 py-px text-[11px]' : 'px-2.5 py-0.5 text-xs'} font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      )}
                      {/* Приоритет */}
                      {ds.colPriority && (
                        <td className={`${cellPad} whitespace-nowrap`}>
                          <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
                        </td>
                      )}
                      {/* Исполнитель */}
                      {ds.colAssignee && (
                        <td className={`${cellPad} max-w-[180px]`} onClick={(e) => e.stopPropagation()}>
                          <AssigneeTextCell
                            task={assigneeOverrides[task.id] !== undefined ? { ...task, assignees: assigneeOverrides[task.id] } : task}
                            users={users}
                            onNameClick={setProfileUserId}
                          />
                        </td>
                      )}
                      {/* Поставил */}
                      {ds.colCreator && (
                        <td className={cellPad} onClick={(e) => e.stopPropagation()}>
                          <button
                            className={`${ds.compactMode ? 'text-xs' : 'text-sm'} text-left transition-colors ${!isSystem ? 'text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:underline cursor-pointer' : 'text-gray-500 dark:text-gray-400 cursor-default'}`}
                            onClick={(e) => { e.stopPropagation(); if (!isSystem && creatorId) setProfileUserId(creatorId); }}
                            disabled={isSystem}
                          >
                            {creatorName}
                          </button>
                          {ds.showCreatedDate && (task.createdAt || task.created_at) && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {formatDate(task.createdAt || task.created_at)}
                            </div>
                          )}
                        </td>
                      )}
                      {/* Срок */}
                      {ds.colDueDate && (
                        <td className={`${cellPad} whitespace-nowrap`}>
                          <span className={overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                            {formatDate(task.dueDate || task.due_date)}
                            {overdue && ds.showOverdueBadge && <span className="ml-1 text-[10px] uppercase tracking-wide">{t('просрочена')}</span>}
                          </span>
                        </td>
                      )}
                      {/* Дата изменения */}
                      {ds.colUpdatedAt && (
                        <td className={`${cellPad} whitespace-nowrap text-gray-500 dark:text-gray-400`}>
                          {formatDate(updatedAt)}
                        </td>
                      )}
                      {/* Действия */}
                      {ds.showActions && (
                      <td
                        className={`${ds.compactMode ? 'py-1.5 px-2' : 'py-2.5 px-3'} whitespace-nowrap sticky right-0 ${rowOverdue ? 'bg-red-50/70 dark:bg-red-900/10 group-hover/row:bg-red-50 dark:group-hover/row:bg-red-900/20' : 'bg-white dark:bg-gray-800 group-hover/row:bg-gray-50 dark:group-hover/row:bg-gray-900/20'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(task)}
                            title={t('Редактировать')}
                            className="p-1.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            disabled={deletingId === task.id}
                            title={t('Удалить')}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {deletingId === task.id ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v4m0 8v4M4 12H8m8 0h4" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History tooltip (hover preview) */}
      {historyTooltip && (
        <div
          className="fixed z-[200] w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4"
          style={{ top: historyTooltip.y + 8, left: Math.min(historyTooltip.x, (typeof window !== 'undefined' ? window.innerWidth : 1400) - 330) }}
          onMouseEnter={keepTaskHistory}
          onMouseLeave={hideTaskHistory}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t('Последние события')}</p>
          {historyTooltip.events.length === 0 ? (
            <p className="text-xs text-gray-400">{t('Комментариев пока нет')}</p>
          ) : (
            <ul className="space-y-2.5">
              {historyTooltip.events.map((ev: any, i) => {
                const isSystem = ev.type === 'system' || (ev.commentText || ev.content || '').startsWith('__system__:');
                const text = (ev.commentText || ev.content || '').replace(/^__system__:/, '');
                const authorId = ev.userId || ev.user_id;
                const author = authorId ? users.find((u) => u.id === authorId) : null;
                const authorName = isSystem ? 'Система' : (author?.name || author?.email || 'Пользователь');
                return (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold ${isSystem ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'}`}>
                      {isSystem ? '⚙' : authorName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{authorName}</span>
                      <p className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{text}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{new Date(ev.createdAt).toLocaleDateString('ru-RU')}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            onClick={() => { const t = tasks.find((t) => t.id === historyTooltip.taskId); if (t) openTaskHistory(t); setHistoryTooltip(null); }}
            className="text-xs text-violet-500 hover:text-violet-600 mt-3 block font-medium"
          >
            Смотреть всю историю →
          </button>
        </div>
      )}

      {/* Full history drawer */}
      {historyTask && (
        <div className="fixed inset-0 z-[150] flex" onClick={() => setHistoryTask(null)}>
          <div className="flex-1" />
          <div
            className="w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t('История задачи')}</p>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{historyTask.title}</h2>
                  {historyTask.project?.name && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{historyTask.project.name}</p>
                  )}
                </div>
                <button
                  onClick={() => setHistoryTask(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Статус: <span className="font-medium text-gray-700 dark:text-gray-300">{STATUS_LABELS[historyTask.status]?.label || '—'}</span></span>
                <span>Приоритет: <span className="font-medium text-gray-700 dark:text-gray-300">{PRIORITY_LABELS[historyTask.priority]?.label || '—'}</span></span>
                {(historyTask.dueDate || historyTask.due_date) && (
                  <span>Срок: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(historyTask.dueDate || historyTask.due_date)}</span></span>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Загрузка истории...
                </div>
              ) : historyEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">{t('История пуста')}</p>
                  <p className="text-xs mt-1 text-gray-300 dark:text-gray-600">{t('Комментарии появятся после первых действий')}</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-4 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-0">
                    {historyEvents.map((ev: any, i) => {
                      const isSystem = ev.type === 'system' || (ev.commentText || ev.content || '').startsWith('__system__:');
                      const rawText = ev.commentText || ev.content || '';
                      const text = rawText.replace(/^__system__:/, '');
                      const authorId = ev.userId || ev.user_id;
                      const author = authorId ? users.find((u) => u.id === authorId) : null;
                      const authorName = isSystem ? 'Система' : (author?.name || author?.email || `#${authorId}`);
                      const dt = new Date(ev.createdAt);
                      const prevDt = i > 0 ? new Date(historyEvents[i - 1].createdAt) : null;
                      const showDate = !prevDt || dt.toDateString() !== prevDt.toDateString();

                      const iconBg = isSystem
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                        : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400';

                      return (
                        <div key={ev.id || i}>
                          {showDate && (
                            <div className="flex items-center gap-3 my-4 pl-10">
                              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                {dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                          <div className="flex gap-4 py-3 relative">
                            {/* Icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold z-10 ${iconBg}`}>
                              {isSystem
                                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                : authorName.slice(0, 2).toUpperCase()
                              }
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{authorName}</span>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                                  {dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className={`text-sm leading-relaxed break-words ${isSystem ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg' : 'text-gray-700 dark:text-gray-300'}`}>
                                {text}
                              </p>
                              {/* Attachments in comments */}
                              {ev.attachments && (() => {
                                let atts: any[] = [];
                                try { atts = Array.isArray(ev.attachments) ? ev.attachments : JSON.parse(ev.attachments); } catch {}
                                return atts.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {atts.map((a: any, ai: number) => (
                                      <a key={ai} href={a.fileUrl || a.file_url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-violet-500 hover:underline bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded"
                                      >
                                        {a.fileName || a.file_name || 'файл'}
                                      </a>
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-between">
              <span className="text-xs text-gray-400">{historyEvents.length} событий</span>
              <button
                onClick={() => { setHistoryTask(null); handleEdit(historyTask); }}
                className="px-4 py-1.5 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
              >
                Открыть задачу
              </button>
            </div>
          </div>
        </div>
      )}

      {showTableSettings && (
        <TableSettingsModal
          settings={displaySettings}
          onChange={setDisplaySettings}
          onClose={() => setShowTableSettings(false)}
        />
      )}

      {profileUserId !== null && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}

      {showModal && (
        <TaskFormModal
          task={editingTask}
          initialProjectId={!editingTask && quickCreateProjectId ? quickCreateProjectId : undefined}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
            setQuickCreateProjectId(undefined);
            if (openedFromChat) {
              try {
                const backTo = sessionStorage.getItem('taskBackTo');
                sessionStorage.removeItem('taskBackTo');
                setOpenedFromChat(false);
                if (backTo) { router.push(backTo); return; }
              } catch {}
            }
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
