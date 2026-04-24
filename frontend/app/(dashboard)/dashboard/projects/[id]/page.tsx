'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ProjectFormModal from '@/components/dashboard/ProjectFormModal';
import { useToastStore } from '@/stores/toastStore';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import ChatInput from '@/components/chat/ChatInput';
import ChatMessageComponent from '@/components/chat/ChatMessage';

/* ─── Types ─── */

interface Project {
  id: number;
  name: string;
  code?: string;
  description?: string;
  status: number;
  priority: number;
  startDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  budget?: number;
  actualCost?: number;
  address?: string;
  clientName?: string;
  projectManager?: { id: number; name: string; email: string };
}

interface TeamMember {
  id: number;
  teamId: number;
  teamName?: string;
  team?: { id: number; name: string };
  isPrimary?: boolean;
  assignedAt?: string;
}

interface Assignment {
  id: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  roleOnProject?: string;
  isActive?: boolean;
  assignedAt?: string;
}

interface Document {
  id: number;
  title: string;
  documentType?: string;
  status?: string;
  fileUrl?: string;
  fileSize?: number;
  createdAt: string;
}

interface ChatChannel {
  id: number;
  name?: string;
  channelName?: string;
  projectId?: number;
  membersCount?: number;
}

interface ChatMessage {
  id: number;
  messageText?: string;
  senderName?: string;
  user?: { id: number; name: string; email: string; avatarUrl?: string };
  createdAt: string;
  channelId: number;
}

interface ConstructionSite {
  id: number;
  name: string;
  status?: string;
  photos?: string[];
}

// Strip internal Docker/server hostnames from upload URLs so browser can load them
function normalizePhotoUrl(url: string): string {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return url;
  try {
    const parsed = new URL(url);
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) return url;
    return parsed.pathname;
  } catch {
    return url;
  }
}

// Convert webp/heic files to JPEG via Canvas before upload for universal browser support
function convertImageToJpeg(file: File): Promise<File> {
  const needsConversion = ['image/webp', 'image/heic', 'image/heif'].includes(file.type);
  if (!needsConversion) return Promise.resolve(file);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          const name = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.92);
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

const PHOTO_ERROR_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E";

interface Task {
  id: number;
  title: string;
  description?: string;
  status?: number;
  priority?: number;
  dueDate?: string;
  due_date?: string;
  assignees?: { userId: number; userName?: string }[];
}

interface TeamOption {
  id: number;
  name: string;
  description?: string;
  membersCount?: number;
  _count?: { members: number };
}

interface UserOption {
  id: number;
  name: string;
  email: string;
  position?: string;
  roleId?: number;
  role?: { name: string };
}

/* ─── Constants ─── */

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Планирование', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'Активный', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  2: { label: 'Приостановлен', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  3: { label: 'Завершён', color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400' },
  4: { label: 'Отменён', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкий', color: 'text-gray-500' },
  2: { label: 'Средний', color: 'text-yellow-500' },
  3: { label: 'Высокий', color: 'text-orange-500' },
  4: { label: 'Критический', color: 'text-red-500' },
};

