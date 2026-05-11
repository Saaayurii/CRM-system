'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import ProjectFormModal from '@/components/dashboard/ProjectFormModal';
import { useToastStore } from '@/stores/toastStore';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import ChatInput from '@/components/chat/ChatInput';
import ChatMessageComponent from '@/components/chat/ChatMessage';
import FilePreviewModal from '@/components/ui/FilePreviewModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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
  projectManagerId?: number;
  projectManager?: { id: number; name: string; email: string };
  settings?: Record<string, any>;
  updatedAt?: string;
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
  userAvatarUrl?: string;
  roleOnProject?: string;
  isActive?: boolean;
  assignedAt?: string;
  availability?: number;
  user?: { id: number; name: string; email: string; avatarUrl?: string };
}

interface Document {
  id: number;
  title: string;
  documentType?: string;
  status?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  createdAt: string;
}

interface ChatChannel {
  id: number;
  name?: string;
  channelName?: string;
  projectId?: number;
  membersCount?: number;
  avatarUrl?: string;
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

// Normalize upload URLs:
// - Full HTTP URL with internal/external hostname → extract pathname
// - Relative path starting with '/' → keep as-is
// - Bare filename (UUID.ext) → prepend /uploads/chat/
function normalizePhotoUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (typeof window !== 'undefined' && parsed.origin === window.location.origin) return url;
      return parsed.pathname;
    } catch {
      return url;
    }
  }
  if (url.startsWith('/')) return url;
  return `/uploads/chat/${url}`;
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

const ROLE_NAMES: Record<number, string> = {
  1: 'Супер Администратор', 2: 'Администратор', 3: 'HR Менеджер',
  4: 'Менеджер проектов', 5: 'Прораб', 6: 'Снабженец',
  7: 'Кладовщик', 8: 'Бухгалтер', 9: 'Инспектор', 10: 'Рабочий',
  11: 'Поставщик', 12: 'Подрядчик', 13: 'Наблюдатель', 14: 'Аналитик',
};

async function enrichAssignments(assignments: Assignment[]): Promise<Assignment[]> {
  if (!assignments.length) return assignments;

  // First pass: extract from embedded user object (returned by backend include: { user: true })
  const preEnriched = assignments.map((a) => {
    if (a.user) {
      return {
        ...a,
        userName: a.userName || a.user.name,
        userEmail: a.userEmail || a.user.email,
        userAvatarUrl: a.userAvatarUrl || a.user.avatarUrl,
      };
    }
    return a;
  });

  // Second pass: fetch remaining unknowns from /users
  const stillMissing = preEnriched.filter((a) => !a.userName);
  if (!stillMissing.length) return preEnriched;

  try {
    const r = await api.get('/users', { params: { limit: 500 } });
    const users: UserOption[] = r.data?.users || r.data?.data || r.data || [];
    const map = new Map(users.map((u) => [u.id, u]));

    const missingIds = stillMissing.filter((a) => !map.has(a.userId)).map((a) => a.userId);
    if (missingIds.length > 0) {
      await Promise.allSettled(
        missingIds.map(async (id) => {
          try {
            const res = await api.get(`/users/${id}`);
            const u = res.data?.user || res.data;
            if (u?.id) map.set(u.id, u);
          } catch { /* ignore */ }
        })
      );
    }

    return preEnriched.map((a) => {
      if (a.userName) return a;
      const u = map.get(a.userId);
      if (!u) return a;
      return {
        ...a,
        userName: u.name,
        userEmail: u.email,
        userAvatarUrl: (u as any).avatarUrl,
        roleOnProject: a.roleOnProject || (u.roleId ? ROLE_NAMES[u.roleId] : undefined),
        availability: (u as any).availability ?? a.availability,
      };
    });
  } catch {
    return preEnriched;
  }
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
  { key: 'finance', label: 'Финансы' },
  { key: 'resources', label: 'Ресурсы' },
  { key: 'chat', label: 'Диалог' },
  { key: 'photos', label: 'Медиа' },
  { key: 'notes', label: 'Заметки' },
] as const;

interface MaterialRequest {
  id: number;
  requestNumber: string;
  status: number;
  priority: number;
  requestDate: string;
  neededByDate?: string;
  purpose?: string;
  requestedBy?: { id: number; name: string; email: string };
  items?: { id: number; material?: { name: string; unit: string }; requestedQuantity: number }[];
}

interface SupplierOrder {
  id: number;
  orderNumber: string;
  status: number;
  orderDate: string;
  totalAmount?: number;
  currency?: string;
  supplier?: { id: number; name: string };
  items?: { id: number; quantity: number }[];
}

interface Equipment {
  id: number;
  name: string;
  equipmentType?: string;
  status?: number;
  serialNumber?: string;
  model?: string;
}

