'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect, type ReactNode, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useTaskNotifStore } from '@/stores/taskNotifStore';
import FilePreviewModal from '@/components/ui/FilePreviewModal';
import { normalizeFileUrl } from '@/lib/utils';
import { uploadFileChunked } from '@/lib/chunkedUpload';
import { useT } from '@/lib/i18n';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv', 'm4v']);
function isImageFile(a: Attachment): boolean {
  const ext = (a.fileUrl || '').split('?')[0].split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTS.has(ext) || (a.mimeType || '').startsWith('image/');
}
function isVideoFile(a: Attachment): boolean {
  const ext = (a.fileUrl || '').split('?')[0].split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTS.has(ext) || (a.mimeType || '').startsWith('video/');
}

interface Attachment {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
}

// Telegram-style album grid for multiple images/videos inside a comment.
// Mirrors the layout used by the chat (components/chat/ChatMessage.tsx → MediaAlbum).
function CommentMediaAlbum({ items, onOpen }: { items: Attachment[]; onOpen: (a: Attachment) => void }) {
  const count = items.length;

  const renderCell = (a: Attachment, key: React.Key, className: string, overflow?: number) => {
    const url = normalizeFileUrl(a.fileUrl) || '';
    const isVid = isVideoFile(a);
    const showOverflow = overflow != null && overflow > 0;
    return (
      <button
        key={key}
        type="button"
        onClick={() => onOpen(a)}
        title={a.fileName}
        className={`relative overflow-hidden cursor-pointer bg-gray-100 dark:bg-gray-800 ${className}`}
      >
        {isVid ? (
          <video
            src={url}
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.001; }}
            className="w-full h-full object-cover"
            style={{ background: '#000' }}
          />
        ) : (
          <img src={url} alt={a.fileName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        {isVid && !showOverflow && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
            <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow">
              <svg className="w-3.5 h-3.5 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        )}
        {showOverflow && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
            <span className="text-white text-2xl font-bold">+{overflow}</span>
          </div>
        )}
      </button>
    );
  };

  if (count === 1) {
    const a = items[0];
    const url = normalizeFileUrl(a.fileUrl) || '';
    const isVid = isVideoFile(a);
    return (
      <button
        type="button"
        onClick={() => onOpen(a)}
        title={a.fileName}
        className="relative block rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-violet-400 transition-all"
        style={{ maxWidth: 280 }}
      >
        {isVid ? (
          <video
            src={url}
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.001; }}
            className="max-w-[280px] max-h-[320px] object-cover block"
            style={{ background: '#000' }}
          />
        ) : (
          <img src={url} alt={a.fileName} className="max-w-[280px] max-h-[320px] object-cover block" />
        )}
        {isVid && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow">
              <svg className="w-5 h-5 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        )}
      </button>
    );
  }

  const wrap = 'rounded-lg overflow-hidden w-full max-w-[320px]';

  if (count === 2) {
    return (
      <div className={`flex gap-0.5 h-44 ${wrap}`}>
        {renderCell(items[0], 0, 'flex-1')}
        {renderCell(items[1], 1, 'flex-1')}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className={`flex flex-col gap-0.5 ${wrap}`}>
        <div className="h-40">{renderCell(items[0], 0, 'w-full h-full')}</div>
        <div className="flex gap-0.5 h-28">
          {renderCell(items[1], 1, 'flex-1')}
          {renderCell(items[2], 2, 'flex-1')}
        </div>
      </div>
    );
  }

  // 4+ items: 1 large + up to 3 thumbnails, last thumb shows overflow count
  const thumbs = items.slice(1, 4);
  const overflow = count - 4;
  return (
    <div className={`flex flex-col gap-0.5 ${wrap}`}>
      <div className="h-44">{renderCell(items[0], 0, 'w-full h-full')}</div>
      <div className="flex gap-0.5 h-28">
        {thumbs.map((a, i) => {
          const isLast = i === thumbs.length - 1 && overflow > 0;
          return renderCell(a, i + 1, 'flex-1', isLast ? overflow : undefined);
        })}
      </div>
    </div>
  );
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  // Workflow: 0=new, 1=in_progress, 2=pending_approval, 3=done, 4=rejected
  status?: number;
  completedBy?: number;
  completedByName?: string;
  completedAt?: string;
  approvedBy?: number;
  approvedAt?: string;
  // Extended fields (stored in JSONB, no migration needed)
  assigneeId?: number;
  assigneeName?: string;
  dueDate?: string;
  priority?: number;
  createdAt?: string;
  createdByUserId?: number;
}

interface ChecklistGroup {
  id: string;
  title: string;
  collapsed: boolean;
  items: ChecklistItem[];
}

interface TaskComment {
  id: number;
  taskId: number;
  userId?: number;
  user_id?: number;
  commentText?: string;
  content?: string;
  attachments: any;
  createdAt: string;
  type?: 'user' | 'system';
}

interface Assignee {
  userId: number;
  userName?: string;
}

interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  roleId?: number;
  avatarUrl?: string;
}

interface Project {
  id: number;
  name: string;
}