const TASK_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'В работе', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  2: { label: 'На проверке', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  3: { label: 'Готово', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  4: { label: 'Отменена', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

const TASK_PRIORITY: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкий', color: 'text-gray-500' },
  2: { label: 'Средний', color: 'text-yellow-500' },
  3: { label: 'Высокий', color: 'text-orange-500' },
  4: { label: 'Критический', color: 'text-red-500' },
};

const DOC_TYPE_OPTIONS = [
  { value: 'contract', label: 'Договор' },
  { value: 'invoice', label: 'Счёт' },
  { value: 'report', label: 'Отчёт' },
  { value: 'permit', label: 'Разрешение' },
  { value: 'blueprint', label: 'Чертёж' },
  { value: 'other', label: 'Прочее' },
];

const DOC_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOC_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const TABS = [
  { key: 'overview', label: 'Обзор' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'team', label: 'Команда' },
  { key: 'documents', label: 'Документы' },
  { key: 'chat', label: 'Диалог' },
  { key: 'photos', label: 'Фотографии' },
] as const;

type TabKey = typeof TABS[number]['key'];

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

function fmtMoney(n?: number) {
  if (n == null) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function fmtSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}

/* ─── Main Page ─── */

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showEditModal, setShowEditModal] = useState(false);

  /* Team tab */
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [showAssignEmployee, setShowAssignEmployee] = useState(false);
  const [removingTeamId, setRemovingTeamId] = useState<number | null>(null);
  const [removingAssignId, setRemovingAssignId] = useState<number | null>(null);

  /* Documents tab */
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);

  /* Tasks tab */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  /* Team modals */
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  /* Document modal */
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  /* Chat tab */
  const [channel, setChannel] = useState<ChatChannel | null>(null);
  const [channelChecked, setChannelChecked] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);

  /* Photos tab */
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* Overview summary */
  const [overviewSummary, setOverviewSummary] = useState<{
    teams: TeamMember[];
    assignments: Assignment[];
    tasks: Task[];
    documents: Document[];
    sites: ConstructionSite[];
  } | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  /* ─── Load project ─── */
  useEffect(() => {
    api.get(`/projects/${projectId}`)
      .then((r) => setProject(r.data))
      .catch(() => router.push('/dashboard/projects'))
      .finally(() => setLoadingProject(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* ─── Reload helpers ─── */
  const reloadTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const [teamRes, assignRes] = await Promise.all([
        api.get(`/projects/${projectId}/team`).catch(() => ({ data: [] })),
        api.get(`/projects/${projectId}/assignments`).catch(() => ({ data: {} })),
      ]);
      setTeamMembers(Array.isArray(teamRes.data) ? teamRes.data : teamRes.data?.teams || []);
      const aData = assignRes.data?.assignments || assignRes.data?.data || assignRes.data || [];
      setAssignments(Array.isArray(aData) ? aData : []);
      setTeamLoaded(true);
    } finally {
      setLoadingTeam(false);
    }
  }, [projectId]);

  const reloadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const r = await api.get('/documents', { params: { projectId, limit: 100 } });
      const d = r.data?.documents || r.data?.data || r.data || [];
      setDocuments(Array.isArray(d) ? d : []);
      setDocsLoaded(true);
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [projectId]);

  const reloadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const r = await api.get('/tasks', { params: { projectId, limit: 100 } });
      const t = r.data?.tasks || r.data?.data || r.data || [];
      setTasks(Array.isArray(t) ? t : []);
      setTasksLoaded(true);
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [projectId]);

  const reloadSites = useCallback(async () => {
    setLoadingPhotos(true);
    try {
      const r = await api.get(`/projects/${projectId}/construction-sites`, { params: { limit: 100 } });
      const s = r.data?.sites || r.data?.data || r.data || [];
      setSites(Array.isArray(s) ? s : []);
      setSitesLoaded(true);
    } catch {
      setSites([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, [projectId]);

  /* ─── Load tab data ─── */
  useEffect(() => {
    if (activeTab === 'overview' && !overviewSummary && !overviewLoading) {
      setOverviewLoading(true);
      Promise.all([
        api.get(`/projects/${projectId}/team`).catch(() => ({ data: [] })),
        api.get(`/projects/${projectId}/assignments`).catch(() => ({ data: {} })),
        api.get('/tasks', { params: { projectId, limit: 100 } }).catch(() => ({ data: [] })),
        api.get('/documents', { params: { projectId, limit: 100 } }).catch(() => ({ data: [] })),
        api.get(`/projects/${projectId}/construction-sites`, { params: { limit: 100 } }).catch(() => ({ data: [] })),
      ]).then(([teamRes, assignRes, tasksRes, docsRes, sitesRes]) => {
        const teams = Array.isArray(teamRes.data) ? teamRes.data : teamRes.data?.teams || [];
        const aData = assignRes.data?.assignments || assignRes.data?.data || assignRes.data || [];
        const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.tasks || tasksRes.data?.data || [];
        const docs = Array.isArray(docsRes.data) ? docsRes.data : docsRes.data?.documents || docsRes.data?.data || [];
        const sitesData = Array.isArray(sitesRes.data) ? sitesRes.data : sitesRes.data?.sites || sitesRes.data?.data || [];
        setOverviewSummary({
          teams: Array.isArray(teams) ? teams : [],
          assignments: Array.isArray(aData) ? aData : [],
          tasks: Array.isArray(tasks) ? tasks : [],
          documents: Array.isArray(docs) ? docs : [],
          sites: Array.isArray(sitesData) ? sitesData : [],
        });
      }).finally(() => setOverviewLoading(false));
    }
    if (activeTab === 'team' && !teamLoaded && !loadingTeam) reloadTeam();
    if (activeTab === 'documents' && !docsLoaded && !loadingDocs) reloadDocuments();
    if (activeTab === 'tasks' && !tasksLoaded && !loadingTasks) reloadTasks();
    if (activeTab === 'chat' && !channelChecked && !loadingChat) findChannel();
    if (activeTab === 'photos' && !sitesLoaded && !loadingPhotos) reloadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ─── Chat helpers ─── */
  const findChannel = useCallback(async () => {
    setLoadingChat(true);
    try {
      const r = await api.get('/chat-channels', { params: { limit: 200 } });
      const list: any[] = r.data?.data || r.data?.channels || [];
      const found = list.find((c: any) => c.projectId === projectId || c.project_id === projectId);
      if (found) setChannel(found);
    } catch { /* ignore */ }
    finally { setLoadingChat(false); setChannelChecked(true); }
  }, [projectId]);

  const getOrCreateChannel = useCallback(async (): Promise<ChatChannel | null> => {
    if (channel) return channel;
    try {
      const r = await api.get('/chat-channels', { params: { limit: 200 } });
      const list: any[] = r.data?.data || r.data?.channels || [];
      const found = list.find((c: any) => c.projectId === projectId || c.project_id === projectId);
      if (found) { setChannel(found); return found; }
    } catch { /* ignore */ }
    if (!project) return null;
    try {
      const r = await api.post('/chat-channels', { name: `Проект: ${project.name}`, channelType: 'group', projectId });
      setChannel(r.data); setChannelChecked(true);
      return r.data;
    } catch { return null; }
  }, [channel, project, projectId]);

  const addUsersToChannel = useCallback(async (userIds: number[]) => {
    const ch = await getOrCreateChannel();
    if (!ch || userIds.length === 0) return;
    await Promise.allSettled(
      userIds.map((userId) => api.post(`/chat-channels/${ch.id}/members`, { userId, role: 'member' }))
    );
    // refresh channel to update member count in store
    useChatStore.getState().fetchChannels(1);
    const refreshed = await api.get(`/chat-channels/${ch.id}`).catch(() => null);
    if (refreshed) setChannel(refreshed.data);
  }, [getOrCreateChannel]);

  const handleCreateChannel = async () => {
    if (!project) return;
    setCreatingChannel(true);
    try {
      const r = await api.post('/chat-channels', { name: `Проект: ${project.name}`, channelType: 'group', projectId });
      setChannel(r.data); setChannelChecked(true);
      addToast('success', 'Чат для проекта создан');
    } catch { addToast('error', 'Не удалось создать чат'); }
    finally { setCreatingChannel(false); }
  };

  /* ─── Chat file sync ─── */
  const handleChatFilesSent = useCallback(async (attachments: { fileUrl: string; fileName: string; fileSize: number; mimeType: string }[]) => {
    for (const att of attachments) {
      const isImage = att.mimeType?.startsWith('image/');
      const isAudio = att.mimeType?.startsWith('audio/');

      if (isAudio) continue; // голосовые сообщения не сохраняем

      if (isImage) {
        // Добавить в фото объекта строительства
        try {
          let targetSite = sites[0] ?? null;
          if (!targetSite) {
            const r = await api.get(`/projects/${projectId}/construction-sites`, { params: { limit: 1 } });
            const s = r.data?.sites || r.data?.data || r.data || [];
            targetSite = Array.isArray(s) && s.length > 0 ? s[0] : null;
            if (!targetSite) {
              const createRes = await api.post(`/projects/${projectId}/construction-sites`, {
                name: 'Основной объект',
                address: project?.address || 'Не указан',
              });
              targetSite = createRes.data;
            }
          }
          if (targetSite) {
            const siteRes = await api.get(`/construction-sites/${targetSite.id}`);
            const existing: string[] = siteRes.data?.photos || [];
            await api.put(`/construction-sites/${targetSite.id}`, {
              photos: [...existing, normalizePhotoUrl(att.fileUrl)],
            });
            setSitesLoaded(false); // сбросить кэш чтобы вкладка перезагрузилась
          }
        } catch { /* синхронизация опциональна */ }
      } else {
        // Добавить в документы проекта
        try {
          await api.post('/documents', {
            title: att.fileName,
            projectId,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize,
            fileType: att.mimeType,
            status: 'active',
          });
          setDocsLoaded(false); // сбросить кэш чтобы вкладка перезагрузилась
        } catch { /* синхронизация опциональна */ }
      }
    }
  }, [projectId, project, sites]);

  /* ─── Team actions ─── */
  const handleAssignTeam = async (teamId: number) => {
    try {
      await api.post(`/projects/${projectId}/team`, { teamId });
      // get team members to sync chat
      try {
        const r = await api.get(`/teams/${teamId}/members`);
        const members: any[] = r.data?.members || r.data?.data || r.data || [];
        const userIds = members.map((m: any) => m.userId || m.user?.id).filter(Boolean) as number[];
        if (userIds.length > 0) await addUsersToChannel(userIds);
      } catch { /* chat sync optional */ }
      await reloadTeam();
      addToast('success', 'Команда назначена и добавлена в чат');
    } catch { addToast('error', 'Не удалось назначить команду'); }
  };

  const handleRemoveTeam = async (teamId: number) => {
    setRemovingTeamId(teamId);
    try {
      await api.delete(`/projects/${projectId}/team/${teamId}`);
      setTeamMembers((prev) => prev.filter((m) => m.teamId !== teamId));
      addToast('success', 'Команда удалена из проекта');
    } catch { addToast('error', 'Не удалось удалить команду'); }
    finally { setRemovingTeamId(null); }
  };

  const handleAssignEmployee = async (userId: number, roleOnProject?: string) => {
    try {
      await api.post(`/projects/${projectId}/assignments`, { userId, roleOnProject });
      await addUsersToChannel([userId]);
      await reloadTeam();
      addToast('success', 'Сотрудник назначен и добавлен в чат');
    } catch { addToast('error', 'Не удалось назначить сотрудника'); }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    setRemovingAssignId(assignmentId);
    try {
      await api.delete(`/projects/${projectId}/assignments/${assignmentId}`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      addToast('success', 'Сотрудник удалён из проекта');
    } catch { addToast('error', 'Не удалось удалить сотрудника'); }
    finally { setRemovingAssignId(null); }
  };

  /* ─── Document upload ─── */
  const handleUploadDocument = async (file: File, title: string, docType: string, description: string) => {
    const form = new FormData();
    form.append('file', file);
    const uploadRes = await api.post('/employee-documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const fileUrl: string = uploadRes.data?.fileUrl || uploadRes.data?.url || '';
    const fileSize: number = uploadRes.data?.fileSize || file.size;
    await api.post('/documents', {
      title,
      documentType: docType || undefined,
      description: description || undefined,
      projectId,
      fileUrl,
      fileSize,
      fileType: file.type,
      status: 'active',
    });
    await reloadDocuments();
    addToast('success', 'Документ загружен');
  };

  /* ─── Photo upload ─── */
  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    try {
      // ensure at least one construction site exists
      let targetSite = sites[0];
      if (!targetSite) {
        const r = await api.post(`/projects/${projectId}/construction-sites`, {
          name: 'Основной объект',
          address: project?.address || 'Не указан',
        });
        targetSite = r.data;
        await reloadSites();
        targetSite = sites[0] || r.data;
      }

      for (const rawFile of Array.from(files)) {
        const file = await convertImageToJpeg(rawFile);
        const form = new FormData();
        form.append('files', file);
        const uploadRes = await api.post('/chat-channels/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploaded: any[] = Array.isArray(uploadRes.data) ? uploadRes.data : [uploadRes.data];
        const newUrls = uploaded.map((u: any) => normalizePhotoUrl(u.fileUrl || u.url)).filter(Boolean);

        // fetch current site photos and append
        const siteRes = await api.get(`/construction-sites/${targetSite.id}`);
        const existing: string[] = siteRes.data?.photos || [];
        await api.put(`/construction-sites/${targetSite.id}`, {
          photos: [...existing, ...newUrls],
        });
      }
      await reloadSites();
      addToast('success', `Загружено ${files.length} фото`);
    } catch { addToast('error', 'Ошибка при загрузке фото'); }
    finally { setUploadingPhoto(false); if (photoInputRef.current) photoInputRef.current.value = ''; }
  };

  /* ─── Render ─── */

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }
  if (!project) return null;

  const status = STATUS_LABELS[project.status] || STATUS_LABELS[0];
  const priority = PRIORITY_LABELS[project.priority] || PRIORITY_LABELS[1];
  const allPhotos = sites.flatMap((s) => (s.photos || []).map((url) => ({ url, siteName: s.name })));

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:justify-between sm:items-start mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">{project.name}</h1>
            {project.code && (
              <span className="text-sm text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                {project.code}
              </span>
            )}
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0 shrink-0">
          <Link href="/dashboard/projects" className="text-sm text-violet-500 hover:text-violet-600">&larr; Назад</Link>
          <button onClick={() => setShowEditModal(true)} className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors">
            Редактировать
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── Overview ─── */}
      {activeTab === 'overview' && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Основная информация</h2>
            <InfoRow label="Статус" value={<span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>} />
            <InfoRow label="Приоритет" value={<span className={`text-sm font-medium ${priority.color}`}>{priority.label}</span>} />
            <InfoRow label="Руководитель" value={project.projectManager?.name || '—'} />
            <InfoRow label="Клиент" value={project.clientName || '—'} />
            <InfoRow label="Адрес" value={project.address || '—'} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Сроки и бюджет</h2>
            <InfoRow label="Дата начала" value={fmt(project.startDate)} />
            <InfoRow label="Плановое окончание" value={fmt(project.plannedEndDate)} />
            <InfoRow label="Фактическое окончание" value={fmt(project.actualEndDate)} />
            <InfoRow label="Бюджет" value={fmtMoney(project.budget)} />
            <InfoRow label="Фактические затраты" value={fmtMoney(project.actualCost)} />
            {project.budget != null && project.actualCost != null && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Освоение бюджета</span>
                  <span>{Math.min(100, Math.round((project.actualCost / project.budget) * 100))}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((project.actualCost / project.budget) * 100))}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Overview Tree ─── */}
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Состав проекта</h2>
          </div>
          {overviewLoading ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Загрузка...</div>
          ) : !overviewSummary ? null : (
            <div className="p-4 space-y-1">
              <TreeSection
                icon="👥"
                label="Команды"
                count={overviewSummary.teams.length}
                items={overviewSummary.teams.map((m) => ({
                  key: String(m.id),
                  label: m.team?.name || m.teamName || `Команда #${m.teamId}`,
                  sub: m.isPrimary ? 'Основная' : undefined,
                }))}
              />
              <TreeSection
                icon="👤"
                label="Сотрудники"
                count={overviewSummary.assignments.length}
                items={overviewSummary.assignments.map((a) => ({
                  key: String(a.id),
                  label: a.userName || `#${a.userId}`,
                  sub: a.roleOnProject || undefined,
                }))}
              />
              <TreeSection
                icon="✅"
                label="Задачи"
                count={overviewSummary.tasks.length}
                items={[
                  { key: 'new', label: `Новые: ${overviewSummary.tasks.filter((t) => (t.status ?? 0) === 0).length}` },
                  { key: 'wip', label: `В работе: ${overviewSummary.tasks.filter((t) => t.status === 1).length}` },
                  { key: 'review', label: `На проверке: ${overviewSummary.tasks.filter((t) => t.status === 2).length}` },
                  { key: 'done', label: `Готово: ${overviewSummary.tasks.filter((t) => t.status === 3).length}` },
                  { key: 'cancel', label: `Отменено: ${overviewSummary.tasks.filter((t) => t.status === 4).length}` },
                ].filter((item) => {
                  const n = Number(item.label.split(': ')[1]);
                  return n > 0;
                })}
              />
              <TreeSection
                icon="📄"
                label="Документы"
                count={overviewSummary.documents.length}
                items={overviewSummary.documents.map((d) => ({
                  key: String(d.id),
                  label: d.title,
                  sub: d.documentType || undefined,
                }))}
              />
              <TreeSection
                icon="🏗️"
                label="Объекты строительства"
                count={overviewSummary.sites.length}
                items={overviewSummary.sites.map((s) => ({
                  key: String(s.id),
                  label: s.name,
                  sub: `${(s.photos || []).length} фото`,
                }))}
              />
            </div>
          )}
        </div>
        </>
      )}

      {/* ─── Tasks ─── */}
      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Задачи проекта</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{tasks.length} задач</span>
              <button onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Создать задачу
              </button>
            </div>
          </div>
          {loadingTasks ? <LoadingState /> : tasks.length === 0 ? <EmptyState text="Задачи не найдены" /> : (
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Название</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                  <th className="py-3 px-4 text-left font-semibold">Приоритет</th>
                  <th className="py-3 px-4 text-left font-semibold">Срок</th>
                  <th className="py-3 px-4 text-left font-semibold">Исполнители</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {tasks.map((t) => {
                  const ts = TASK_STATUS[t.status ?? 0] || TASK_STATUS[0];
                  const tp = TASK_PRIORITY[t.priority ?? 2] || TASK_PRIORITY[2];
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer" onClick={() => setSelectedTask(t)}>
                      <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-100">{t.title}</td>
                      <td className="py-2.5 px-4"><span className={`text-xs px-2 py-0.5 rounded-full ${ts.color}`}>{ts.label}</span></td>
                      <td className="py-2.5 px-4"><span className={`text-xs font-medium ${tp.color}`}>{tp.label}</span></td>
                      <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{fmt(t.dueDate || t.due_date)}</td>
                      <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400 text-xs">
                        {t.assignees?.map((a) => a.userName || `#${a.userId}`).join(', ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Team ─── */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {loadingTeam ? <LoadingState /> : (
            <>
              {/* Teams section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Команды</h2>
                  <button onClick={() => setShowAssignTeam(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Назначить команду
                  </button>
                </div>
                {teamMembers.length === 0 ? <EmptyState text="Команды не назначены" /> : (
                  <table className="table-auto w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                        <th className="py-3 px-4 text-left font-semibold">Команда</th>
                        <th className="py-3 px-4 text-left font-semibold">Дата назначения</th>
                        <th className="py-3 px-4 text-left font-semibold">Основная</th>
                        <th className="py-3 px-4 text-center font-semibold w-20">Удалить</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                      {teamMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer" onClick={() => setSelectedTeamMember(m)}>
                          <td className="py-2.5 px-4 text-gray-800 dark:text-gray-100">{m.team?.name || m.teamName || `Команда #${m.teamId}`}</td>
                          <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{fmt(m.assignedAt)}</td>
                          <td className="py-2.5 px-4">
                            {m.isPrimary && <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded-full">Основная</span>}
                          </td>
                          <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleRemoveTeam(m.teamId)} disabled={removingTeamId === m.teamId}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40" title="Удалить">
                              {removingTeamId === m.teamId
                                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              }
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Employees section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Сотрудники</h2>
                  <button onClick={() => setShowAssignEmployee(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить сотрудника
                  </button>
                </div>
                {assignments.length === 0 ? <EmptyState text="Сотрудники не назначены" /> : (
                  <table className="table-auto w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                        <th className="py-3 px-4 text-left font-semibold">Сотрудник</th>
                        <th className="py-3 px-4 text-left font-semibold">Роль</th>
                        <th className="py-3 px-4 text-left font-semibold">Статус</th>
                        <th className="py-3 px-4 text-left font-semibold">Назначен</th>
                        <th className="py-3 px-4 text-center font-semibold w-20">Удалить</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                      {assignments.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer" onClick={() => setSelectedAssignment(a)}>
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-gray-800 dark:text-gray-100">{a.userName || `#${a.userId}`}</div>
                            {a.userEmail && <div className="text-xs text-gray-400">{a.userEmail}</div>}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{a.roleOnProject || '—'}</td>
                          <td className="py-2.5 px-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'}`}>
                              {a.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{fmt(a.assignedAt)}</td>
                          <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleRemoveAssignment(a.id)} disabled={removingAssignId === a.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40" title="Удалить">
                              {removingAssignId === a.id
                                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              }
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Documents ─── */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Документы проекта</h2>
            <button onClick={() => setShowUploadDoc(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Загрузить документ
            </button>
          </div>
          {loadingDocs ? <LoadingState /> : documents.length === 0 ? <EmptyState text="Документы не найдены" /> : (
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Название</th>
                  <th className="py-3 px-4 text-left font-semibold">Тип</th>
                  <th className="py-3 px-4 text-left font-semibold">Размер</th>
                  <th className="py-3 px-4 text-left font-semibold">Дата</th>
                  <th className="py-3 px-4 text-center font-semibold">Скачать</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer" onClick={() => setSelectedDocument(doc)}>
                    <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-100">{doc.title}</td>
                    <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{DOC_TYPE_LABELS[doc.documentType || ''] || doc.documentType || '—'}</td>
                    <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{fmtSize(doc.fileSize)}</td>
                    <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{fmt(doc.createdAt)}</td>
                    <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-violet-500 hover:text-violet-600 font-medium">
                          Скачать
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Chat ─── */}
      {activeTab === 'chat' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden flex flex-col" style={{ height: '600px' }}>
          {loadingChat ? <LoadingState /> : !channel ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Чат для этого проекта не создан</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">При назначении команды или сотрудника чат создаётся автоматически</p>
              </div>
              <button onClick={handleCreateChannel} disabled={creatingChannel}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {creatingChannel ? 'Создание...' : 'Создать чат'}
              </button>
            </div>
          ) : (
            <ProjectChatPanel channelId={channel.id} channelName={channel.name || channel.channelName || 'Чат проекта'} projectId={projectId} onFilesSent={handleChatFilesSent} />
          )}
        </div>
      )}

      {/* ─── Photos ─── */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          {/* Upload button */}
          <div className="flex justify-end">
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files)} />
            <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {uploadingPhoto ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {uploadingPhoto ? 'Загрузка...' : 'Добавить фото'}
            </button>
          </div>

          {loadingPhotos ? <LoadingState /> : allPhotos.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Фотографии не загружены</p>
              <p className="text-xs text-gray-400 mt-1">Нажмите «Добавить фото» чтобы загрузить</p>
            </div>
          ) : (
            sites.map((site) => {
              const photos = site.photos || [];
              if (photos.length === 0) return null;
              return (
                <div key={site.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{site.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{photos.length} фото</p>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {photos.map((url, idx) => (
                      <button key={idx} onClick={() => setLightboxPhoto(url)}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 hover:opacity-90 transition-opacity">
                        <img src={url} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover"
                          onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (el.src !== PHOTO_ERROR_PLACEHOLDER) el.src = PHOTO_ERROR_PLACEHOLDER; }} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setLightboxPhoto(null)}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={lightboxPhoto} alt="Просмотр фото" className="max-w-full max-h-full rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ProjectFormModal project={project} onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            addToast('success', 'Проект обновлён');
            api.get(`/projects/${projectId}`).then((r) => setProject(r.data)).catch(() => {});
          }} />
      )}

      {/* Assign Team Modal */}
      {showAssignTeam && (
        <AssignTeamModal
          alreadyAssigned={teamMembers.map((m) => m.teamId)}
          onAssign={async (teamId) => { await handleAssignTeam(teamId); setShowAssignTeam(false); }}
          onClose={() => setShowAssignTeam(false)}
        />
      )}

      {/* Assign Employee Modal */}
      {showAssignEmployee && (
        <AssignEmployeeModal
          alreadyAssigned={assignments.map((a) => Number((a as any).userId || (a as any).user_id || 0)).filter(Boolean)}
          onAssign={async (userId, role) => { await handleAssignEmployee(userId, role); setShowAssignEmployee(false); }}
          onClose={() => setShowAssignEmployee(false)}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          projectId={projectId}
          onCreated={async () => { setShowCreateTask(false); await reloadTasks(); addToast('success', 'Задача создана'); }}
          onClose={() => setShowCreateTask(false)}
        />
      )}

      {/* Upload Document Modal */}
      {showUploadDoc && (
        <UploadDocumentModal
          onUpload={async (file, title, type, description) => {
            await handleUploadDocument(file, title, type, description);
            setShowUploadDoc(false);
          }}
          onClose={() => setShowUploadDoc(false)}
        />
      )}

      {/* Edit Task Modal */}
      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          projectId={projectId}
          onSaved={async () => { setSelectedTask(null); await reloadTasks(); addToast('success', 'Задача обновлена'); }}
          onDeleted={async () => { setSelectedTask(null); await reloadTasks(); addToast('success', 'Задача удалена'); }}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Team Member Detail Modal */}
      {selectedTeamMember && (
        <TeamMemberDetailModal
          member={selectedTeamMember}
          projectId={projectId}
          onRemoved={async () => { setSelectedTeamMember(null); await reloadTeam(); addToast('success', 'Команда удалена из проекта'); }}
          onClose={() => setSelectedTeamMember(null)}
        />
      )}

      {/* Assignment Detail Modal */}
      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          projectId={projectId}
          onRemoved={async () => { setSelectedAssignment(null); await reloadTeam(); addToast('success', 'Сотрудник удалён из проекта'); }}
          onClose={() => setSelectedAssignment(null)}
        />
      )}

      {/* Document Detail Modal */}
      {selectedDocument && (
        <DocumentDetailModal
          document={selectedDocument}
          onDeleted={async () => { setSelectedDocument(null); await reloadDocuments(); addToast('success', 'Документ удалён'); }}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}

/* ─── Helper Components ─── */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-100 text-right">{value}</span>
    </div>
  );
}

function TreeSection({
  icon, label, count, items,
}: {
  icon: string;
  label: string;
  count: number;
  items: { key: string; label: string; sub?: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors rounded-lg text-left"
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">{label}</span>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{count}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div className="ml-9 border-l-2 border-gray-100 dark:border-gray-700 pl-3 py-1 space-y-0.5">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">Нет данных</p>
          ) : items.map((item) => (
            <div key={item.key} className="flex items-center gap-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
              {item.sub && <span className="text-xs text-gray-400">· {item.sub}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-8 text-center text-gray-500 dark:text-gray-400">{text}</div>;
}

/* ─── Modal: Assign Team ─── */

function AssignTeamModal({
  alreadyAssigned, onAssign, onClose,
}: {
  alreadyAssigned: number[];
  onAssign: (teamId: number) => Promise<void>;
  onClose: () => void;
}) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState<number | null>(null);

  useEffect(() => {
    api.get('/teams', { params: { limit: 100 } })
      .then((r) => {
        const d = r.data?.teams || r.data?.data || r.data || [];
        setTeams(Array.isArray(d) ? d : []);
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModalShell title="Назначить команду" onClose={onClose}>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск команды..."
        className="w-full px-3 py-2 mb-4 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100" />
      {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState text="Команды не найдены" /> : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filtered.map((team) => {
            const assigned = alreadyAssigned.includes(team.id);
            return (
              <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <div>
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{team.name}</div>
                  {team.description && <div className="text-xs text-gray-400 mt-0.5">{team.description}</div>}
                  <div className="text-xs text-gray-400 mt-0.5">
                    {team._count?.members ?? team.membersCount ?? 0} участников
                  </div>
                </div>
                {assigned ? (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Назначена</span>
                ) : (
                  <button
                    onClick={async () => { setAssigning(team.id); await onAssign(team.id); setAssigning(null); }}
                    disabled={assigning === team.id}
                    className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                    {assigning === team.id ? '...' : 'Назначить'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}

/* ─── Modal: Assign Employee ─── */

function AssignEmployeeModal({
  alreadyAssigned, onAssign, onClose,
}: {
  alreadyAssigned: number[];
  onAssign: (userId: number, role?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [assigning, setAssigning] = useState<number | null>(null);

  useEffect(() => {
    api.get('/users', { params: { limit: 200 } })
      .then((r) => {
        const d = r.data?.users || r.data?.data || r.data || [];
        setUsers(Array.isArray(d) ? d : []);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModalShell title="Добавить сотрудника" onClose={onClose}>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск сотрудника..."
        className="w-full px-3 py-2 mb-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100" />
      <input value={roleInput} onChange={(e) => setRoleInput(e.target.value)} placeholder="Роль в проекте (необязательно)"
        className="w-full px-3 py-2 mb-4 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100" />
      {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState text="Сотрудники не найдены" /> : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filtered.map((user) => {
            const assigned = alreadyAssigned.map(Number).includes(Number(user.id));
            return (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <div>
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{user.name}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                  {user.position && <div className="text-xs text-gray-400">{user.position}</div>}
                </div>
                {assigned ? (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Добавлен</span>
                ) : (
                  <button
                    onClick={async () => { setAssigning(user.id); await onAssign(user.id, roleInput || undefined); setAssigning(null); }}
                    disabled={assigning === user.id}
                    className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                    {assigning === user.id ? '...' : 'Добавить'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}

/* ─── Modal: Upload Document ─── */

function UploadDocumentModal({
  onUpload, onClose,
}: {
  onUpload: (file: File, title: string, type: string, description: string) => Promise<void>;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    try {
      await onUpload(file, title.trim(), docType, description);
    } catch {
      addToast('error', 'Ошибка при загрузке документа');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalShell title="Загрузить документ" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Название *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Введите название документа"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Тип документа</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100">
            <option value="">— Не выбрано —</option>
            {DOC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Краткое описание"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Файл *</label>
          <input type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200 dark:file:bg-violet-900/40 dark:file:text-violet-300" />
          {file && <p className="text-xs text-gray-400 mt-1">{file.name} · {fmtSize(file.size)}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={uploading || !file || !title.trim()}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {uploading ? 'Загрузка...' : 'Загрузить'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─── Project Chat Panel ─── */

function ProjectChatPanel({ channelId, channelName, projectId, onFilesSent }: { channelId: number; channelName: string; projectId?: number; onFilesSent?: (attachments: any[]) => void }) {
  const connect = useChatStore((s) => s.connect);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const messages = useChatStore((s) => s.messages);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const channelReadAts = useChatStore((s) => s.channelReadAts);
  const setReplyToMessage = useChatStore((s) => s.setReplyToMessage);
  const channels = useChatStore((s) => s.channels);
  const user = useAuthStore((s) => s.user);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(true);
  const prevLenRef = useRef(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<{ id: number; name: string; email: string; role?: string }[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const membersCount = channels.find((c) => c.id === channelId)?.membersCount ?? 0;

  const loadParticipants = useCallback(async () => {
    setLoadingParticipants(true);
    try {
      const r = await api.get(`/chat-channels/${channelId}/members`);
      const list = r.data?.members || r.data?.data || r.data || [];
      setParticipants(Array.isArray(list) ? list.map((m: any) => ({
        id: m.userId || m.user?.id || m.id,
        name: m.user?.name || m.name || `#${m.userId || m.id}`,
        email: m.user?.email || m.email || '',
        role: m.role,
      })) : []);
    } catch { setParticipants([]); }
    finally { setLoadingParticipants(false); }
  }, [channelId]);

  useEffect(() => {
    connect();
    // Ensure channel is in store's channels list, then activate
    fetchChannels(1).then(() => setActiveChannel(channelId));
    return () => { setActiveChannel(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (initialRef.current) {
      initialRef.current = false;
      prevLenRef.current = messages.length;
      bottomRef.current?.scrollIntoView();
      return;
    }
    if (messages.length > prevLenRef.current) {
      prevLenRef.current = messages.length;
      const el = containerRef.current;
      if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isLoadingMessages || !hasMoreMessages || messages.length === 0) return;
    if (el.scrollTop < 200) {
      const prevH = el.scrollHeight;
      fetchMessages(channelId, messages[0]?.id).then(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight - prevH;
          }
        });
      });
    }
  }, [channelId, fetchMessages, hasMoreMessages, isLoadingMessages, messages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const isMessageRead = useCallback((msg: any): boolean => {
    if (msg.senderId !== user?.id) return false;
    const reads = channelReadAts[channelId] || {};
    return Object.entries(reads).some(
      ([uid, readAt]) => Number(uid) !== user?.id && new Date(readAt as string) >= new Date(msg.createdAt)
    );
  }, [channelId, channelReadAts, user?.id]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{channelName}</h3>
          <p className="text-xs text-gray-400">{membersCount} участник{membersCount === 1 ? '' : membersCount >= 2 && membersCount <= 4 ? 'а' : 'ов'}</p>
        </div>
        <button
          onClick={() => { setShowParticipants(true); loadParticipants(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
          title="Участники чата"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Участники
        </button>
      </div>

      {/* Participants panel */}
      {showParticipants && (
        <div className="absolute inset-0 z-10 bg-white dark:bg-gray-800 flex flex-col" style={{ borderRadius: 'inherit' }}>
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Участники чата</h3>
            <button onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {loadingParticipants ? (
              <div className="text-center text-sm text-gray-400 py-8">Загрузка...</div>
            ) : participants.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-8">Нет участников</div>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm font-medium text-violet-700 dark:text-violet-300 shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{p.name}</div>
                      {p.email && <div className="text-xs text-gray-400 truncate">{p.email}</div>}
                    </div>
                    {p.role && (
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full shrink-0">{p.role}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {isLoadingMessages && <div className="text-center text-xs text-gray-400 py-2">Загрузка...</div>}
        {!isLoadingMessages && messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-12">Нет сообщений. Начните диалог!</p>
        )}
        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const showAvatar = !prev || prev.senderId !== msg.senderId;
          return (
            <ChatMessageComponent
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === user?.id}
              showAvatar={showAvatar}
              isRead={isMessageRead(msg)}
              onReply={() => setReplyToMessage(msg)}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput channelId={channelId} projectId={projectId} onFilesSent={onFilesSent} />
    </div>
  );
}

/* ─── Modal: Create Task ─── */

function CreateTaskModal({
  projectId, onCreated, onClose,
}: {
  projectId: number;
  onCreated: () => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(2);
  const [status, setStatus] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState<number | ''>('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    api.get('/users', { params: { limit: 200 } })
      .then((r) => { const d = r.data?.users || r.data?.data || r.data || []; setUsers(Array.isArray(d) ? d : []); })
      .catch(() => setUsers([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post('/tasks', {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        priority,
        status,
        dueDate: dueDate || undefined,
        assignedToUserId: assignedToUserId || undefined,
      });
      await onCreated();
    } catch {
      addToast('error', 'Не удалось создать задачу');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Создать задачу" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Название *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Введите название задачи"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Краткое описание"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Исполнитель</label>
          <select value={assignedToUserId} onChange={(e) => setAssignedToUserId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100">
            <option value="">— Не назначен —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Приоритет</label>
            <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100">
              <option value={1}>Низкий</option>
              <option value={2}>Средний</option>
              <option value={3}>Высокий</option>
              <option value={4}>Критический</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Статус</label>
            <select value={status} onChange={(e) => setStatus(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100">
              <option value={0}>Новая</option>
              <option value={1}>В работе</option>
              <option value={2}>На проверке</option>
              <option value={3}>Готово</option>
              <option value={4}>Отменена</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Срок выполнения</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={saving || !title.trim()}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─── Modal: Edit Task ─── */

function EditTaskModal({
  task, projectId, onSaved, onDeleted, onClose,
}: {
  task: Task;
  projectId: number;
  onSaved: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status ?? 0);
  const [priority, setPriority] = useState(task.priority ?? 2);
  const [dueDate, setDueDate] = useState(task.dueDate || task.due_date ? (task.dueDate || task.due_date || '').slice(0, 10) : '');
  const [assignedToUserId, setAssignedToUserId] = useState<number | ''>(task.assignees?.[0]?.userId || '');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    api.get('/users', { params: { limit: 200 } })
      .then((r) => { const d = r.data?.users || r.data?.data || r.data || []; setUsers(Array.isArray(d) ? d : []); })
      .catch(() => setUsers([]));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.put(`/tasks/${task.id}`, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
        assignedToUserId: assignedToUserId || undefined,
      });
      await onSaved();
    } catch {
      addToast('error', 'Не удалось сохранить задачу');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      await onDeleted();
    } catch {
      addToast('error', 'Не удалось удалить задачу');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalShell title="Редактировать задачу" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Название *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Исполнитель</label>
          <select value={assignedToUserId} onChange={(e) => setAssignedToUserId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100">
            <option value="">— Не назначен —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Статус</label>
            <select value={status} onChange={(e) => setStatus(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100">
              <option value={0}>Новая</option>
              <option value={1}>В работе</option>
              <option value={2}>На проверке</option>
              <option value={3}>Готово</option>
              <option value={4}>Отменена</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Приоритет</label>
            <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100">
              <option value={1}>Низкий</option>
              <option value={2}>Средний</option>
              <option value={3}>Высокий</option>
              <option value={4}>Критический</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Срок выполнения</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100" />
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Удалить задачу?</span>
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg disabled:opacity-50">
                {deleting ? '...' : 'Да'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Нет
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-500 hover:text-red-600 transition-colors">
              Удалить задачу
            </button>
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={saving || !title.trim()}
              className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─── Modal: Team Member Detail ─── */

function TeamMemberDetailModal({
  member, projectId, onRemoved, onClose,
}: {
  member: TeamMember;
  projectId: number;
  onRemoved: () => Promise<void>;
  onClose: () => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/projects/${projectId}/team/${member.teamId}`);
      await onRemoved();
    } catch {
      addToast('error', 'Не удалось удалить команду');
    } finally {
      setRemoving(false);
    }
  };

  const teamName = member.team?.name || member.teamName || `Команда #${member.teamId}`;

  return (
    <ModalShell title="Команда" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-base font-semibold text-violet-700 dark:text-violet-300 shrink-0">
            {teamName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">{teamName}</div>
            {member.isPrimary && (
              <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded-full">Основная команда</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Дата назначения</span>
            <span className="text-gray-800 dark:text-gray-100">{fmt(member.assignedAt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">ID команды</span>
            <span className="text-gray-800 dark:text-gray-100">#{member.teamId}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Удалить команду из проекта?</span>
              <button onClick={handleRemove} disabled={removing}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg disabled:opacity-50">
                {removing ? '...' : 'Да'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Нет
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:text-red-600 transition-colors">
              Убрать из проекта
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Modal: Assignment Detail ─── */

function AssignmentDetailModal({
  assignment, projectId, onRemoved, onClose,
}: {
  assignment: Assignment;
  projectId: number;
  onRemoved: () => Promise<void>;
  onClose: () => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/projects/${projectId}/assignments/${assignment.id}`);
      await onRemoved();
    } catch {
      addToast('error', 'Не удалось удалить сотрудника');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <ModalShell title="Сотрудник" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-base font-semibold text-violet-700 dark:text-violet-300 shrink-0">
            {(assignment.userName || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">{assignment.userName || `#${assignment.userId}`}</div>
            {assignment.userEmail && <div className="text-xs text-gray-400">{assignment.userEmail}</div>}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Роль в проекте</span>
            <span className="text-gray-800 dark:text-gray-100">{assignment.roleOnProject || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Статус</span>
            <span className={`text-sm font-medium ${assignment.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {assignment.isActive ? 'Активен' : 'Неактивен'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Назначен</span>
            <span className="text-gray-800 dark:text-gray-100">{fmt(assignment.assignedAt)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Удалить сотрудника из проекта?</span>
              <button onClick={handleRemove} disabled={removing}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg disabled:opacity-50">
                {removing ? '...' : 'Да'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Нет
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:text-red-600 transition-colors">
              Убрать из проекта
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Modal: Document Detail ─── */

function DocumentDetailModal({
  document, onDeleted, onClose,
}: {
  document: Document;
  onDeleted: () => Promise<void>;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/documents/${document.id}`);
      await onDeleted();
    } catch {
      addToast('error', 'Не удалось удалить документ');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalShell title="Документ" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-800 dark:text-gray-100 break-words">{document.title}</div>
            {document.documentType && (
              <div className="text-xs text-gray-400 mt-0.5">{DOC_TYPE_LABELS[document.documentType] || document.documentType}</div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Размер</span>
            <span className="text-gray-800 dark:text-gray-100">{fmtSize(document.fileSize) || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Дата загрузки</span>
            <span className="text-gray-800 dark:text-gray-100">{fmt(document.createdAt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Статус</span>
            <span className="text-gray-800 dark:text-gray-100">{document.status || '—'}</span>
          </div>
        </div>
        {document.fileUrl && (
          <a href={document.fileUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Скачать файл
          </a>
        )}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Удалить документ?</span>
              <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg disabled:opacity-50">
                {deleting ? '...' : 'Да'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Нет
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:text-red-600 transition-colors">
              Удалить документ
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Modal Shell ─── */

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
