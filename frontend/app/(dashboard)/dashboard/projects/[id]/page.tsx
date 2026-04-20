'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ProjectFormModal from '@/components/dashboard/ProjectFormModal';
import { useToastStore } from '@/stores/toastStore';

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

interface Task {
  id: number;
  title: string;
  status?: number;
  priority?: number;
  dueDate?: string;
  due_date?: string;
  assignees?: { userId: number; userName?: string }[];
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

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: 'Договор', invoice: 'Счёт', report: 'Отчёт',
  permit: 'Разрешение', blueprint: 'Чертёж', other: 'Прочее',
};

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

  /* Tab-specific state */
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [channel, setChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  /* ─── Load project ─── */
  useEffect(() => {
    api.get(`/projects/${projectId}`)
      .then((r) => setProject(r.data))
      .catch(() => router.push('/dashboard/projects'))
      .finally(() => setLoadingProject(false));
  }, [projectId, router]);

  /* ─── Load tab data ─── */
  useEffect(() => {
    if (activeTab === 'team' && teamMembers.length === 0 && !loadingTeam) {
      setLoadingTeam(true);
      Promise.all([
        api.get(`/projects/${projectId}/team`).catch(() => ({ data: [] })),
        api.get(`/projects/${projectId}/assignments`).catch(() => ({ data: { assignments: [], data: [] } })),
      ]).then(([teamRes, assignRes]) => {
        setTeamMembers(Array.isArray(teamRes.data) ? teamRes.data : teamRes.data?.teams || []);
        const aData = assignRes.data?.assignments || assignRes.data?.data || assignRes.data || [];
        setAssignments(Array.isArray(aData) ? aData : []);
      }).finally(() => setLoadingTeam(false));
    }

    if (activeTab === 'documents' && documents.length === 0 && !loadingDocs) {
      setLoadingDocs(true);
      api.get('/documents', { params: { projectId, limit: 100 } })
        .then((r) => {
          const d = r.data?.documents || r.data?.data || r.data || [];
          setDocuments(Array.isArray(d) ? d : []);
        })
        .catch(() => setDocuments([]))
        .finally(() => setLoadingDocs(false));
    }

    if (activeTab === 'tasks' && tasks.length === 0 && !loadingTasks) {
      setLoadingTasks(true);
      api.get('/tasks', { params: { projectId, limit: 100 } })
        .then((r) => {
          const t = r.data?.tasks || r.data?.data || r.data || [];
          setTasks(Array.isArray(t) ? t : []);
        })
        .catch(() => setTasks([]))
        .finally(() => setLoadingTasks(false));
    }

    if (activeTab === 'chat' && !channel && !loadingChat) {
      loadOrCreateChannel();
    }

    if (activeTab === 'photos' && sites.length === 0 && !loadingPhotos) {
      setLoadingPhotos(true);
      api.get(`/projects/${projectId}/construction-sites`, { params: { limit: 100 } })
        .then((r) => {
          const s = r.data?.sites || r.data?.data || r.data || [];
          setSites(Array.isArray(s) ? s : []);
        })
        .catch(() => setSites([]))
        .finally(() => setLoadingPhotos(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ─── Chat helpers ─── */
  const loadMessages = useCallback(async (channelId: number) => {
    try {
      const r = await api.get(`/chat-channels/${channelId}/messages`, { params: { limit: 50 } });
      const raw = r.data?.data || r.data?.messages || (Array.isArray(r.data) ? r.data : []);
      const msgs: ChatMessage[] = Array.isArray(raw) ? raw : [];
      setMessages(msgs.slice().reverse());
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      setMessages([]);
    }
  }, []);

  const loadOrCreateChannel = useCallback(async () => {
    setLoadingChat(true);
    try {
      const r = await api.get('/chat-channels', { params: { limit: 200 } });
      const channels: any[] = r.data?.channels || r.data?.data || r.data || [];
      const found = channels.find((c: any) => c.projectId === projectId || c.project_id === projectId);
      if (found) {
        setChannel(found);
        await loadMessages(found.id);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingChat(false);
    }
  }, [projectId, loadMessages]);

  const handleCreateChannel = async () => {
    if (!project) return;
    setCreatingChannel(true);
    try {
      const r = await api.post('/chat-channels', {
        name: `Проект: ${project.name}`,
        channelType: 'group',
        projectId,
      });
      const created = r.data;
      setChannel(created);
      setMessages([]);
      addToast('success', 'Чат для проекта создан');
    } catch {
      addToast('error', 'Не удалось создать чат');
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleSendMessage = async () => {
    if (!channel || !chatInput.trim()) return;
    setSendingMsg(true);
    try {
      await api.post(`/chat-channels/${channel.id}/messages`, { messageText: chatInput.trim() });
      setChatInput('');
      await loadMessages(channel.id);
    } catch {
      addToast('error', 'Не удалось отправить сообщение');
    } finally {
      setSendingMsg(false);
    }
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

  const allPhotos = sites.flatMap((s) =>
    (s.photos || []).map((url) => ({ url, siteName: s.name }))
  );

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:justify-between sm:items-start mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
              {project.name}
            </h1>
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
          <Link href="/dashboard/projects" className="text-sm text-violet-500 hover:text-violet-600">
            &larr; Назад
          </Link>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Редактировать
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── TAB: Overview ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Основная информация</h2>
            <InfoRow label="Статус" value={
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            } />
            <InfoRow label="Приоритет" value={
              <span className={`text-sm font-medium ${priority.color}`}>{priority.label}</span>
            } />
            <InfoRow label="Руководитель" value={project.projectManager?.name || '—'} />
            <InfoRow label="Клиент" value={project.clientName || '—'} />
            <InfoRow label="Адрес" value={project.address || '—'} />
          </div>

          {/* Dates & Budget */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Сроки и бюджет</h2>
            <InfoRow label="Дата начала" value={fmt(project.startDate)} />
            <InfoRow label="Плановое окончание" value={fmt(project.plannedEndDate)} />
            <InfoRow label="Фактическое окончание" value={fmt(project.actualEndDate)} />
            <InfoRow label="Бюджет" value={fmtMoney(project.budget)} />
            <InfoRow label="Фактические затраты" value={fmtMoney(project.actualCost)} />
            {project.budget && project.actualCost != null && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Освоение бюджета</span>
                  <span>{Math.min(100, Math.round((project.actualCost / project.budget) * 100))}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((project.actualCost! / project.budget!) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: Tasks ─── */}
      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Задачи проекта</h2>
            <span className="text-xs text-gray-400">{tasks.length} задач</span>
          </div>
          {loadingTasks ? (
            <LoadingState />
          ) : tasks.length === 0 ? (
            <EmptyState text="Задачи не найдены" />
          ) : (
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
                  const taskStatus = TASK_STATUS[t.status ?? 0] || TASK_STATUS[0];
                  const taskPriority = TASK_PRIORITY[t.priority ?? 2] || TASK_PRIORITY[2];
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                      <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-100">{t.title}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${taskStatus.color}`}>
                          {taskStatus.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-medium ${taskPriority.color}`}>{taskPriority.label}</span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">
                        {fmt(t.dueDate || t.due_date)}
                      </td>
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

      {/* ─── TAB: Team ─── */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {loadingTeam ? (
            <LoadingState />
          ) : (
            <>
              {/* Teams */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Команды</h2>
                </div>
                {teamMembers.length === 0 ? (
                  <EmptyState text="Команды не назначены" />
                ) : (
                  <table className="table-auto w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                        <th className="py-3 px-4 text-left font-semibold">Команда</th>
                        <th className="py-3 px-4 text-left font-semibold">Дата назначения</th>
                        <th className="py-3 px-4 text-left font-semibold">Основная</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                      {teamMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                          <td className="py-2.5 px-4 text-gray-800 dark:text-gray-100">
                            {m.teamName || `Команда #${m.teamId}`}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{fmt(m.assignedAt)}</td>
                          <td className="py-2.5 px-4">
                            {m.isPrimary && (
                              <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded-full">
                                Основная
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Employees */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Сотрудники</h2>
                </div>
                {assignments.length === 0 ? (
                  <EmptyState text="Сотрудники не назначены" />
                ) : (
                  <table className="table-auto w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                        <th className="py-3 px-4 text-left font-semibold">Сотрудник</th>
                        <th className="py-3 px-4 text-left font-semibold">Роль в проекте</th>
                        <th className="py-3 px-4 text-left font-semibold">Статус</th>
                        <th className="py-3 px-4 text-left font-semibold">Назначен</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                      {assignments.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-gray-800 dark:text-gray-100">
                              {a.userName || `Пользователь #${a.userId}`}
                            </div>
                            {a.userEmail && (
                              <div className="text-xs text-gray-400">{a.userEmail}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">
                            {a.roleOnProject || '—'}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              a.isActive
                                ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                                : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                            }`}>
                              {a.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{fmt(a.assignedAt)}</td>
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

      {/* ─── TAB: Documents ─── */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Документы проекта</h2>
          </div>
          {loadingDocs ? (
            <LoadingState />
          ) : documents.length === 0 ? (
            <EmptyState text="Документы не найдены" />
          ) : (
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Название</th>
                  <th className="py-3 px-4 text-left font-semibold">Тип</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                  <th className="py-3 px-4 text-left font-semibold">Дата</th>
                  <th className="py-3 px-4 text-center font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                    <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-100">{doc.title}</td>
                    <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">
                      {DOC_TYPE_LABELS[doc.documentType || ''] || doc.documentType || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{doc.status || '—'}</td>
                    <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{fmt(doc.createdAt)}</td>
                    <td className="py-2.5 px-4 text-center">
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-violet-500 hover:text-violet-600 font-medium"
                        >
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

      {/* ─── TAB: Chat ─── */}
      {activeTab === 'chat' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden flex flex-col" style={{ height: '520px' }}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">
              {channel ? (channel.name || channel.channelName || 'Чат проекта') : 'Диалог'}
            </h2>
            {channel && (
              <span className="text-xs text-gray-400">{channel.membersCount ?? 0} участников</span>
            )}
          </div>

          {loadingChat ? (
            <LoadingState />
          ) : !channel ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Чат для этого проекта не создан</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Создайте чат, чтобы общаться с командой</p>
              </div>
              <button
                onClick={handleCreateChannel}
                disabled={creatingChannel}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {creatingChannel ? 'Создание...' : 'Создать чат'}
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-gray-400 mt-8">Нет сообщений. Начните диалог!</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                        {(msg.user?.name || msg.senderName || '?')[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {msg.user?.name || msg.senderName || 'Пользователь'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{msg.messageText}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-gray-100 dark:border-gray-700 p-3 flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="Введите сообщение..."
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100 placeholder-gray-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMsg || !chatInput.trim()}
                  className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {sendingMsg ? '...' : 'Отправить'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB: Photos ─── */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          {loadingPhotos ? (
            <LoadingState />
          ) : sites.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Строительные объекты не найдены</p>
            </div>
          ) : allPhotos.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Фотографии не загружены</p>
              <p className="text-xs text-gray-400 mt-1">
                Строительные объекты: {sites.map((s) => s.name).join(', ')}
              </p>
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
                      <button
                        key={idx}
                        onClick={() => setLightboxPhoto(url)}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={url}
                          alt={`Фото ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '';
                            (e.currentTarget.parentElement as HTMLElement).classList.add('flex', 'items-center', 'justify-center');
                          }}
                        />
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
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setLightboxPhoto(null)}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxPhoto}
            alt="Просмотр фото"
            className="max-w-full max-h-full rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ProjectFormModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            addToast('success', 'Проект обновлён');
            api.get(`/projects/${projectId}`).then((r) => setProject(r.data)).catch(() => {});
          }}
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
      <span className="text-sm text-gray-800 dark:text-gray-100 text-right">
        {typeof value === 'string' || typeof value === 'number' ? value : value}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-gray-500 dark:text-gray-400">{text}</div>
  );
}