const MATERIAL_REQUEST_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  1: { label: 'На рассмотрении', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  2: { label: 'Согласована', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  3: { label: 'Заказана', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  4: { label: 'Частично', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  5: { label: 'Выполнена', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  6: { label: 'Отклонена', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const SUPPLIER_ORDER_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Черновик', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  1: { label: 'Отправлен', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  2: { label: 'Подтверждён', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  3: { label: 'Частично', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  4: { label: 'Доставлен', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  5: { label: 'Отменён', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const EQUIPMENT_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Доступно', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  1: { label: 'В работе', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  2: { label: 'На обслуживании', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  3: { label: 'Неисправно', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  vehicle: 'Транспорт',
  tool: 'Инструмент',
  machinery: 'Спецтехника',
};

type TabKey = typeof TABS[number]['key'];

function TabsNav({ activeTab, onSelect }: { activeTab: TabKey; onSelect: (k: TabKey) => void }) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeBtn = nav.querySelector('[data-active="true"]') as HTMLElement | null;
    if (!activeBtn) return;
    const left = activeBtn.offsetLeft - nav.offsetWidth / 2 + activeBtn.offsetWidth / 2;
    nav.scrollTo({ left, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav ref={navRef} className="flex gap-1 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.key}
            data-active={activeTab === t.key ? 'true' : 'false'}
            onClick={() => onSelect(t.key)}
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
  );
}

interface Payment {
  id: number;
  paymentNumber: string;
  amount: number;
  currency?: string;
  paymentDate: string;
  paymentType?: string;
  category?: string;
  status?: number;
  description?: string;
  projectId?: number;
}

interface Budget {
  id: number;
  budgetName: string;
  totalBudget: number;
  allocatedAmount?: number;
  spentAmount?: number;
  budgetPeriod?: string;
  startDate?: string;
  endDate?: string;
  status?: number;
  projectId?: number;
}

interface Act {
  id: number;
  actNumber: string;
  actType?: string;
  actDate: string;
  totalAmount?: number;
  currency?: string;
  status?: number;
  description?: string;
  projectId?: number;
}

const PAYMENT_DIRECTION = [
  { value: 'incoming', label: '↑ Поступление' },
  { value: 'outgoing', label: '↓ Расход' },
  { value: 'advance', label: '→ Аванс' },
  { value: 'refund', label: '↩ Возврат' },
];

const PAYMENT_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Ожидание', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  1: { label: 'Выполнен', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  2: { label: 'Отменён', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
  3: { label: 'Возврат', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
};

const ACT_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Черновик', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'На подписи', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  2: { label: 'Подписан', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  3: { label: 'Оспорен', color: 'bg-orange-500/20 text-orange-700 dark:text-orange-400' },
  4: { label: 'Отменён', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

const BUDGET_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Черновик', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'Активный', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  2: { label: 'Закрыт', color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400' },
};

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

function fmtMoney(n?: number) {
  if (n == null) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function paymentIsIncome(p: { paymentType?: string }): boolean {
  return /^(incoming|income|поступление|приход|advance|аванс)$/i.test(p.paymentType?.trim() || '')
    || /incoming|income|поступление|приход/i.test(p.paymentType || '');
}

function paymentIsExpense(p: { paymentType?: string }): boolean {
  return /^(outgoing|expense|расход|refund|возврат)$/i.test(p.paymentType?.trim() || '')
    || /outgoing|expense|расход/i.test(p.paymentType || '');
}

function FinanceViewToggle({ mode, onChange }: { mode: 'table' | 'grid'; onChange: (m: 'table' | 'grid') => void }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
      <button onClick={() => onChange('table')} title="Таблица"
        className={`p-1.5 rounded transition-colors ${mode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>
        <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      <button onClick={() => onChange('grid')} title="Карточки"
        className={`p-1.5 rounded transition-colors ${mode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>
        <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
    </div>
  );
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
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const fetchProjectChannels = useChatStore((s) => s.fetchProjectChannels);
  const createChannelInStore = useChatStore((s) => s.createChannel);

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
const [pdfLoading, setPdfLoading] = useState(false);

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
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('');
  const [taskViewMode, setTaskViewMode] = useState<'table'|'grid'>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('projTaskView') as 'table'|'grid') || 'table' : 'table'
  );
  const [teamViewMode, setTeamViewMode] = useState<'table'|'grid'>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('projTeamView') as 'table'|'grid') || 'table' : 'table'
  );

  /* Documents search */
  const [docSearch, setDocSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [docViewMode, setDocViewMode] = useState<'table'|'grid'>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('projDocView') as 'table'|'grid') || 'table' : 'table'
  );

  /* Photos filter & sort */
  const [photoSiteFilter, setPhotoSiteFilter] = useState('');
  const [photoSort, setPhotoSort] = useState('default');

  /* Team modals */
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  /* Document modal */
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  /* Chat tab */
  const [projectChannels, setProjectChannels] = useState<ChatChannel[]>([]);
  const [activeProjectChannelId, setActiveProjectChannelId] = useState<number | null>(null);
  const [channelChecked, setChannelChecked] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  /* Photos tab */
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  /* Notes tab */
  const [notesText, setNotesText] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* Finance tab */
  const [financePayments, setFinancePayments] = useState<Payment[]>([]);
  const [financeBudgets, setFinanceBudgets] = useState<Budget[]>([]);
  const [financeActs, setFinanceActs] = useState<Act[]>([]);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [financeLoaded, setFinanceLoaded] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showActModal, setShowActModal] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [closingProject, setClosingProject] = useState(false);
  const [editingAct, setEditingAct] = useState<Act | null>(null);
  const [savingFinance, setSavingFinance] = useState(false);
  const [financeViewMode, setFinanceViewMode] = useState<'table' | 'grid'>(() =>
    typeof window !== 'undefined' ? ((localStorage.getItem('financeViewMode') as 'table' | 'grid') || 'table') : 'table'
  );
  const [budgetsViewMode, setBudgetsViewMode] = useState<'table' | 'grid'>(() =>
    typeof window !== 'undefined' ? ((localStorage.getItem('budgetsViewMode') as 'table' | 'grid') || 'table') : 'table'
  );
  const [actsViewMode, setActsViewMode] = useState<'table' | 'grid'>(() =>
    typeof window !== 'undefined' ? ((localStorage.getItem('actsViewMode') as 'table' | 'grid') || 'table') : 'table'
  );

  /* Resources tab */
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [resourceSubTab, setResourceSubTab] = useState<'materials' | 'orders' | 'equipment'>('materials');
  const [savingResource, setSavingResource] = useState(false);
  /* Material request modal */
  const [showMRModal, setShowMRModal] = useState(false);
  const [editingMR, setEditingMR] = useState<MaterialRequest | null>(null);
  /* Supplier order modal */
  const [showSOModal, setShowSOModal] = useState(false);
  const [editingSO, setEditingSO] = useState<SupplierOrder | null>(null);
  const [suppliersList, setSuppliersList] = useState<{ id: number; name: string }[]>([]);
  /* Equipment modal */
  const [showEqModal, setShowEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);

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
      .then((r) => { setProject(r.data); setNotesText(r.data?.settings?.notes || ''); })
      .catch(() => router.push('/dashboard/projects'))
      .finally(() => setLoadingProject(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* ─── Inactivity check — show close modal after 14 days without updates ─── */
  useEffect(() => {
    if (!project) return;
    if (project.status === 3 || project.status === 4) return; // already completed / cancelled
    const dismissKey = `project_inactive_dismissed_${project.id}`;
    const dismissed = localStorage.getItem(dismissKey);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;
    if (!project.updatedAt) return;
    const daysSince = (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= 14) setShowInactiveModal(true);
  }, [project]);

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
      const raw: Assignment[] = Array.isArray(aData) ? aData : [];
      setAssignments(await enrichAssignments(raw));
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

  const reloadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoadingTasks(true);
    try {
      const r = await api.get('/tasks', { params: { projectId, limit: 100 } });
      const t = r.data?.tasks || r.data?.data || r.data || [];
      setTasks(Array.isArray(t) ? t : []);
      setTasksLoaded(true);
    } catch {
      if (!silent) setTasks([]);
    } finally {
      if (!silent) setLoadingTasks(false);
    }
  }, [projectId]);

  const reloadResources = useCallback(async () => {
    setLoadingResources(true);
    try {
      const [matRes, ordersRes, equipRes, suppRes] = await Promise.allSettled([
        api.get('/material-requests', { params: { projectId, limit: 200 } }),
        api.get('/supplier-orders', { params: { projectId, limit: 200 } }),
        api.get('/equipment', { params: { limit: 200 } }),
        api.get('/suppliers', { params: { limit: 500 } }),
      ]);
      setMaterialRequests(matRes.status === 'fulfilled'
        ? (matRes.value.data?.materialRequests || matRes.value.data?.data || matRes.value.data || [])
        : []);
      setSupplierOrders(ordersRes.status === 'fulfilled'
        ? (ordersRes.value.data?.orders || ordersRes.value.data?.data || ordersRes.value.data || [])
        : []);
      setEquipmentList(equipRes.status === 'fulfilled'
        ? (equipRes.value.data?.equipment || equipRes.value.data?.data || equipRes.value.data || [])
        : []);
      if (suppRes.status === 'fulfilled') {
        const s = suppRes.value.data?.suppliers || suppRes.value.data?.data || suppRes.value.data || [];
        setSuppliersList(Array.isArray(s) ? s.map((x: any) => ({ id: x.id, name: x.name })) : []);
      }
      setResourcesLoaded(true);
    } finally {
      setLoadingResources(false);
    }
  }, [projectId]);

  const handleSaveMaterialRequest = useCallback(async (data: Record<string, unknown>) => {
    setSavingResource(true);
    try {
      if (editingMR) {
        await api.put(`/material-requests/${editingMR.id}`, data);
        addToast('success', 'Заявка обновлена');
      } else {
        const num = `MR-${Date.now()}`;
        await api.post('/material-requests', { ...data, projectId, requestNumber: num, accountId: 0 });
        addToast('success', 'Заявка создана');
      }
      setShowMRModal(false);
      setEditingMR(null);
      await reloadResources();
    } catch { addToast('error', 'Ошибка при сохранении заявки'); }
    finally { setSavingResource(false); }
  }, [editingMR, projectId, addToast, reloadResources]);

  const handleDeleteMaterialRequest = useCallback(async (id: number) => {
    if (!confirm('Удалить материальную заявку?')) return;
    try {
      await api.delete(`/material-requests/${id}`);
      addToast('success', 'Заявка удалена');
      setMaterialRequests((p) => p.filter((r) => r.id !== id));
    } catch { addToast('error', 'Ошибка при удалении'); }
  }, [addToast]);

  const handleSaveSupplierOrder = useCallback(async (data: Record<string, unknown>) => {
    setSavingResource(true);
    try {
      if (editingSO) {
        await api.put(`/supplier-orders/${editingSO.id}`, data);
        addToast('success', 'Заказ обновлён');
      } else {
        const num = `SO-${Date.now()}`;
        await api.post('/supplier-orders', { ...data, projectId, orderNumber: num, accountId: 0 });
        addToast('success', 'Заказ создан');
      }
      setShowSOModal(false);
      setEditingSO(null);
      await reloadResources();
    } catch { addToast('error', 'Ошибка при сохранении заказа'); }
    finally { setSavingResource(false); }
  }, [editingSO, projectId, addToast, reloadResources]);

  const handleDeleteSupplierOrder = useCallback(async (id: number) => {
    if (!confirm('Удалить заказ поставщику?')) return;
    try {
      await api.delete(`/supplier-orders/${id}`);
      addToast('success', 'Заказ удалён');
      setSupplierOrders((p) => p.filter((o) => o.id !== id));
    } catch { addToast('error', 'Ошибка при удалении'); }
  }, [addToast]);

  const handleSaveEquipment = useCallback(async (data: Record<string, unknown>) => {
    setSavingResource(true);
    try {
      if (editingEq) {
        await api.put(`/equipment/${editingEq.id}`, data);
        addToast('success', 'Оборудование обновлено');
      } else {
        await api.post('/equipment', { ...data, accountId: 0 });
        addToast('success', 'Оборудование добавлено');
      }
      setShowEqModal(false);
      setEditingEq(null);
      await reloadResources();
    } catch { addToast('error', 'Ошибка при сохранении'); }
    finally { setSavingResource(false); }
  }, [editingEq, addToast, reloadResources]);

  const handleDeleteEquipment = useCallback(async (id: number) => {
    if (!confirm('Удалить оборудование?')) return;
    try {
      await api.delete(`/equipment/${id}`);
      addToast('success', 'Оборудование удалено');
      setEquipmentList((p) => p.filter((e) => e.id !== id));
    } catch { addToast('error', 'Ошибка при удалении'); }
  }, [addToast]);

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

  const reloadFinance = useCallback(async () => {
    setLoadingFinance(true);
    try {
      const [paymentsRes, budgetsRes, actsRes] = await Promise.all([
        api.get('/payments', { params: { projectId, limit: 500 } }).catch(() => ({ data: {} })),
        api.get('/budgets', { params: { projectId, limit: 500 } }).catch(() => ({ data: {} })),
        api.get('/acts', { params: { projectId, limit: 500 } }).catch(() => ({ data: {} })),
      ]);
      setFinancePayments(paymentsRes.data?.data || paymentsRes.data?.payments || []);
      setFinanceBudgets(budgetsRes.data?.data || budgetsRes.data?.budgets || []);
      setFinanceActs(actsRes.data?.data || actsRes.data?.acts || []);
      setFinanceLoaded(true);
    } finally {
      setLoadingFinance(false);
    }
  }, [projectId]);

  const handleSavePayment = useCallback(async (data: Omit<Payment, 'id'>) => {
    setSavingFinance(true);
    try {
      if (editingPayment) {
        await api.put(`/payments/${editingPayment.id}`, data);
        addToast('success', 'Платёж обновлён');
      } else {
        await api.post('/payments', { ...data, projectId });
        addToast('success', 'Платёж создан');
      }
      setShowPaymentModal(false);
      setEditingPayment(null);
      await reloadFinance();
    } catch {
      addToast('error', 'Ошибка при сохранении платежа');
    } finally {
      setSavingFinance(false);
    }
  }, [editingPayment, projectId, addToast, reloadFinance]);

  const handleDeletePayment = useCallback(async (id: number) => {
    if (!confirm('Удалить платёж?')) return;
    try {
      await api.delete(`/payments/${id}`);
      addToast('success', 'Платёж удалён');
      await reloadFinance();
    } catch {
      addToast('error', 'Ошибка при удалении');
    }
  }, [addToast, reloadFinance]);

  const handleSaveBudget = useCallback(async (data: Omit<Budget, 'id'>) => {
    setSavingFinance(true);
    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}`, data);
        addToast('success', 'Бюджет обновлён');
      } else {
        await api.post('/budgets', { ...data, projectId });
        addToast('success', 'Бюджет создан');
      }
      setShowBudgetModal(false);
      setEditingBudget(null);
      await reloadFinance();
    } catch {
      addToast('error', 'Ошибка при сохранении бюджета');
    } finally {
      setSavingFinance(false);
    }
  }, [editingBudget, projectId, addToast, reloadFinance]);

  const handleDeleteBudget = useCallback(async (id: number) => {
    if (!confirm('Удалить бюджет?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      addToast('success', 'Бюджет удалён');
      await reloadFinance();
    } catch {
      addToast('error', 'Ошибка при удалении');
    }
  }, [addToast, reloadFinance]);

  const handleSaveAct = useCallback(async (data: Omit<Act, 'id'>) => {
    setSavingFinance(true);
    try {
      if (editingAct) {
        await api.put(`/acts/${editingAct.id}`, data);
        addToast('success', 'Акт обновлён');
      } else {
        await api.post('/acts', { ...data, projectId });
        addToast('success', 'Акт создан');
      }
      setShowActModal(false);
      setEditingAct(null);
      await reloadFinance();
    } catch {
      addToast('error', 'Ошибка при сохранении акта');
    } finally {
      setSavingFinance(false);
    }
  }, [editingAct, projectId, addToast, reloadFinance]);

  const handleDeleteAct = useCallback(async (id: number) => {
    if (!confirm('Удалить акт?')) return;
    try {
      await api.delete(`/acts/${id}`);
      addToast('success', 'Акт удалён');
      await reloadFinance();
    } catch {
      addToast('error', 'Ошибка при удалении');
    }
  }, [addToast, reloadFinance]);

  const handleCloseProjectInactive = useCallback(async () => {
    if (!project) return;
    setClosingProject(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const r = await api.put(`/projects/${projectId}`, { status: 3, actualEndDate: today });
      setProject(r.data);
      setShowInactiveModal(false);
      addToast('success', 'Проект завершён');
    } catch {
      addToast('error', 'Не удалось завершить проект');
    } finally {
      setClosingProject(false);
    }
  }, [project, projectId, addToast]);

  const handleDismissInactiveModal = useCallback(() => {
    if (!project) return;
    localStorage.setItem(`project_inactive_dismissed_${project.id}`, String(Date.now()));
    setShowInactiveModal(false);
  }, [project]);

  const handleQuickStatusChange = useCallback(async (newStatus: number) => {
    if (!project) return;
    const today = new Date().toISOString().split('T')[0];
    const payload: Record<string, unknown> = { status: newStatus };
    if ((newStatus === 3 || newStatus === 4) && !project.actualEndDate) {
      payload.actualEndDate = today;
    }
    try {
      const r = await api.put(`/projects/${projectId}`, payload);
      setProject(r.data);
      addToast('success', 'Статус обновлён');
    } catch {
      addToast('error', 'Не удалось изменить статус');
    }
  }, [project, projectId, addToast]);

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
      ]).then(async ([teamRes, assignRes, tasksRes, docsRes, sitesRes]) => {
        const teams = Array.isArray(teamRes.data) ? teamRes.data : teamRes.data?.teams || [];
        const aData = assignRes.data?.assignments || assignRes.data?.data || assignRes.data || [];
        const rawAssignments: Assignment[] = Array.isArray(aData) ? aData : [];
        const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.tasks || tasksRes.data?.data || [];
        const docs = Array.isArray(docsRes.data) ? docsRes.data : docsRes.data?.documents || docsRes.data?.data || [];
        const sitesData = Array.isArray(sitesRes.data) ? sitesRes.data : sitesRes.data?.sites || sitesRes.data?.data || [];
        setOverviewSummary({
          teams: Array.isArray(teams) ? teams : [],
          assignments: await enrichAssignments(rawAssignments),
          tasks: Array.isArray(tasks) ? tasks : [],
          documents: Array.isArray(docs) ? docs : [],
          sites: Array.isArray(sitesData) ? sitesData : [],
        });
      }).finally(() => setOverviewLoading(false));
    }
    if (activeTab === 'team' && !teamLoaded && !loadingTeam) reloadTeam();
    if (activeTab === 'documents' && !docsLoaded && !loadingDocs) reloadDocuments();
    if (activeTab === 'tasks' && !tasksLoaded && !loadingTasks) reloadTasks();
    if (activeTab === 'resources' && !resourcesLoaded && !loadingResources) reloadResources();
    if (activeTab === 'chat' && !channelChecked && !loadingChat) loadProjectChannels();
    if (activeTab === 'photos' && !sitesLoaded && !loadingPhotos) reloadSites();
    if (activeTab === 'finance' && !financeLoaded && !loadingFinance) {
      setLoadingFinance(true);
      Promise.all([
        api.get('/payments', { params: { limit: 200 } }).catch(() => ({ data: {} })),
        api.get('/budgets', { params: { limit: 200 } }).catch(() => ({ data: {} })),
        api.get('/acts', { params: { limit: 200 } }).catch(() => ({ data: {} })),
      ]).then(([paymentsRes, budgetsRes, actsRes]) => {
        const payments: Payment[] = (paymentsRes.data?.data || paymentsRes.data?.payments || []).filter((p: Payment) => p.projectId === projectId);
        const budgets: Budget[] = (budgetsRes.data?.data || budgetsRes.data?.budgets || []).filter((b: Budget) => b.projectId === projectId);
        const acts: Act[] = (actsRes.data?.data || actsRes.data?.acts || []).filter((a: Act) => a.projectId === projectId);
        setFinancePayments(payments);
        setFinanceBudgets(budgets);
        setFinanceActs(acts);
      }).finally(() => { setLoadingFinance(false); setFinanceLoaded(true); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ─── Auto-refresh active tab every 30s + on window focus ─── */
  const activeTabRefresh = useCallback(() => {
    if (activeTab === 'tasks' && tasksLoaded) reloadTasks(true);
    else if (activeTab === 'team' && teamLoaded) reloadTeam();
    else if (activeTab === 'documents' && docsLoaded) reloadDocuments();
    else if (activeTab === 'finance' && financeLoaded) reloadFinance();
    else if (activeTab === 'resources' && resourcesLoaded) reloadResources();
    else if (activeTab === 'photos' && sitesLoaded) reloadSites();
  }, [activeTab, tasksLoaded, teamLoaded, docsLoaded, financeLoaded, resourcesLoaded, sitesLoaded,
      reloadTasks, reloadTeam, reloadDocuments, reloadFinance, reloadResources, reloadSites]);

  useAutoRefresh(activeTabRefresh);

  /* ─── Chat helpers ─── */
  const handleDeleteChannel = useCallback(async (ch: ChatChannel) => {
    if (!confirm(`Удалить канал «${ch.channelName || ch.name || `#${ch.id}`}»? Это действие нельзя отменить.`)) return;
    try {
      await api.delete(`/chat-channels/${ch.id}`);
      setProjectChannels((prev) => prev.filter((c) => c.id !== ch.id));
      if (activeProjectChannelId === ch.id) setActiveProjectChannelId(null);
      addToast('success', 'Канал удалён');
    } catch {
      addToast('error', 'Не удалось удалить канал');
    }
  }, [activeProjectChannelId, addToast]);

  const loadProjectChannels = useCallback(async () => {
    setLoadingChat(true);
    try {
      const channels = await fetchProjectChannels(projectId);
      setProjectChannels(channels);
      setChannelChecked(true);
    } catch { /* ignore */ }
    finally { setLoadingChat(false); }
  }, [projectId, fetchProjectChannels]);

  const addUsersToChannel = useCallback(async (userIds: number[]) => {
    if (userIds.length === 0) return;
    // add to all project channels, or create a general channel if none exist
    let targetChannels = projectChannels;
    if (targetChannels.length === 0 && project) {
      try {
        const r = await api.post('/chat-channels', {
          name: `Общий: ${project.name}`, channelType: 'group', projectId,
        });
        targetChannels = [r.data];
        setProjectChannels([r.data]);
      } catch { return; }
    }
    if (targetChannels.length === 0) return;
    const ch = targetChannels[0];
    await Promise.allSettled(
      userIds.map((userId) => api.post(`/chat-channels/${ch.id}/members`, { userId, role: 'member' }))
    );
    useChatStore.getState().fetchChannels(1);
  }, [projectChannels, project, projectId]);

  /* ─── Chat file sync ─── */
  const handleChatFilesSent = useCallback(async (attachments: { fileUrl: string; fileName: string; fileSize: number; mimeType: string }[]) => {
    for (const att of attachments) {
      const isImage = att.mimeType?.startsWith('image/');
      const isVideo = att.mimeType?.startsWith('video/');
      const isAudio = att.mimeType?.startsWith('audio/');

      if (isAudio) continue; // голосовые сообщения не сохраняем

      if (isImage || isVideo) {
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

  const handleAssignEmployee = async (user: UserOption, roleOnProject?: string) => {
    try {
      const res = await api.post(`/projects/${projectId}/assignments`, { userId: user.id, roleOnProject });
      const newAssignment: Assignment = {
        id: res.data?.id ?? Date.now(),
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        roleOnProject: roleOnProject || (user.roleId ? ROLE_NAMES[user.roleId] : undefined),
        isActive: true,
        assignedAt: new Date().toISOString(),
      };
      setAssignments((prev) => [...prev, newAssignment]);
      addToast('success', 'Сотрудник добавлен в проект');
    } catch {
      addToast('error', 'Не удалось назначить сотрудника');
      return;
    }
    addUsersToChannel([user.id]).catch(() => {});
    reloadTeam();
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
        const isVid = rawFile.type.startsWith('video/');
        const file = isVid ? rawFile : await convertImageToJpeg(rawFile);
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
      addToast('success', `Загружено ${files.length} медиа`);
    } catch { addToast('error', 'Ошибка при загрузке фото'); }
    finally { setUploadingPhoto(false); if (photoInputRef.current) photoInputRef.current.value = ''; }
  };

  const handleDeletePhoto = useCallback(async (site: ConstructionSite, rawUrl: string) => {
    setDeletingPhoto(rawUrl);
    try {
      const siteRes = await api.get(`/construction-sites/${site.id}`);
      const existing: string[] = siteRes.data?.photos || [];
      const updated = existing.filter((u) => u !== rawUrl && normalizePhotoUrl(u) !== normalizePhotoUrl(rawUrl));
      await api.put(`/construction-sites/${site.id}`, { photos: updated });
      setSites((prev) => prev.map((s) => s.id === site.id ? { ...s, photos: updated } : s));
      addToast('success', 'Фото удалено');
    } catch { addToast('error', 'Не удалось удалить фото'); }
    finally { setDeletingPhoto(null); }
  }, []);

  /* ─── PDF Report ─── */
  const downloadProjectPdf = async () => {
    if (!project || pdfLoading) return;
    setPdfLoading(true);
    try {
      // fetch finance data if not yet loaded
      let pdfPayments = financePayments;
      let pdfBudgets = financeBudgets;
      if (!financeLoaded) {
        const [pr, br] = await Promise.all([
          api.get('/payments', { params: { limit: 200 } }).catch(() => ({ data: {} })),
          api.get('/budgets', { params: { limit: 200 } }).catch(() => ({ data: {} })),
        ]);
        pdfPayments = (pr.data?.data || pr.data?.payments || []).filter((p: any) => p.projectId === projectId);
        pdfBudgets = (br.data?.data || br.data?.budgets || []).filter((b: any) => b.projectId === projectId);
      }

      const { data: gen } = await api.post('/documents/pdf/generate-project-report', {
        project,
        assignments,
        tasks,
        payments: pdfPayments,
        budgets: pdfBudgets,
        notes: notesText,
      });
      const { data: blob } = await api.get(`/documents/pdf/download/${gen.filename}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = gen.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'PDF сформирован');
    } catch {
      addToast('error', 'Не удалось сформировать PDF');
    } finally {
      setPdfLoading(false);
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
  const allPhotos = sites.flatMap((s) => (s.photos || []).map((url) => ({ url: normalizePhotoUrl(url), siteName: s.name })));

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
          {project && (
            <button
              onClick={downloadProjectPdf}
              disabled={pdfLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {pdfLoading ? 'PDF...' : 'PDF'}
            </button>
          )}
          <button onClick={() => setShowEditModal(true)} className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors">
            Редактировать
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TabsNav activeTab={activeTab} onSelect={setActiveTab} />


      {/* ─── Overview ─── */}
      {activeTab === 'overview' && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Основная информация</h2>
            <InfoRow label="Статус" value={
              <select
                value={project.status}
                onChange={(e) => handleQuickStatusChange(Number(e.target.value))}
                className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 cursor-pointer focus:ring-1 focus:ring-violet-400 ${status.color}`}
              >
                {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            } />
            <InfoRow label="Приоритет" value={<span className={`text-sm font-medium ${priority.color}`}>{priority.label}</span>} />
            <InfoRow label="Руководитель" value={project.projectManager?.name || '—'} />
            <InfoRow label="Клиент" value={project.clientName || '—'} />
            <InfoRow label="Адрес" value={project.address || '—'} />
            {project.settings?.notes && (
              <div className="pt-1 border-t border-gray-100 dark:border-gray-700/60">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">Заметки</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {project.settings.notes}
                </p>
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5 space-y-4">
            {(() => {
              // Derive dates from tasks (overview summary has tasks loaded for this tab)
              const allTasks: any[] = overviewSummary?.tasks?.length ? overviewSummary.tasks : tasks;
              const taskDueDates = allTasks.map((t) => t.dueDate).filter(Boolean).map((d: string) => new Date(d));
              const completedTaskDates = allTasks.filter((t) => t.status === 3).map((t) => t.dueDate || t.updatedAt).filter(Boolean).map((d: string) => new Date(d));
              const derivedPlanned = taskDueDates.length > 0 ? new Date(Math.max(...taskDueDates.map((d) => d.getTime()))) : null;
              const derivedActual = completedTaskDates.length > 0 ? new Date(Math.max(...completedTaskDates.map((d) => d.getTime()))) : null;

              const displayPlanned = project.plannedEndDate || derivedPlanned?.toISOString();
              const displayActual = project.actualEndDate || derivedActual?.toISOString();
              const fromTasks = !project.plannedEndDate && !!derivedPlanned;

              const dateOverrun = !!(displayActual && displayPlanned && new Date(displayActual) > new Date(displayPlanned));
              const budgetOverrun = !!(project.actualCost != null && project.budget != null && project.actualCost > project.budget);
              const hasOverrun = dateOverrun || budgetOverrun;
              const pct = (project.budget != null && project.actualCost != null && project.budget > 0)
                ? Math.round((project.actualCost / project.budget) * 100) : null;
              const WarningIcon = () => (
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              );
              return (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-100">Сроки и бюджет</h2>
                    {hasOverrun && (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                        <WarningIcon /> Превышение показателей
                      </span>
                    )}
                  </div>
                  {hasOverrun && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                      <WarningIcon />
                      Обнаружены превышения плановых показателей
                    </div>
                  )}
                  <InfoRow label="Дата начала" value={fmt(project.startDate)} />
                  <InfoRow label="Плановое окончание" value={
                    <span className="flex items-center gap-1.5">
                      {fmt(displayPlanned)}
                      {fromTasks && displayPlanned && (
                        <span className="text-xs text-gray-400 font-normal">(по задачам)</span>
                      )}
                    </span>
                  } />
                  <InfoRow label="Фактическое окончание" value={
                    dateOverrun ? (
                      <span className="flex items-center gap-1.5 text-red-500 font-semibold">
                        <WarningIcon />{fmt(displayActual)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        {fmt(displayActual)}
                        {!project.actualEndDate && displayActual && (
                          <span className="text-xs text-gray-400 font-normal">(по задачам)</span>
                        )}
                      </span>
                    )
                  } />
                  <InfoRow label="Бюджет" value={fmtMoney(project.budget)} />
                  <InfoRow label="Фактические затраты" value={
                    budgetOverrun ? (
                      <span className="flex items-center gap-1.5 text-red-500 font-semibold">
                        <WarningIcon />{fmtMoney(project.actualCost)}
                      </span>
                    ) : fmtMoney(project.actualCost)
                  } />
                  {pct !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Освоение бюджета</span>
                        <span className={budgetOverrun ? 'text-red-500 font-semibold' : 'text-gray-500'}>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className={`${budgetOverrun ? 'bg-red-500' : 'bg-violet-500'} h-2 rounded-full transition-all`}
                          style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
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

        {/* ─── Finance Summary Chart ─── */}
        {(project.budget != null || project.actualCost != null) && (
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Финансы проекта</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[
                  {
                    name: 'Бюджет',
                    Плановый: project.budget ?? 0,
                    Фактический: project.actualCost ?? 0,
                  },
                ]}
                barCategoryGap="40%"
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}М`
                      : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}К`
                      : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#f3f4f6', fontSize: 12 }}
                  formatter={(value: number | undefined) =>
                    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value ?? 0)
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                <Bar dataKey="Плановый" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Фактический" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        </>
      )}

      {/* ─── Tasks ─── */}
      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 shrink-0">Задачи проекта</h2>
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {/* Search */}
              <div className="relative flex-1 min-w-[120px] max-w-xs">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text" value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              {/* Status filter */}
              <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="text-xs px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none">
                <option value="">Все статусы</option>
                {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {/* Priority filter */}
              <select value={taskPriorityFilter} onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="text-xs px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none">
                <option value="">Все приоритеты</option>
                {Object.entries(TASK_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* View toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button onClick={() => { setTaskViewMode('table'); localStorage.setItem('projTaskView','table'); }}
                  className={`p-1.5 rounded transition-colors ${taskViewMode==='table' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Таблица">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/></svg>
                </button>
                <button onClick={() => { setTaskViewMode('grid'); localStorage.setItem('projTaskView','grid'); }}
                  className={`p-1.5 rounded transition-colors ${taskViewMode==='grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Карточки">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>
                </button>
              </div>
              <span className="text-xs text-gray-400">{tasks.length} задач</span>
              <button onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Создать задачу</span>
                <span className="sm:hidden">Создать</span>
              </button>
            </div>
          </div>
          {loadingTasks ? <LoadingState /> : tasks.length === 0 ? <EmptyState text="Задачи не найдены" /> : (() => {
            const filtered = tasks.filter((t) => {
              const matchSearch = !taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase());
              const matchStatus = !taskStatusFilter || String(t.status ?? 0) === taskStatusFilter;
              const matchPriority = !taskPriorityFilter || String(t.priority ?? 2) === taskPriorityFilter;
              return matchSearch && matchStatus && matchPriority;
            });
            if (filtered.length === 0) return <EmptyState text="Ничего не найдено" />;
            if (taskViewMode === 'grid') return (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((t) => {
                  const ts = TASK_STATUS[t.status ?? 0] || TASK_STATUS[0];
                  const tp = TASK_PRIORITY[t.priority ?? 2] || TASK_PRIORITY[2];
                  return (
                    <div key={t.id} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-violet-300 dark:hover:ring-violet-600 transition-all" onClick={() => setSelectedTask(t)}>
                      <div className="font-medium text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">{t.title}</div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ts.color}`}>{ts.label}</span>
                        <span className={`text-xs font-medium ${tp.color}`}>{tp.label}</span>
                      </div>
                      <div className="text-xs text-gray-400">{fmt(t.dueDate || t.due_date) || '—'}</div>
                      {(t.assignees?.length ?? 0) > 0 && (
                        <div className="mt-1 text-xs text-gray-400 truncate">{t.assignees?.map((a) => a.userName || `#${a.userId}`).join(', ')}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
            return (
              <div className="overflow-x-auto">
                <table className="table-auto w-full text-sm min-w-[480px]">
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
                    {filtered.map((t) => {
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
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── Team ─── */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {loadingTeam ? <LoadingState /> : (
            <>
              {/* Teams section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Команды</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                      <button onClick={() => { setTeamViewMode('table'); localStorage.setItem('projTeamView','table'); }}
                        className={`p-1.5 rounded transition-colors ${teamViewMode==='table' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Таблица">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/></svg>
                      </button>
                      <button onClick={() => { setTeamViewMode('grid'); localStorage.setItem('projTeamView','grid'); }}
                        className={`p-1.5 rounded transition-colors ${teamViewMode==='grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Карточки">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>
                      </button>
                    </div>
                    <button onClick={() => setShowAssignTeam(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="hidden sm:inline">Назначить команду</span>
                      <span className="sm:hidden">Добавить</span>
                    </button>
                  </div>
                </div>
                {teamMembers.length === 0 ? <EmptyState text="Команды не назначены" /> : teamViewMode === 'grid' ? (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {teamMembers.map((m) => (
                      <div key={m.id} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-violet-300 dark:hover:ring-violet-600 transition-all flex items-start justify-between" onClick={() => setSelectedTeamMember(m)}>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-100">{m.team?.name || m.teamName || `Команда #${m.teamId}`}</div>
                          <div className="text-xs text-gray-400 mt-1">{fmt(m.assignedAt)}</div>
                          {m.isPrimary && <span className="mt-2 inline-block text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded-full">Основная</span>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveTeam(m.teamId); }} disabled={removingTeamId === m.teamId}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0" title="Удалить">
                          {removingTeamId === m.teamId
                            ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-auto w-full text-sm min-w-[400px]">
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
                  </div>
                )}
              </div>

              {/* Employees section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Сотрудники</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                      <button onClick={() => { setTeamViewMode('table'); localStorage.setItem('projTeamView','table'); }}
                        className={`p-1.5 rounded transition-colors ${teamViewMode==='table' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Таблица">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/></svg>
                      </button>
                      <button onClick={() => { setTeamViewMode('grid'); localStorage.setItem('projTeamView','grid'); }}
                        className={`p-1.5 rounded transition-colors ${teamViewMode==='grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Карточки">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>
                      </button>
                    </div>
                    <button onClick={() => setShowAssignEmployee(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="hidden sm:inline">Добавить сотрудника</span>
                      <span className="sm:hidden">Добавить</span>
                    </button>
                  </div>
                </div>
                {assignments.length === 0 ? <EmptyState text="Сотрудники не назначены" /> : teamViewMode === 'grid' ? (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assignments.map((a) => {
                      const isOnline = onlineUsers.has(a.userId);
                      return (
                        <div key={a.id} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-violet-300 dark:hover:ring-violet-600 transition-all flex items-start justify-between" onClick={() => setSelectedAssignment(a)}>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-800 dark:text-gray-100 truncate">{a.userName || `#${a.userId}`}</div>
                            {a.userEmail && <div className="text-xs text-gray-400 truncate">{a.userEmail}</div>}
                            <div className="text-xs text-gray-400 mt-1">{a.roleOnProject || '—'}</div>
                            <span className="flex items-center gap-1.5 mt-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                              <span className="text-xs text-gray-500 dark:text-gray-400">{isOnline ? 'В сети' : 'Офлайн'}</span>
                            </span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(a.id); }} disabled={removingAssignId === a.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0" title="Удалить">
                            {removingAssignId === a.id
                              ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            }
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-auto w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                          <th className="py-3 px-4 text-left font-semibold">Сотрудник</th>
                          <th className="py-3 px-4 text-left font-semibold">Роль</th>
                          <th className="py-3 px-4 text-left font-semibold">В сети</th>
                          <th className="py-3 px-4 text-left font-semibold">Назначен</th>
                          <th className="py-3 px-4 text-center font-semibold w-20">Удалить</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {assignments.map((a) => {
                          const isOnline = onlineUsers.has(a.userId);
                          return (
                          <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer" onClick={() => setSelectedAssignment(a)}>
                            <td className="py-2.5 px-4">
                              <div className="font-medium text-gray-800 dark:text-gray-100">{a.userName || `#${a.userId}`}</div>
                              {a.userEmail && <div className="text-xs text-gray-400">{a.userEmail}</div>}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{a.roleOnProject || '—'}</td>
                            <td className="py-2.5 px-4">
                              <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
                                <span className="text-xs text-gray-600 dark:text-gray-400">{isOnline ? 'В сети' : 'Офлайн'}</span>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Documents ─── */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 shrink-0">Документы проекта</h2>
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {/* Search */}
              <div className="relative flex-1 min-w-[120px] max-w-xs">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text" value={docSearch} onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              {/* Type filter */}
              <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)}
                className="text-xs px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none">
                <option value="">Все типы</option>
                {DOC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* View toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button onClick={() => { setDocViewMode('table'); localStorage.setItem('projDocView','table'); }}
                  className={`p-1.5 rounded transition-colors ${docViewMode==='table' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Таблица">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/></svg>
                </button>
                <button onClick={() => { setDocViewMode('grid'); localStorage.setItem('projDocView','grid'); }}
                  className={`p-1.5 rounded transition-colors ${docViewMode==='grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Карточки">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>
                </button>
              </div>
              <button onClick={() => setShowUploadDoc(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">Загрузить документ</span>
                <span className="sm:hidden">Загрузить</span>
              </button>
            </div>
          </div>
          {loadingDocs ? <LoadingState /> : documents.length === 0 ? <EmptyState text="Документы не найдены" /> : (() => {
            const filtered = documents.filter((doc) => {
              const matchSearch = !docSearch || doc.title.toLowerCase().includes(docSearch.toLowerCase());
              const matchType = !docTypeFilter || doc.documentType === docTypeFilter;
              return matchSearch && matchType;
            });
            if (filtered.length === 0) return <EmptyState text="Ничего не найдено" />;
            const getDocIcon = (doc: Document) => {
              const url = doc.fileUrl || '';
              const mime = doc.fileType || '';
              if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) {
                return { type: 'image', url };
              }
              if (mime.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(url)) {
                return { type: 'video', url };
              }
              if (mime === 'application/pdf' || /\.pdf(\?|$)/i.test(url)) return { type: 'pdf' };
              if (/\.(doc|docx)(\?|$)/i.test(url)) return { type: 'word' };
              if (/\.(xls|xlsx)(\?|$)/i.test(url)) return { type: 'excel' };
              return { type: 'file' };
            };
            if (docViewMode === 'grid') return (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((doc) => {
                  const icon = getDocIcon(doc);
                  return (
                    <div key={doc.id} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl overflow-hidden">
                      {/* Preview */}
                      <div className="h-36 bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative overflow-hidden">
                        {icon.type === 'image' ? (
                          <img src={icon.url} alt="" className="w-full h-full object-cover" />
                        ) : icon.type === 'video' ? (
                          <div className="w-full h-full relative">
                            <video src={icon.url} className="w-full h-full object-cover" muted preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-3xl">{icon.type === 'pdf' ? '📄' : icon.type === 'word' ? '📝' : icon.type === 'excel' ? '📊' : '📎'}</span>
                            <span className="text-xs text-gray-400 uppercase">{(doc.fileUrl || '').split('.').pop()?.split('?')[0]}</span>
                          </div>
                        )}
                      </div>
                      {/* Info + actions */}
                      <div className="p-3">
                        <div className="font-medium text-gray-800 dark:text-gray-100 text-sm line-clamp-1 mb-0.5">{doc.title}</div>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                          <span>{fmtSize(doc.fileSize)}</span>
                          <span>{fmt(doc.createdAt)}</span>
                        </div>
                        <div className="flex gap-1.5">
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg transition-colors font-medium">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              Скачать
                            </a>
                          )}
                          <button onClick={() => setSelectedDocument(doc)}
                            className="p-1.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors" title="Информация">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
            return (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filtered.map((doc) => {
                  const icon = getDocIcon(doc);
                  return (
                    <div key={doc.id}
                      onClick={() => doc.fileUrl && setPreviewDoc(doc)}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors ${doc.fileUrl ? 'cursor-pointer' : ''}`}>
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                        {icon.type === 'image' ? (
                          <img src={icon.url} alt="" className="w-full h-full object-cover" />
                        ) : icon.type === 'video' ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-gray-800">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        ) : (
                          <span className="text-2xl">{icon.type === 'pdf' ? '📄' : icon.type === 'word' ? '📝' : icon.type === 'excel' ? '📊' : '📎'}</span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{doc.title}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{DOC_TYPE_LABELS[doc.documentType || ''] || doc.documentType || '—'}</span>
                          <span>·</span>
                          <span>{fmtSize(doc.fileSize)}</span>
                          <span>·</span>
                          <span>{fmt(doc.createdAt)}</span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors" title="Скачать">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </a>
                        )}
                        <button onClick={() => setSelectedDocument(doc)}
                          className="p-1.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors" title="Информация">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── Chat ─── */}
      {activeTab === 'chat' && (
        <div className="flex gap-4" style={{ height: '640px' }}>
          {/* Sidebar: channel list — hidden on mobile when chat is open */}
          <div className={`${mobileChatOpen ? 'hidden sm:flex' : 'flex'} w-full sm:w-64 shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-xs flex-col overflow-hidden`}>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Каналы проекта</h3>
              <button onClick={() => setShowCreateChannelModal(true)}
                className="p-1.5 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors" title="Создать канал">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {loadingChat ? (
                <div className="p-4 flex justify-center"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : projectChannels.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mb-2">Каналов пока нет</p>
                  <button onClick={() => setShowCreateChannelModal(true)}
                    className="text-xs text-violet-500 hover:text-violet-600 transition-colors">+ Создать первый</button>
                </div>
              ) : (
                projectChannels.map((ch) => (
                  <div key={ch.id} className={`group flex items-center gap-2.5 px-4 py-2.5 transition-colors cursor-pointer ${activeProjectChannelId === ch.id ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    onClick={() => { setActiveProjectChannelId(ch.id); setMobileChatOpen(true); }}>
                    <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden relative">
                      {ch.avatarUrl
                        ? <img src={ch.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        : (ch.channelName || ch.name || '#').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${activeProjectChannelId === ch.id ? 'text-violet-600 dark:text-violet-400' : 'text-gray-800 dark:text-gray-100'}`}>
                        {ch.channelName || ch.name || `Канал #${ch.id}`}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{ch.membersCount} участников</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingChannel(ch); }}
                        className="p-1 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded transition-all"
                        title="Редактировать канал">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch); }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                        title="Удалить канал">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat window — hidden on mobile when no channel selected */}
          <div className={`${mobileChatOpen ? 'flex' : 'hidden sm:flex'} flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden flex-col`}>
            {!activeProjectChannelId ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-gray-400">{projectChannels.length === 0 ? 'Создайте первый канал' : 'Выберите канал для общения'}</p>
              </div>
            ) : (
              <ProjectChatPanel
                key={activeProjectChannelId}
                channelId={activeProjectChannelId}
                channelName={(() => { const c = projectChannels.find((c) => c.id === activeProjectChannelId); return c?.channelName || c?.name || 'Канал'; })()}
                projectId={projectId}
                projectMembers={assignments}
                onFilesSent={handleChatFilesSent}
                onBack={() => setMobileChatOpen(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* Create channel modal */}
      {showCreateChannelModal && (
        <ProjectChannelCreateModal
          projectId={projectId}
          projectName={project?.name || ''}
          projectMembers={assignments}
          onCreated={(ch) => {
            setProjectChannels((prev) => [...prev, ch]);
            setActiveProjectChannelId(ch.id);
            setShowCreateChannelModal(false);
            useChatStore.getState().fetchChannels(1);
          }}
          onClose={() => setShowCreateChannelModal(false)}
        />
      )}

      {/* Edit channel modal */}
      {editingChannel && (
        <ProjectChannelEditModal
          channel={editingChannel}
          onSaved={(updated) => {
            setProjectChannels((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
            setEditingChannel(null);
          }}
          onClose={() => setEditingChannel(null)}
        />
      )}

      {/* ─── Photos ─── */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          {/* Top bar: filters + upload */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={photoSiteFilter}
              onChange={(e) => setPhotoSiteFilter(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            >
              <option value="">Все площадки</option>
              {sites.filter((s) => (s.photos || []).length > 0).map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
            <select
              value={photoSort}
              onChange={(e) => setPhotoSort(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none"
            >
              <option value="default">По умолчанию</option>
              <option value="most">Больше медиа</option>
              <option value="least">Меньше медиа</option>
              <option value="az">Название А-Я</option>
              <option value="za">Название Я-А</option>
            </select>
            <div className="flex-1" />
            <input ref={photoInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
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
              {uploadingPhoto ? 'Загрузка...' : 'Добавить медиа'}
            </button>
          </div>

          {loadingPhotos ? <LoadingState /> : allPhotos.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Медиафайлы не загружены</p>
              <p className="text-xs text-gray-400 mt-1">Нажмите «Добавить медиа» чтобы загрузить фото или видео</p>
            </div>
          ) : (
            (() => {
              let filtered = sites.filter((s) => (s.photos || []).length > 0);
              if (photoSiteFilter) filtered = filtered.filter((s) => String(s.id) === photoSiteFilter);
              if (photoSort === 'most') filtered = [...filtered].sort((a, b) => (b.photos?.length ?? 0) - (a.photos?.length ?? 0));
              else if (photoSort === 'least') filtered = [...filtered].sort((a, b) => (a.photos?.length ?? 0) - (b.photos?.length ?? 0));
              else if (photoSort === 'az') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
              else if (photoSort === 'za') filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name, 'ru'));
              return filtered;
            })().map((site) => {
              const photos = site.photos || [];
              return (
                <div key={site.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{site.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{photos.length} медиафайлов</p>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {photos.map((rawUrl, idx) => {
                      const url = normalizePhotoUrl(rawUrl);
                      const isDeleting = deletingPhoto === rawUrl;
                      const isVidUrl = /\.(mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(url);
                      return (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                          <button onClick={() => setLightboxPhoto(url)} className="w-full h-full">
                            {isVidUrl ? (
                              <div className="w-full h-full relative">
                                <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img src={url} alt={`Медиа ${idx + 1}`} className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (el.src !== PHOTO_ERROR_PLACEHOLDER) el.src = PHOTO_ERROR_PLACEHOLDER; }} />
                            )}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePhoto(site, rawUrl); }}
                            disabled={isDeleting}
                            className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-black/60 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                            title="Удалить"
                          >
                            {isDeleting ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Notes ─── */}
      {activeTab === 'notes' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Заметки проекта</h2>
            {!notesEditing && (
              <button onClick={() => setNotesEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Редактировать
              </button>
            )}
          </div>
          <div className="p-5">
            {notesEditing ? (
              <div className="space-y-3">
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={10}
                  autoFocus
                  placeholder="Введите заметки по проекту..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setNotesEditing(false); setNotesText(project?.settings?.notes || ''); }}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                    Отмена
                  </button>
                  <button disabled={notesSaving} onClick={async () => {
                    setNotesSaving(true);
                    const savedNotes = notesText.trim();
                    try {
                      const r = await api.put(`/projects/${projectId}`, {
                        settings: { ...(project?.settings || {}), notes: savedNotes },
                      });
                      // Merge API response with explicit notes value so both
                      // the notes tab and the overview card update immediately
                      setProject((prev) => ({
                        ...(r.data ?? prev ?? {}),
                        settings: { ...((r.data ?? prev)?.settings ?? {}), notes: savedNotes },
                      }));
                      setNotesText(savedNotes);
                      setNotesEditing(false);
                      addToast('success', 'Заметки сохранены');
                    } catch { addToast('error', 'Не удалось сохранить заметки'); }
                    finally { setNotesSaving(false); }
                  }}
                    className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                    {notesSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            ) : notesText ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{notesText}</p>
            ) : (
              <div className="py-12 text-center">
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-sm text-gray-400">Заметок пока нет</p>
                <button onClick={() => setNotesEditing(true)}
                  className="mt-2 text-xs text-violet-500 hover:text-violet-600 transition-colors">
                  Добавить заметку
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Finance ─── */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {loadingFinance ? (
            <LoadingState />
          ) : (
            <>
              {/* ── Summary cards ── */}
              {(() => {
                const isIncome = paymentIsIncome;
                const isExpense = paymentIsExpense;
                const totalIncome = financePayments.filter(isIncome).reduce((s, p) => s + (p.amount ?? 0), 0);
                const totalExpense = financePayments.filter(isExpense).reduce((s, p) => s + (p.amount ?? 0), 0);
                const balance = totalIncome - totalExpense;
                const expensePct = project?.budget ? Math.round((totalExpense / project.budget) * 100) : null;
                const chartData = [{
                  name: 'Финансы проекта',
                  'Бюджет': project?.budget ?? 0,
                  'Поступления': totalIncome,
                  'Расходы': totalExpense,
                  'Факт. затраты': project?.actualCost ?? 0,
                }];
                return (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Budget */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Бюджет</p>
                        <p className="text-xl font-bold text-violet-600 dark:text-violet-400">{fmtMoney(project?.budget) || '—'}</p>
                      </div>
                      {/* Income */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Поступления</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmtMoney(totalIncome)}</p>
                      </div>
                      {/* Expense */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Расходы</p>
                        <p className="text-xl font-bold text-red-500">{fmtMoney(totalExpense)}</p>
                        {expensePct !== null && (
                          <p className={`text-xs mt-0.5 ${expensePct > 100 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                            {expensePct}% от бюджета
                          </p>
                        )}
                      </div>
                      {/* Balance */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Баланс</p>
                        <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          {balance >= 0 ? '+' : ''}{fmtMoney(balance)}
                        </p>
                      </div>
                    </div>

                    {/* ── Correlation chart ── */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-5">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Корреляция финансов</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                            tickFormatter={(v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}М` : v >= 1_000 ? `${(v/1_000).toFixed(0)}К` : String(v)} />
                          <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#f3f4f6', fontSize: 12 }}
                            formatter={(v: number | undefined) => v == null ? '—' : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v)} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="Бюджет" fill="#8b5cf6" radius={[4,4,0,0]} />
                          <Bar dataKey="Поступления" fill="#22c55e" radius={[4,4,0,0]} />
                          <Bar dataKey="Расходы" fill="#ef4444" radius={[4,4,0,0]} />
                          <Bar dataKey="Факт. затраты" fill="#f97316" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                );
              })()}

              {/* ── Payments ── */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Платежи</h3>
                  <FinanceViewToggle mode={financeViewMode} onChange={(m) => { setFinanceViewMode(m); localStorage.setItem('financeViewMode', m); }} />
                  <button onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Добавить
                  </button>
                </div>
                {financePayments.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Нет платежей для этого проекта</div>
                ) : financeViewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                          <th className="py-3 px-4 text-left font-semibold">№</th>
                          <th className="py-3 px-4 text-left font-semibold">Направление</th>
                          <th className="py-3 px-4 text-right font-semibold">Сумма</th>
                          <th className="py-3 px-4 text-left font-semibold">Дата</th>
                          <th className="py-3 px-4 text-left font-semibold">Категория</th>
                          <th className="py-3 px-4 text-center font-semibold">Статус</th>
                          <th className="py-3 px-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {financePayments.map((p) => {
                          const income = paymentIsIncome(p);
                          const expense = paymentIsExpense(p);
                          const dirLabel = PAYMENT_DIRECTION.find(d => d.value === p.paymentType)?.label || p.paymentType || '—';
                          const dirColor = income
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : expense
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
                          return (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer"
                              onClick={() => { setEditingPayment(p); setShowPaymentModal(true); }}>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{p.paymentNumber || p.id}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${dirColor}`}>
                                  {dirLabel}
                                </span>
                              </td>
                              <td className={`py-3 px-4 text-right font-semibold ${income ? 'text-green-600 dark:text-green-400' : expense ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{income ? '+' : expense ? '−' : ''}{fmtMoney(p.amount)}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{fmt(p.paymentDate)}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{p.category || '—'}</td>
                              <td className="py-3 px-4 text-center">
                                {p.status != null ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS[p.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                    {PAYMENT_STATUS[p.status]?.label ?? p.status}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleDeletePayment(p.id)}
                                  className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                    {financePayments.map((p) => {
                      const income = paymentIsIncome(p);
                      const expense = paymentIsExpense(p);
                      const dirLabel = PAYMENT_DIRECTION.find(d => d.value === p.paymentType)?.label || p.paymentType || '—';
                      const dirColor = income
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : expense
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
                      return (
                        <div key={p.id} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors border border-gray-100 dark:border-gray-700/40"
                          onClick={() => { setEditingPayment(p); setShowPaymentModal(true); }}>
                          <div className="flex items-start justify-between mb-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${dirColor}`}>{dirLabel}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeletePayment(p.id); }}
                              className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                          <p className={`text-2xl font-bold mb-3 ${income ? 'text-green-600 dark:text-green-400' : expense ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                            {income ? '+' : expense ? '−' : ''}{fmtMoney(p.amount)}
                          </p>
                          <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex justify-between">
                              <span>Дата:</span>
                              <span className="text-gray-700 dark:text-gray-300">{fmt(p.paymentDate)}</span>
                            </div>
                            {p.category && (
                              <div className="flex justify-between">
                                <span>Категория:</span>
                                <span className="text-gray-700 dark:text-gray-300 truncate ml-2">{p.category}</span>
                              </div>
                            )}
                            {p.status != null && (
                              <div className="flex justify-between items-center">
                                <span>Статус:</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS[p.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                  {PAYMENT_STATUS[p.status]?.label ?? p.status}
                                </span>
                              </div>
                            )}
                            {p.description && <p className="text-gray-400 dark:text-gray-500 truncate pt-0.5">{p.description}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Budgets ── */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Бюджеты</h3>
                  <FinanceViewToggle mode={budgetsViewMode} onChange={(m) => { setBudgetsViewMode(m); localStorage.setItem('budgetsViewMode', m); }} />
                  <button onClick={() => { setEditingBudget(null); setShowBudgetModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Добавить
                  </button>
                </div>
                {financeBudgets.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Нет бюджетов для этого проекта</div>
                ) : budgetsViewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                          <th className="py-3 px-4 text-left font-semibold">Название</th>
                          <th className="py-3 px-4 text-right font-semibold">Общий</th>
                          <th className="py-3 px-4 text-right font-semibold">Потрачено</th>
                          <th className="py-3 px-4 text-right font-semibold">Выделено</th>
                          <th className="py-3 px-4 text-center font-semibold">Статус</th>
                          <th className="py-3 px-4 text-left font-semibold">Период</th>
                          <th className="py-3 px-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {financeBudgets.map((b) => {
                          const overSpent = b.spentAmount != null && b.totalBudget != null && b.spentAmount > b.totalBudget;
                          return (
                            <tr key={b.id}
                              className={`cursor-pointer transition-colors ${overSpent ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'}`}
                              onClick={() => { setEditingBudget(b); setShowBudgetModal(true); }}>
                              <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">{b.budgetName || '—'}</td>
                              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{fmtMoney(b.totalBudget)}</td>
                              <td className="py-3 px-4 text-right">
                                {overSpent ? (
                                  <span className="flex items-center justify-end gap-1 text-red-500 font-semibold">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                                    {fmtMoney(b.spentAmount)}
                                  </span>
                                ) : <span className="text-gray-700 dark:text-gray-300">{fmtMoney(b.spentAmount)}</span>}
                              </td>
                              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{fmtMoney(b.allocatedAmount)}</td>
                              <td className="py-3 px-4 text-center">
                                {b.status != null ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BUDGET_STATUS[b.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                    {BUDGET_STATUS[b.status]?.label ?? b.status}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                {b.startDate ? fmt(b.startDate) : ''}{b.startDate && b.endDate ? ' – ' : ''}{b.endDate ? fmt(b.endDate) : ''}{!b.startDate && !b.endDate ? '—' : ''}
                              </td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleDeleteBudget(b.id)}
                                  className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                    {financeBudgets.map((b) => {
                      const overSpent = b.spentAmount != null && b.totalBudget != null && b.spentAmount > b.totalBudget;
                      const pct = b.totalBudget && b.spentAmount != null ? Math.min(100, Math.round((b.spentAmount / b.totalBudget) * 100)) : null;
                      return (
                        <div key={b.id} className={`rounded-xl p-4 cursor-pointer transition-colors border ${overSpent ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-900/50'}`}
                          onClick={() => { setEditingBudget(b); setShowBudgetModal(true); }}>
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">{b.budgetName || '—'}</p>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteBudget(b.id); }}
                              className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{fmtMoney(b.totalBudget)}</p>
                          {pct != null && (
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <span>Использовано</span>
                                <span className={overSpent ? 'text-red-500 font-semibold' : ''}>{pct}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${overSpent ? 'bg-red-500' : 'bg-violet-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )}
                          <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex justify-between">
                              <span>Потрачено:</span>
                              <span className={overSpent ? 'text-red-500 font-semibold' : 'text-gray-700 dark:text-gray-300'}>{fmtMoney(b.spentAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Выделено:</span>
                              <span className="text-gray-700 dark:text-gray-300">{fmtMoney(b.allocatedAmount)}</span>
                            </div>
                            {b.status != null && (
                              <div className="flex justify-between items-center">
                                <span>Статус:</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${BUDGET_STATUS[b.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                  {BUDGET_STATUS[b.status]?.label ?? b.status}
                                </span>
                              </div>
                            )}
                            {(b.startDate || b.endDate) && (
                              <div className="flex justify-between">
                                <span>Период:</span>
                                <span className="text-gray-700 dark:text-gray-300">{b.startDate ? fmt(b.startDate) : ''}{b.startDate && b.endDate ? ' – ' : ''}{b.endDate ? fmt(b.endDate) : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Acts ── */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Акты</h3>
                  <FinanceViewToggle mode={actsViewMode} onChange={(m) => { setActsViewMode(m); localStorage.setItem('actsViewMode', m); }} />
                  <button onClick={() => { setEditingAct(null); setShowActModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Добавить
                  </button>
                </div>
                {financeActs.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Нет актов для этого проекта</div>
                ) : actsViewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                          <th className="py-3 px-4 text-left font-semibold">№ акта</th>
                          <th className="py-3 px-4 text-left font-semibold">Тип</th>
                          <th className="py-3 px-4 text-left font-semibold">Дата</th>
                          <th className="py-3 px-4 text-right font-semibold">Сумма</th>
                          <th className="py-3 px-4 text-center font-semibold">Статус</th>
                          <th className="py-3 px-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {financeActs.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer"
                            onClick={() => { setEditingAct(a); setShowActModal(true); }}>
                            <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{a.actNumber || a.id}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{a.actType || '—'}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{fmt(a.actDate)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">{fmtMoney(a.totalAmount)}</td>
                            <td className="py-3 px-4 text-center">
                              {a.status != null ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACT_STATUS[a.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                  {ACT_STATUS[a.status]?.label ?? a.status}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleDeleteAct(a.id)}
                                className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                    {financeActs.map((a) => (
                      <div key={a.id} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors border border-gray-100 dark:border-gray-700/40"
                        onClick={() => { setEditingAct(a); setShowActModal(true); }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">№ {a.actNumber || a.id}</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{a.actType || '—'}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteAct(a.id); }}
                            className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{fmtMoney(a.totalAmount)}</p>
                        <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>Дата:</span>
                            <span className="text-gray-700 dark:text-gray-300">{fmt(a.actDate)}</span>
                          </div>
                          {a.status != null && (
                            <div className="flex justify-between items-center">
                              <span>Статус:</span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${ACT_STATUS[a.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                {ACT_STATUS[a.status]?.label ?? a.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Resources ─── */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          {/* Sub-nav */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {([
              { key: 'materials', label: 'Материальные заявки', count: materialRequests.length },
              { key: 'orders', label: 'Заказы поставщикам', count: supplierOrders.length },
              { key: 'equipment', label: 'Оборудование', count: equipmentList.length },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setResourceSubTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  resourceSubTab === t.key
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.label}
                {!loadingResources && t.count > 0 && (
                  <span className="ml-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {loadingResources ? (
            <LoadingState />
          ) : (
            <>
              {/* ── Material Requests ── */}
              {resourceSubTab === 'materials' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Материальные заявки</h3>
                    <button onClick={() => { setEditingMR(null); setShowMRModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Добавить
                    </button>
                  </div>
                  {materialRequests.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Нет материальных заявок для этого проекта</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                            <th className="py-3 px-4 text-left font-semibold">№ заявки</th>
                            <th className="py-3 px-4 text-left font-semibold">Статус</th>
                            <th className="py-3 px-4 text-left font-semibold">Цель</th>
                            <th className="py-3 px-4 text-left font-semibold">Позиций</th>
                            <th className="py-3 px-4 text-left font-semibold">Запросил</th>
                            <th className="py-3 px-4 text-left font-semibold">Дата заявки</th>
                            <th className="py-3 px-4 text-left font-semibold">Нужно до</th>
                            <th className="py-3 px-4 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {materialRequests.map((mr) => (
                            <tr key={mr.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors"
                              onClick={() => { setEditingMR(mr); setShowMRModal(true); }}>
                              <td className="py-3 px-4 font-mono text-xs text-violet-600 dark:text-violet-400 font-medium">{mr.requestNumber}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MATERIAL_REQUEST_STATUS[mr.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                  {MATERIAL_REQUEST_STATUS[mr.status]?.label ?? mr.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-700 dark:text-gray-300 max-w-[180px] truncate">{mr.purpose || '—'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mr.items?.length ?? 0}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{mr.requestedBy?.name || '—'}</td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{mr.requestDate ? new Date(mr.requestDate).toLocaleDateString('ru-RU') : '—'}</td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{mr.neededByDate ? new Date(mr.neededByDate).toLocaleDateString('ru-RU') : '—'}</td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleDeleteMaterialRequest(mr.id)}
                                  className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Supplier Orders ── */}
              {resourceSubTab === 'orders' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Заказы поставщикам</h3>
                    <button onClick={() => { setEditingSO(null); setShowSOModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Добавить
                    </button>
                  </div>
                  {supplierOrders.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Нет заказов поставщикам для этого проекта</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                            <th className="py-3 px-4 text-left font-semibold">№ заказа</th>
                            <th className="py-3 px-4 text-left font-semibold">Статус</th>
                            <th className="py-3 px-4 text-left font-semibold">Поставщик</th>
                            <th className="py-3 px-4 text-left font-semibold">Позиций</th>
                            <th className="py-3 px-4 text-right font-semibold">Сумма</th>
                            <th className="py-3 px-4 text-left font-semibold">Дата заказа</th>
                            <th className="py-3 px-4 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {supplierOrders.map((so) => (
                            <tr key={so.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors"
                              onClick={() => { setEditingSO(so); setShowSOModal(true); }}>
                              <td className="py-3 px-4 font-mono text-xs text-violet-600 dark:text-violet-400 font-medium">{so.orderNumber}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SUPPLIER_ORDER_STATUS[so.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                  {SUPPLIER_ORDER_STATUS[so.status]?.label ?? so.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{so.supplier?.name || '—'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{so.items?.length ?? 0}</td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-800 dark:text-gray-200">
                                {so.totalAmount != null
                                  ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: so.currency || 'RUB', maximumFractionDigits: 0 }).format(so.totalAmount)
                                  : '—'}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{so.orderDate ? new Date(so.orderDate).toLocaleDateString('ru-RU') : '—'}</td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleDeleteSupplierOrder(so.id)}
                                  className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Equipment ── */}
              {resourceSubTab === 'equipment' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Оборудование</h3>
                    <button onClick={() => { setEditingEq(null); setShowEqModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Добавить
                    </button>
                  </div>
                  {equipmentList.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Оборудование не найдено</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                            <th className="py-3 px-4 text-left font-semibold">Название</th>
                            <th className="py-3 px-4 text-left font-semibold">Тип</th>
                            <th className="py-3 px-4 text-left font-semibold">Модель</th>
                            <th className="py-3 px-4 text-left font-semibold">Серийный №</th>
                            <th className="py-3 px-4 text-left font-semibold">Статус</th>
                            <th className="py-3 px-4 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {equipmentList.map((eq) => (
                            <tr key={eq.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors"
                              onClick={() => { setEditingEq(eq); setShowEqModal(true); }}>
                              <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{eq.name}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{eq.equipmentType ? (EQUIPMENT_TYPE_LABELS[eq.equipmentType] ?? eq.equipmentType) : '—'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{eq.model || '—'}</td>
                              <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">{eq.serialNumber || '—'}</td>
                              <td className="py-3 px-4">
                                {eq.status != null ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EQUIPMENT_STATUS[eq.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                    {EQUIPMENT_STATUS[eq.status]?.label ?? eq.status}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleDeleteEquipment(eq.id)}
                                  className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
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
          {/\.(mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(lightboxPhoto) ? (
            <video src={lightboxPhoto} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={lightboxPhoto} alt="Просмотр" className="max-w-full max-h-full rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}

      {/* Material Request Modal */}
      {showMRModal && (
        <FinanceModal
          title={editingMR ? 'Материальная заявка' : 'Новая заявка'}
          saving={savingResource}
          initialData={editingMR ? {
            purpose: editingMR.purpose,
            status: editingMR.status,
            priority: editingMR.priority,
            requestDate: editingMR.requestDate,
            neededByDate: editingMR.neededByDate,
          } : undefined}
          fields={[
            { key: 'purpose', label: 'Цель / назначение', type: 'text' },
            {
              key: 'status', label: 'Статус', type: 'select',
              options: Object.entries(MATERIAL_REQUEST_STATUS).map(([v, s]) => ({ value: Number(v), label: s.label })),
            },
            {
              key: 'priority', label: 'Приоритет', type: 'select',
              options: [{ value: 1, label: 'Низкий' }, { value: 2, label: 'Средний' }, { value: 3, label: 'Высокий' }],
            },
            { key: 'requestDate', label: 'Дата заявки', type: 'date', required: true },
            { key: 'neededByDate', label: 'Нужно до', type: 'date' },
          ]}
          onClose={() => { setShowMRModal(false); setEditingMR(null); }}
          onSave={(data) => handleSaveMaterialRequest(data)}
        />
      )}

      {/* Supplier Order Modal */}
      {showSOModal && (
        <FinanceModal
          title={editingSO ? 'Заказ поставщику' : 'Новый заказ поставщику'}
          saving={savingResource}
          initialData={editingSO ? {
            supplierId: editingSO.supplier?.id,
            status: editingSO.status,
            orderDate: editingSO.orderDate,
            totalAmount: editingSO.totalAmount,
            currency: editingSO.currency,
          } : undefined}
          fields={[
            ...(suppliersList.length > 0 ? [{
              key: 'supplierId', label: 'Поставщик', type: 'select' as const,
              options: suppliersList.map((s) => ({ value: s.id, label: s.name })),
            }] : [{ key: 'supplierId', label: 'ID поставщика', type: 'number' as const }]),
            {
              key: 'status', label: 'Статус', type: 'select',
              options: Object.entries(SUPPLIER_ORDER_STATUS).map(([v, s]) => ({ value: Number(v), label: s.label })),
            },
            { key: 'orderDate', label: 'Дата заказа', type: 'date', required: true },
            { key: 'totalAmount', label: 'Сумма', type: 'number' },
            {
              key: 'currency', label: 'Валюта', type: 'select',
              options: [{ value: 'RUB', label: 'RUB' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }],
            },
          ]}
          onClose={() => { setShowSOModal(false); setEditingSO(null); }}
          onSave={(data) => handleSaveSupplierOrder(data)}
        />
      )}

      {/* Equipment Modal */}
      {showEqModal && (
        <FinanceModal
          title={editingEq ? 'Оборудование' : 'Добавить оборудование'}
          saving={savingResource}
          initialData={editingEq ? {
            name: editingEq.name,
            equipmentType: editingEq.equipmentType,
            model: editingEq.model,
            serialNumber: editingEq.serialNumber,
            status: editingEq.status,
          } : undefined}
          fields={[
            { key: 'name', label: 'Название', type: 'text', required: true },
            {
              key: 'equipmentType', label: 'Тип', type: 'select',
              options: [
                { value: 'machinery', label: 'Спецтехника' },
                { value: 'vehicle', label: 'Транспорт' },
                { value: 'tool', label: 'Инструмент' },
              ],
            },
            { key: 'model', label: 'Модель', type: 'text' },
            { key: 'serialNumber', label: 'Серийный номер', type: 'text' },
            {
              key: 'status', label: 'Статус', type: 'select',
              options: Object.entries(EQUIPMENT_STATUS).map(([v, s]) => ({ value: Number(v), label: s.label })),
            },
          ]}
          onClose={() => { setShowEqModal(false); setEditingEq(null); }}
          onSave={(data) => handleSaveEquipment(data)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ProjectFormModal project={project} onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setShowEditModal(false);
            addToast('success', 'Проект обновлён');
            if (updated) {
              setProject(updated);
              setNotesText(updated?.settings?.notes || '');
            } else {
              api.get(`/projects/${projectId}`)
                .then((r) => { setProject(r.data); setNotesText(r.data?.settings?.notes || ''); })
                .catch(() => {});
            }
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
          onAssign={async (user, role) => { await handleAssignEmployee(user, role); setShowAssignEmployee(false); }}
          onClose={() => setShowAssignEmployee(false)}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          projectId={projectId}
          projectMembers={assignments}
          onCreated={async (newTask) => {
            setShowCreateTask(false);
            if (newTask?.id) setTasks((prev) => [...prev, newTask]);
            addToast('success', 'Задача создана');
            reloadTasks(true);
          }}
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
          projectMembers={assignments}
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

      {previewDoc?.fileUrl && (
        <FilePreviewModal
          fileUrl={previewDoc.fileUrl}
          fileName={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <FinanceModal
          title={editingPayment ? 'Редактировать платёж' : 'Новый платёж'}
          saving={savingFinance}
          onClose={() => { setShowPaymentModal(false); setEditingPayment(null); }}
          onSave={(data) => handleSavePayment(data as Omit<Payment, 'id'>)}
          fields={[
            { key: 'paymentNumber', label: 'Номер платежа', type: 'text', required: true },
            { key: 'paymentType', label: 'Направление', type: 'select', required: true, options: PAYMENT_DIRECTION },
            { key: 'amount', label: 'Сумма', type: 'number', required: true },
            { key: 'paymentDate', label: 'Дата платежа', type: 'date', required: true },
            { key: 'category', label: 'Категория', type: 'text' },
            { key: 'status', label: 'Статус', type: 'select', options: Object.entries(PAYMENT_STATUS).map(([v, s]) => ({ value: Number(v), label: s.label })) },
            { key: 'description', label: 'Описание', type: 'textarea' },
          ]}
          initialData={editingPayment ? editingPayment as unknown as Record<string, unknown> : undefined}
        />
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <FinanceModal
          title={editingBudget ? 'Редактировать бюджет' : 'Новый бюджет'}
          saving={savingFinance}
          onClose={() => { setShowBudgetModal(false); setEditingBudget(null); }}
          onSave={(data) => handleSaveBudget(data as Omit<Budget, 'id'>)}
          fields={[
            { key: 'budgetName', label: 'Название бюджета', type: 'text', required: true },
            { key: 'totalBudget', label: 'Общий бюджет', type: 'number', required: true },
            { key: 'allocatedAmount', label: 'Выделено', type: 'number' },
            { key: 'spentAmount', label: 'Потрачено', type: 'number' },
            { key: 'startDate', label: 'Дата начала', type: 'date' },
            { key: 'endDate', label: 'Дата окончания', type: 'date' },
            { key: 'status', label: 'Статус', type: 'select', options: Object.entries(BUDGET_STATUS).map(([v, s]) => ({ value: Number(v), label: s.label })) },
          ]}
          initialData={editingBudget ? editingBudget as unknown as Record<string, unknown> : undefined}
        />
      )}

      {/* Act Modal */}
      {showActModal && (
        <FinanceModal
          title={editingAct ? 'Редактировать акт' : 'Новый акт'}
          saving={savingFinance}
          onClose={() => { setShowActModal(false); setEditingAct(null); }}
          onSave={(data) => handleSaveAct(data as Omit<Act, 'id'>)}
          fields={[
            { key: 'actNumber', label: 'Номер акта', type: 'text', required: true },
            { key: 'actDate', label: 'Дата акта', type: 'date', required: true },
            { key: 'actType', label: 'Тип акта', type: 'text' },
            { key: 'totalAmount', label: 'Сумма', type: 'number' },
            { key: 'status', label: 'Статус', type: 'select', options: Object.entries(ACT_STATUS).map(([v, s]) => ({ value: Number(v), label: s.label })) },
            { key: 'description', label: 'Описание', type: 'textarea' },
          ]}
          initialData={editingAct ? editingAct as unknown as Record<string, unknown> : undefined}
        />
      )}

      {/* ── Inactive project modal ── */}
      {showInactiveModal && project && (() => {
        const daysInactive = project.updatedAt
          ? Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 14;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto mb-4">
                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
                Проект неактивен
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
                Проект <span className="font-medium text-gray-700 dark:text-gray-300">«{project.name}»</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                не обновлялся <span className="font-semibold text-amber-600 dark:text-amber-400">{daysInactive} {daysInactive === 1 ? 'день' : daysInactive < 5 ? 'дня' : 'дней'}</span>.
                Хотите завершить его?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCloseProjectInactive}
                  disabled={closingProject}
                  className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {closingProject ? 'Завершаем...' : 'Завершить проект'}
                </button>
                <button
                  onClick={handleDismissInactiveModal}
                  className="w-full py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl transition-colors">
                  Отложить на неделю
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
  onAssign: (user: UserOption, role?: string) => Promise<void>;
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
                    onClick={async () => { setAssigning(user.id); await onAssign(user, roleInput || undefined); setAssigning(null); }}
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

function ProjectChatPanel({ channelId, channelName, projectId, projectMembers = [], onFilesSent, onBack }: { channelId: number; channelName: string; projectId?: number; projectMembers?: Assignment[]; onFilesSent?: (attachments: any[]) => void; onBack?: () => void }) {
  const connect = useChatStore((s) => s.connect);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const messages = useChatStore((s) => s.messages);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const channelReadAts = useChatStore((s) => s.channelReadAts);
  const setReplyToMessage = useChatStore((s) => s.setReplyToMessage);
  const deleteMessageSocket = useChatStore((s) => s.deleteMessage);
  const reactToMessage = useChatStore((s) => s.reactToMessage);
  const pinMessageSocket = useChatStore((s) => s.pinMessage);
  const unpinMessageSocket = useChatStore((s) => s.unpinMessage);
  const channels = useChatStore((s) => s.channels);
  const setChatWindowOpen = useChatStore((s) => s.setChatWindowOpen);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setChatWindowOpen(true);
    return () => setChatWindowOpen(false);
  }, [setChatWindowOpen]);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(true);
  const prevLenRef = useRef(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<{ id: number; name: string; email: string; avatarUrl?: string; role?: string; isMuted?: boolean }[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [mutingId, setMutingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [projectMemberOptions, setProjectMemberOptions] = useState<{ id: number; name: string; email: string; avatarUrl?: string }[]>([]);
  const [loadingProjectMembers, setLoadingProjectMembers] = useState(false);
  const [addingUserId, setAddingUserId] = useState<number | null>(null);

  const membersCount = channels.find((c) => c.id === channelId)?.membersCount ?? 0;
  const activeChannel = channels.find((c) => c.id === channelId);
  const currentMemberRole = activeChannel?.members?.find((m) => m.id === user?.id)?.role;
  const isCurrentUserAdmin = currentMemberRole === 'admin';
  const canPin = activeChannel?.channelType === 'direct' || isCurrentUserAdmin;
  const pinnedMessages = activeChannel?.pinnedMessages ?? [];
  const [pinnedIndex, setPinnedIndex] = useState(0);

  useEffect(() => {
    setPinnedIndex(pinnedMessages.length > 0 ? pinnedMessages.length - 1 : 0);
  }, [channelId, pinnedMessages.length]);

  const currentPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedIndex] : null;

  const handlePin = useCallback((msg: any) => {
    const alreadyPinned = pinnedMessages.some((p: any) => p.id === msg.id);
    if (alreadyPinned) {
      unpinMessageSocket(channelId, msg.id);
    } else {
      pinMessageSocket(channelId, msg.id, msg.text, msg.senderName);
    }
  }, [channelId, pinnedMessages, pinMessageSocket, unpinMessageSocket]);

  const handleDeleteMessage = useCallback(async (msg: any) => {
    if (msg.attachments && msg.attachments.length > 0) {
      await Promise.allSettled(
        msg.attachments.map((att: any) => {
          const filename = att.fileUrl?.split('/').pop();
          if (!filename) return Promise.resolve();
          return api.delete(`/chat-channels/upload/${filename}`).catch(() => {});
        })
      );
    }
    deleteMessageSocket(msg.id);
  }, [deleteMessageSocket]);

  const loadParticipants = useCallback(async () => {
    setLoadingParticipants(true);
    try {
      const r = await api.get(`/chat-channels/${channelId}/members`);
      const list = r.data?.members || r.data?.data || r.data || [];
      setParticipants(Array.isArray(list) ? list.map((m: any) => ({
        id: m.userId || m.user?.id || m.id,
        name: m.user?.name || m.name || `#${m.userId || m.id}`,
        email: m.user?.email || m.email || '',
        avatarUrl: m.user?.avatarUrl || m.avatarUrl,
        role: m.role,
        isMuted: m.isMuted ?? false,
      })) : []);
    } catch { setParticipants([]); }
    finally { setLoadingParticipants(false); }
  }, [channelId]);

  const handleMuteMember = useCallback(async (memberId: number, currentlyMuted: boolean) => {
    setMutingId(memberId);
    try {
      await api.patch(`/chat-channels/${channelId}/members/${memberId}`, { isMuted: !currentlyMuted });
      setParticipants((prev) => prev.map((p) => p.id === memberId ? { ...p, isMuted: !currentlyMuted } : p));
    } catch { /* ignore */ }
    finally { setMutingId(null); }
  }, [channelId]);

  const handleRemoveMember = useCallback(async (memberId: number, memberName: string) => {
    setRemovingId(memberId);
    try {
      await api.delete(`/chat-channels/${channelId}/members/${memberId}`);
      await api.post('/notifications', {
        userId: memberId,
        title: 'Вас удалили из чата',
        message: `Вы были удалены из канала "${channelName}"`,
        notificationType: 'system_alert',
        channels: ['in_app'],
        priority: 2,
      }).catch(() => {});
      setParticipants((prev) => prev.filter((p) => p.id !== memberId));
      setProjectMemberOptions((prev) => {
        const already = prev.find((m) => m.id === memberId);
        if (already) return prev;
        return [...prev, { id: memberId, name: memberName, email: '' }];
      });
    } catch { /* ignore */ }
    finally { setRemovingId(null); }
  }, [channelId, channelName]);

  const loadProjectMembers = useCallback(async () => {
    if (!projectId) return;
    setLoadingProjectMembers(true);
    try {
      const inChat = new Set(participants.map((p) => p.id));
      if (projectMembers.length > 0) {
        setProjectMemberOptions(
          projectMembers
            .filter((a) => a.userId && !inChat.has(a.userId))
            .map((a) => ({
              id: a.userId,
              name: a.userName || `#${a.userId}`,
              email: a.userEmail || '',
              avatarUrl: a.userAvatarUrl,
            }))
        );
      } else {
        const r = await api.get(`/projects/${projectId}/assignments`);
        const raw = r.data?.assignments || r.data?.data || r.data || [];
        const enriched = await enrichAssignments(raw);
        setProjectMemberOptions(
          enriched
            .filter((a: any) => { const uid = a.userId || a.user?.id; return uid && !inChat.has(uid); })
            .map((a: any) => ({
              id: a.userId || a.user?.id,
              name: a.userName || a.user?.name || a.name || `#${a.userId}`,
              avatarUrl: a.userAvatarUrl || a.user?.avatarUrl,
              email: a.userEmail || a.user?.email || a.email || '',
            }))
        );
      }
    } catch { setProjectMemberOptions([]); }
    finally { setLoadingProjectMembers(false); }
  }, [projectId, participants, projectMembers]);

  const handleAddMember = useCallback(async (userId: number) => {
    setAddingUserId(userId);
    try {
      await api.post(`/chat-channels/${channelId}/members`, { userId });
      await loadParticipants();
      setProjectMemberOptions((prev) => prev.filter((m) => m.id !== userId));
    } catch { /* ignore */ }
    finally { setAddingUserId(null); }
  }, [channelId, loadParticipants]);

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

  const getMessageReaders = useCallback((msg: any): { id: number; name: string; avatarUrl?: string }[] => {
    if (msg.senderId !== user?.id) return [];
    const reads = channelReadAts[channelId] || {};
    const members = activeChannel?.members || [];
    return Object.entries(reads)
      .filter(([uid, readAt]) => Number(uid) !== user?.id && new Date(readAt as string) >= new Date(msg.createdAt))
      .map(([uid]) => {
        const m = members.find((mb: any) => mb.id === Number(uid));
        return m ? { id: m.id, name: m.name || m.email || 'Пользователь', avatarUrl: m.avatarUrl } : null;
      })
      .filter(Boolean) as { id: number; name: string; avatarUrl?: string }[];
  }, [channelId, channelReadAts, user?.id, activeChannel?.members]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="sm:hidden p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors -ml-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
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
          {/* Panel header */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Участники чата</h3>
            <div className="flex items-center gap-1">
              {(() => {
                const role = participants.find((p) => p.id === user?.id)?.role;
                return (role === 'admin' || role === 'owner') && projectId ? (
                  <button
                    onClick={() => { setShowAddMember((v) => !v); if (!showAddMember) loadProjectMembers(); }}
                    className={`p-1.5 rounded-lg transition-colors ${showAddMember ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
                    title="Добавить участника"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </button>
                ) : null;
              })()}
              <button
                onClick={() => { setShowParticipants(false); setShowAddMember(false); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Add member from project */}
          {showAddMember && (
            <div className="px-4 pt-3 pb-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Добавить из проекта</p>
              {loadingProjectMembers ? (
                <div className="text-xs text-gray-400 text-center py-2">Загрузка...</div>
              ) : projectMemberOptions.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-2">Все участники проекта уже в чате</div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {projectMemberOptions.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-xs font-medium text-sky-700 dark:text-sky-300 shrink-0 relative overflow-hidden">
                        {m.name.charAt(0).toUpperCase()}
                        {m.avatarUrl && (
                          <img src={m.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 dark:text-gray-100 truncate">{m.name}</div>
                        {m.email && <div className="text-xs text-gray-400 truncate">{m.email}</div>}
                      </div>
                      <button
                        onClick={() => handleAddMember(m.id)}
                        disabled={addingUserId === m.id}
                        className="shrink-0 px-2.5 py-1 text-xs bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                      >
                        {addingUserId === m.id ? '...' : 'Добавить'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members list */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingParticipants ? (
              <div className="text-center text-sm text-gray-400 py-8">Загрузка...</div>
            ) : participants.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-8">Нет участников</div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const DELETED_RE = /^deleted_\d+_\d+@crm\.deleted$/;
                  const currentUserRole = participants.find((p) => p.id === user?.id)?.role;
                  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';
                  return participants.map((p) => {
                    const isDeleted = DELETED_RE.test(p.email ?? '');
                    const displayName = isDeleted ? 'Удалённый пользователь' : p.name;
                    return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 relative overflow-hidden ${isDeleted ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'}`}>
                        {isDeleted ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          p.name.charAt(0).toUpperCase()
                        )}
                        {!isDeleted && p.avatarUrl && (
                          <img src={p.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isDeleted ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-800 dark:text-gray-100'}`}>{displayName}</div>
                      </div>
                      {!isDeleted && p.role && p.role !== 'member' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
                          p.role === 'admin' || p.role === 'owner'
                            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {p.role === 'admin' ? 'Администратор' : p.role === 'owner' ? 'Владелец' : p.role}
                        </span>
                      )}
                      {isAdmin && p.id !== user?.id && !isDeleted && (
                        <>
                          {/* Mute/unmute */}
                          <button
                            onClick={() => handleMuteMember(p.id, p.isMuted ?? false)}
                            disabled={mutingId === p.id}
                            title={p.isMuted ? 'Снять мьют' : 'Замьютить'}
                            className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                              p.isMuted
                                ? 'text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } disabled:opacity-50`}
                          >
                            {mutingId === p.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                            ) : p.isMuted ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                            )}
                          </button>
                          {/* Remove from chat */}
                          <button
                            onClick={() => handleRemoveMember(p.id, p.name)}
                            disabled={removingId === p.id}
                            title="Удалить из чата"
                            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          >
                            {removingId === p.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                              </svg>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Pinned message banner */}
      {currentPinned && (
        <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800/40 shrink-0">
          <div className="w-0.5 self-stretch bg-violet-400 rounded-full shrink-0" />
          <button
            className="flex-1 min-w-0 text-left"
            onClick={() => {
              const el = containerRef.current?.querySelector(`[data-msgid="${currentPinned.id}"]`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              if (pinnedMessages.length > 1) setPinnedIndex((i) => (i - 1 + pinnedMessages.length) % pinnedMessages.length);
            }}
          >
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
              {pinnedMessages.length > 1 ? `Закреплённое · ${pinnedIndex + 1}/${pinnedMessages.length}` : 'Закреплённое сообщение'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{currentPinned.text}</p>
          </button>
          {canPin && (
            <button
              onClick={() => unpinMessageSocket(channelId, currentPinned.id)}
              className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              title="Открепить"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50 dark:bg-gray-900">
        {isLoadingMessages && <div className="text-center text-xs text-gray-400 py-2">Загрузка...</div>}
        {!isLoadingMessages && messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-12">Нет сообщений. Начните диалог!</p>
        )}
        {messages.map((msg, idx) => {
          const prev = messages[idx - 1];
          const showAvatar = !prev || prev.senderId !== msg.senderId;
          const isMsgPinned = pinnedMessages.some((p: any) => p.id === msg.id);
          return (
            <ChatMessageComponent
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === user?.id}
              showAvatar={showAvatar}
              isRead={isMessageRead(msg)}
              readers={getMessageReaders(msg)}
              onReply={() => setReplyToMessage(msg)}
              onReact={reactToMessage}
              onDelete={handleDeleteMessage}
              onPin={canPin ? handlePin : undefined}
              isPinned={isMsgPinned}
              canPin={canPin}
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
  projectId, projectMembers, onCreated, onClose,
}: {
  projectId: number;
  projectMembers: Assignment[];
  onCreated: (task?: any) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(2);
  const [status, setStatus] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState<number | ''>('');
  const [members, setMembers] = useState<Assignment[]>(projectMembers);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (projectMembers.length > 0 && projectMembers.some((m) => m.userName)) {
      setMembers(projectMembers);
      return;
    }
    api.get(`/projects/${projectId}/assignments`)
      .then(async (r) => {
        const d = r.data?.assignments || r.data?.data || r.data || [];
        const raw: Assignment[] = Array.isArray(d) ? d : [];
        setMembers(await enrichAssignments(raw));
      })
      .catch(() => setMembers(projectMembers));
  }, [projectId, projectMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/tasks', {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        priority,
        status,
        dueDate: dueDate || undefined,
        assignedToUserId: assignedToUserId || undefined,
      });
      const newTask = res.data;
      // Populate taskAssignee junction so assignees column shows immediately
      if (assignedToUserId && newTask?.id) {
        const member = members.find((m) => m.userId === Number(assignedToUserId));
        await api.post(`/tasks/${newTask.id}/assignees`, {
          assignees: [{ userId: Number(assignedToUserId), userName: member?.userName }],
        }).catch(() => {});
      }
      onCreated(newTask);
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
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userName || `Пользователь #${m.userId}`}{m.userEmail ? ` (${m.userEmail})` : ''}
              </option>
            ))}
          </select>
          {members.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">Сначала добавьте сотрудников в проект на вкладке «Команда»</p>
          )}
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
  task, projectId, projectMembers, onSaved, onDeleted, onClose,
}: {
  task: Task;
  projectId: number;
  projectMembers: Assignment[];
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
  const [members, setMembers] = useState<Assignment[]>(projectMembers);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (projectMembers.length > 0 && projectMembers.some((m) => m.userName)) {
      setMembers(projectMembers);
      return;
    }
    api.get(`/projects/${projectId}/assignments`)
      .then(async (r) => {
        const d = r.data?.assignments || r.data?.data || r.data || [];
        const raw: Assignment[] = Array.isArray(d) ? d : [];
        setMembers(await enrichAssignments(raw));
      })
      .catch(() => setMembers(projectMembers));
  }, [projectId, projectMembers]);

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
      // Sync taskAssignee table so the assignees column updates immediately
      const assigneeList = assignedToUserId
        ? [{ userId: Number(assignedToUserId), userName: members.find((m) => m.userId === Number(assignedToUserId))?.userName }]
        : [];
      await api.post(`/tasks/${task.id}/assignees`, { assignees: assigneeList }).catch(() => {});
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
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userName || `Пользователь #${m.userId}`}{m.userEmail ? ` (${m.userEmail})` : ''}
              </option>
            ))}
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
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const fetchUserTasks = async () => {
      try {
        const r = await api.get('/tasks', { params: { projectId, limit: 200 } });
        const all: any[] = r.data?.data || r.data?.tasks || [];
        const uid = Number(assignment.userId);
        setUserTasks(
          all.filter((t) => {
            if (Number(t.assignedToUserId) === uid) return true;
            if (Array.isArray(t.assignees) && t.assignees.some((a: any) => Number(a.userId) === uid)) return true;
            return Number(t.assigneeId) === uid || Number(t.userId) === uid;
          })
        );
      } catch {
        setUserTasks([]);
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchUserTasks();
  }, [assignment.userId, projectId]);

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
          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-base font-semibold text-violet-700 dark:text-violet-300 shrink-0 relative overflow-hidden">
            {(assignment.userName || '?').charAt(0).toUpperCase()}
            {assignment.userAvatarUrl && (
              <img src={assignment.userAvatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
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

        {/* Tasks section */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Задачи сотрудника
          </div>
          {loadingTasks ? (
            <div className="text-xs text-gray-400 py-2">Загрузка...</div>
          ) : userTasks.length === 0 ? (
            <div className="text-xs text-gray-400 py-2">Нет задач в этом проекте</div>
          ) : (
            <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {userTasks.map((t) => {
                const ts = TASK_STATUS[t.status ?? 0] || TASK_STATUS[0];
                const tp = TASK_PRIORITY[t.priority ?? 2] || TASK_PRIORITY[2];
                return (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-xs bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2">
                    <span className="text-gray-800 dark:text-gray-100 font-medium truncate">{t.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${ts.color}`}>{ts.label}</span>
                      <span className={`text-xs font-medium ${tp.color}`}>{tp.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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

  const url = document.fileUrl || '';
  const mime = document.fileType || '';
  const isImg = mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
  const isVid = mime.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(url);
  const isPdf = mime === 'application/pdf' || /\.pdf(\?|$)/i.test(url);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview */}
        <div className="flex-1 min-h-[200px] md:min-h-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
          {isVid ? (
            <video src={url} controls autoPlay className="max-w-full max-h-full" style={{ maxHeight: '70vh' }} />
          ) : isImg ? (
            <img src={url} alt={document.title} className="max-w-full max-h-full object-contain" style={{ maxHeight: '70vh' }} />
          ) : isPdf ? (
            <iframe src={url} className="w-full h-full" style={{ minHeight: '400px' }} title={document.title} />
          ) : (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="text-6xl">📄</span>
              <p className="text-sm text-gray-400">Предпросмотр недоступен</p>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="w-full md:w-72 shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Информация</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Название</p>
              <p className="text-sm text-gray-800 dark:text-gray-100 break-words">{document.title}</p>
            </div>
            {document.documentType && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Тип</p>
                <p className="text-sm text-gray-800 dark:text-gray-100">{DOC_TYPE_LABELS[document.documentType] || document.documentType}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">Размер</p>
              <p className="text-sm text-gray-800 dark:text-gray-100">{fmtSize(document.fileSize) || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Дата загрузки</p>
              <p className="text-sm text-gray-800 dark:text-gray-100">{fmt(document.createdAt)}</p>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 dark:border-gray-700 space-y-2">
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Скачать
              </a>
            )}
            {confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                  {deleting ? '...' : 'Да, удалить'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  Отмена
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-xl transition-colors border border-red-200 dark:border-red-800/50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Удалить документ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Finance Modal ─── */

interface FinanceField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required?: boolean;
  options?: { value: number | string; label: string }[];
}

function FinanceModal({ title, fields, initialData, saving, onClose, onSave }: {
  title: string;
  fields: FinanceField[];
  initialData?: Record<string, unknown>;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const f of fields) {
      if (initialData && initialData[f.key] != null) {
        if (f.type === 'date' && typeof initialData[f.key] === 'string') {
          defaults[f.key] = (initialData[f.key] as string).slice(0, 10);
        } else {
          defaults[f.key] = initialData[f.key];
        }
      } else if (f.type === 'select' && f.options?.length) {
        defaults[f.key] = f.options[0].value;
      } else {
        defaults[f.key] = f.type === 'number' ? '' : '';
      }
    }
    return defaults;
  });

  const set = (key: string, val: unknown) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.key];
      if (v === '' || v == null) continue;
      data[f.key] = f.type === 'number' ? Number(v) : v;
    }
    onSave(data);
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50";

  return (
    <ModalShell title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea rows={3} className={inputCls} value={String(form[f.key] ?? '')}
                  onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === 'select' ? (
                <select className={inputCls} value={String(form[f.key] ?? '')}
                  onChange={(e) => {
                    const opt = f.options?.find((o) => String(o.value) === e.target.value);
                    set(f.key, opt ? opt.value : e.target.value);
                  }}>
                  {f.options?.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                </select>
              ) : (
                <input type={f.type} required={f.required} className={inputCls}
                  value={String(form[f.key] ?? '')}
                  onChange={(e) => set(f.key, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Отмена
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
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

/* ─── Modal: Create Project Channel ─── */

function AvatarPicker({ preview, onFile, onClear }: { preview: string | null; onFile: (f: File) => void; onClear: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3 mb-3">
      <button type="button" onClick={() => ref.current?.click()}
        className="relative w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 overflow-hidden border-2 border-dashed border-violet-300 dark:border-violet-700 hover:border-violet-500 transition-colors"
        title="Загрузить аватар">
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover" />
          : <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        }
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {preview && (
        <button type="button" onClick={onClear} className="text-xs text-red-400 hover:text-red-600 transition-colors">Удалить фото</button>
      )}
    </div>
  );
}

function ProjectChannelCreateModal({
  projectId, projectName, projectMembers, onCreated, onClose,
}: {
  projectId: number;
  projectName: string;
  projectMembers: Assignment[];
  onCreated: (channel: ChatChannel) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Assignment[]>(projectMembers);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (projectMembers.length > 0 && projectMembers.some((m) => m.userName)) {
      setMembers(projectMembers.filter((m) => !!m.userName));
      return;
    }
    api.get(`/projects/${projectId}/assignments`)
      .then(async (r) => {
        const d = r.data?.assignments || r.data?.data || r.data || [];
        const raw: Assignment[] = Array.isArray(d) ? d : [];
        const enriched = await enrichAssignments(raw);
        setMembers(enriched.filter((m) => !!m.userName));
      })
      .catch(() => {});
  }, [projectId, projectMembers]);

  const toggleMember = (userId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        try {
          const fd = new FormData();
          fd.append('files', avatarFile);
          const { data: up } = await api.post('/chat-channels/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          avatarUrl = Array.isArray(up) ? up[0]?.fileUrl : (up.fileUrl || up.url);
        } catch { /* ignore */ }
      }

      const r = await api.post('/chat-channels', {
        name: name.trim(),
        channelType: 'group',
        projectId,
        memberIds: selectedMemberIds,
        settings: { projectName },
        avatarUrl,
      });
      const raw = r.data;
      onCreated({
        id: raw.id,
        name: raw.name,
        channelName: raw.channelName ?? raw.name ?? '',
        projectId: raw.projectId,
        membersCount: raw.members?.length ?? raw._count?.members ?? 0,
        avatarUrl,
      });
    } catch {
      addToast('error', 'Не удалось создать канал');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Новый канал" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Название канала *</label>
          <div className="flex items-center gap-3">
            <AvatarPicker
              preview={avatarPreview}
              onFile={(f) => { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }}
              onClear={() => { setAvatarFile(null); setAvatarPreview(null); }}
            />
            <input
              value={name} onChange={(e) => setName(e.target.value)} required autoFocus
              placeholder={`Например: Общий ${projectName}`}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Участники{' '}
            <span className="text-violet-500">{selectedMemberIds.length > 0 ? `(${selectedMemberIds.length} выбрано)` : '— только участники проекта'}</span>
          </label>
          {members.length === 0 ? (
            <p className="text-xs text-gray-400">Нет участников в проекте</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {members.map((m) => {
                const checked = selectedMemberIds.includes(m.userId);
                return (
                  <label key={m.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggleMember(m.userId)}
                      className="rounded text-violet-500 focus:ring-violet-500" />
                    <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-semibold text-violet-700 dark:text-violet-300 shrink-0">
                      {(m.userName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{m.userName || `#${m.userId}`}</p>
                      {m.userEmail && <p className="text-xs text-gray-400 truncate">{m.userEmail}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors">Отмена</button>
          <button type="submit" disabled={saving || !name.trim()}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ProjectChannelEditModal({
  channel, onSaved, onClose,
}: {
  channel: ChatChannel;
  onSaved: (updated: Partial<ChatChannel> & { id: number }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(channel.channelName || channel.name || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(channel.avatarUrl || null);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      let avatarUrl = channel.avatarUrl;
      if (avatarFile) {
        try {
          const fd = new FormData();
          fd.append('files', avatarFile);
          const { data: up } = await api.post('/chat-channels/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          avatarUrl = Array.isArray(up) ? up[0]?.fileUrl : (up.fileUrl || up.url);
        } catch { /* ignore */ }
      }

      await api.put(`/chat-channels/${channel.id}`, { name: name.trim(), avatarUrl });
      addToast('success', 'Канал обновлён');
      onSaved({ id: channel.id, channelName: name.trim(), name: name.trim(), avatarUrl });
    } catch {
      addToast('error', 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Редактировать канал" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Название канала *</label>
          <div className="flex items-center gap-3">
            <AvatarPicker
              preview={avatarPreview}
              onFile={(f) => { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }}
              onClear={() => { setAvatarFile(null); setAvatarPreview(null); }}
            />
            <input
              value={name} onChange={(e) => setName(e.target.value)} required autoFocus
              placeholder="Название канала"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors">Отмена</button>
          <button type="submit" disabled={saving || !name.trim()}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