interface ConstructionSite {
  id: number;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 0, label: 'Новая',       cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300' },
  { value: 1, label: 'Назначена',   cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400' },
  { value: 2, label: 'В работе',    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  { value: 3, label: 'На проверке', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
  { value: 4, label: 'Завершена',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  { value: 5, label: 'Отменена',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Низкий',      activeCls: 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200' },
  { value: 2, label: 'Средний',     activeCls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' },
  { value: 3, label: 'Высокий',     activeCls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' },
  { value: 4, label: 'Критический', activeCls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
];

// Subtask workflow statuses
// 0=new, 1=in_progress, 2=pending_approval, 3=done, 4=rejected
const SUBTASK_STATUS = {
  NEW: 0,
  IN_PROGRESS: 1,
  PENDING_APPROVAL: 2,
  DONE: 3,
  REJECTED: 4,
} as const;

const SUBTASK_STATUS_LABELS: Record<number, { label: string; bg: string; text: string }> = {
  0: { label: 'Новая',          bg: 'bg-gray-300 dark:bg-gray-600',  text: 'text-gray-600 dark:text-gray-300' },
  1: { label: 'В работе',       bg: 'bg-violet-400 dark:bg-violet-500', text: 'text-violet-700 dark:text-violet-300' },
  2: { label: 'На утверждении', bg: 'bg-yellow-400 dark:bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300' },
  3: { label: 'Выполнена',      bg: 'bg-green-500 dark:bg-green-500',   text: 'text-green-700 dark:text-green-300' },
  4: { label: 'Отклонена',      bg: 'bg-red-400 dark:bg-red-500',       text: 'text-red-700 dark:text-red-300' },
};

const SUBTASK_STATUS_TABLE: Record<number, { label: string; dotClass: string; textClass: string }> = {
  0: { label: 'Новая',          dotClass: 'bg-gray-400 dark:bg-gray-500',    textClass: 'text-gray-500 dark:text-gray-400' },
  1: { label: 'В работе',       dotClass: 'bg-blue-500',                     textClass: 'text-blue-600 dark:text-blue-400' },
  2: { label: 'На утверждении', dotClass: 'bg-yellow-500',                   textClass: 'text-yellow-600 dark:text-yellow-400' },
  3: { label: 'Выполнена',      dotClass: 'bg-green-500',                    textClass: 'text-green-600 dark:text-green-400' },
  4: { label: 'Отклонена',      dotClass: 'bg-red-500',                      textClass: 'text-red-600 dark:text-red-400' },
};

const SUBTASK_PRIORITY_TABLE: Record<number, { label: string; cls: string }> = {
  1: { label: 'Низкий',      cls: 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400' },
  2: { label: 'Средний',     cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400' },
  3: { label: 'Высокий',     cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  4: { label: 'Критический', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

// ── Настройки отображения подзадач (шестерёнка в шапке списка) ──────────────
interface SubtaskDisplaySettings {
  viewMode: 'table' | 'grid';
  colAssignee: boolean;
  colDueDate: boolean;
  colPriority: boolean;
  colCreatedAt: boolean;
}

const SUBTASK_DISPLAY_KEY = 'subtaskDisplaySettings';
const DEFAULT_SUBTASK_DISPLAY: SubtaskDisplaySettings = {
  viewMode: 'table',
  colAssignee: true,
  colDueDate: true,
  colPriority: true,
  colCreatedAt: true,
};

function loadSubtaskDisplaySettings(): SubtaskDisplaySettings {
  try {
    const raw = localStorage.getItem(SUBTASK_DISPLAY_KEY);
    if (raw) return { ...DEFAULT_SUBTASK_DISPLAY, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SUBTASK_DISPLAY };
}

const SUBTASK_COLUMN_ITEMS: { key: keyof SubtaskDisplaySettings; label: string }[] = [
  { key: 'colAssignee',  label: 'Исполнитель' },
  { key: 'colDueDate',   label: 'Срок' },
  { key: 'colPriority',  label: 'Приоритет' },
  { key: 'colCreatedAt', label: 'Создано' },
];

function isItemOverdue(item: ChecklistItem): boolean {
  if (!item.dueDate) return false;
  const st = typeof item.status === 'number' ? item.status : (item.checked ? 3 : 0);
  if (st === 3 || st === 4) return false;
  return new Date(item.dueDate).getTime() < Date.now();
}

function getItemStatus(item: ChecklistItem): number {
  if (typeof item.status === 'number') return item.status;
  return item.checked ? SUBTASK_STATUS.DONE : SUBTASK_STATUS.NEW;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function userName(u: User): string {
  if (u.firstName || u.lastName) {
    return [u.firstName, u.lastName].filter(Boolean).join(' ');
  }
  return u.name || u.email || `#${u.id}`;
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function formatAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateTime(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ROLE_LABELS: Record<number, string> = {
  1: 'Супер-администратор', 2: 'Администратор', 3: 'HR-менеджер',
  4: 'Менеджер проекта', 5: 'Прораб', 6: 'Снабженец',
  7: 'Кладовщик', 8: 'Бухгалтер', 9: 'Инспектор', 10: 'Рабочий',
};

function parseAttachments(raw: any): Attachment[] {
  let parsed: any[] = [];
  if (Array.isArray(raw)) parsed = raw;
  else if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { parsed = []; }
  }
  return parsed
    .filter((a: any) => (a?.fileUrl || a?.file_url) && (a?.fileName || a?.file_name))
    .map((a: any) => ({
      fileName: a.fileName || a.file_name || '',
      fileSize: a.fileSize || a.file_size || 0,
      mimeType: a.mimeType || a.mime_type || '',
      fileUrl: a.fileUrl || a.file_url || '',
    }));
}

function EmployeeCard({ user, assignedAt, onClose, onRemove }: {
  user: User;
  assignedAt?: string;
  onClose: () => void;
  onRemove?: () => void;
}) {
  const t = useT();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    api.get('/tasks', { params: { assignedToUserId: user.id, limit: 10 } })
      .then((r) => setTasks(r.data?.tasks || r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingTasks(false));
  }, [user.id]);

  const name = userName(user);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Сотрудник')}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Avatar + name */}
        <div className="mx-5 mb-4 flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white text-base font-semibold shrink-0 overflow-hidden relative">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              : initials(name)
            }
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">{name}</div>
            {user.email && <div className="text-xs text-gray-400 truncate">{user.email}</div>}
          </div>
        </div>

        {/* Info rows */}
        <div className="px-5 space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('Роль')}</span>
            <span className="text-gray-800 dark:text-gray-100 text-right">{user.roleId ? (ROLE_LABELS[user.roleId] || `#${user.roleId}`) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('Статус')}</span>
            <span className="text-green-600 dark:text-green-400 font-medium">{t('Активен')}</span>
          </div>
          {assignedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('Назначен')}</span>
              <span className="text-gray-800 dark:text-gray-100">{new Date(assignedAt).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="px-5 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('Задачи сотрудника')}</p>
          {loadingTasks ? (
            <p className="text-xs text-gray-400 py-2">{t('Загрузка...')}</p>
          ) : tasks.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">{t('Нет задач')}</p>
          ) : (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {tasks.map((t) => {
                const ts = STATUS_OPTIONS.find((s) => s.value === (t.status ?? 0)) || STATUS_OPTIONS[0];
                const tp = PRIORITY_OPTIONS.find((p) => p.value === (t.priority ?? 2)) || PRIORITY_OPTIONS[1];
                return (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-xs bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2">
                    <span className="text-gray-800 dark:text-gray-100 font-medium truncate">{t.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded-full ${ts.cls}`}>{ts.label}</span>
                      <span className={`font-medium ${tp.activeCls}`}>{tp.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-700">
          {onRemove ? (
            confirmRemove ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">{t('Убрать из задачи?')}</span>
                <button onClick={onRemove} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg">{t('Да')}</button>
                <button onClick={() => setConfirmRemove(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">{t('Нет')}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmRemove(true)} className="text-sm text-red-500 hover:text-red-600 transition-colors">
                Убрать из задачи
              </button>
            )
          ) : <span />}
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreatedTaskSnapshot {
  id: number;
  title: string;
  description?: string | null;
  status: number;
  priority: number;
  dueDate: string | null;
  projectId: number | null;
  assignees: { userId: number; userName?: string }[];
}

interface TaskFormModalProps {
  task?: any | null;
  onClose: () => void;
  onSaved: () => void;
  // Optional: pre-seed values when creating a new task from a chat slash command.
  initialProjectId?: number;
  initialTitle?: string;
  lockProjectId?: boolean;
  onSavedTask?: (task: CreatedTaskSnapshot) => void;
}

// Matches: @[Display Name](123) — mention token stored in checklist text
const MENTION_REGEX = /@\[([^\]]+)\]\((\d+)\)/g;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderTextWithLinks(text: string, onMentionClick?: (userId: number) => void) {
  // Split text into segments by mentions first, then links inside non-mention segments
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  const pushPlain = (s: string) => {
    if (!s) return;
    const parts = s.split(URL_REGEX);
    parts.forEach((p) => {
      if (/^https?:\/\//.test(p)) {
        out.push(
          <a key={key++} href={p} target="_blank" rel="noopener noreferrer"
            className="text-violet-500 underline hover:text-violet-700 break-all"
            onClick={(e) => e.stopPropagation()}
          >{p}</a>
        );
      } else if (p) {
        out.push(<span key={key++}>{p}</span>);
      }
    });
  };
  const re = new RegExp(MENTION_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    pushPlain(text.slice(lastIndex, m.index));
    const name = m[1];
    const userId = Number(m[2]);
    out.push(
      <span
        key={key++}
        className="inline-flex items-center px-1.5 py-px rounded-md bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium hover:bg-violet-200 dark:hover:bg-violet-900/60 cursor-pointer transition-colors"
        onClick={(e) => { e.stopPropagation(); onMentionClick?.(userId); }}
      >@{name}</span>
    );
    lastIndex = m.index + m[0].length;
  }
  pushPlain(text.slice(lastIndex));
  return out;
}

interface MentionCandidate {
  userId: number;
  userName: string;
  avatarUrl?: string;
}

function AutoResizeTextarea({ value, onChange, className, placeholder, autoFocus, onBlur, mentionCandidates }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
  mentionCandidates?: MentionCandidate[];
}) {
  const t = useT();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const resize = useCallback(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, []);

  useLayoutEffect(() => { resize(); }, [value, resize]);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(resize);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [resize]);

  const detectMention = (text: string, caret: number) => {
    if (!mentionCandidates || mentionCandidates.length === 0) {
      setMention(null);
      return;
    }
    // Walk back from caret to find @ that starts a mention (preceded by start/space)
    let i = caret - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === '@') {
        const prev = i > 0 ? text[i - 1] : '';
        if (i === 0 || /\s/.test(prev)) {
          const query = text.slice(i + 1, caret);
          if (/^[^\s\]]*$/.test(query)) {
            setMention({ start: i, query });
            setMentionIndex(0);
            return;
          }
        }
        setMention(null);
        return;
      }
      if (/\s/.test(ch)) break;
      i--;
    }
    setMention(null);
  };

  const filtered = useMemo(() => {
    if (!mention || !mentionCandidates) return [];
    const q = mention.query.toLowerCase();
    return mentionCandidates.filter((c) => c.userName.toLowerCase().includes(q)).slice(0, 8);
  }, [mention, mentionCandidates]);

  useEffect(() => {
    if (mentionIndex >= filtered.length) setMentionIndex(0);
  }, [filtered.length, mentionIndex]);

  const insertMention = (candidate: MentionCandidate) => {
    if (!mention || !ref.current) return;
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + 1 + mention.query.length);
    const token = `@[${candidate.userName}](${candidate.userId})`;
    const next = `${before}${token} ${after}`;
    onChange(next);
    setMention(null);
    requestAnimationFrame(() => {
      if (!ref.current) return;
      const pos = before.length + token.length + 1;
      ref.current.focus();
      ref.current.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mention || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filtered[mentionIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMention(null);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          detectMention(v, e.target.selectionStart ?? v.length);
        }}
        onKeyUp={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
            const el = e.currentTarget;
            detectMention(el.value, el.selectionStart ?? el.value.length);
          }
        }}
        onClick={(e) => {
          const el = e.currentTarget;
          detectMention(el.value, el.selectionStart ?? el.value.length);
        }}
        onKeyDown={handleKeyDown}
        rows={1}
        className={className}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onBlur={(e) => {
          // Delay so click on dropdown can fire first
          setTimeout(() => setMention(null), 150);
          onBlur?.();
        }}
      />
      {mention && filtered.length > 0 && (
        <div className="absolute z-50 left-0 top-full mt-1 w-64 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
          {filtered.map((c, i) => (
            <button
              key={c.userId}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(c); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm ${
                i === mentionIndex
                  ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40'
              }`}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 text-[10px] font-semibold shrink-0">
                {initials(c.userName)}
              </span>
              <span className="truncate">{c.userName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Панель настроек отображения подзадач — как шестерёнка на странице задач:
// перетаскиваемая за шапку, без затемнения фона, изменения видны сразу.
function SubtaskSettingsPanel({ settings, onChange, onClose }: {
  settings: SubtaskDisplaySettings;
  onChange: (s: SubtaskDisplaySettings) => void;
  onClose: () => void;
}) {
  const t = useT();
  const isDefault = JSON.stringify(settings) === JSON.stringify(DEFAULT_SUBTASK_DISPLAY);

  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 440) : 100,
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
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Портал в body: панель живёт вне DOM-дерева модалки задачи, поэтому клики
  // и перетаскивание не всплывают до её бэкдропа (иначе модалка закрывалась).
  return createPortal(
    <div
      className="fixed z-[200] w-[22rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
      style={{ left: pos.x, top: pos.y, maxHeight: 'calc(100vh - 24px)' }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        onPointerDown={(e) => { dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; }}
        className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Настройки подзадач')}</h2>
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
        {/* Вид */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{t('Вид')}</p>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => onChange({ ...settings, viewMode: 'table' })}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${settings.viewMode === 'table' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              Таблица
            </button>
            <button
              onClick={() => onChange({ ...settings, viewMode: 'grid' })}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${settings.viewMode === 'grid' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              Карточки
            </button>
          </div>
        </div>
        {/* Колонки таблицы */}
        <div className={settings.viewMode === 'grid' ? 'opacity-50 pointer-events-none' : ''}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{t('Колонки таблицы')}</p>
          <div className="space-y-0.5">
            {SUBTASK_COLUMN_ITEMS.map((item) => {
              const checked = settings[item.key] as boolean;
              return (
                <label
                  key={item.key}
                  className="flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange({ ...settings, [item.key]: !checked })}
                    className="sr-only"
                  />
                  <span className={`w-[18px] h-[18px] rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-violet-500 border-violet-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t(item.label)}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-between">
        <button
          onClick={() => onChange({ ...DEFAULT_SUBTASK_DISPLAY })}
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
    </div>,
    document.body
  );
}

export default function TaskFormModal({ task, onClose, onSaved, initialProjectId, initialTitle, lockProjectId, onSavedTask }: TaskFormModalProps) {
  const t = useT();
  const { user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const { lastSeenAt, setUnreadCount } = useTaskNotifStore();

  const isNew = !task?.id;

  // Core fields
  const [title, setTitle] = useState(task?.title || initialTitle || '');
  const [description, setDescription] = useState(task?.description || '');
  const [descExpanded, setDescExpanded] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (descExpanded && descRef.current) {
      descRef.current.style.height = 'auto';
      descRef.current.style.height = descRef.current.scrollHeight + 'px';
    }
  }, [descExpanded]);
  const [status, setStatus] = useState<number>(task?.status ?? 0);
  const [priority, setPriority] = useState<number>(task?.priority ?? 1);
  const [dueDate, setDueDate] = useState(task?.dueDate?.split('T')[0] || task?.due_date?.split('T')[0] || '');
  const [projectId, setProjectId] = useState(String(task?.projectId || task?.project_id || initialProjectId || ''));
  const [constructionSiteId, setConstructionSiteId] = useState(String(task?.constructionSiteId || task?.construction_site_id || ''));
  const [estimatedHours, setEstimatedHours] = useState(String(task?.estimatedHours || task?.estimated_hours || ''));
  const [requiresBriefingTypes, setRequiresBriefingTypes] = useState<string[]>(() => {
    const raw = task?.requiresBriefingTypes || task?.requires_briefing_types;
    return Array.isArray(raw) ? raw : [];
  });

  // Mobile sidebar sheet
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  // History collapse
  const [showHistory, setShowHistory] = useState(true);
  // Sidebar collapsed state — правая панель (статус и т.д.) всегда изначально свёрнута
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  // History panel in sidebar
  const [historyPanelItemId, setHistoryPanelItemId] = useState<string | null>(null);
  // Hover tooltip for item history
  const [historyTooltip, setHistoryTooltip] = useState<{ itemId: string; x: number; y: number } | null>(null);
  const historyTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drag & drop
  const dragItemRef = useRef<{ groupId: string; itemId: string } | null>(null);
  const dragOverItemRef = useRef<{ groupId: string; itemId: string } | null>(null);
  // Inline cell editing for subtask table fields
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: 'status' | 'assignee' | 'dueDate' | 'priority' } | null>(null);
  // Настройки отображения подзадач (вид + колонки таблицы), сохраняются в localStorage
  const [subtaskDisplay, setSubtaskDisplay] = useState<SubtaskDisplaySettings>(loadSubtaskDisplaySettings);
  const [showSubtaskSettings, setShowSubtaskSettings] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(SUBTASK_DISPLAY_KEY, JSON.stringify(subtaskDisplay)); } catch { /* ignore */ }
  }, [subtaskDisplay]);

  // Assignees
  const [assignees, setAssignees] = useState<Assignee[]>(() =>
    (task?.assignees || []).map((a: any) => ({ userId: a.userId || a.user_id, userName: a.userName || a.user_name }))
  );
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [employeeCard, setEmployeeCard] = useState<{ user: User; assignedAt?: string; onRemove?: () => void } | null>(null);

  // Checklists
  const [checklists, setChecklists] = useState<ChecklistGroup[]>(() => {
    const cf = task?.customFields || task?.custom_fields;
    return cf?.checklists || [];
  });
  const clSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Comments
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [hideSystemMessages, setHideSystemMessages] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<Attachment[]>([]);
  const [sendingComment, setSendingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingEditComment, setSavingEditComment] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>(() => parseAttachments(task?.attachments));
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const attSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  // Reference data
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [saving, setSaving] = useState(false);

  // Load reference data + comments
  useEffect(() => {
    Promise.all([
      api.get('/projects', { params: { limit: 100 } }),
      api.get('/users', { params: { limit: 100 } }),
    ]).then(([pRes, uRes]) => {
      setProjects(pRes.data.projects || pRes.data.data || []);
      setUsers(uRes.data.data || uRes.data.users || []);
    }).catch(() => {});

    if (projectId) {
      api.get('/construction-sites', { params: { projectId: Number(projectId), limit: 100 } })
        .then((r) => setSites(r.data.data || r.data.constructionSites || r.data || []))
        .catch(() => setSites([]));
    }

    if (task?.id) {
      api.get(`/tasks/${task.id}`)
        .then((r) => {
          const t = r.data;
          setAttachments(parseAttachments(t.attachments));
        })
        .catch((err) => { console.error('[TaskFormModal] task fetch error:', err); });

      api.get('/task-comments', { params: { taskId: task.id, limit: 200 } })
        .then((res) => {
          const data = res.data;
          const raw: TaskComment[] = Array.isArray(data) ? data : (data.data || data.comments || []);
          // Sort oldest first for chat-like display
          const list = [...raw].toSorted((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          setComments(list);
          const uid = user?.id;
          const unread = list.filter(
            (c) => (c.userId || c.user_id) !== uid && new Date(c.createdAt).getTime() > lastSeenAt
          );
          setUnreadCount(unread.length);
        }).catch(() => {});
    }
  }, [task?.id]);

  // Reload sites when project changes
  useEffect(() => {
    if (!projectId) { setSites([]); setConstructionSiteId(''); return; }
    api.get('/construction-sites', { params: { projectId: Number(projectId), limit: 100 } })
      .then((r) => setSites(r.data.data || r.data.constructionSites || r.data || []))
      .catch(() => setSites([]));
  }, [projectId]);

  const userMap = useMemo(() => {
    const m: Record<number, User> = {};
    users.forEach((u) => { m[u.id] = u; });
    return m;
  }, [users]);

  const createdByUser = task?.createdByUserId && userMap[task.createdByUserId]
    ? userMap[task.createdByUserId]
    : null;

  // Debounced checklist save
  const saveChecklists = useCallback((next: ChecklistGroup[]) => {
    if (!task?.id) return;
    if (clSaveTimer.current) clearTimeout(clSaveTimer.current);
    clSaveTimer.current = setTimeout(async () => {
      try {
        await api.put(`/tasks/${task.id}`, { customFields: { checklists: next } });
      } catch {}
    }, 600);
  }, [task?.id]);

  // Auto-save attachments for existing tasks (immediate, no debounce —
  // file upload is the user's commit action; we must persist before they close the modal)
  const persistAttachments = useCallback(async (next: Attachment[]) => {
    if (!task?.id) return;
    if (attSaveTimer.current) clearTimeout(attSaveTimer.current);
    try {
      await api.put(`/tasks/${task.id}`, { attachments: next });
    } catch {
      addToast('error', 'Не удалось сохранить вложение');
    }
  }, [task?.id, addToast]);

  const updateChecklists = (fn: (prev: ChecklistGroup[]) => ChecklistGroup[]) => {
    setChecklists((prev) => {
      const next = fn(prev);
      saveChecklists(next);
      return next;
    });
  };

  const canSave = title.trim().length > 0 && projectId !== '' && assignees.length > 0;

  // ---- Save task ----
  const handleSave = async () => {
    if (!title.trim()) { addToast('error', 'Введите название задачи'); return; }
    if (!projectId) { addToast('error', 'Выберите проект'); return; }
    if (assignees.length === 0) { addToast('error', 'Назначьте хотя бы одного ответственного'); return; }
    setSaving(true);
    try {
      const filteredAttachments = attachments.filter((a) => a.fileUrl && a.fileName);
      const payload: any = {
        title,
        description: description || null,
        status: Number(status),
        priority: Number(priority),
        projectId: projectId ? Number(projectId) : null,
        constructionSiteId: constructionSiteId ? Number(constructionSiteId) : null,
        dueDate: dueDate || null,
        estimatedHours: estimatedHours ? Number(estimatedHours) : null,
        attachments: filteredAttachments,
        customFields: { checklists },
        requiresBriefingTypes,
      };
      if (isNew) {
        // Step 1: create the task WITHOUT checklists/attachments to avoid backend rejection
        const basePayload: Record<string, unknown> = { ...payload };
        delete basePayload.customFields;
        delete basePayload.attachments;
        const res = await api.post('/tasks', basePayload);
        const newId = res.data?.id;
        if (!newId) throw new Error('Не удалось получить id новой задачи');
        // Step 2: assignees
        if (assignees.length > 0) {
          await api.post(`/tasks/${newId}/assignees`, { assignees });
        }
        // Step 3: separate PUT for checklists + attachments (only if any)
        if (checklists.length > 0 || filteredAttachments.length > 0) {
          await api.put(`/tasks/${newId}`, {
            customFields: { checklists },
            attachments: filteredAttachments,
          });
        }
        if (onSavedTask) {
          onSavedTask({
            id: Number(newId),
            title,
            description: description || null,
            status: Number(status),
            priority: Number(priority),
            dueDate: dueDate || null,
            projectId: projectId ? Number(projectId) : null,
            assignees,
          });
        }
        addToast('success', 'Задача создана');
      } else {
        await api.put(`/tasks/${task.id}`, payload);
        await api.post(`/tasks/${task.id}/assignees`, { assignees });
        addToast('success', 'Задача сохранена');
      }
      onSaved();
    } catch (e: any) {
      const msg = e.response?.data?.message;
      const errorText = Array.isArray(msg) ? msg.join(', ') : (msg || 'Ошибка при сохранении');
      addToast('error', errorText);
    } finally {
      setSaving(false);
    }
  };

  // ---- Send comment ----
  const handleSendComment = async () => {
    const hasText = commentText.trim().length > 0;
    const hasAttachments = commentAttachments.length > 0;
    if ((!hasText && !hasAttachments) || !task?.id) return;
    setSendingComment(true);
    try {
      const res = await api.post('/task-comments', {
        taskId: task.id,
        commentText: commentText.trim(),
        attachments: commentAttachments,
      });
      const newComment: TaskComment = res.data;
      setComments((prev) => [...prev, newComment]);
      if (commentAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...commentAttachments]);
      }
      setCommentText('');
      setCommentAttachments([]);
    } catch (err: any) {
      addToast('error', 'Ошибка отправки комментария');
    } finally {
      setSendingComment(false);
    }
  };

  // ---- Delete comment ----
  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.delete(`/task-comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      addToast('error', 'Ошибка удаления комментария');
    }
  };

  // ---- Edit comment ----
  const startEditComment = (c: TaskComment) => {
    setEditingCommentId(c.id);
    setEditingCommentText(c.commentText || (c as any).content || '');
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const saveEditComment = async (commentId: number) => {
    if (!editingCommentText.trim()) return;
    setSavingEditComment(true);
    try {
      await api.put(`/task-comments/${commentId}`, { commentText: editingCommentText.trim() });
      setComments((prev) => prev.map((c) =>
        c.id === commentId ? { ...c, commentText: editingCommentText.trim() } : c
      ));
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch {
      addToast('error', 'Ошибка редактирования комментария');
    } finally {
      setSavingEditComment(false);
    }
  };

  // ---- File upload ----
  // Uses chunked upload (5MB chunks via /api/chat/upload) — see lib/chunkedUpload.ts.
  // Large files (videos, etc.) would otherwise hit nginx body-buffering limits on a
  // single multipart POST.
  const handleFileSelect = async (files: FileList | null, forComment = false) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((f) => uploadFileChunked(f)),
      );
      const list: Attachment[] = uploads.map((a) => ({
        fileName: a.fileName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        fileUrl: a.fileUrl,
      }));
      if (forComment) {
        setCommentAttachments((prev) => [...prev, ...list]);
      } else {
        setAttachments((prev) => {
          const next = [...prev, ...list];
          persistAttachments(next);
          return next;
        });
      }
    } catch (e) {
      console.error('[TaskFormModal] upload error:', e);
      addToast('error', 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (commentFileInputRef.current) commentFileInputRef.current.value = '';
    }
  };

  // ---- Checklist helpers ----
  const addChecklist = () =>
    updateChecklists((prev) => [...prev, { id: uid(), title: 'Список задач', collapsed: false, items: [] }]);
  const removeChecklist = (gid: string) => {
    const group = checklists.find((g) => g.id === gid);
    if (group && group.items.length > 0) {
      addToast('error', 'Сначала удалите все подзадачи из этого списка');
      return;
    }
    updateChecklists((prev) => prev.filter((g) => g.id !== gid));
  };
  const toggleCollapse = (gid: string) =>
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, collapsed: !g.collapsed } : g));
  const updateGroupTitle = (gid: string, t: string) =>
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, title: t } : g));
  const addItem = (gid: string) => {
    const newId = uid();
    const newItem: ChecklistItem = {
      id: newId, text: '', checked: false,
      createdAt: new Date().toISOString(),
      createdByUserId: user ? Number(user.id) : undefined,
    };
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, collapsed: false, items: [newItem, ...g.items] } : g));
    setEditingItemId(newId);
  };

  const updateItemField = (gid: string, iid: string, fields: Partial<ChecklistItem>) => {
    updateChecklists((prev) => prev.map((g) => g.id === gid ? {
      ...g, items: g.items.map((i) => i.id === iid ? { ...i, ...fields } : i),
    } : g));
  };
  const removeItem = (gid: string, iid: string) =>
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, items: g.items.filter((i) => i.id !== iid) } : g));
  const updateItemText = (gid: string, iid: string, text: string) => {
    const normalized = text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, items: g.items.map((i) => i.id === iid ? { ...i, text: normalized } : i) } : g));
  };
  // Workflow: click sends to pending_approval; from done/rejected back to new
  const toggleItem = (gid: string, iid: string) => {
    const g = checklists.find((g) => g.id === gid);
    const item = g?.items.find((i) => i.id === iid);
    if (!item) return;
    const cur = getItemStatus(item);
    let nextStatus: number;
    if (cur === SUBTASK_STATUS.DONE || cur === SUBTASK_STATUS.REJECTED) {
      nextStatus = SUBTASK_STATUS.NEW;
    } else {
      nextStatus = SUBTASK_STATUS.PENDING_APPROVAL;
    }
    setSubtaskStatus(gid, iid, nextStatus);
  };

  const setSubtaskStatus = (gid: string, iid: string, newStatus: number) => {
    const g = checklists.find((g) => g.id === gid);
    const item = g?.items.find((i) => i.id === iid);
    if (!item) return;
    const oldStatus = getItemStatus(item);
    if (oldStatus === newStatus) return;
    const nowIso = new Date().toISOString();
    const actorName = user ? userName({ id: Number(user.id), email: user.email || '', firstName: (user as any).firstName, lastName: (user as any).lastName, name: (user as any).name } as User) : 'Пользователь';
    let allItemsAfter: ChecklistItem[] = [];
    updateChecklists((prev) => {
      const next = prev.map((g) => g.id === gid ? {
        ...g,
        items: g.items.map((i) => {
          if (i.id !== iid) return i;
          const updated: ChecklistItem = { ...i, status: newStatus, checked: newStatus === SUBTASK_STATUS.DONE };
          if (newStatus === SUBTASK_STATUS.PENDING_APPROVAL) {
            updated.completedBy = user ? Number(user.id) : undefined;
            updated.completedByName = actorName;
            updated.completedAt = nowIso;
          }
          if (newStatus === SUBTASK_STATUS.DONE) {
            updated.approvedBy = user ? Number(user.id) : undefined;
            updated.approvedAt = nowIso;
          }
          if (newStatus === SUBTASK_STATUS.NEW) {
            updated.completedBy = undefined;
            updated.completedByName = undefined;
            updated.completedAt = undefined;
            updated.approvedBy = undefined;
            updated.approvedAt = undefined;
          }
          return updated;
        }),
      } : g);
      allItemsAfter = next.flatMap((g) => g.items);
      return next;
    });
    // Sync main task status (deferred until next tick to ensure state propagation)
    setTimeout(() => syncMainStatusFromSubtasks(allItemsAfter), 0);
    // System message in task chat (only for existing tasks)
    if (task?.id && item.text && !suppressSystemRef.current) {
      const labelMap: Record<number, string> = {
        [SUBTASK_STATUS.PENDING_APPROVAL]: 'отправлена на утверждение',
        [SUBTASK_STATUS.DONE]: 'выполнена',
        [SUBTASK_STATUS.REJECTED]: 'отклонена',
        [SUBTASK_STATUS.NEW]: 'возвращена в работу',
      };
      const verb = labelMap[newStatus];
      if (verb) {
        postSystemComment(`Подзадача «${item.text}» ${verb} — Система`);
      }
    }
  };

  const suppressSystemRef = useRef(false);

  const postSystemComment = async (text: string) => {
    if (!task?.id) return;
    try {
      const res = await api.post('/task-comments', {
        taskId: task.id,
        commentText: text,
        attachments: [],
        type: 'system',
      });
      const newComment: TaskComment = res.data;
      setComments((prev) => [...prev, newComment]);
    } catch {/* ignore */}
  };

  // Permission: can approve/reject subtasks
  // Sync main task status from subtasks aggregate
  // All DONE → status 4; all PENDING_APPROVAL → status 3
  const syncMainStatusFromSubtasks = (items: ChecklistItem[]) => {
    if (items.length === 0) return;
    const allItems = items;
    if (allItems.length === 0) return;
    const allDone = allItems.every((i) => getItemStatus(i) === SUBTASK_STATUS.DONE);
    const allPending = allItems.every((i) => {
      const s = getItemStatus(i);
      return s === SUBTASK_STATUS.PENDING_APPROVAL || s === SUBTASK_STATUS.DONE;
    }) && allItems.some((i) => getItemStatus(i) === SUBTASK_STATUS.PENDING_APPROVAL);
    if (allDone && status !== 4) {
      setStatus(4);
    } else if (allPending && status !== 3 && status !== 4) {
      setStatus(3);
    }
  };

  const handleMainStatusChange = (newStatus: number) => {
    // If user manually sets task to DONE — mark all subtasks DONE
    if (newStatus === 4 && checklists.length > 0) {
      suppressSystemRef.current = true;
      const nowIso = new Date().toISOString();
      updateChecklists((prev) => prev.map((g) => ({
        ...g,
        items: g.items.map((i) => {
          const cur = getItemStatus(i);
          if (cur === SUBTASK_STATUS.DONE) return i;
          return {
            ...i,
            status: SUBTASK_STATUS.DONE,
            checked: true,
            approvedBy: user ? Number(user.id) : i.approvedBy,
            approvedAt: nowIso,
          };
        }),
      })));
      setTimeout(() => { suppressSystemRef.current = false; }, 0);
    }
    setStatus(newStatus);
  };

  const canApproveSubtasks = useMemo(() => {
    if (!user) return false;
    const rid = Number((user as any).roleId);
    if (rid === 1 || rid === 2 || rid === 3 || rid === 4) return true;
    if (task && Number(user.id) === Number(task.createdByUserId)) return true;
    return false;
  }, [user, task]);

  const extractItemHistory = useCallback((itemText: string) => {
    if (!itemText) return [];
    return comments
      .filter((c) => {
        const t = c.commentText || (c as any).content || '';
        const isSys = c.type === 'system' || t.startsWith('__system__:');
        if (!isSys) return false;
        const clean = t.startsWith('__system__:') ? t.slice('__system__:'.length) : t;
        return clean.includes(`«${itemText}»`);
      })
      .map((c) => {
        const t = c.commentText || (c as any).content || '';
        const clean = t.startsWith('__system__:') ? t.slice('__system__:'.length) : t;
        const m = clean.match(/^Подзадача «.+?» (.+?) — Система/);
        return { action: m ? m[1] : clean, time: c.createdAt };
      })
      .toReversed();
  }, [comments]);

  const HISTORY_ACTION_COLORS: Record<string, string> = {
    'отправлена на утверждение': 'bg-yellow-400',
    'выполнена': 'bg-green-500',
    'отклонена': 'bg-red-400',
    'возвращена в работу': 'bg-gray-400',
  };

  const showHistoryTooltip = (e: React.MouseEvent, itemId: string) => {
    if (historyTooltipTimer.current) clearTimeout(historyTooltipTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHistoryTooltip({ itemId, x: rect.left, y: rect.bottom });
  };
  const hideHistoryTooltip = () => {
    historyTooltipTimer.current = setTimeout(() => setHistoryTooltip(null), 150);
  };
  const keepHistoryTooltip = () => {
    if (historyTooltipTimer.current) clearTimeout(historyTooltipTimer.current);
  };

  const handleDragOver = (e: React.DragEvent, groupId: string, itemId: string) => {
    e.preventDefault();
    dragOverItemRef.current = { groupId, itemId };
  };
  const handleDrop = (groupId: string) => {
    const from = dragItemRef.current;
    const to = dragOverItemRef.current;
    dragItemRef.current = null;
    dragOverItemRef.current = null;
    if (!from || !to || from.groupId !== groupId || to.groupId !== groupId || from.itemId === to.itemId) return;
    updateChecklists((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const items = [...g.items];
      const fromIdx = items.findIndex((i) => i.id === from.itemId);
      const toIdx = items.findIndex((i) => i.id === to.itemId);
      if (fromIdx === -1 || toIdx === -1) return g;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return { ...g, items };
    }));
  };

  // Project / Object lock: для существующих задач только admin/super_admin/PM может менять
  const canEditProjectObject = useMemo(() => {
    if (isNew) return true;
    if (!user) return false;
    const rid = Number((user as any).roleId);
    return rid === 1 || rid === 2 || rid === 4;
  }, [isNew, user]);

  // ---- Assignee helpers ----
  const toggleAssignee = (u: User) => {
    setAssignees((prev) =>
      prev.some((a) => a.userId === u.id)
        ? prev.filter((a) => a.userId !== u.id)
        : [...prev, { userId: u.id, userName: userName(u) }]
    );
  };

  const statusInfo = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

  // Files attached via comments — show alongside main task documents
  const commentAttachmentsFlat = useMemo(() => {
    const out: { att: Attachment; commentId: number }[] = [];
    for (const c of comments) {
      const list = parseAttachments(c.attachments);
      for (const a of list) {
        out.push({ att: a, commentId: c.id });
      }
    }
    return out;
  }, [comments]);

  // Sidebar content — reused for both desktop sidebar and mobile sheet
  const SidebarContent = () => (
    <div className="space-y-5">
      {/* Status */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
          Статус <span className="text-red-400">*</span>
        </p>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => handleMainStatusChange(Number(e.target.value))}
            className={`w-full text-sm font-medium px-3 py-1.5 pr-7 rounded-lg border-none outline-none cursor-pointer appearance-none ${statusInfo.cls}`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-current opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {requiresBriefingTypes.length > 0 && status === 1 && (
          <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>
              Требуется инструктаж: {requiresBriefingTypes.join(', ')}.{' '}
              <a href="/dashboard/safety-briefings?tab=compliance" target="_blank" className="underline hover:text-amber-900 dark:hover:text-amber-200">
                Проверить
              </a>
            </span>
          </div>
        )}
      </div>

      {/* Priority */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
          Приоритет <span className="text-red-400">*</span>
        </p>
        <div className="grid grid-cols-2 gap-1">
          {PRIORITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setPriority(o.value)}
              className={`py-1 text-xs font-medium rounded-lg transition-colors ${
                priority === o.value
                  ? o.activeCls
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignees */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Ответственные <span className="text-red-400">*</span>
          </p>
          <button
            onClick={() => setShowAssigneePicker((v) => !v)}
            className="text-gray-400 hover:text-violet-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        {assignees.length === 0 && (
          <p className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1 mb-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Назначьте хотя бы одного
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {assignees.map((a) => {
            const u = userMap[a.userId];
            const name = a.userName || (u ? userName(u) : `#${a.userId}`);
            return (
              <button
                key={a.userId}
                title={name}
                onClick={() => {
                  if (!u) return;
                  setEmployeeCard({
                    user: u,
                    assignedAt: task?.createdAt,
                    onRemove: () => { toggleAssignee(u); setEmployeeCard(null); },
                  });
                }}
                className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden ring-2 ring-white dark:ring-gray-900 hover:ring-violet-300 transition-all"
              >
                {u?.avatarUrl
                  ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : initials(name)
                }
              </button>
            );
          })}
        </div>
        {showAssigneePicker && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-lg overflow-hidden max-h-44 overflow-y-auto">
            {users.filter((u) => u.roleId !== 1).map((u) => (
              <button
                key={u.id}
                onClick={() => toggleAssignee(u)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className={`rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  assignees.some((a) => a.userId === u.id)
                    ? 'bg-violet-500 border-violet-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`} style={{ width: 18, height: 18 }}>
                  {assignees.some((a) => a.userId === u.id) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{userName(u)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Deadline */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('Дедлайн')}</p>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {/* Project */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
          Проект <span className="text-red-400">*</span>
        </p>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={!canEditProjectObject || !!lockProjectId}
          className={`w-full text-sm px-3 py-1.5 border rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed ${
            !projectId ? 'border-amber-300 dark:border-amber-600' : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <option value="">{t('— выберите проект —')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {!canEditProjectObject && !isNew && (
          <p className="text-[10px] text-gray-400 mt-1">{t('Менять проект может только администратор или PM')}</p>
        )}
      </div>

      {/* Construction site */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('Объект')}</p>
        <select
          value={constructionSiteId}
          onChange={(e) => setConstructionSiteId(e.target.value)}
          disabled={!projectId || !canEditProjectObject}
          className="w-full text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">{t('Не выбрано')}</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {!projectId && (
          <p className="text-[10px] text-gray-400 mt-1">{t('Сначала выберите проект')}</p>
        )}
      </div>

      {/* Created by */}
      {(createdByUser || task?.createdByUserId) && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('Поставил задачу')}</p>
          {createdByUser?.roleId === 1 ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">С</div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('Система')}</span>
            </div>
          ) : createdByUser ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                {createdByUser.avatarUrl
                  ? <img src={createdByUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : initials(userName(createdByUser))
                }
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{userName(createdByUser)}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Created at */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t('Создана')}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {task?.createdAt ? fmtDateTime(task.createdAt) : fmtDateTime(new Date().toISOString())}
        </p>
      </div>

      {/* Closed / completed at */}
      {(task?.actualEndDate || task?.actual_end_date) && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t('Закрыта')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{fmtDateTime(task.actualEndDate || task.actual_end_date)}</p>
        </div>
      )}

      {/* Status changed at — show updatedAt when task exists and status is not new */}
      {!isNew && task?.updatedAt && status !== 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t('Статус изменён')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{fmtDateTime(task.updatedAt)}</p>
        </div>
      )}

      {/* Estimated hours */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('Оценка (ч)')}</p>
        <input
          type="number"
          value={estimatedHours}
          onChange={(e) => setEstimatedHours(e.target.value)}
          min="0"
          step="0.5"
          className="w-full text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          placeholder="0"
        />
      </div>

      {/* Required briefing types */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
          Требуемые инструктажи
        </p>
        <div className="flex flex-col gap-1">
          {[
            { value: 'introductory', label: 'Вводный' },
            { value: 'primary', label: 'Первичный' },
            { value: 'repeat', label: 'Повторный' },
            { value: 'targeted', label: 'Целевой' },
            { value: 'unscheduled', label: 'Внеплановый' },
          ].map((opt) => {
            const checked = requiresBriefingTypes.includes(opt.value);
            return (
              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setRequiresBriefingTypes((prev) =>
                      e.target.checked ? [...prev, opt.value] : prev.filter((v) => v !== opt.value),
                    );
                  }}
                  className="sr-only"
                />
                <span
                  className={`flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                    checked
                      ? 'bg-violet-600 border-violet-600'
                      : 'bg-transparent border-gray-500 dark:border-gray-600 group-hover:border-violet-400'
                  }`}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
              </label>
            );
          })}
        </div>
        {requiresBriefingTypes.length > 0 && (
          <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Ответственным нужен актуальный инструктаж
          </p>
        )}
      </div>

      {/* Attachments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('Документы')}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-gray-400 hover:text-violet-500 disabled:opacity-50 transition-colors"
            title={t('Прикрепить файл')}
          >
            {uploading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth={2.5} opacity="0.25" />
                <path d="M21 12a9 9 0 00-9-9" strokeWidth={2.5} strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
        {uploading && <p className="text-xs text-violet-500">{t('Загрузка...')}</p>}
        {!uploading && attachments.length === 0 && commentAttachmentsFlat.length === 0 && <p className="text-xs text-gray-400">{t('Нет файлов')}</p>}
        <div className="space-y-1.5">
          {attachments.map((a, i) => {
            const isImg = isImageFile(a);
            const thumbUrl = isImg ? normalizeFileUrl(a.fileUrl) : null;
            return (
              <div key={i} className="flex items-center gap-2">
                {isImg && thumbUrl ? (
                  <button
                    onClick={() => setPreviewFile({ url: a.fileUrl, name: a.fileName })}
                    className="w-8 h-8 rounded overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-700 hover:ring-2 hover:ring-violet-400 transition-all"
                  >
                    <img src={thumbUrl} alt={a.fileName} className="w-full h-full object-cover" />
                  </button>
                ) : (
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
                <button
                  onClick={() => setPreviewFile({ url: a.fileUrl, name: a.fileName })}
                  className="flex-1 text-left text-xs text-violet-500 hover:underline truncate"
                >
                  {a.fileName}
                </button>
                <button
                  onClick={() => setAttachments((p) => {
                    const next = p.filter((_, idx) => idx !== i);
                    persistAttachments(next);
                    return next;
                  })}
                  className="text-gray-300 hover:text-red-400 text-sm shrink-0"
                >×</button>
              </div>
            );
          })}
          {commentAttachmentsFlat.length > 0 && (
            <>
              <div className="mt-2 mb-1 text-[9px] uppercase tracking-wider text-gray-400">{t('Из комментариев')}</div>
              {commentAttachmentsFlat.map(({ att: a, commentId }, i) => {
                const isImg = isImageFile(a);
                const thumbUrl = isImg ? normalizeFileUrl(a.fileUrl) : null;
                return (
                  <div key={`c-${commentId}-${i}`} className="flex items-center gap-2 opacity-90">
                    {isImg && thumbUrl ? (
                      <button
                        onClick={() => setPreviewFile({ url: a.fileUrl, name: a.fileName })}
                        className="w-8 h-8 rounded overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-700 hover:ring-2 hover:ring-violet-400 transition-all"
                      >
                        <img src={thumbUrl} alt={a.fileName} className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    )}
                    <button
                      onClick={() => setPreviewFile({ url: a.fileUrl, name: a.fileName })}
                      className="flex-1 text-left text-xs text-gray-500 dark:text-gray-400 hover:text-violet-500 hover:underline truncate"
                      title={t('Файл из комментария')}
                    >
                      {a.fileName}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
        style={{ height: 'calc(100dvh - 32px)', maxHeight: 920, minHeight: 500 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden file inputs — inside modal to avoid click bubble to backdrop */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          onClick={(e) => e.stopPropagation()}
        />
        <input
          ref={commentFileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, true)}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Header */}
        <div className="flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700/60 shrink-0">
          <div className="flex-1 min-w-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full text-lg sm:text-xl font-semibold bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 border-none outline-none focus:ring-0 ${!title.trim() ? 'placeholder-red-400 dark:placeholder-red-500/60' : ''}`}
              placeholder={t('Название задачи *')}
              required
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {/* Mobile settings burger */}
            <button
              className="sm:hidden p-1.5 text-gray-400 hover:text-violet-500 rounded-lg transition-colors"
              onClick={() => setShowMobileSettings(true)}
              title={t('Настройки задачи')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              title={!canSave ? 'Заполните название, проект и хотя бы одного ответственного' : undefined}
              className="px-4 py-1.5 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
            >
              {saving ? '...' : isNew ? 'Создать' : 'Сохранить'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body: left + right */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left column ── */}
          <div className="flex-1 overflow-y-auto scrollbar-none px-5 sm:px-6 py-5 space-y-6 min-w-0">

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t('Описание')}</p>
              {descExpanded || !description ? (
                <textarea
                  ref={descRef}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }}
                  onFocus={() => setDescExpanded(true)}
                  onBlur={() => setDescExpanded(false)}
                  autoFocus={descExpanded}
                  rows={3}
                  className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-300 border-none outline-none focus:ring-0 resize-none overflow-hidden placeholder-gray-400"
                  placeholder={t('Добавить описание задачи...')}
                />
              ) : (
                <div
                  onClick={() => setDescExpanded(true)}
                  className="w-full text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words line-clamp-3 cursor-text"
                  title={t('Нажмите, чтобы развернуть')}
                >
                  {description}
                </div>
              )}
            </div>

            {/* Checklists */}
            {checklists.map((group) => {
              const total = group.items.length;
              const statusCounts = group.items.reduce<Record<number, number>>((acc, i) => {
                const st = getItemStatus(i);
                acc[st] = (acc[st] || 0) + 1;
                return acc;
              }, {});
              const done = statusCounts[SUBTASK_STATUS.DONE] || 0;
              return (
                <div key={group.id} className="border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-visible">
                  {/* Group header */}
                  <div className="relative z-10 flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-t-xl">
                    <button onClick={() => toggleCollapse(group.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <svg className={`w-4 h-4 transition-transform duration-200 ${group.collapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <input
                      value={group.title}
                      onChange={(e) => updateGroupTitle(group.id, e.target.value)}
                      className="flex-1 min-w-0 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent outline-none border-none focus:ring-0"
                    />
                    <button
                      onClick={() => addItem(group.id)}
                      title={t('Добавить подзадачу')}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 bg-white dark:bg-gray-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-gray-200 dark:border-gray-600 rounded-md transition-colors shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Добавить
                    </button>
                    {/* Настройки отображения (вид + колонки) */}
                    <button
                      onClick={() => setShowSubtaskSettings(true)}
                      title={t('Настройки отображения подзадач')}
                      className="p-1 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-md transition-colors shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    {total > 0 && <span className="text-xs text-gray-400 shrink-0">{done}/{total}</span>}
                    {canApproveSubtasks && (
                      <button
                        onClick={() => removeChecklist(group.id)}
                        title={total > 0 ? 'Сначала удалите все подзадачи' : 'Удалить список'}
                        className={`transition-colors shrink-0 ${total > 0 ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed' : 'text-gray-300 hover:text-red-400'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {/* Progress bar */}
                  {total > 0 && (
                    <>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800/60 flex overflow-hidden">
                        {group.items.map((item) => {
                          const st = getItemStatus(item);
                          return (
                            <div
                              key={item.id}
                              className={`flex-1 transition-colors ${SUBTASK_STATUS_LABELS[st]?.bg || ''}`}
                              title={SUBTASK_STATUS_LABELS[st]?.label}
                            />
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50/60 dark:bg-gray-800/30 flex-wrap">
                        {Object.entries(statusCounts).map(([st, cnt]) => {
                          const info = SUBTASK_STATUS_LABELS[Number(st)];
                          if (!info) return null;
                          return (
                            <span key={st} className="inline-flex items-center gap-1 text-[10px]">
                              <span className={`w-2 h-2 rounded-sm ${info.bg}`} />
                              <span className={info.text}>{info.label}: {cnt}</span>
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {!group.collapsed && subtaskDisplay.viewMode === 'grid' && (
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.items.map((item) => {
                        const itemStatus = getItemStatus(item);
                        const isDone = itemStatus === SUBTASK_STATUS.DONE;
                        const isRejected = itemStatus === SUBTASK_STATUS.REJECTED;
                        const overdue = isItemOverdue(item);
                        const statusDisplay = overdue
                          ? { label: 'Просрочена', dotClass: 'bg-red-500', textClass: 'text-red-500 dark:text-red-400' }
                          : (SUBTASK_STATUS_TABLE[itemStatus] || SUBTASK_STATUS_TABLE[0]);
                        const priorityInfo = item.priority ? SUBTASK_PRIORITY_TABLE[item.priority] : null;
                        return (
                          <div
                            key={item.id}
                            id={`checklist-item-${item.id}`}
                            className={`group/card border rounded-lg p-3 flex flex-col gap-2 transition-shadow hover:shadow-sm ${overdue ? 'bg-red-50/60 dark:bg-red-900/10 border-red-200 dark:border-red-700/50' : 'bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-700/50'}`}
                          >
                            {/* Status + actions row */}
                            <div className="flex items-center justify-between gap-1">
                              {editingCell?.itemId === item.id && editingCell.field === 'status' ? (
                                <select
                                  autoFocus
                                  value={itemStatus}
                                  onChange={(e) => { setSubtaskStatus(group.id, item.id, Number(e.target.value)); setEditingCell(null); }}
                                  onBlur={() => setEditingCell(null)}
                                  className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
                                >
                                  {Object.entries(SUBTASK_STATUS_TABLE).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <button
                                  onClick={() => setEditingCell({ itemId: item.id, field: 'status' })}
                                  className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                                  title={t('Изменить статус')}
                                >
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDisplay.dotClass}`} />
                                  <span className={`text-[11px] font-medium ${statusDisplay.textClass}`}>{statusDisplay.label}</span>
                                </button>
                              )}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <div
                                  draggable
                                  onDragStart={(e) => { e.stopPropagation(); dragItemRef.current = { groupId: group.id, itemId: item.id }; }}
                                  onDragEnd={() => { dragItemRef.current = null; dragOverItemRef.current = null; }}
                                  className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none p-0.5"
                                  title={t('Перетащить')}
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 10 16" fill="currentColor">
                                    <circle cx="3" cy="2" r="1.5" /><circle cx="3" cy="8" r="1.5" /><circle cx="3" cy="14" r="1.5" />
                                    <circle cx="7" cy="2" r="1.5" /><circle cx="7" cy="8" r="1.5" /><circle cx="7" cy="14" r="1.5" />
                                  </svg>
                                </div>
                                {canApproveSubtasks && (
                                  <button
                                    onClick={() => removeItem(group.id, item.id)}
                                    className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                                    title={t('Удалить подзадачу')}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Title */}
                            {editingItemId === item.id ? (
                              <AutoResizeTextarea
                                value={item.text}
                                onChange={(v) => updateItemText(group.id, item.id, v)}
                                className={`w-full text-sm bg-transparent outline-none border-none focus:ring-0 resize-none overflow-hidden leading-normal ${isDone ? 'line-through text-gray-400' : isRejected ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}
                                placeholder={t('Введите название подзадачи...')}
                                autoFocus
                                onBlur={() => { if (!item.text.trim()) removeItem(group.id, item.id); setEditingItemId(null); }}
                                mentionCandidates={assignees.map((a) => ({
                                  userId: a.userId,
                                  userName: a.userName || (userMap[a.userId] ? userName(userMap[a.userId]) : `#${a.userId}`),
                                  avatarUrl: userMap[a.userId]?.avatarUrl,
                                }))}
                              />
                            ) : (
                              <div
                                onClick={() => setEditingItemId(item.id)}
                                className={`text-sm cursor-text leading-snug line-clamp-3 min-h-[1.25rem] ${isDone ? 'line-through text-gray-400' : isRejected ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                {item.text
                                  ? renderTextWithLinks(item.text, (uid) => { const u = userMap[uid]; if (u) setEmployeeCard({ user: u }); })
                                  : <span className="text-gray-300 dark:text-gray-600">{t('Введите название...')}</span>
                                }
                              </div>
                            )}
                            {/* Meta */}
                            <dl className="grid grid-cols-2 gap-x-2 gap-y-1 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700/30">
                              <div>
                                <dt className="text-[10px] text-gray-400">{t('Исполнитель')}</dt>
                                <dd>
                                  {editingCell?.itemId === item.id && editingCell.field === 'assignee' ? (
                                    <select
                                      autoFocus
                                      value={item.assigneeId || ''}
                                      onChange={(e) => {
                                        const uid = Number(e.target.value) || undefined;
                                        const asgn = uid ? assignees.find((a) => a.userId === uid) : undefined;
                                        updateItemField(group.id, item.id, { assigneeId: uid, assigneeName: asgn?.userName || (uid ? `#${uid}` : undefined) });
                                        setEditingCell(null);
                                      }}
                                      onBlur={() => setEditingCell(null)}
                                      className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none max-w-[120px]"
                                    >
                                      <option value="">{t('— Не назначен —')}</option>
                                      {assignees.map((a) => (
                                        <option key={a.userId} value={a.userId}>{a.userName || `#${a.userId}`}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span
                                      onClick={() => setEditingCell({ itemId: item.id, field: 'assignee' })}
                                      className="text-xs text-gray-600 dark:text-gray-400 truncate cursor-pointer hover:text-violet-500 transition-colors"
                                      title={t('Нажмите для выбора исполнителя')}
                                    >
                                      {item.assigneeName || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </span>
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-[10px] text-gray-400">{t('Срок')}</dt>
                                <dd>
                                  {editingCell?.itemId === item.id && editingCell.field === 'dueDate' ? (
                                    <input
                                      type="date"
                                      autoFocus
                                      value={item.dueDate || ''}
                                      onChange={(e) => updateItemField(group.id, item.id, { dueDate: e.target.value || undefined })}
                                      onBlur={() => setEditingCell(null)}
                                      className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
                                    />
                                  ) : (
                                    <span
                                      onClick={() => setEditingCell({ itemId: item.id, field: 'dueDate' })}
                                      className={`text-xs cursor-pointer transition-colors ${overdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-violet-500'}`}
                                      title={t('Нажмите для изменения срока')}
                                    >
                                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString('ru-RU') : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </span>
                                  )}
                                </dd>
                              </div>
                              <div className="col-span-2">
                                <dt className="text-[10px] text-gray-400">{t('Приоритет')}</dt>
                                <dd>
                                  {editingCell?.itemId === item.id && editingCell.field === 'priority' ? (
                                    <select
                                      autoFocus
                                      value={item.priority || ''}
                                      onChange={(e) => { updateItemField(group.id, item.id, { priority: e.target.value ? Number(e.target.value) : undefined }); setEditingCell(null); }}
                                      onBlur={() => setEditingCell(null)}
                                      className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
                                    >
                                      <option value="">{t('— Без —')}</option>
                                      <option value="1">{t('Низкий')}</option>
                                      <option value="2">{t('Средний')}</option>
                                      <option value="3">{t('Высокий')}</option>
                                      <option value="4">{t('Критический')}</option>
                                    </select>
                                  ) : (
                                    <span
                                      onClick={() => setEditingCell({ itemId: item.id, field: 'priority' })}
                                      className={`text-xs font-medium cursor-pointer hover:opacity-75 transition-opacity ${priorityInfo ? priorityInfo.cls : 'text-gray-300 dark:text-gray-600'}`}
                                      title={t('Нажмите для изменения приоритета')}
                                    >
                                      {priorityInfo ? priorityInfo.label : '—'}
                                    </span>
                                  )}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!group.collapsed && subtaskDisplay.viewMode === 'table' && (
                    <div className="overflow-x-auto scrollbar-none">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead>
                          <tr className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700/40 bg-gray-50/60 dark:bg-gray-800/30">
                            <th className="px-3 py-2 text-left font-semibold">{t('Статус')}</th>
                            <th className="px-3 py-2 text-left font-semibold">{t('Название подзадачи')}</th>
                            {subtaskDisplay.colAssignee && <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{t('Исполнитель')}</th>}
                            {subtaskDisplay.colDueDate && <th className="px-3 py-2 text-left font-semibold">{t('Срок')}</th>}
                            {subtaskDisplay.colPriority && <th className="px-3 py-2 text-left font-semibold">{t('Приоритет')}</th>}
                            {subtaskDisplay.colCreatedAt && <th className="px-3 py-2 text-left font-semibold">{t('Создано')}</th>}
                            <th className="px-2 py-2 w-14" aria-hidden />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/30">
                          {group.items.map((item) => {
                            const itemStatus = getItemStatus(item);
                            const isPending = itemStatus === SUBTASK_STATUS.PENDING_APPROVAL;
                            const isDone = itemStatus === SUBTASK_STATUS.DONE;
                            const isRejected = itemStatus === SUBTASK_STATUS.REJECTED;
                            const overdue = isItemOverdue(item);
                            const statusDisplay = overdue
                              ? { label: 'Просрочена', dotClass: 'bg-red-500', textClass: 'text-red-500 dark:text-red-400' }
                              : (SUBTASK_STATUS_TABLE[itemStatus] || SUBTASK_STATUS_TABLE[0]);
                            const priorityInfo = item.priority ? SUBTASK_PRIORITY_TABLE[item.priority] : null;
                            const isEditingStatus = editingCell?.itemId === item.id && editingCell.field === 'status';
                            const isEditingAssignee = editingCell?.itemId === item.id && editingCell.field === 'assignee';
                            const isEditingDate = editingCell?.itemId === item.id && editingCell.field === 'dueDate';
                            const isEditingPriority = editingCell?.itemId === item.id && editingCell.field === 'priority';
                            return (
                              <tr
                                key={item.id}
                                id={`checklist-item-${item.id}`}
                                onDragOver={(e) => handleDragOver(e, group.id, item.id)}
                                onDrop={() => handleDrop(group.id)}
                                className={`group/item transition-colors ${highlightedItemId === item.id ? 'bg-violet-50 dark:bg-violet-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/20'}`}
                              >
                                {/* Status */}
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    {isEditingStatus ? (
                                      <select
                                        autoFocus
                                        value={itemStatus}
                                        onChange={(e) => { setSubtaskStatus(group.id, item.id, Number(e.target.value)); setEditingCell(null); }}
                                        onBlur={() => setEditingCell(null)}
                                        className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
                                      >
                                        {Object.entries(SUBTASK_STATUS_TABLE).map(([k, v]) => (
                                          <option key={k} value={k}>{v.label}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <button
                                        onClick={() => setEditingCell({ itemId: item.id, field: 'status' })}
                                        className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                                        title={t('Изменить статус')}
                                      >
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDisplay.dotClass}`} />
                                        <span className={`text-xs font-medium ${statusDisplay.textClass}`}>{statusDisplay.label}</span>
                                      </button>
                                    )}
                                    {/* ⓘ history */}
                                    {item.text && !isNew && (
                                      <button
                                        className="opacity-0 group-hover/item:opacity-50 hover:!opacity-100 p-0.5 text-gray-400 hover:text-violet-500 shrink-0 transition-all ml-0.5"
                                        title={t('История подзадачи')}
                                        onMouseEnter={(e) => showHistoryTooltip(e, item.id)}
                                        onMouseLeave={hideHistoryTooltip}
                                        onClick={(e) => { e.stopPropagation(); setHistoryPanelItemId(item.id); setSidebarCollapsed(false); setHistoryTooltip(null); }}
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </button>
                                    )}
                                    {/* Approve/Reject for pending */}
                                    {isPending && canApproveSubtasks && (
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity ml-0.5">
                                        <button onClick={() => setSubtaskStatus(group.id, item.id, SUBTASK_STATUS.DONE)} title={t('Утвердить')} className="p-0.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                        <button onClick={() => setSubtaskStatus(group.id, item.id, SUBTASK_STATUS.REJECTED)} title={t('Отклонить')} className="p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {/* Name */}
                                <td className="px-3 py-2 max-w-[220px]">
                                  {editingItemId === item.id ? (
                                    <AutoResizeTextarea
                                      value={item.text}
                                      onChange={(v) => updateItemText(group.id, item.id, v)}
                                      className={`w-full text-sm bg-transparent outline-none border-none focus:ring-0 resize-none overflow-hidden leading-normal ${isDone ? 'line-through text-gray-400' : isRejected ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}
                                      placeholder={t('Введите название подзадачи...')}
                                      autoFocus
                                      onBlur={() => { if (!item.text.trim()) removeItem(group.id, item.id); setEditingItemId(null); }}
                                      mentionCandidates={assignees.map((a) => ({
                                        userId: a.userId,
                                        userName: a.userName || (userMap[a.userId] ? userName(userMap[a.userId]) : `#${a.userId}`),
                                        avatarUrl: userMap[a.userId]?.avatarUrl,
                                      }))}
                                    />
                                  ) : (
                                    <div
                                      onClick={() => setEditingItemId(item.id)}
                                      title={t('Нажмите, чтобы развернуть')}
                                      className={`text-sm cursor-text leading-normal whitespace-pre-wrap break-words line-clamp-2 min-h-[1.25rem] ${isDone ? 'line-through text-gray-400' : isRejected ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                      {item.text
                                        ? renderTextWithLinks(item.text, (uid) => { const u = userMap[uid]; if (u) setEmployeeCard({ user: u }); })
                                        : <span className="text-gray-400 dark:text-gray-600">{t('Введите название...')}</span>
                                      }
                                    </div>
                                  )}
                                </td>
                                {/* Assignee */}
                                {subtaskDisplay.colAssignee && (
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {isEditingAssignee ? (
                                    <select
                                      autoFocus
                                      value={item.assigneeId || ''}
                                      onChange={(e) => {
                                        const uid = Number(e.target.value) || undefined;
                                        const asgn = uid ? assignees.find((a) => a.userId === uid) : undefined;
                                        updateItemField(group.id, item.id, { assigneeId: uid, assigneeName: asgn?.userName || (uid ? `#${uid}` : undefined) });
                                        setEditingCell(null);
                                      }}
                                      onBlur={() => setEditingCell(null)}
                                      className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none max-w-[130px]"
                                    >
                                      <option value="">{t('— Не назначен —')}</option>
                                      {assignees.map((a) => (
                                        <option key={a.userId} value={a.userId}>{a.userName || `#${a.userId}`}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span
                                      onClick={() => setEditingCell({ itemId: item.id, field: 'assignee' })}
                                      className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-violet-500 transition-colors"
                                      title={t('Нажмите для выбора исполнителя')}
                                    >
                                      {item.assigneeName || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </span>
                                  )}
                                </td>
                                )}
                                {/* Due date */}
                                {subtaskDisplay.colDueDate && (
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {isEditingDate ? (
                                    <input
                                      type="date"
                                      autoFocus
                                      value={item.dueDate || ''}
                                      onChange={(e) => updateItemField(group.id, item.id, { dueDate: e.target.value || undefined })}
                                      onBlur={() => setEditingCell(null)}
                                      className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
                                    />
                                  ) : (
                                    <span
                                      onClick={() => setEditingCell({ itemId: item.id, field: 'dueDate' })}
                                      className={`text-sm cursor-pointer transition-colors ${overdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-violet-500'}`}
                                      title={t('Нажмите для изменения срока')}
                                    >
                                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString('ru-RU') : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </span>
                                  )}
                                </td>
                                )}
                                {/* Priority */}
                                {subtaskDisplay.colPriority && (
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {isEditingPriority ? (
                                    <select
                                      autoFocus
                                      value={item.priority || ''}
                                      onChange={(e) => { updateItemField(group.id, item.id, { priority: e.target.value ? Number(e.target.value) : undefined }); setEditingCell(null); }}
                                      onBlur={() => setEditingCell(null)}
                                      className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
                                    >
                                      <option value="">{t('— Без —')}</option>
                                      <option value="1">{t('Низкий')}</option>
                                      <option value="2">{t('Средний')}</option>
                                      <option value="3">{t('Высокий')}</option>
                                      <option value="4">{t('Критический')}</option>
                                    </select>
                                  ) : (
                                    <span
                                      onClick={() => setEditingCell({ itemId: item.id, field: 'priority' })}
                                      className={`text-xs font-medium px-2 py-0.5 rounded cursor-pointer hover:opacity-75 transition-opacity ${priorityInfo ? priorityInfo.cls : 'text-gray-300 dark:text-gray-600'}`}
                                      title={t('Нажмите для изменения приоритета')}
                                    >
                                      {priorityInfo ? priorityInfo.label : '—'}
                                    </span>
                                  )}
                                </td>
                                )}
                                {/* Created */}
                                {subtaskDisplay.colCreatedAt && (
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
                                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ru-RU') : '—'}
                                </td>
                                )}
                                {/* Actions */}
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <div
                                      draggable
                                      onDragStart={(e) => { e.stopPropagation(); dragItemRef.current = { groupId: group.id, itemId: item.id }; }}
                                      onDragEnd={() => { dragItemRef.current = null; dragOverItemRef.current = null; }}
                                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none p-0.5"
                                      title={t('Перетащить')}
                                    >
                                      <svg className="w-3 h-3" viewBox="0 0 10 16" fill="currentColor">
                                        <circle cx="3" cy="2" r="1.5" /><circle cx="3" cy="8" r="1.5" /><circle cx="3" cy="14" r="1.5" />
                                        <circle cx="7" cy="2" r="1.5" /><circle cx="7" cy="8" r="1.5" /><circle cx="7" cy="14" r="1.5" />
                                      </svg>
                                    </div>
                                    {canApproveSubtasks && (
                                      <button
                                        onClick={() => removeItem(group.id, item.id)}
                                        className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                                        title={t('Удалить подзадачу')}
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add checklist */}
            <button
              onClick={addChecklist}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:text-violet-500 hover:border-violet-300 dark:hover:border-violet-700/60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить новый список задач
            </button>

            {/* Comment input (editing mode only) */}
            {!isNew && (
              <div className="border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendComment(); }}
                  rows={2}
                  className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 bg-transparent outline-none border-none resize-none placeholder-gray-400 focus:ring-0"
                  placeholder={t('Комментировать...')}
                />
                {commentAttachments.length > 0 && (
                  <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                    {commentAttachments.map((a, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700/60 rounded text-xs text-gray-600 dark:text-gray-300">
                        <span className="truncate max-w-[120px]">{a.fileName}</span>
                        <button
                          onClick={() => setCommentAttachments((p) => p.filter((_, idx) => idx !== i))}
                          className="text-gray-400 hover:text-red-400 ml-0.5"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-700/30">
                  <button
                    onClick={() => commentFileInputRef.current?.click()}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={t('Прикрепить файл')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button
                    onClick={handleSendComment}
                    disabled={sendingComment || (!commentText.trim() && commentAttachments.length === 0) || uploading}
                    className="p-1.5 text-violet-500 hover:text-violet-600 disabled:opacity-30 transition-colors"
                    title={t('Отправить (Ctrl+Enter)')}
                  >
                    {sendingComment ? (
                      <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin block" />
                    ) : (
                      <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Comments history */}
            {comments.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showHistory ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    История ({comments.length})
                  </button>
                  {comments.some((c) => c.type === 'system' || (c.commentText || (c as any).content || '').startsWith('__system__:')) && (
                    <button
                      onClick={() => setHideSystemMessages((v) => !v)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                        hideSystemMessages
                          ? 'border-violet-300 text-violet-600 dark:text-violet-400 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-gray-200 text-gray-500 dark:text-gray-400 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      title={t('Скрыть/показать системные уведомления')}
                    >
                      {hideSystemMessages ? 'Показать тех. уведомления' : 'Скрыть тех. уведомления'}
                    </button>
                  )}
                </div>
                {showHistory && <div className="space-y-4">
                  {comments.filter((c) => {
                    const t = c.commentText || (c as any).content || '';
                    const isSys = c.type === 'system' || t.startsWith('__system__:');
                    if (hideSystemMessages && isSys) return false;
                    return true;
                  }).map((c) => {
                    const cUserId = c.userId || c.user_id;
                    const author = cUserId ? userMap[cUserId] : null;
                    const isSystemUser = !author || author.roleId === 1;
                    const name = isSystemUser ? 'Система' : userName(author!);
                    const rawText = c.commentText || (c as any).content || '';
                    const isSystemMessage = c.type === 'system' || rawText.startsWith('__system__:');
                    const text = (rawText.startsWith('__system__:') ? rawText.slice('__system__:'.length) : rawText)
                      .replace(/ — (?!Система).+$/, ' — Система');
                    if (isSystemMessage) {
                      const subtaskMatch = text.match(/^Подзадача «(.+)»/);
                      const handleSubtaskClick = subtaskMatch ? () => {
                        const title = subtaskMatch[1];
                        let foundId: string | null = null;
                        for (const g of checklists) {
                          const found = g.items.find((i) => i.text === title || i.text.startsWith(title));
                          if (found) { foundId = found.id; break; }
                        }
                        if (!foundId) return;
                        const el = document.getElementById(`checklist-item-${foundId}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setHighlightedItemId(foundId);
                          setTimeout(() => setHighlightedItemId(null), 2000);
                        }
                      } : undefined;
                      return (
                        <div
                          key={c.id}
                          onClick={handleSubtaskClick}
                          className={`flex items-center gap-2 py-1 px-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg text-xs text-gray-500 dark:text-gray-400 ${handleSubtaskClick ? 'cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors' : ''}`}
                        >
                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="flex-1">{text}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{formatAgo(c.createdAt)}</span>
                        </div>
                      );
                    }
                    const att: Attachment[] = parseAttachments(c.attachments);
                    const isOwnComment = user && Number(user.id) === Number(cUserId);
                    const canDelete =
                      user && task && (
                        Number(user.id) === Number(task.createdByUserId) ||
                        isOwnComment
                      );
                    const isEditing = editingCommentId === c.id;
                    return (
                      <div key={c.id} className="flex gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                          {author?.avatarUrl
                            ? <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : initials(name)
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{name}</span>
                            <span className="text-xs text-gray-400">{formatAgo(c.createdAt)}</span>
                            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                              {isOwnComment && !isEditing && (
                                <button
                                  onClick={() => startEditComment(c)}
                                  className="p-0.5 text-gray-400 hover:text-violet-500 transition-colors"
                                  title={t('Редактировать комментарий')}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {canDelete && !isEditing && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                                  title={t('Удалить комментарий')}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="mt-1">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEditComment(c.id);
                                  if (e.key === 'Escape') cancelEditComment();
                                }}
                                rows={2}
                                autoFocus
                                className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-violet-300 dark:border-violet-700 rounded-lg outline-none resize-none focus:ring-1 focus:ring-violet-500"
                              />
                              <div className="flex items-center gap-2 mt-1.5">
                                <button
                                  onClick={() => saveEditComment(c.id)}
                                  disabled={savingEditComment || !editingCommentText.trim()}
                                  className="px-3 py-1 text-xs font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 rounded-lg transition-colors"
                                >
                                  {savingEditComment ? '...' : 'Сохранить'}
                                </button>
                                <button
                                  onClick={cancelEditComment}
                                  className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{text}</p>
                          )}
                          {att.length > 0 && !isEditing && (() => {
                            const media = att.filter((a) => isImageFile(a) || isVideoFile(a));
                            const files = att.filter((a) => !isImageFile(a) && !isVideoFile(a));
                            return (
                              <div className="mt-2 space-y-2">
                                {media.length > 0 && (
                                  <CommentMediaAlbum
                                    items={media}
                                    onOpen={(a) => setPreviewFile({ url: a.fileUrl, name: a.fileName })}
                                  />
                                )}
                                {files.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {files.map((a, i) => (
                                      <button
                                        key={i}
                                        onClick={() => setPreviewFile({ url: a.fileUrl, name: a.fileName })}
                                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-violet-500 hover:underline bg-gray-50 dark:bg-gray-800/60 rounded-md"
                                      >
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        <span className="truncate max-w-[200px]">{a.fileName}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>}
              </div>
            )}
          </div>

          {/* ── Right sidebar (desktop only) ── */}
          <div className={`shrink-0 border-l border-gray-200 dark:border-gray-700/60 transition-all duration-200 hidden sm:flex sm:flex-col ${sidebarCollapsed ? 'w-8' : 'w-60 xl:w-64'}`}>
            {/* Toggle button */}
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-end'} px-1.5 pt-3 pb-1 shrink-0`}>
              <button
                onClick={() => { setSidebarCollapsed((v) => !v); if (!sidebarCollapsed) setHistoryPanelItemId(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                title={sidebarCollapsed ? 'Развернуть панель' : 'Свернуть панель'}
              >
                <svg className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-5 min-h-0">
                {historyPanelItemId ? (() => {
                  const allItems = checklists.flatMap((g) => g.items);
                  const hItem = allItems.find((i) => i.id === historyPanelItemId);
                  const hEvents = hItem ? extractItemHistory(hItem.text) : [];
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => setHistoryPanelItemId(null)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                          title={t('Назад')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('История подзадачи')}</p>
                      </div>
                      {hItem && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg leading-relaxed">
                          {hItem.text}
                        </p>
                      )}
                      {hEvents.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">{t('Нет событий')}</p>
                      ) : (
                        <div className="space-y-3">
                          {hEvents.map((ev, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${HISTORY_ACTION_COLORS[ev.action] || 'bg-violet-400'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 dark:text-gray-300 capitalize">{ev.action}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(ev.time).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })() : <SidebarContent />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History tooltip (fixed overlay) */}
      {historyTooltip && (() => {
        const allItems = checklists.flatMap((g) => g.items);
        const tItem = allItems.find((i) => i.id === historyTooltip.itemId);
        const tEvents = tItem ? extractItemHistory(tItem.text) : [];
        const left = Math.min(historyTooltip.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 288);
        return (
          <div
            className="fixed z-[200] w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3"
            style={{ top: historyTooltip.y + 6, left }}
            onMouseEnter={keepHistoryTooltip}
            onMouseLeave={hideHistoryTooltip}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{t('История (последние события)')}</p>
            {tEvents.length === 0 ? (
              <p className="text-xs text-gray-400">{t('Событий пока нет')}</p>
            ) : (
              <ul className="space-y-1.5">
                {tEvents.slice(0, 3).map((ev, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${HISTORY_ACTION_COLORS[ev.action] || 'bg-violet-400'}`} />
                    <span className="flex-1 text-gray-700 dark:text-gray-300 capitalize">{ev.action}</span>
                    <span className="text-gray-400 shrink-0">{formatAgo(ev.time)}</span>
                  </li>
                ))}
              </ul>
            )}
            {tEvents.length > 0 && (
              <button
                onClick={() => { setHistoryPanelItemId(historyTooltip.itemId); setSidebarCollapsed(false); setHistoryTooltip(null); }}
                className="text-xs text-violet-500 hover:text-violet-600 mt-2 block"
              >
                Смотреть всю историю →
              </button>
            )}
          </div>
        );
      })()}

      {/* Mobile settings sheet */}
      {showMobileSettings && (
        <div className="fixed inset-0 z-[55] flex items-end sm:hidden" onClick={() => setShowMobileSettings(false)}>
          <div
            className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800 dark:text-gray-100">{t('Параметры задачи')}</span>
              <button onClick={() => setShowMobileSettings(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Employee card */}
      {employeeCard && (
        <EmployeeCard
          user={employeeCard.user}
          assignedAt={employeeCard.assignedAt}
          onRemove={employeeCard.onRemove}
          onClose={() => setEmployeeCard(null)}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Настройки отображения подзадач (шестерёнка в шапке списка) */}
      {showSubtaskSettings && (
        <SubtaskSettingsPanel
          settings={subtaskDisplay}
          onChange={setSubtaskDisplay}
          onClose={() => setShowSubtaskSettings(false)}
        />
      )}
    </div>
  );
}
