'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useTaskNotifStore } from '@/stores/taskNotifStore';
import FilePreviewModal from '@/components/ui/FilePreviewModal';

interface Attachment {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
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
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Сотрудник</h3>
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
            <span className="text-gray-500 dark:text-gray-400">Роль</span>
            <span className="text-gray-800 dark:text-gray-100 text-right">{user.roleId ? (ROLE_LABELS[user.roleId] || `#${user.roleId}`) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Статус</span>
            <span className="text-green-600 dark:text-green-400 font-medium">Активен</span>
          </div>
          {assignedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Назначен</span>
              <span className="text-gray-800 dark:text-gray-100">{new Date(assignedAt).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="px-5 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Задачи сотрудника</p>
          {loadingTasks ? (
            <p className="text-xs text-gray-400 py-2">Загрузка...</p>
          ) : tasks.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">Нет задач</p>
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
                <span className="text-xs text-red-500">Убрать из задачи?</span>
                <button onClick={onRemove} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg">Да</button>
                <button onClick={() => setConfirmRemove(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Нет</button>
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

interface TaskFormModalProps {
  task?: any | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskFormModal({ task, onClose, onSaved }: TaskFormModalProps) {
  const { user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const { lastSeenAt, setUnreadCount } = useTaskNotifStore();

  const isNew = !task?.id;

  // Core fields
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<number>(task?.status ?? 0);
  const [priority, setPriority] = useState<number>(task?.priority ?? 2);
  const [dueDate, setDueDate] = useState(task?.dueDate?.split('T')[0] || task?.due_date?.split('T')[0] || '');
  const [projectId, setProjectId] = useState(String(task?.projectId || task?.project_id || ''));
  const [constructionSiteId, setConstructionSiteId] = useState(String(task?.constructionSiteId || task?.construction_site_id || ''));
  const [estimatedHours, setEstimatedHours] = useState(String(task?.estimatedHours || task?.estimated_hours || ''));

  // Mobile sidebar sheet
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  // History collapse
  const [showHistory, setShowHistory] = useState(true);

  // Assignees
  const [assignees, setAssignees] = useState<Assignee[]>(() =>
    (task?.assignees || []).map((a: any) => ({ userId: a.userId || a.user_id, userName: a.userName || a.user_name }))
  );
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [employeeCard, setEmployeeCard] = useState<{ user: User; assignedAt?: string; onRemove: () => void } | null>(null);

  // Checklists
  const [checklists, setChecklists] = useState<ChecklistGroup[]>(() => {
    const cf = task?.customFields || task?.custom_fields;
    return cf?.checklists || [];
  });
  const clSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Comments
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<Attachment[]>([]);
  const [sendingComment, setSendingComment] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>(() => parseAttachments(task?.attachments));
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

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
          const list = [...raw].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

  const updateChecklists = (fn: (prev: ChecklistGroup[]) => ChecklistGroup[]) => {
    setChecklists((prev) => {
      const next = fn(prev);
      saveChecklists(next);
      return next;
    });
  };

  // ---- Save task ----
  const handleSave = async () => {
    if (!title.trim()) { addToast('error', 'Введите название задачи'); return; }
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
      };
      if (isNew) {
        const res = await api.post('/tasks', payload);
        const newId = res.data?.id;
        if (newId && assignees.length > 0) {
          await api.post(`/tasks/${newId}/assignees`, { assignees });
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
      setCommentText('');
      setCommentAttachments([]);
    } catch (err: any) {
      addToast('error', 'Ошибка отправки комментария');
    } finally {
      setSendingComment(false);
    }
  };

  // ---- File upload ----
  const handleFileSelect = async (files: FileList | null, forComment = false) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      const { data } = await api.post('/chat-channels/upload', fd);
      const list: Attachment[] = (Array.isArray(data) ? data : [data]).map((a: any) => ({
        fileName: a.fileName || a.file_name || '',
        fileSize: a.fileSize || a.file_size || 0,
        mimeType: a.mimeType || a.mime_type || '',
        fileUrl: a.fileUrl || a.file_url || a.url || '',
      }));
      if (forComment) setCommentAttachments((prev) => [...prev, ...list]);
      else setAttachments((prev) => [...prev, ...list]);
    } catch {
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
  const removeChecklist = (gid: string) =>
    updateChecklists((prev) => prev.filter((g) => g.id !== gid));
  const toggleCollapse = (gid: string) =>
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, collapsed: !g.collapsed } : g));
  const updateGroupTitle = (gid: string, t: string) =>
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, title: t } : g));
  const addItem = (gid: string) =>
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, items: [...g.items, { id: uid(), text: '', checked: false }] } : g));
  const removeItem = (gid: string, iid: string) =>
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, items: g.items.filter((i) => i.id !== iid) } : g));
  const updateItemText = (gid: string, iid: string, text: string) =>
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, items: g.items.map((i) => i.id === iid ? { ...i, text } : i) } : g));
  const toggleItem = (gid: string, iid: string) =>
    updateChecklists((prev) => prev.map((g) => g.id === gid ? { ...g, items: g.items.map((i) => i.id === iid ? { ...i, checked: !i.checked } : i) } : g));

  // ---- Assignee helpers ----
  const toggleAssignee = (u: User) => {
    setAssignees((prev) =>
      prev.some((a) => a.userId === u.id)
        ? prev.filter((a) => a.userId !== u.id)
        : [...prev, { userId: u.id, userName: userName(u) }]
    );
  };

  const statusInfo = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

  // Sidebar content — reused for both desktop sidebar and mobile sheet
  const SidebarContent = () => (
    <div className="space-y-5">
      {/* Status */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Статус</p>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(Number(e.target.value))}
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
      </div>

      {/* Priority */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Приоритет</p>
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
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Ответственные</p>
          <button
            onClick={() => setShowAssigneePicker((v) => !v)}
            className="text-gray-400 hover:text-violet-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        {assignees.length === 0 && <p className="text-xs text-gray-400">Не назначено</p>}
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
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Дедлайн</p>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {/* Project */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Проект</p>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          <option value="">Не выбрано</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Construction site */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Объект</p>
        <select
          value={constructionSiteId}
          onChange={(e) => setConstructionSiteId(e.target.value)}
          disabled={!projectId}
          className="w-full text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="">Не выбрано</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {!projectId && (
          <p className="text-[10px] text-gray-400 mt-1">Сначала выберите проект</p>
        )}
      </div>

      {/* Created by */}
      {(createdByUser || task?.createdByUserId) && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Поставил задачу</p>
          {createdByUser?.roleId === 1 ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">С</div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Система</span>
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
      {task?.createdAt && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Создана</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{fmtDateTime(task.createdAt)}</p>
        </div>
      )}

      {/* Estimated hours */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Оценка (ч)</p>
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

      {/* Attachments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Документы</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-gray-400 hover:text-violet-500 disabled:opacity-50 transition-colors"
            title="Прикрепить файл"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        {attachments.length === 0 && <p className="text-xs text-gray-400">Нет файлов</p>}
        <div className="space-y-1.5">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <button
                onClick={() => setPreviewFile({ url: a.fileUrl, name: a.fileName })}
                className="flex-1 text-left text-xs text-violet-500 hover:underline truncate"
              >
                {a.fileName}
              </button>
              <button
                onClick={() => setAttachments((p) => p.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-red-400 text-sm shrink-0"
              >×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/60 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl my-2 sm:my-6 flex flex-col overflow-hidden"
        style={{ minHeight: 580 }}
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
              className="w-full text-lg sm:text-xl font-semibold bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 border-none outline-none focus:ring-0"
              placeholder="Название задачи"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {/* Mobile settings burger */}
            <button
              className="sm:hidden p-1.5 text-gray-400 hover:text-violet-500 rounded-lg transition-colors"
              onClick={() => setShowMobileSettings(true)}
              title="Настройки задачи"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
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
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6 min-w-0">

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Описание</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-300 border-none outline-none focus:ring-0 resize-none placeholder-gray-400"
                placeholder="Добавить описание задачи..."
              />
            </div>

            {/* Checklists */}
            {checklists.map((group) => {
              const done = group.items.filter((i) => i.checked).length;
              const total = group.items.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={group.id} className="border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60">
                    <button onClick={() => toggleCollapse(group.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <svg className={`w-4 h-4 transition-transform duration-200 ${group.collapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <input
                      value={group.title}
                      onChange={(e) => updateGroupTitle(group.id, e.target.value)}
                      className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent outline-none border-none focus:ring-0"
                    />
                    {total > 0 && <span className="text-xs text-gray-400 shrink-0">{done}/{total}</span>}
                    <button onClick={() => removeChecklist(group.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {total > 0 && (
                    <div className="h-1 bg-gray-100 dark:bg-gray-800">
                      <div className="h-full bg-violet-400 transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {!group.collapsed && (
                    <>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/30">
                        {group.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 group/item">
                            <button
                              onClick={() => toggleItem(group.id, item.id)}
                              className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                                item.checked ? 'bg-violet-500 border-violet-500' : 'border-gray-300 dark:border-gray-600 hover:border-violet-400'
                              }`}
                            >
                              {item.checked && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <input
                              value={item.text}
                              onChange={(e) => updateItemText(group.id, item.id, e.target.value)}
                              className={`flex-1 text-sm bg-transparent outline-none border-none focus:ring-0 ${item.checked ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
                              placeholder="Введите пункт..."
                            />
                            <button onClick={() => removeItem(group.id, item.id)} className="opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700/30">
                        <button onClick={() => addItem(group.id)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Добавить задачу
                        </button>
                      </div>
                    </>
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
                  placeholder="Комментировать..."
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
                    title="Прикрепить файл"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button
                    onClick={handleSendComment}
                    disabled={sendingComment || (!commentText.trim() && commentAttachments.length === 0) || uploading}
                    className="p-1.5 text-violet-500 hover:text-violet-600 disabled:opacity-30 transition-colors"
                    title="Отправить (Ctrl+Enter)"
                  >
                    {sendingComment ? (
                      <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin block" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showHistory ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  История ({comments.length})
                </button>
                {showHistory && <div className="space-y-4">
                  {comments.map((c) => {
                    const cUserId = c.userId || c.user_id;
                    const author = cUserId ? userMap[cUserId] : null;
                    const isSystemUser = !author || author.roleId === 1;
                    const name = isSystemUser ? 'Система' : userName(author!);
                    const text = c.commentText || (c as any).content || '';
                    const att: Attachment[] = parseAttachments(c.attachments);
                    return (
                      <div key={c.id} className="flex gap-3">
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
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{text}</p>
                          {att.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {att.map((a, i) => (
                                <button
                                  key={i}
                                  onClick={() => setPreviewFile({ url: a.fileUrl, name: a.fileName })}
                                  className="flex items-center gap-1 text-xs text-violet-500 hover:underline"
                                >
                                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  {a.fileName}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>}
              </div>
            )}
          </div>

          {/* ── Right sidebar (desktop only) ── */}
          <div className="w-60 xl:w-64 shrink-0 border-l border-gray-200 dark:border-gray-700/60 px-4 py-5 overflow-y-auto hidden sm:flex sm:flex-col">
            <SidebarContent />
          </div>
        </div>
      </div>

      {/* Mobile settings sheet */}
      {showMobileSettings && (
        <div className="fixed inset-0 z-[55] flex items-end sm:hidden" onClick={() => setShowMobileSettings(false)}>
          <div
            className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-800 dark:text-gray-100">Параметры задачи</span>
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
    </div>
  );
}
