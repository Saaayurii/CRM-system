'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import QRCode from 'qrcode';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import ProjectFormModal from '@/components/dashboard/ProjectFormModal';
import TaskFormModal from '@/components/dashboard/TaskFormModal';
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
  code?: string;
  siteType?: string;
  address?: string;
  description?: string;
  status?: number | string;
  foremanId?: number;
  startDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  areaSize?: number;
  photos?: string[];
  projectId?: number;
  createdAt?: string;
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
  projectId?: number;
  assignedToUserId?: number;
  attachments?: any[];
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
  1: { label: 'Назначена', color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400' },
  2: { label: 'В работе', color: 'bg-violet-500/20 text-violet-700 dark:text-violet-400' },
  3: { label: 'На проверке', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  4: { label: 'Завершена', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  5: { label: 'Отменена', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
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
  { key: 'objects', label: 'Объекты' },
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

interface Warehouse {
  id: number;
  name: string;
  address?: string;
  accountId?: number;
  equipment?: Equipment[];
  createdAt?: string;
}

interface InventoryItem {
  id: number;
  inventorySessionId: number;
  equipmentId: number;
  equipment?: { id: number; name: string; serialNumber?: string; status?: number; equipmentType?: string };
  warehouseId?: number;
  warehouse?: { id: number; name: string };
  expectedStatus?: number;
  actualStatus?: number;
  isFound: boolean;
  notes?: string;
}

interface InventorySession {
  id: number;
  name: string;
  projectId?: number;
  accountId?: number;
  status: number;
  scheduledDate?: string;
  completedDate?: string;
  createdByUserId?: number;
  notes?: string;
  items?: InventoryItem[];
  createdAt?: string;
}

interface Equipment {
  id: number;
  name: string;
  equipmentType?: string;
  status?: number;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  currentLocation?: string;
  warehouseId?: number;
  warehouse?: { id: number; name: string };
  purchaseDate?: string;
  purchaseCost?: number;
  assignedToUserId?: number;
  notes?: string;
}

interface EquipmentMaintenance {
  id: number;
  equipmentId: number;
  equipment?: { id: number; name: string };
  maintenanceType?: string;
  maintenanceDate: string;
  performedByUserId?: number;
  description?: string;
  cost?: number;
  nextMaintenanceDate?: string;
  createdAt?: string;
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

const INV_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Черновик',   color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  1: { label: 'В процессе', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  2: { label: 'Завершена',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
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

interface WorkTemplate {
  id: number;
  name: string;
  code?: string;
  category?: string;
  description?: string;
  unit?: string;
  estimatedCost?: number;
  estimatedDuration?: number;
  complexityLevel?: number;
  isActive?: boolean;
}

interface ProposalLine {
  id: number;
  workTemplateId?: number;
  serviceName: string;
  serviceDesc?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  workStatus: string;
  factQuantity?: number;
  sortOrder: number;
}

interface CommercialProposal {
  id: number;
  proposalNumber: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  objectAddress?: string;
  objectComment?: string;
  managerName?: string;
  status: string;
  totalAmount: number;
  notes?: string;
  projectId?: number;
  createdAt: string;
  lines: ProposalLine[];
}

const PROPOSAL_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Черновик',    color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  sent:     { label: 'Отправлен',   color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  accepted: { label: 'Принят',      color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  rejected: { label: 'Отклонён',   color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

const WORK_STATUS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Не начато',  color: 'bg-gray-500/20 text-gray-500 dark:text-gray-400' },
  in_progress: { label: 'В работе',   color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
  done:        { label: 'Выполнено',  color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
};

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

function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToast = useToastStore((s) => s.addToast);
  const projectId = Number(id);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const fetchProjectChannels = useChatStore((s) => s.fetchProjectChannels);
  const createChannelInStore = useChatStore((s) => s.createChannel);

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tab = searchParams.get('tab') as TabKey | null;
    return tab && TABS.some((t) => t.key === tab) ? tab : 'overview';
  });
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
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
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
  const [photoTypeFilter, setPhotoTypeFilter] = useState<'all'|'image'|'video'>('all');
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
  const [financeSubTab, setFinanceSubTab] = useState<'overview' | 'payments' | 'budgets' | 'acts' | 'price' | 'proposals'>('overview');
  /* Price list (work templates) */
  const [priceItems, setPriceItems] = useState<WorkTemplate[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [priceSearch, setPriceSearch] = useState('');
  const [priceCategoryFilter, setPriceCategoryFilter] = useState('');
  const [priceCategories, setPriceCategories] = useState<string[]>([]);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<WorkTemplate | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);
  /* Commercial proposals */
  const [proposals, setProposals] = useState<CommercialProposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [proposalsLoaded, setProposalsLoaded] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<CommercialProposal | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [savingProposal, setSavingProposal] = useState(false);
  const [proposalDetailsOpen, setProposalDetailsOpen] = useState(true);
  const [proposalLineSearch, setProposalLineSearch] = useState('');
  const [showProposalDocument, setShowProposalDocument] = useState(false);
  const [kpAddSource, setKpAddSource] = useState<'price' | 'tasks' | 'manual'>('price');
  const [closedTasks, setClosedTasks] = useState<Task[]>([]);
  const [closedTasksLoaded, setClosedTasksLoaded] = useState(false);
  const [closedTasksLoading, setClosedTasksLoading] = useState(false);
  const [taskPrices, setTaskPrices] = useState<Record<number, string>>({});
  const [manualLine, setManualLine] = useState({ serviceName: '', unit: '', quantity: '1', unitPrice: '' });

  /* Resources tab */
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [maintenanceList, setMaintenanceList] = useState<EquipmentMaintenance[]>([]);
  const [warehousesList, setWarehousesList] = useState<Warehouse[]>([]);
  const [inventorySessions, setInventorySessions] = useState<InventorySession[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [resourceSubTab, setResourceSubTab] = useState<'materials' | 'orders' | 'equipment' | 'maintenance' | 'warehouses' | 'history' | 'inventory'>('materials');
  const [detailEquipment, setDetailEquipment] = useState<Equipment | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [warehouseSubTab, setWarehouseSubTab] = useState<string>('');
  const [savingResource, setSavingResource] = useState(false);
  /* Material request modal */
  const [showMRModal, setShowMRModal] = useState(false);
  const [editingMR, setEditingMR] = useState<MaterialRequest | null>(null);
  /* Supplier order modal */
  const [showSOModal, setShowSOModal] = useState(false);
  const [editingSO, setEditingSO] = useState<SupplierOrder | null>(null);
  const [suppliersList, setSuppliersList] = useState<{ id: number; name: string }[]>([]);
  /* Maintenance modal */
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [editingMaint, setEditingMaint] = useState<EquipmentMaintenance | null>(null);
  /* Equipment modal */
  const [showEqModal, setShowEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);
  /* Inventory modal */
  const [showInvModal, setShowInvModal] = useState(false);
  const [editingInv, setEditingInv] = useState<InventorySession | null>(null);
  const [detailInventory, setDetailInventory] = useState<InventorySession | null>(null);
  const [showInvItemModal, setShowInvItemModal] = useState(false);
  const [savingInvItem, setSavingInvItem] = useState(false);
  /* Warehouse modal */
  const [showWHModal, setShowWHModal] = useState(false);
  const [editingWH, setEditingWH] = useState<Warehouse | null>(null);
  const [savingWH, setSavingWH] = useState(false);
  const [whSearch, setWhSearch] = useState('');

  /* Objects tab */
  const [objectsList, setObjectsList] = useState<ConstructionSite[]>([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectsLoaded, setObjectsLoaded] = useState(false);
  const [showObjectModal, setShowObjectModal] = useState(false);
  const [editingObject, setEditingObject] = useState<ConstructionSite | null>(null);
  const [objectSaving, setObjectSaving] = useState(false);

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
      const [tasksRes, usersRes] = await Promise.all([
        api.get('/tasks', { params: { projectId, limit: 100 } }),
        api.get('/users', { params: { limit: 500 } }),
      ]);
      const raw = tasksRes.data?.tasks || tasksRes.data?.data || tasksRes.data || [];
      const users: any[] = usersRes.data?.data || usersRes.data?.users || usersRes.data || [];
      const userMap = new Map<number, string>(users.map((u: any) => [u.id, u.name || u.email]));
      const enriched = (Array.isArray(raw) ? raw : []).map((task: any) => ({
        ...task,
        assignees: (task.assignees || []).map((a: any) => ({
          ...a,
          userName: a.userName || userMap.get(a.userId) || null,
        })),
      }));
      setTasks(enriched);
      setTasksLoaded(true);
    } catch {
      if (!silent) setTasks([]);
    } finally {
      if (!silent) setLoadingTasks(false);
    }
  }, [projectId]);

  const handleDeleteTask = useCallback(async (taskId: number) => {
    setDeletingTaskId(taskId);
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      addToast('success', 'Задача удалена');
    } catch {
      addToast('error', 'Не удалось удалить задачу');
    } finally {
      setDeletingTaskId(null);
    }
  }, [addToast]);

  const reloadResources = useCallback(async (silent = false) => {
    if (!silent) setLoadingResources(true);
    try {
      const [matRes, ordersRes, equipRes, suppRes, maintRes, whRes, invRes] = await Promise.allSettled([
        api.get('/material-requests', { params: { projectId, limit: 200 } }),
        api.get('/supplier-orders', { params: { projectId, limit: 200 } }),
        api.get('/equipment', { params: { limit: 200 } }),
        api.get('/suppliers', { params: { limit: 500 } }),
        api.get('/equipment-maintenance', { params: { limit: 200 } }),
        api.get('/eq-warehouses'),
        api.get('/inventory-sessions', { params: { projectId } }),
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
      setMaintenanceList(maintRes.status === 'fulfilled'
        ? (maintRes.value.data?.maintenanceRecords || maintRes.value.data?.data || maintRes.value.data || [])
        : []);
      const whRaw = whRes.status === 'fulfilled'
        ? (whRes.value.data?.data || whRes.value.data || [])
        : [];
      setWarehousesList(Array.isArray(whRaw) ? whRaw : []);
      const invRaw = invRes.status === 'fulfilled'
        ? (invRes.value.data?.data || invRes.value.data || [])
        : [];
      setInventorySessions(Array.isArray(invRaw) ? invRaw : []);
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
        await api.post('/equipment', data);
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

  const handleSaveMaintenance = useCallback(async (data: Record<string, unknown>) => {
    setSavingResource(true);
    try {
      if (editingMaint) {
        await api.put(`/equipment-maintenance/${editingMaint.id}`, data);
        addToast('success', 'Запись обновлена');
      } else {
        await api.post('/equipment-maintenance', data);
        addToast('success', 'Запись добавлена');
      }
      setShowMaintModal(false);
      setEditingMaint(null);
      await reloadResources();
    } catch { addToast('error', 'Ошибка при сохранении'); }
    finally { setSavingResource(false); }
  }, [editingMaint, addToast, reloadResources]);

  const handleDeleteMaintenance = useCallback(async (id: number) => {
    if (!confirm('Удалить запись об обслуживании?')) return;
    try {
      await api.delete(`/equipment-maintenance/${id}`);
      addToast('success', 'Запись удалена');
      setMaintenanceList((p) => p.filter((m) => m.id !== id));
    } catch { addToast('error', 'Ошибка при удалении записи'); }
  }, [addToast]);

  const handleSaveInventory = useCallback(async (data: Record<string, unknown>) => {
    setSavingResource(true);
    try {
      if (editingInv) {
        await api.put(`/inventory-sessions/${editingInv.id}`, data);
        addToast('success', 'Инвентаризация обновлена');
      } else {
        await api.post('/inventory-sessions', { ...data, projectId });
        addToast('success', 'Инвентаризация создана');
      }
      setShowInvModal(false);
      setEditingInv(null);
      await reloadResources();
    } catch { addToast('error', 'Ошибка при сохранении инвентаризации'); }
    finally { setSavingResource(false); }
  }, [editingInv, projectId, addToast, reloadResources]);

  const handleDeleteInventory = useCallback(async (id: number) => {
    if (!confirm('Удалить инвентаризацию?')) return;
    try {
      await api.delete(`/inventory-sessions/${id}`);
      addToast('success', 'Инвентаризация удалена');
      setInventorySessions((p) => p.filter((s) => s.id !== id));
      if (detailInventory?.id === id) setDetailInventory(null);
    } catch { addToast('error', 'Ошибка при удалении'); }
  }, [addToast, detailInventory]);

  const handleAddInventoryItem = useCallback(async (data: Record<string, unknown>) => {
    if (!detailInventory) return;
    setSavingInvItem(true);
    try {
      const res = await api.post(`/inventory-sessions/${detailInventory.id}/items`, data);
      const newItem: InventoryItem = res.data;
      setDetailInventory((prev) => prev ? { ...prev, items: [...(prev.items ?? []), newItem] } : prev);
      setInventorySessions((prev) => prev.map((s) =>
        s.id === detailInventory.id ? { ...s, items: [...(s.items ?? []), newItem] } : s,
      ));
      setShowInvItemModal(false);
      addToast('success', 'Позиция добавлена');
    } catch { addToast('error', 'Ошибка при добавлении позиции'); }
    finally { setSavingInvItem(false); }
  }, [detailInventory, addToast]);

  const handleDeleteInventoryItem = useCallback(async (sessionId: number, itemId: number) => {
    if (!confirm('Удалить позицию?')) return;
    try {
      await api.delete(`/inventory-sessions/${sessionId}/items/${itemId}`);
      setDetailInventory((prev) => prev ? { ...prev, items: prev.items?.filter((i) => i.id !== itemId) } : prev);
      setInventorySessions((prev) => prev.map((s) =>
        s.id === sessionId ? { ...s, items: s.items?.filter((i) => i.id !== itemId) } : s,
      ));
      addToast('success', 'Позиция удалена');
    } catch { addToast('error', 'Ошибка при удалении позиции'); }
  }, [addToast]);

  const handleSaveWarehouse = useCallback(async (data: Record<string, unknown>) => {
    setSavingWH(true);
    try {
      if (editingWH) {
        const res = await api.put(`/eq-warehouses/${editingWH.id}`, data);
        const updated: Warehouse = res.data ?? { ...editingWH, ...data };
        setWarehousesList((p) => p.map((w) => w.id === editingWH.id ? updated : w));
        addToast('success', 'Склад обновлён');
      } else {
        const res = await api.post('/eq-warehouses', data);
        const created: Warehouse = res.data;
        setWarehousesList((p) => [...p, created]);
        setWarehouseSubTab(String(created.id));
        addToast('success', 'Склад создан');
      }
      setShowWHModal(false);
      setEditingWH(null);
    } catch { addToast('error', 'Ошибка при сохранении склада'); }
    finally { setSavingWH(false); }
  }, [editingWH, addToast]);

  const handleDeleteWarehouse = useCallback(async (id: number) => {
    if (!confirm('Удалить склад? Оборудование не будет удалено.')) return;
    try {
      await api.delete(`/eq-warehouses/${id}`);
      setWarehousesList((p) => p.filter((w) => w.id !== id));
      setWarehouseSubTab('');
      addToast('success', 'Склад удалён');
    } catch { addToast('error', 'Ошибка при удалении склада'); }
  }, [addToast]);

  const generateQr = useCallback(async (eq: Equipment) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/equipment/${eq.id}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
      setQrDataUrl(dataUrl);
    } catch { setQrDataUrl(''); }
  }, []);

  const reloadSites = useCallback(async () => {
    setLoadingPhotos(true);
    try {
      const r = await api.get(`/construction-sites`, { params: { projectId, limit: 100 } });
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
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка при сохранении акта'));
      console.error('act save error', e?.response?.data);
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

  const reloadPriceItems = useCallback(async () => {
    setPriceLoading(true);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        api.get('/work-templates', { params: { limit: 500 } }).catch(() => ({ data: {} })),
        api.get('/work-templates/categories').catch(() => ({ data: [] })),
      ]);
      setPriceItems(itemsRes.data?.data || []);
      setPriceCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
      setPriceLoaded(true);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  const handleSavePriceItem = useCallback(async (data: Omit<WorkTemplate, 'id'>) => {
    setSavingPrice(true);
    try {
      if (editingPrice) {
        await api.put(`/work-templates/${editingPrice.id}`, data);
        addToast('success', 'Позиция обновлена');
      } else {
        await api.post('/work-templates', data);
        addToast('success', 'Позиция добавлена');
      }
      setShowPriceModal(false);
      setEditingPrice(null);
      await reloadPriceItems();
    } catch {
      addToast('error', 'Ошибка при сохранении');
    } finally {
      setSavingPrice(false);
    }
  }, [editingPrice, addToast, reloadPriceItems]);

  const handleDeletePriceItem = useCallback(async (id: number) => {
    if (!confirm('Удалить позицию из прайса?')) return;
    try {
      await api.delete(`/work-templates/${id}`);
      addToast('success', 'Позиция удалена');
      await reloadPriceItems();
    } catch {
      addToast('error', 'Ошибка при удалении');
    }
  }, [addToast, reloadPriceItems]);

  const reloadProposals = useCallback(async () => {
    setProposalsLoading(true);
    try {
      const res = await api.get('/commercial-proposals', { params: { projectId, limit: 200 } }).catch(() => ({ data: {} }));
      setProposals(res.data?.data || []);
      setProposalsLoaded(true);
    } finally {
      setProposalsLoading(false);
    }
  }, [projectId]);

  const loadClosedTasks = useCallback(async () => {
    if (closedTasksLoading) return;
    setClosedTasksLoading(true);
    try {
      const res = await api.get('/tasks', { params: { projectId, status: 4, limit: 200 } }).catch(() => ({ data: [] }));
      const raw = Array.isArray(res.data) ? res.data : (res.data?.tasks ?? res.data?.data ?? []);
      setClosedTasks(raw);
      setClosedTasksLoaded(true);
    } finally {
      setClosedTasksLoading(false);
    }
  }, [projectId, closedTasksLoading]);

  const handleSaveProposal = useCallback(async (data: Partial<CommercialProposal>) => {
    setSavingProposal(true);
    try {
      let result: CommercialProposal;
      if (selectedProposal?.id) {
        const res = await api.put(`/commercial-proposals/${selectedProposal.id}`, data);
        result = res.data;
        addToast('success', 'КП обновлено');
      } else {
        const res = await api.post('/commercial-proposals', { ...data, projectId });
        result = res.data;
        addToast('success', 'КП создано');
      }
      setSelectedProposal(result);
      setShowProposalModal(false);
      await reloadProposals();
    } catch {
      addToast('error', 'Ошибка при сохранении КП');
    } finally {
      setSavingProposal(false);
    }
  }, [selectedProposal, projectId, addToast, reloadProposals]);

  const handleDeleteProposal = useCallback(async (id: number) => {
    if (!confirm('Удалить КП?')) return;
    try {
      await api.delete(`/commercial-proposals/${id}`);
      if (selectedProposal?.id === id) setSelectedProposal(null);
      addToast('success', 'КП удалено');
      await reloadProposals();
    } catch {
      addToast('error', 'Ошибка при удалении');
    }
  }, [selectedProposal, addToast, reloadProposals]);

  const handleUpdateProposalLine = useCallback(async (proposalId: number, lineId: number, data: { quantity: number; unitPrice: number }) => {
    try {
      await api.put(`/commercial-proposals/lines/${lineId}`, data);
      const res = await api.get(`/commercial-proposals/${proposalId}`);
      setSelectedProposal(res.data);
      setProposals(prev => prev.map(p => p.id === proposalId ? res.data : p));
    } catch {
      addToast('error', 'Ошибка при обновлении позиции');
    }
  }, [addToast]);

  const handleAddProposalLine = useCallback(async (proposalId: number, line: Partial<ProposalLine>) => {
    try {
      await api.post(`/commercial-proposals/${proposalId}/lines`, line);
      const res = await api.get(`/commercial-proposals/${proposalId}`);
      setSelectedProposal(res.data);
      setProposals(prev => prev.map(p => p.id === proposalId ? res.data : p));
    } catch {
      addToast('error', 'Ошибка при добавлении позиции');
    }
  }, [addToast]);

  const handleDeleteProposalLine = useCallback(async (proposalId: number, lineId: number) => {
    try {
      await api.delete(`/commercial-proposals/lines/${lineId}`);
      const res = await api.get(`/commercial-proposals/${proposalId}`);
      setSelectedProposal(res.data);
      setProposals(prev => prev.map(p => p.id === proposalId ? res.data : p));
    } catch {
      addToast('error', 'Ошибка при удалении позиции');
    }
  }, [addToast]);

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
        api.get(`/construction-sites`, { params: { projectId, limit: 100 } }).catch(() => ({ data: [] })),
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
    if ((activeTab === 'documents' || activeTab === 'photos') && !tasksLoaded && !loadingTasks) reloadTasks();
    if (activeTab === 'resources' && !resourcesLoaded && !loadingResources) reloadResources();
    if (activeTab === 'chat' && !channelChecked && !loadingChat) loadProjectChannels();
    if (activeTab === 'photos' && !sitesLoaded && !loadingPhotos) reloadSites();
    if (activeTab === 'objects' && !objectsLoaded && !objectsLoading) {
      setObjectsLoading(true);
      api.get(`/construction-sites`, { params: { projectId, limit: 200 } })
        .then((r) => {
          const data = r.data?.sites || r.data?.data || r.data || [];
          setObjectsList(Array.isArray(data) ? data : []);
          setObjectsLoaded(true);
        })
        .catch(() => setObjectsList([]))
        .finally(() => setObjectsLoading(false));
    }
    if (activeTab === 'finance' && !financeLoaded && !loadingFinance) {
      reloadFinance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'finance') {
      if (financeSubTab === 'price' && !priceLoaded && !priceLoading) reloadPriceItems();
      if (financeSubTab === 'proposals') {
        if (!proposalsLoaded && !proposalsLoading) reloadProposals();
        if (!priceLoaded && !priceLoading) reloadPriceItems();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, financeSubTab]);

  /* ─── Auto-refresh active tab every 30s + on window focus ─── */
  const activeTabRefresh = useCallback(() => {
    if (activeTab === 'tasks' && tasksLoaded) reloadTasks(true);
    else if (activeTab === 'team' && teamLoaded) reloadTeam();
    else if (activeTab === 'documents' && docsLoaded) reloadDocuments();
    else if (activeTab === 'finance' && financeLoaded) reloadFinance();
    else if (activeTab === 'resources' && resourcesLoaded) reloadResources(true);
    else if (activeTab === 'photos' && sitesLoaded) reloadSites();
  }, [activeTab, tasksLoaded, teamLoaded, docsLoaded, financeLoaded, resourcesLoaded, sitesLoaded,
      reloadTasks, reloadTeam, reloadDocuments, reloadFinance, reloadResources, reloadSites]);

  useAutoRefresh(activeTabRefresh);

  useEffect(() => {
    if (detailEquipment) generateQr(detailEquipment);
    else setQrDataUrl('');
  }, [detailEquipment, generateQr]);

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
            const r = await api.get(`/construction-sites`, { params: { projectId, limit: 1 } });
            const s = r.data?.sites || r.data?.data || r.data || [];
            targetSite = Array.isArray(s) && s.length > 0 ? s[0] : null;
            if (!targetSite) {
              const createRes = await api.post(`/construction-sites`, {
                projectId,
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
    const uploadRes = await api.post('/employee-documents/upload', form);
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
        const r = await api.post(`/construction-sites`, {
          projectId,
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
        const uploadRes = await api.post('/chat-channels/upload', form);
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

  const isMediaAtt = (fileUrl: string, mimeType?: string) =>
    /\.(jpg|jpeg|png|gif|webp|svg|mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(fileUrl) ||
    !!(mimeType && (mimeType.startsWith('image/') || mimeType.startsWith('video/')));

  const taskAttachmentsList = tasks.flatMap((task) => {
    const atts = Array.isArray(task.attachments) ? task.attachments : [];
    return atts
      .filter((a: any) => (a?.fileUrl || a?.file_url) && (a?.fileName || a?.file_name))
      .map((a: any) => ({
        fileName: a.fileName || a.file_name || '',
        fileSize: a.fileSize || a.file_size || 0,
        mimeType: a.mimeType || a.mime_type || '',
        fileUrl: a.fileUrl || a.file_url || '',
        taskId: task.id,
        taskTitle: task.title,
      }));
  });
  const taskDocAttachments = taskAttachmentsList.filter((a) => !isMediaAtt(a.fileUrl, a.mimeType));
  const taskMediaAttachments = taskAttachmentsList.filter((a) => isMediaAtt(a.fileUrl, a.mimeType));

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
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-medium text-gray-800 dark:text-gray-100 line-clamp-2 flex-1">{t.title}</div>
                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setSelectedTask(t)} className="p-1 text-gray-400 hover:text-violet-500 transition-colors rounded" title="Редактировать">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteTask(t.id)} disabled={deletingTaskId === t.id} className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded disabled:opacity-40" title="Удалить">
                            {deletingTaskId === t.id
                              ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            }
                          </button>
                        </div>
                      </div>
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
                      <th className="py-3 px-4 text-center font-semibold w-20"></th>
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
                          <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => setSelectedTask(t)} className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors rounded" title="Редактировать">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteTask(t.id)} disabled={deletingTaskId === t.id} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded disabled:opacity-40" title="Удалить">
                                {deletingTaskId === t.id
                                  ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                  : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                }
                              </button>
                            </div>
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
        <div className="space-y-4">
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

        {/* Task document attachments */}
        {taskDocAttachments.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Вложения из задач</h3>
              <span className="text-xs text-gray-400">{taskDocAttachments.length} файлов</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {taskDocAttachments.map((att, idx) => {
                const ext = att.fileUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
                const icon = att.mimeType === 'application/pdf' || ext === 'pdf' ? '📄'
                  : /doc(x)?/.test(ext) ? '📝'
                  : /xls(x)?/.test(ext) ? '📊'
                  : '📎';
                return (
                  <a key={idx} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-xl">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{att.fileName}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span>{att.taskTitle}</span>
                        {att.fileSize > 0 && <><span>·</span><span>{fmtSize(att.fileSize)}</span></>}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        )}
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
            {/* Site filter */}
            <div className="relative">
              <select
                value={photoSiteFilter}
                onChange={(e) => setPhotoSiteFilter(e.target.value)}
                className="appearance-none py-2 pl-3 pr-8 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none cursor-pointer"
              >
                <option value="">Все площадки</option>
                {sites.filter((s) => (s.photos || []).length > 0).map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {/* File type filter */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 gap-0.5">
              {([['all','Все'],['image','Фото'],['video','Видео']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPhotoTypeFilter(val)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                    photoTypeFilter === val
                      ? 'bg-white dark:bg-gray-700 text-violet-600 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Sort */}
            <div className="relative">
              <select
                value={photoSort}
                onChange={(e) => setPhotoSort(e.target.value)}
                className="appearance-none py-2 pl-3 pr-8 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none cursor-pointer"
              >
                <option value="default">По умолчанию</option>
                <option value="most">Больше медиа</option>
                <option value="least">Меньше медиа</option>
                <option value="az">Название А-Я</option>
                <option value="za">Название Я-А</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
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
              const isVid = (u: string) => /\.(mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(u);
              let filtered = sites
                .map((s) => {
                  let photos = s.photos || [];
                  if (photoTypeFilter === 'image') photos = photos.filter((u) => !isVid(normalizePhotoUrl(u)));
                  else if (photoTypeFilter === 'video') photos = photos.filter((u) => isVid(normalizePhotoUrl(u)));
                  return { ...s, photos };
                })
                .filter((s) => s.photos.length > 0);
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

          {/* Task media attachments */}
          {taskMediaAttachments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Медиа из задач</h3>
                <span className="text-xs text-gray-400">{taskMediaAttachments.length} файлов</span>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {taskMediaAttachments.map((att, idx) => {
                  const isVidUrl = /\.(mp4|mov|avi|webm|mkv|m4v)(\?|$)/i.test(att.fileUrl);
                  return (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <button onClick={() => setLightboxPhoto(att.fileUrl)} className="w-full h-full">
                        {isVidUrl ? (
                          <div className="w-full h-full relative">
                            <video src={att.fileUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            onError={(e) => { const el = e.currentTarget as HTMLImageElement; if (el.src !== PHOTO_ERROR_PLACEHOLDER) el.src = PHOTO_ERROR_PLACEHOLDER; }} />
                        )}
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{att.taskTitle}</p>
                      </div>
                      <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-black/60 hover:bg-violet-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        title="Открыть">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
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

      {/* ─── Objects ─── */}
      {activeTab === 'objects' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">
              Объекты проекта
              {!objectsLoading && objectsList.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">({objectsList.length})</span>
              )}
            </h2>
            <button
              onClick={() => { setEditingObject(null); setShowObjectModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Добавить объект
            </button>
          </div>

          {objectsLoading ? (
            <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
          ) : objectsList.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">Объектов пока нет</p>
              <button onClick={() => { setEditingObject(null); setShowObjectModal(true); }} className="mt-2 text-xs text-violet-500 hover:text-violet-600 transition-colors">Добавить первый объект</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                    <th className="py-3 px-4 text-left font-semibold">Название</th>
                    <th className="py-3 px-4 text-left font-semibold">Адрес</th>
                    <th className="py-3 px-4 text-left font-semibold">Статус</th>
                    <th className="py-3 px-4 text-left font-semibold">Нач. — Оконч.</th>
                    <th className="py-3 px-4 w-28"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {objectsList.map((obj) => {
                    const statusNum = typeof obj.status === 'string' ? parseInt(obj.status) : (obj.status ?? 0);
                    const statusLabel = statusNum === 0 ? 'Планирование' : statusNum === 1 ? 'В работе' : statusNum === 2 ? 'Приостановлен' : statusNum === 3 ? 'Завершён' : '—';
                    const statusColor = statusNum === 0 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : statusNum === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : statusNum === 2 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
                    return (
                      <tr
                        key={obj.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/projects/${projectId}/objects/${obj.id}`)}
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-800 dark:text-gray-100">{obj.name}</span>
                          {obj.code && <span className="ml-2 text-xs text-gray-400">({obj.code})</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{obj.address || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                          {obj.startDate ? new Date(obj.startDate).toLocaleDateString('ru-RU') : '—'}
                          {' → '}
                          {obj.plannedEndDate ? new Date(obj.plannedEndDate).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditingObject(obj); setShowObjectModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                              title="Редактировать"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Удалить объект «${obj.name}»?`)) return;
                                try {
                                  await api.delete(`/construction-sites/${obj.id}`);
                                  setObjectsList((prev) => prev.filter((o) => o.id !== obj.id));
                                  addToast('success', 'Объект удалён');
                                } catch { addToast('error', 'Ошибка при удалении'); }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              title="Удалить"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
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
      )}

      {/* ─── Finance ─── */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          {/* Sub-tab nav */}
          <div className="flex gap-0.5 bg-white dark:bg-gray-800 rounded-xl shadow-xs px-3 py-1.5 overflow-x-auto">
            {([
              { key: 'overview',  label: 'Обзор' },
              { key: 'payments',  label: 'Платежи',      count: financePayments.length },
              { key: 'budgets',   label: 'Бюджеты',      count: financeBudgets.length },
              { key: 'acts',      label: 'Акты',         count: financeActs.length },
              { key: 'price',     label: 'Прайс',        count: priceLoaded ? priceItems.length : undefined },
              { key: 'proposals', label: 'Коммерческие', count: proposalsLoaded ? proposals.length : undefined },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setFinanceSubTab(t.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  financeSubTab === t.key
                    ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                }`}
              >
                {t.label}
                {'count' in t && t.count != null && t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${financeSubTab === t.key ? 'bg-violet-100 dark:bg-violet-800/50 text-violet-600 dark:text-violet-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {financeSubTab === 'overview' && (loadingFinance ? <LoadingState /> : (
            <>
              {(() => {
                const isIncome = paymentIsIncome;
                const isExpense = paymentIsExpense;
                const totalIncome = financePayments.filter(isIncome).reduce((s, p) => s + (Number(p.amount) || 0), 0);
                const totalExpense = financePayments.filter(isExpense).reduce((s, p) => s + (Number(p.amount) || 0), 0);
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
            </>
          ))}

          {/* ── Payments ── */}
          {financeSubTab === 'payments' && (loadingFinance ? <LoadingState /> : (
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
          ))}

          {/* ── Budgets ── */}
          {financeSubTab === 'budgets' && (loadingFinance ? <LoadingState /> : (
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
          ))}

          {/* ── Acts ── */}
          {financeSubTab === 'acts' && (loadingFinance ? <LoadingState /> : (
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
          ))}

          {/* ── Price List ── */}
          {financeSubTab === 'price' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input value={priceSearch} onChange={e => setPriceSearch(e.target.value)} placeholder="Поиск по названию..." className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                {priceCategories.length > 0 && (
                  <select value={priceCategoryFilter} onChange={e => setPriceCategoryFilter(e.target.value)} className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-700 dark:text-gray-300">
                    <option value="">Все категории</option>
                    {priceCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <button onClick={() => { setEditingPrice(null); setShowPriceModal(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Добавить услугу
                </button>
              </div>
              {priceLoading ? <LoadingState /> : (() => {
                const filtered = priceItems.filter(p =>
                  (!priceSearch || p.name.toLowerCase().includes(priceSearch.toLowerCase())) &&
                  (!priceCategoryFilter || p.category === priceCategoryFilter)
                );
                if (filtered.length === 0) return (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs py-16 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="text-sm text-gray-400 dark:text-gray-500">{priceItems.length === 0 ? 'Прайс-лист пуст. Добавьте первую услугу.' : 'Ничего не найдено'}</p>
                  </div>
                );
                const byCategory = filtered.reduce<Record<string, WorkTemplate[]>>((acc, p) => { const cat = p.category || 'Без категории'; if (!acc[cat]) acc[cat] = []; acc[cat].push(p); return acc; }, {});
                return (
                  <div className="space-y-4">
                    {Object.entries(byCategory).map(([cat, items]) => (
                      <div key={cat} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cat}</h4>
                          <span className="text-xs text-gray-400 dark:text-gray-500">({items.length})</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-900/10">
                                <th className="py-2.5 px-4 text-left font-semibold">Услуга</th>
                                <th className="py-2.5 px-4 text-left font-semibold">Код</th>
                                <th className="py-2.5 px-4 text-left font-semibold">Ед.</th>
                                <th className="py-2.5 px-4 text-right font-semibold">Стоимость</th>
                                <th className="py-2.5 px-4 text-center font-semibold">Сложность</th>
                                <th className="py-2.5 px-4 w-20"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                              {items.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 group">
                                  <td className="py-3 px-4">
                                    <div className="font-medium text-gray-800 dark:text-gray-200">{p.name}</div>
                                    {p.description && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{p.description}</div>}
                                  </td>
                                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.code || '—'}</td>
                                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{p.unit || '—'}</td>
                                  <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">{p.estimatedCost != null ? fmtMoney(p.estimatedCost) : '—'}</td>
                                  <td className="py-3 px-4 text-center">
                                    {p.complexityLevel != null ? (
                                      <span className="inline-flex items-center gap-1">
                                        {[1,2,3].map(n => <div key={n} className={`w-2 h-2 rounded-full ${n <= (p.complexityLevel ?? 0) ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'}`} />)}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                      <button onClick={() => { setEditingPrice(p); setShowPriceModal(true); }} className="p-1.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </button>
                                      <button onClick={() => handleDeletePriceItem(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Commercial Proposals ── */}
          {financeSubTab === 'proposals' && (
            <div className="space-y-4">
              {proposalsLoading ? <LoadingState /> : selectedProposal ? (
                showProposalDocument ? (
                  <ProposalActDocument
                    proposal={selectedProposal}
                    projectName={project?.name ?? ''}
                    projectAddress={project?.address}
                    managerName={selectedProposal.managerName || project?.projectManager?.name}
                    onBack={() => setShowProposalDocument(false)}
                  />
                ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setSelectedProposal(null); setShowProposalDocument(false); }} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      Назад
                    </button>
                    <div className="flex-1 flex items-center gap-2.5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">КП № {selectedProposal.proposalNumber}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PROPOSAL_STATUS[selectedProposal.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {PROPOSAL_STATUS[selectedProposal.status]?.label ?? selectedProposal.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowProposalDocument(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Документ
                      </button>
                      <button onClick={() => setShowProposalModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Редактировать
                      </button>
                      <button onClick={() => handleDeleteProposal(selectedProposal.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 border border-red-200 dark:border-red-800/40 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Удалить
                      </button>
                    </div>
                  </div>
                  {/* Реквиты КП — collapsible */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                    <button onClick={() => setProposalDetailsOpen(o => !o)} className="w-full px-5 py-3.5 flex items-center gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">Реквиты КП</span>
                      <span className="flex-1" />
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${proposalDetailsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {proposalDetailsOpen && (
                      <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 border-t border-gray-100 dark:border-gray-700/60 pt-4">
                        {[
                          { label: 'КЛИЕНТ',               value: selectedProposal.clientName },
                          { label: 'ТЕЛЕФОН',              value: selectedProposal.clientPhone },
                          { label: 'EMAIL',                value: selectedProposal.clientEmail },
                          { label: 'ОБЪЕКТ',               value: selectedProposal.objectAddress },
                          { label: 'КОММЕНТАРИЙ К ОБЪЕКТУ',value: selectedProposal.objectComment },
                          { label: 'МЕНЕДЖЕР',             value: selectedProposal.managerName },
                        ].map(f => (
                          <div key={f.label}>
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wide mb-0.5">{f.label}</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{f.value || '—'}</p>
                          </div>
                        ))}
                        {selectedProposal.notes && (
                          <div className="col-span-2 md:col-span-3">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wide mb-0.5">ПРИМЕЧАНИЯ</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{selectedProposal.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Добавить позицию — из прайса или из задач */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Добавить позицию</p>
                      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs font-medium">
                        <button
                          onClick={() => setKpAddSource('price')}
                          className={`px-3 py-1.5 transition-colors ${kpAddSource === 'price' ? 'bg-violet-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                        >
                          Из прайса
                        </button>
                        <button
                          onClick={() => { setKpAddSource('tasks'); if (!closedTasksLoaded && !closedTasksLoading) loadClosedTasks(); }}
                          className={`px-3 py-1.5 transition-colors border-l border-gray-200 dark:border-gray-700 ${kpAddSource === 'tasks' ? 'bg-violet-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                        >
                          Из задач
                        </button>
                        <button
                          onClick={() => setKpAddSource('manual')}
                          className={`px-3 py-1.5 transition-colors border-l border-gray-200 dark:border-gray-700 ${kpAddSource === 'manual' ? 'bg-violet-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                        >
                          Вручную
                        </button>
                      </div>
                    </div>

                    {kpAddSource === 'price' ? (() => {
                      const q = proposalLineSearch.trim().toLowerCase();
                      const matches = q.length >= 2 ? priceItems.filter(p =>
                        p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
                      ).slice(0, 8) : [];
                      return (
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          <input
                            value={proposalLineSearch}
                            onChange={e => setProposalLineSearch(e.target.value)}
                            placeholder="Поиск по названию или категории (от 2 символов)..."
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white dark:focus:bg-gray-800"
                          />
                          {matches.length > 0 && (
                            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                              {matches.map(p => (
                                <button key={p.id} onClick={() => {
                                  handleAddProposalLine(selectedProposal.id, {
                                    serviceName: p.name,
                                    unit: p.unit,
                                    unitPrice: p.estimatedCost ? Number(p.estimatedCost) : 0,
                                    quantity: 1,
                                    totalPrice: p.estimatedCost ? Number(p.estimatedCost) : 0,
                                    workStatus: 'not_started',
                                    sortOrder: selectedProposal.lines.length,
                                  });
                                  setProposalLineSearch('');
                                }} className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                                  <div>
                                    <span className="text-sm text-gray-800 dark:text-gray-200">{p.name}</span>
                                    {p.category && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{p.category}</span>}
                                  </div>
                                  <span className="text-sm font-medium text-violet-600 dark:text-violet-400 ml-4 shrink-0">{p.estimatedCost ? fmtMoney(Number(p.estimatedCost)) : '—'}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {q.length >= 2 && matches.length === 0 && (
                            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                              Ничего не найдено в прайсе
                            </div>
                          )}
                        </div>
                      );
                    })() : kpAddSource === 'tasks' ? (
                      <div className="space-y-1 max-h-72 overflow-y-auto">
                        {closedTasksLoading ? (
                          <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Загрузка задач...</div>
                        ) : closedTasks.length === 0 ? (
                          <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                            Нет завершённых задач в проекте
                          </div>
                        ) : closedTasks.map(task => {
                          const alreadyAdded = selectedProposal.lines.some(l => l.serviceName === task.title);
                          return (
                            <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${alreadyAdded ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">{task.title}</p>
                                {task.description && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{task.description}</p>}
                              </div>
                              {alreadyAdded ? (
                                <span className="text-xs text-green-500 font-medium shrink-0 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  В составе
                                </span>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Цена ₽"
                                    value={taskPrices[task.id] ?? ''}
                                    onChange={e => setTaskPrices(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    className="w-24 text-sm text-right border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-gray-50 dark:bg-gray-900/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white dark:focus:bg-gray-800"
                                  />
                                  <button
                                    onClick={() => {
                                      const price = Number(taskPrices[task.id] ?? 0);
                                      handleAddProposalLine(selectedProposal.id, {
                                        serviceName: task.title,
                                        serviceDesc: task.description,
                                        unit: 'шт',
                                        quantity: 1,
                                        unitPrice: price,
                                        totalPrice: price,
                                        workStatus: 'done',
                                        sortOrder: selectedProposal.lines.length,
                                      });
                                    }}
                                    className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors"
                                  >
                                    + Добавить
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Наименование *</label>
                            <input
                              type="text"
                              placeholder="Название работы или услуги"
                              value={manualLine.serviceName}
                              onChange={e => setManualLine(prev => ({ ...prev, serviceName: e.target.value }))}
                              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white dark:focus:bg-gray-800"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Ед. изм.</label>
                              <input
                                type="text"
                                placeholder="шт, м², км..."
                                value={manualLine.unit}
                                onChange={e => setManualLine(prev => ({ ...prev, unit: e.target.value }))}
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white dark:focus:bg-gray-800"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Количество</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="1"
                                value={manualLine.quantity}
                                onChange={e => setManualLine(prev => ({ ...prev, quantity: e.target.value }))}
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white dark:focus:bg-gray-800"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">Цена ₽</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={manualLine.unitPrice}
                                onChange={e => setManualLine(prev => ({ ...prev, unitPrice: e.target.value }))}
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white dark:focus:bg-gray-800"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          {manualLine.serviceName && manualLine.quantity && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              Итого: <span className="font-medium text-violet-600 dark:text-violet-400">{fmtMoney(Number(manualLine.quantity) * Number(manualLine.unitPrice || 0))}</span>
                            </span>
                          )}
                          <button
                            disabled={!manualLine.serviceName.trim()}
                            onClick={() => {
                              const qty = Number(manualLine.quantity) || 1;
                              const price = Number(manualLine.unitPrice) || 0;
                              handleAddProposalLine(selectedProposal.id, {
                                serviceName: manualLine.serviceName.trim(),
                                unit: manualLine.unit.trim() || undefined,
                                quantity: qty,
                                unitPrice: price,
                                totalPrice: qty * price,
                                workStatus: 'not_started',
                                sortOrder: selectedProposal.lines.length,
                              });
                              setManualLine({ serviceName: '', unit: '', quantity: '1', unitPrice: '' });
                            }}
                            className="ml-auto px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Добавить строку
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Состав КП */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Состав КП</h4>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{selectedProposal.lines.length} позиций</span>
                    </div>
                    {selectedProposal.lines.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Добавьте позиции: из прайса, задач проекта или вручную</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                              <th className="py-3 px-4 text-left font-semibold">Услуга</th>
                              <th className="py-3 px-4 text-center font-semibold w-16">Ед.</th>
                              <th className="py-3 px-4 text-right font-semibold w-24">Кол-во</th>
                              <th className="py-3 px-4 text-right font-semibold w-32">Цена</th>
                              <th className="py-3 px-4 text-right font-semibold w-28">Сумма</th>
                              <th className="py-3 px-4 w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {[...selectedProposal.lines].sort((a, b) => a.sortOrder - b.sortOrder).map(line => (
                              <ProposalLineRow
                                key={line.id}
                                line={line}
                                proposalId={selectedProposal.id}
                                onUpdate={handleUpdateProposalLine}
                                onDelete={handleDeleteProposalLine}
                              />
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 dark:bg-gray-900/20 border-t-2 border-gray-200 dark:border-gray-700">
                              <td colSpan={3} className="py-3 px-4 text-right font-semibold text-gray-700 dark:text-gray-300 text-sm">Итого:</td>
                              <td className="py-3 px-4 text-right font-bold text-base text-violet-600 dark:text-violet-400" colSpan={2}>{fmtMoney(selectedProposal.totalAmount)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                )
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Коммерческие предложения</h3>
                    <button onClick={() => setShowProposalModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Создать КП
                    </button>
                  </div>
                  {proposals.length === 0 ? (
                    <div className="py-16 text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Коммерческих предложений нет</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                            <th className="py-3 px-4 text-left font-semibold">№ КП</th>
                            <th className="py-3 px-4 text-left font-semibold">Клиент</th>
                            <th className="py-3 px-4 text-left font-semibold">Объект</th>
                            <th className="py-3 px-4 text-right font-semibold">Сумма</th>
                            <th className="py-3 px-4 text-center font-semibold">Статус</th>
                            <th className="py-3 px-4 text-right font-semibold">Дата</th>
                            <th className="py-3 px-4 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {proposals.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer" onClick={() => setSelectedProposal(p)}>
                              <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">{p.proposalNumber}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{p.clientName || '—'}</td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">{p.objectAddress || '—'}</td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">{fmtMoney(p.totalAmount)}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PROPOSAL_STATUS[p.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                  {PROPOSAL_STATUS[p.status]?.label ?? p.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-gray-500 dark:text-gray-400">{fmt(p.createdAt)}</td>
                              <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleDeleteProposal(p.id)} className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
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
            </div>
          )}
        </div>
      )}

      {/* ─── Resources ─── */}
      {/* ─── Equipment Detail View ─── */}
      {activeTab === 'resources' && detailEquipment && (() => {
        const eq = detailEquipment;
        const eqHistory = maintenanceList.filter(m => m.equipmentId === eq.id).sort((a, b) => new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime());
        return (
          <div className="space-y-4">
            <button onClick={() => setDetailEquipment(null)}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Назад к инвентарю
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Left card — info */}
              <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{eq.name}</h3>
                  <button onClick={() => { setEditingEq(eq); setShowEqModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Редактировать
                  </button>
                </div>
                <div className="p-5 flex gap-6">
                  {/* QR code */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                    {qrDataUrl ? (
                      <>
                        <img src={qrDataUrl} alt="QR" className="w-28 h-28 rounded-lg" />
                        <a href={qrDataUrl} download={`equipment-${eq.id}.png`}
                          className="text-xs text-violet-500 hover:text-violet-600 dark:text-violet-400">
                          Скачать
                        </a>
                      </>
                    ) : (
                      <div className="w-28 h-28 bg-gray-100 dark:bg-gray-900/40 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-gray-300 dark:text-gray-600">QR код</span>
                      </div>
                    )}
                  </div>
                  {/* Fields grid */}
                  <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3">
                    {[
                      { label: 'Серийный №', value: eq.serialNumber },
                      { label: 'Тип', value: eq.equipmentType ? (EQUIPMENT_TYPE_LABELS[eq.equipmentType] ?? eq.equipmentType) : null },
                      { label: 'Бренд / Производитель', value: eq.manufacturer },
                      { label: 'Модель', value: eq.model },
                      { label: 'Дата поступления', value: eq.purchaseDate ? new Date(eq.purchaseDate).toLocaleDateString('ru-RU') : null },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <dt className="text-xs text-gray-400 dark:text-gray-500">{label}</dt>
                        <dd className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{value || '—'}</dd>
                      </div>
                    ))}
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Текущий склад</dt>
                      <dd className="mt-0.5">
                        {eq.currentLocation ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{eq.currentLocation}</span>
                        ) : <span className="text-sm text-gray-400">—</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Статус</dt>
                      <dd className="mt-0.5">
                        {eq.status != null ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EQUIPMENT_STATUS[eq.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                            {EQUIPMENT_STATUS[eq.status]?.label ?? eq.status}
                          </span>
                        ) : <span className="text-sm text-gray-400">—</span>}
                      </dd>
                    </div>
                  </div>
                </div>
                {eq.notes && (
                  <div className="px-5 pb-5">
                    <dt className="text-xs text-gray-400 dark:text-gray-500 mb-1">Примечания</dt>
                    <dd className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3">{eq.notes}</dd>
                  </div>
                )}
              </div>
              {/* Right card — history */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">История перемещений</h3>
                </div>
                {eqHistory.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Нет записей истории</div>
                ) : (
                  <div className="px-5 py-4 overflow-y-auto max-h-[480px]">
                    <div className="relative">
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                      <div className="space-y-5">
                        {eqHistory.map((m) => (
                          <div key={m.id} className="relative flex gap-3 pl-8">
                            <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-violet-500 border-2 border-white dark:border-gray-800 z-10" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                {m.maintenanceType && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{m.maintenanceType}</span>
                                )}
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{new Date(m.maintenanceDate).toLocaleDateString('ru-RU')}</span>
                              </div>
                              {m.description && <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{m.description}</p>}
                              {m.cost != null && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Стоимость: <span className="font-medium text-gray-600 dark:text-gray-300">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(m.cost)}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'resources' && !detailEquipment && (
        <div className="space-y-6">
          {/* Sub-nav */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {([
              { key: 'materials', label: 'Материальные заявки', count: materialRequests.length },
              { key: 'orders', label: 'Заказы поставщикам', count: supplierOrders.length },
              { key: 'equipment', label: 'Оборудование', count: equipmentList.length },
              { key: 'warehouses', label: 'Склады', count: warehousesList.length },
              { key: 'history', label: 'История', count: maintenanceList.length },
              { key: 'inventory', label: 'Инвентаризации', count: inventorySessions.length },
              { key: 'maintenance', label: 'Обслуживание', count: maintenanceList.length },
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
                            <th className="py-3 px-4 text-left font-semibold">Серийный №</th>
                            <th className="py-3 px-4 text-left font-semibold">Расположение</th>
                            <th className="py-3 px-4 text-left font-semibold">Дата поступления</th>
                            <th className="py-3 px-4 text-left font-semibold">Статус</th>
                            <th className="py-3 px-4 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {equipmentList.map((eq) => (
                            <tr key={eq.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors"
                              onClick={() => setDetailEquipment(eq)}>
                              <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{eq.name}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{eq.equipmentType ? (EQUIPMENT_TYPE_LABELS[eq.equipmentType] ?? eq.equipmentType) : '—'}</td>
                              <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">{eq.serialNumber || '—'}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{eq.currentLocation || '—'}</td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{eq.purchaseDate ? new Date(eq.purchaseDate).toLocaleDateString('ru-RU') : '—'}</td>
                              <td className="py-3 px-4">
                                {eq.status != null ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EQUIPMENT_STATUS[eq.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                    {EQUIPMENT_STATUS[eq.status]?.label ?? eq.status}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => { setEditingEq(eq); setShowEqModal(true); }}
                                    className="p-1 text-gray-300 hover:text-violet-500 dark:text-gray-600 dark:hover:text-violet-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={() => handleDeleteEquipment(eq.id)}
                                    className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Warehouses ── */}
              {resourceSubTab === 'warehouses' && (() => {
                const activeWHId = warehouseSubTab ? parseInt(warehouseSubTab, 10) : (warehousesList[0]?.id ?? 0);
                const activeWarehouse = warehousesList.find(w => w.id === activeWHId) ?? warehousesList[0];
                const noWarehouseEq = equipmentList.filter(e => !e.warehouseId);
                const warehouseEqRaw = activeWHId ? equipmentList.filter(e => e.warehouseId === activeWHId) : noWarehouseEq;
                const warehouseEq = whSearch
                  ? warehouseEqRaw.filter(e => e.name.toLowerCase().includes(whSearch.toLowerCase()) || e.serialNumber?.toLowerCase().includes(whSearch.toLowerCase()))
                  : warehouseEqRaw;
                return (
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Склады</h2>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Распределение оборудования по складам</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setResourceSubTab('inventory'); }}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                          Инвентаризация
                        </button>
                        <button onClick={() => { setEditingWH(null); setShowWHModal(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          Добавить склад
                        </button>
                      </div>
                    </div>

                    {/* Warehouse pills */}
                    <div className="flex gap-2 flex-wrap">
                      {warehousesList.map(wh => {
                        const count = equipmentList.filter(e => e.warehouseId === wh.id).length;
                        const active = activeWHId === wh.id;
                        return (
                          <button key={wh.id} onClick={() => setWarehouseSubTab(String(wh.id))}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${active ? 'bg-violet-500 text-white border-violet-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500'}`}>
                            {wh.name} <span className={`ml-1 ${active ? 'opacity-80' : 'text-gray-400 dark:text-gray-500'}`}>({count})</span>
                          </button>
                        );
                      })}
                      {noWarehouseEq.length > 0 && (
                        <button onClick={() => setWarehouseSubTab('0')}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${activeWHId === 0 ? 'bg-violet-500 text-white border-violet-500' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'}`}>
                          без склада <span className="ml-1 opacity-70">({noWarehouseEq.length})</span>
                        </button>
                      )}
                      {warehousesList.length === 0 && noWarehouseEq.length === 0 && (
                        <span className="text-sm text-gray-400 dark:text-gray-500">Нет складов. Нажмите «+ Добавить склад».</span>
                      )}
                    </div>

                    {/* Active warehouse table */}
                    {(activeWarehouse || activeWHId === 0) && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                        {/* Warehouse heading */}
                        <div className="px-5 pt-5 pb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              {activeWHId === 0 ? 'без склада' : (activeWarehouse?.name ?? '')}
                            </h3>
                            {activeWarehouse && (
                              <button onClick={() => { setEditingWH(activeWarehouse); setShowWHModal(true); }}
                                className="p-1 text-gray-300 hover:text-violet-500 dark:text-gray-600 dark:hover:text-violet-400 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            )}
                            {activeWarehouse && (
                              <button onClick={() => handleDeleteWarehouse(activeWarehouse.id)}
                                className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {warehouseEqRaw.length} {warehouseEqRaw.length === 1 ? 'единица' : warehouseEqRaw.length < 5 ? 'единицы' : 'единиц'}
                            {activeWarehouse?.address && ` · ${activeWarehouse.address}`}
                          </p>
                        </div>

                        {/* Search */}
                        <div className="px-5 pb-3 flex items-center gap-3">
                          <div className="relative flex-1 max-w-xs">
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                              value={whSearch}
                              onChange={(e) => setWhSearch(e.target.value)}
                              placeholder="Поиск по инструментам..."
                              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500 text-gray-700 dark:text-gray-300 placeholder-gray-400"
                            />
                          </div>
                        </div>

                        {warehouseEq.length === 0 ? (
                          <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700/60">
                            {whSearch ? 'Ничего не найдено' : 'Нет оборудования на этом складе'}
                          </div>
                        ) : (
                          <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700/60">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                                  <th className="py-3 px-4 w-10">
                                    <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-violet-500 focus:ring-violet-400" />
                                  </th>
                                  <th className="py-3 px-4 text-left font-semibold">Порядковый №</th>
                                  <th className="py-3 px-4 text-left font-semibold">Название</th>
                                  <th className="py-3 px-4 text-left font-semibold">Дата</th>
                                  <th className="py-3 px-4 text-left font-semibold">Склад</th>
                                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                                  <th className="py-3 px-4 text-left font-semibold">Производитель</th>
                                  <th className="py-3 px-4 text-left font-semibold">Ответственный</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {warehouseEq.map((eq) => (
                                  <tr key={eq.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors"
                                    onClick={() => setDetailEquipment(eq)}>
                                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                      <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-violet-500 focus:ring-violet-400" />
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                                      {String(eq.id).padStart(5, '0')}
                                    </td>
                                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{eq.name}</td>
                                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                                      {eq.purchaseDate ? new Date(eq.purchaseDate).toLocaleDateString('ru-RU') : '—'}
                                    </td>
                                    <td className="py-3 px-4">
                                      {activeWHId !== 0 && activeWarehouse ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 uppercase tracking-wide">
                                          {activeWarehouse.name}
                                        </span>
                                      ) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="py-3 px-4">
                                      {eq.status != null ? (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${EQUIPMENT_STATUS[eq.status]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                          {EQUIPMENT_STATUS[eq.status]?.label ?? eq.status}
                                        </span>
                                      ) : '—'}
                                    </td>
                                    <td className="py-3 px-4">
                                      {eq.manufacturer ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                                          {eq.manufacturer}
                                        </span>
                                      ) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">—</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── History ── */}
              {resourceSubTab === 'history' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">История обслуживания и перемещений</h3>
                  </div>
                  {maintenanceList.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">История пуста</div>
                  ) : (
                    <div className="px-5 py-4">
                      <div className="relative">
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                        <div className="space-y-6">
                          {[...maintenanceList].sort((a, b) => new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime()).map((m) => {
                            const eq = equipmentList.find(e => e.id === m.equipmentId);
                            return (
                              <div key={m.id} className="relative flex gap-4 pl-10">
                                <div className="absolute left-3.5 top-1 w-3 h-3 rounded-full bg-violet-500 border-2 border-white dark:border-gray-800 z-10" />
                                <div className="flex-1 bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                      <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{eq?.name || `Оборудование #${m.equipmentId}`}</span>
                                      {m.maintenanceType && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{m.maintenanceType}</span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{new Date(m.maintenanceDate).toLocaleDateString('ru-RU')}</span>
                                  </div>
                                  {m.description && <p className="text-sm text-gray-600 dark:text-gray-400">{m.description}</p>}
                                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                                    {m.cost != null && (
                                      <span>Стоимость: <span className="font-medium text-gray-600 dark:text-gray-300">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(m.cost)}</span></span>
                                    )}
                                    {m.nextMaintenanceDate && (
                                      <span>Следующее ТО: <span className="font-medium text-gray-600 dark:text-gray-300">{new Date(m.nextMaintenanceDate).toLocaleDateString('ru-RU')}</span></span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Inventory ── */}
              {resourceSubTab === 'inventory' && !detailInventory && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Инвентаризации</h3>
                    <button onClick={() => { setEditingInv(null); setShowInvModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Добавить
                    </button>
                  </div>
                  {inventorySessions.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Инвентаризации не проводились</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                            <th className="py-3 px-4 text-left font-semibold">Название</th>
                            <th className="py-3 px-4 text-left font-semibold">Статус</th>
                            <th className="py-3 px-4 text-left font-semibold">Дата проведения</th>
                            <th className="py-3 px-4 text-left font-semibold">Дата завершения</th>
                            <th className="py-3 px-4 text-center font-semibold">Позиций</th>
                            <th className="py-3 px-4 text-left font-semibold">Примечания</th>
                            <th className="py-3 px-4 w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {inventorySessions.map((inv) => (
                            <tr key={inv.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors"
                              onClick={() => setDetailInventory(inv)}>
                              <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{inv.name}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INV_STATUS[inv.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                                  {INV_STATUS[inv.status]?.label ?? inv.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{inv.scheduledDate ? new Date(inv.scheduledDate).toLocaleDateString('ru-RU') : '—'}</td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{inv.completedDate ? new Date(inv.completedDate).toLocaleDateString('ru-RU') : '—'}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold">
                                  {inv.items?.length ?? 0}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400 max-w-[180px] truncate">{inv.notes || '—'}</td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => { setEditingInv(inv); setShowInvModal(true); }}
                                    className="p-1 text-gray-300 hover:text-violet-500 dark:text-gray-600 dark:hover:text-violet-400 transition-colors" title="Редактировать">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={() => handleDeleteInventory(inv.id)}
                                    className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors" title="Удалить">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Inventory detail card ── */}
              {resourceSubTab === 'inventory' && detailInventory && (() => {
                const inv = detailInventory;
                const foundCount = inv.items?.filter(i => i.isFound).length ?? 0;
                const notFoundCount = (inv.items?.length ?? 0) - foundCount;
                return (
                  <div className="space-y-4">
                    <button onClick={() => setDetailInventory(null)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Назад к инвентаризациям
                    </button>

                    {/* Header card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{inv.name}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INV_STATUS[inv.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                              {INV_STATUS[inv.status]?.label ?? inv.status}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => { setEditingInv(inv); setShowInvModal(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Редактировать
                        </button>
                        <button onClick={() => handleDeleteInventory(inv.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Удалить
                        </button>
                      </div>
                      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <dt className="text-xs text-gray-400 dark:text-gray-500">Дата проведения</dt>
                          <dd className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{inv.scheduledDate ? new Date(inv.scheduledDate).toLocaleDateString('ru-RU') : '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-400 dark:text-gray-500">Дата завершения</dt>
                          <dd className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{inv.completedDate ? new Date(inv.completedDate).toLocaleDateString('ru-RU') : '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-400 dark:text-gray-500">Найдено</dt>
                          <dd className="text-sm font-semibold text-green-600 dark:text-green-400 mt-0.5">{foundCount} из {inv.items?.length ?? 0}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-400 dark:text-gray-500">Не найдено / расхождения</dt>
                          <dd className={`text-sm font-semibold mt-0.5 ${notFoundCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'}`}>{notFoundCount}</dd>
                        </div>
                        {inv.notes && (
                          <div className="col-span-2 sm:col-span-4">
                            <dt className="text-xs text-gray-400 dark:text-gray-500">Примечания</dt>
                            <dd className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{inv.notes}</dd>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Позиции инвентаризации</h3>
                        <button onClick={() => setShowInvItemModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          Добавить позицию
                        </button>
                      </div>
                      {!inv.items?.length ? (
                        <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Позиции не добавлены</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                                <th className="py-3 px-4 text-left font-semibold">№</th>
                                <th className="py-3 px-4 text-left font-semibold">Оборудование</th>
                                <th className="py-3 px-4 text-left font-semibold">Серийный №</th>
                                <th className="py-3 px-4 text-left font-semibold">Склад</th>
                                <th className="py-3 px-4 text-left font-semibold">Ожид. статус</th>
                                <th className="py-3 px-4 text-left font-semibold">Факт. статус</th>
                                <th className="py-3 px-4 text-center font-semibold">Найден</th>
                                <th className="py-3 px-4 text-left font-semibold">Примечания</th>
                                <th className="py-3 px-4 w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                              {inv.items.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                  <td className="py-3 px-4 text-xs font-mono text-gray-400 dark:text-gray-500">{idx + 1}</td>
                                  <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{item.equipment?.name || `#${item.equipmentId}`}</td>
                                  <td className="py-3 px-4 font-mono text-xs text-gray-400 dark:text-gray-500">{item.equipment?.serialNumber || '—'}</td>
                                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                                    {item.warehouse ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{item.warehouse.name}</span>
                                    ) : '—'}
                                  </td>
                                  <td className="py-3 px-4">
                                    {item.expectedStatus != null ? (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EQUIPMENT_STATUS[item.expectedStatus]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                                        {EQUIPMENT_STATUS[item.expectedStatus]?.label ?? item.expectedStatus}
                                      </span>
                                    ) : <span className="text-gray-400">—</span>}
                                  </td>
                                  <td className="py-3 px-4">
                                    {item.actualStatus != null ? (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EQUIPMENT_STATUS[item.actualStatus]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                                        {EQUIPMENT_STATUS[item.actualStatus]?.label ?? item.actualStatus}
                                      </span>
                                    ) : <span className="text-gray-400">—</span>}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {item.isFound ? (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30">
                                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30">
                                        <svg className="w-3 h-3 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400 max-w-[160px] truncate">{item.notes || '—'}</td>
                                  <td className="py-3 px-4">
                                    <button onClick={() => handleDeleteInventoryItem(inv.id, item.id)}
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
                  </div>
                );
              })()}

              {/* ── Maintenance ── */}
              {resourceSubTab === 'maintenance' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">Обслуживание оборудования</h3>
                    <button onClick={() => { setEditingMaint(null); setShowMaintModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Добавить
                    </button>
                  </div>
                  {maintenanceList.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Записей об обслуживании нет</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                            <th className="py-3 px-4 text-left font-semibold">Оборудование</th>
                            <th className="py-3 px-4 text-left font-semibold">Тип ТО</th>
                            <th className="py-3 px-4 text-left font-semibold">Дата</th>
                            <th className="py-3 px-4 text-left font-semibold">Следующее ТО</th>
                            <th className="py-3 px-4 text-right font-semibold">Стоимость</th>
                            <th className="py-3 px-4 text-left font-semibold">Описание</th>
                            <th className="py-3 px-4 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {maintenanceList.map((m) => (
                            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer transition-colors"
                              onClick={() => { setEditingMaint(m); setShowMaintModal(true); }}>
                              <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{m.equipment?.name || `#${m.equipmentId}`}</td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{m.maintenanceType || '—'}</td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{new Date(m.maintenanceDate).toLocaleDateString('ru-RU')}</td>
                              <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{m.nextMaintenanceDate ? new Date(m.nextMaintenanceDate).toLocaleDateString('ru-RU') : '—'}</td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-800 dark:text-gray-200">
                                {m.cost != null ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(m.cost) : '—'}
                              </td>
                              <td className="py-3 px-4 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{m.description || '—'}</td>
                              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleDeleteMaintenance(m.id)}
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
            manufacturer: editingEq.manufacturer,
            model: editingEq.model,
            serialNumber: editingEq.serialNumber,
            currentLocation: editingEq.currentLocation,
            purchaseDate: editingEq.purchaseDate,
            status: editingEq.status,
            notes: editingEq.notes,
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
            { key: 'manufacturer', label: 'Производитель', type: 'text' },
            { key: 'model', label: 'Модель', type: 'text' },
            { key: 'serialNumber', label: 'Серийный номер', type: 'text' },
            { key: 'currentLocation', label: 'Расположение', type: 'text' },
            { key: 'purchaseDate', label: 'Дата поступления', type: 'date' },
            {
              key: 'status', label: 'Статус', type: 'select',
              options: Object.entries(EQUIPMENT_STATUS).map(([v, s]) => ({ value: Number(v), label: s.label })),
            },
            { key: 'notes', label: 'Заметки', type: 'textarea' },
          ]}
          onClose={() => { setShowEqModal(false); setEditingEq(null); }}
          onSave={(data) => handleSaveEquipment(data)}
        />
      )}

      {/* Maintenance Modal */}
      {showMaintModal && (
        <FinanceModal
          title={editingMaint ? 'Запись об обслуживании' : 'Добавить обслуживание'}
          saving={savingResource}
          initialData={editingMaint ? {
            equipmentId: editingMaint.equipmentId,
            maintenanceType: editingMaint.maintenanceType,
            maintenanceDate: editingMaint.maintenanceDate,
            nextMaintenanceDate: editingMaint.nextMaintenanceDate,
            cost: editingMaint.cost,
            description: editingMaint.description,
          } : undefined}
          fields={[
            {
              key: 'equipmentId', label: 'Оборудование', type: 'select', required: true,
              options: equipmentList.map((e) => ({ value: e.id, label: e.name })),
            },
            { key: 'maintenanceType', label: 'Тип обслуживания', type: 'text' },
            { key: 'maintenanceDate', label: 'Дата ТО', type: 'date', required: true },
            { key: 'nextMaintenanceDate', label: 'Следующее ТО', type: 'date' },
            { key: 'cost', label: 'Стоимость (₽)', type: 'number' },
            { key: 'description', label: 'Описание', type: 'textarea' },
          ]}
          onClose={() => { setShowMaintModal(false); setEditingMaint(null); }}
          onSave={(data) => handleSaveMaintenance(data)}
        />
      )}

      {/* Inventory Session Modal */}
      {showInvModal && (
        <FinanceModal
          title={editingInv ? 'Редактировать инвентаризацию' : 'Новая инвентаризация'}
          saving={savingResource}
          initialData={editingInv ? {
            name: editingInv.name,
            status: editingInv.status,
            scheduledDate: editingInv.scheduledDate,
            completedDate: editingInv.completedDate,
            notes: editingInv.notes,
          } : { status: 0 }}
          fields={[
            { key: 'name', label: 'Название', type: 'text', required: true },
            {
              key: 'status', label: 'Статус', type: 'select',
              options: [
                { value: 0, label: 'Черновик' },
                { value: 1, label: 'В процессе' },
                { value: 2, label: 'Завершена' },
              ],
            },
            { key: 'scheduledDate', label: 'Дата проведения', type: 'date' },
            { key: 'completedDate', label: 'Дата завершения', type: 'date' },
            { key: 'notes', label: 'Примечания', type: 'textarea' },
          ]}
          onClose={() => { setShowInvModal(false); setEditingInv(null); }}
          onSave={(data) => handleSaveInventory(data)}
        />
      )}

      {/* Inventory Item Modal */}
      {showInvItemModal && (
        <FinanceModal
          title="Добавить позицию"
          saving={savingInvItem}
          fields={[
            {
              key: 'equipmentId', label: 'Оборудование', type: 'select', required: true,
              options: equipmentList.map((e) => ({ value: e.id, label: e.name + (e.serialNumber ? ` (${e.serialNumber})` : '') })),
            },
            {
              key: 'warehouseId', label: 'Склад', type: 'select',
              options: warehousesList.map((w) => ({ value: w.id, label: w.name })),
            },
            {
              key: 'expectedStatus', label: 'Ожидаемый статус', type: 'select',
              options: Object.entries(EQUIPMENT_STATUS).map(([v, s]) => ({ value: Number(v), label: s.label })),
            },
            {
              key: 'actualStatus', label: 'Фактический статус', type: 'select',
              options: Object.entries(EQUIPMENT_STATUS).map(([v, s]) => ({ value: Number(v), label: s.label })),
            },
            {
              key: 'isFound', label: 'Найдено', type: 'select',
              options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }],
            },
            { key: 'notes', label: 'Примечания', type: 'textarea' },
          ]}
          onClose={() => setShowInvItemModal(false)}
          onSave={(data) => handleAddInventoryItem({ ...data, isFound: data.isFound !== 0 })}
        />
      )}

      {/* Warehouse Create/Edit Modal */}
      {showWHModal && (
        <FinanceModal
          title={editingWH ? 'Редактировать склад' : 'Новый склад'}
          saving={savingWH}
          initialData={editingWH ? { name: editingWH.name, address: editingWH.address } : undefined}
          fields={[
            { key: 'name', label: 'Название склада', type: 'text', required: true },
            { key: 'address', label: 'Адрес', type: 'textarea' },
          ]}
          onClose={() => { setShowWHModal(false); setEditingWH(null); }}
          onSave={(data) => handleSaveWarehouse(data)}
        />
      )}

      {/* Object Create/Edit Modal */}
      {showObjectModal && (
        <ObjectFormModal
          obj={editingObject}
          saving={objectSaving}
          onClose={() => { setShowObjectModal(false); setEditingObject(null); }}
          onSave={async (data) => {
            setObjectSaving(true);
            try {
              if (editingObject) {
                const res = await api.put(`/construction-sites/${editingObject.id}`, data);
                const updated = res.data ?? { ...editingObject, ...data };
                setObjectsList((prev) => prev.map((o) => o.id === editingObject.id ? updated : o));
                addToast('success', 'Объект обновлён');
              } else {
                const res = await api.post(`/construction-sites`, { ...data, projectId });
                setObjectsList((prev) => [...prev, res.data]);
                addToast('success', 'Объект создан');
              }
              setShowObjectModal(false);
              setEditingObject(null);
            } catch { addToast('error', 'Ошибка при сохранении объекта'); }
            finally { setObjectSaving(false); }
          }}
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
        <TaskFormModal
          task={{ projectId } as any}
          onClose={() => setShowCreateTask(false)}
          onSaved={() => { setShowCreateTask(false); reloadTasks(true); }}
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
        <TaskFormModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSaved={() => { setSelectedTask(null); reloadTasks(); }}
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

      {/* Price Item Modal */}
      {showPriceModal && (
        <FinanceModal
          title={editingPrice ? 'Редактировать услугу' : 'Новая услуга'}
          saving={savingPrice}
          onClose={() => { setShowPriceModal(false); setEditingPrice(null); }}
          onSave={(data) => handleSavePriceItem(data as unknown as Omit<WorkTemplate, 'id'>)}
          fields={[
            { key: 'name', label: 'Название услуги', type: 'text', required: true },
            { key: 'code', label: 'Код', type: 'text' },
            { key: 'category', label: 'Категория', type: 'text' },
            { key: 'unit', label: 'Единица измерения', type: 'text' },
            { key: 'estimatedCost', label: 'Стоимость', type: 'number' },
            { key: 'estimatedDuration', label: 'Длительность (дней)', type: 'number' },
            { key: 'complexityLevel', label: 'Сложность (1–3)', type: 'number' },
            { key: 'description', label: 'Описание', type: 'textarea' },
          ]}
          initialData={editingPrice ? editingPrice as unknown as Record<string, unknown> : undefined}
        />
      )}

      {/* Commercial Proposal Modal */}
      {showProposalModal && (
        <FinanceModal
          title={selectedProposal ? 'Редактировать КП' : 'Новое коммерческое предложение'}
          saving={savingProposal}
          onClose={() => setShowProposalModal(false)}
          onSave={(data) => handleSaveProposal(data)}
          fields={[
            { key: 'proposalNumber', label: 'Номер КП', type: 'text', required: true },
            { key: 'clientName', label: 'Имя клиента', type: 'text' },
            { key: 'clientPhone', label: 'Телефон клиента', type: 'text' },
            { key: 'clientEmail', label: 'Email клиента', type: 'text' },
            { key: 'objectAddress', label: 'Адрес объекта', type: 'text' },
            { key: 'objectComment', label: 'Комментарий к объекту', type: 'textarea' },
            { key: 'managerName', label: 'Менеджер', type: 'text' },
            { key: 'status', label: 'Статус', type: 'select', options: Object.entries(PROPOSAL_STATUS).map(([v, s]) => ({ value: v, label: s.label })) },
            { key: 'notes', label: 'Примечания', type: 'textarea' },
          ]}
          initialData={selectedProposal ? selectedProposal as unknown as Record<string, unknown> : undefined}
        />
      )}

      {/* ── Inactive project modal ── */}
      {showInactiveModal && project && (() => {
        const daysInactive = project.updatedAt
          ? Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 14;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleDismissInactiveModal}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
        defaults[f.key] = f.type === 'date' ? new Date().toISOString().slice(0, 10) : '';
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

function ObjectFormModal({
  obj,
  saving,
  onClose,
  onSave,
}: {
  obj: ConstructionSite | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<ConstructionSite>) => Promise<void>;
}) {
  const [name, setName] = useState(obj?.name ?? '');
  const [address, setAddress] = useState(obj?.address ?? '');
  const [code, setCode] = useState(obj?.code ?? '');
  const [status, setStatus] = useState<number>(typeof obj?.status === 'number' ? obj.status : typeof obj?.status === 'string' ? parseInt(obj.status) || 0 : 0);
  const [description, setDescription] = useState(obj?.description ?? '');
  const [startDate, setStartDate] = useState(obj?.startDate?.slice(0, 10) ?? '');
  const [plannedEndDate, setPlannedEndDate] = useState(obj?.plannedEndDate?.slice(0, 10) ?? '');

  return (
    <ModalShell title={obj ? 'Редактировать объект' : 'Новый объект'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Название *</label>
          <input
            autoFocus
            className="form-input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Наименование объекта"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Адрес *</label>
          <input
            className="form-input w-full"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Адрес объекта"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Код</label>
            <input className="form-input w-full" value={code} onChange={(e) => setCode(e.target.value)} placeholder="OBJ-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Статус</label>
            <select className="form-select w-full" value={status} onChange={(e) => setStatus(Number(e.target.value))}>
              <option value={0}>Планирование</option>
              <option value={1}>В работе</option>
              <option value={2}>Приостановлен</option>
              <option value={3}>Завершён</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Дата начала</label>
            <input type="date" className="form-input w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Плановое окончание</label>
            <input type="date" className="form-input w-full" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Описание</label>
          <textarea
            className="form-input w-full resize-y"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Дополнительная информация..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors">
          Отмена
        </button>
        <button
          type="button"
          disabled={saving || !name.trim() || !address.trim()}
          onClick={() => onSave({ name, address, code: code || undefined, status, description: description || undefined, startDate: startDate || undefined, plannedEndDate: plannedEndDate || undefined })}
          className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? 'Сохранение...' : obj ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </ModalShell>
  );
}

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
          const { data: up } = await api.post('/chat-channels/upload', fd);
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
          const { data: up } = await api.post('/chat-channels/upload', fd);
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

function ProposalActDocument({ proposal, projectName, projectAddress, managerName, onBack }: {
  proposal: CommercialProposal;
  projectName: string;
  projectAddress?: string;
  managerName?: string;
  onBack: () => void;
}) {
  const sortedLines = [...proposal.lines].sort((a, b) => a.sortOrder - b.sortOrder);
  const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const actNumber = `АКТ-${proposal.proposalNumber}`;

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = '__act_print_style';
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #kp-act-document, #kp-act-document * { visibility: visible !important; }
        #kp-act-document { position: fixed; inset: 0; z-index: 99999; background: white; overflow: visible; padding: 12mm 18mm; }
        @page { margin: 0; size: A4 portrait; }
      }`;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => { const el = document.getElementById('__act_print_style'); el?.remove(); }, 500);
  };

  const labelCls = "text-[10px] uppercase tracking-[0.12em] text-gray-400 font-semibold mb-0.5";
  const valCls   = "text-sm text-gray-900 font-medium";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          К составу
        </button>
        <div className="flex-1" />
        <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">Откройте «Печать» и сохраните как PDF — макет ориентирован на лист А4.</p>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Печать / PDF
        </button>
      </div>

      {/* A4 Document */}
      <div id="kp-act-document" className="bg-white rounded-2xl shadow-md max-w-3xl mx-auto overflow-hidden">
        {/* Color top stripe */}
        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-violet-700" />

        <div className="px-10 py-8">

          {/* Document stamp */}
          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 text-center mb-5">
            Документ для передачи заказчику и печати
          </p>

          {/* Title */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Акт оказанных услуг</h1>
            <p className="text-xs text-gray-400 mt-1.5">{actNumber} &nbsp;·&nbsp; Дата составления: {dateStr}</p>
          </div>

          <hr className="border-gray-100 mb-7" />

          {/* Parties row */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className={labelCls}>Коммерческое предложение</p>
              <p className="text-base font-bold text-gray-900">{proposal.proposalNumber}</p>
              {projectName && <p className="text-xs text-gray-500 mt-0.5">Проект: {projectName}</p>}
            </div>
            <div>
              <p className={labelCls}>Заказчик</p>
              <p className="text-base font-bold text-gray-900">{proposal.clientName || '—'}</p>
              {(proposal.clientPhone || proposal.clientEmail) && (
                <p className="text-xs text-gray-500 mt-0.5">{[proposal.clientPhone, proposal.clientEmail].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          </div>

          {(proposal.objectAddress || projectAddress) && (
            <div className="mb-7 bg-gray-50 rounded-xl px-5 py-4">
              <p className={labelCls}>Объект (адрес)</p>
              <p className={valCls}>{proposal.objectAddress || projectAddress}</p>
              {proposal.objectComment && <p className="text-xs text-gray-500 mt-1">{proposal.objectComment}</p>}
            </div>
          )}

          <hr className="border-gray-100 mb-7" />

          {/* Preamble */}
          <div className="mb-7">
            <h2 className="text-sm font-bold text-gray-800 mb-2">Преамбула</h2>
            <p className="text-sm text-gray-600 leading-relaxed text-justify">
              Настоящий акт составлен в подтверждение того, что Исполнитель надлежащим образом выполнил,
              а Заказчик принял следующие работы и услуги в соответствии с Коммерческим предложением&nbsp;
              <span className="font-semibold text-gray-800">{proposal.proposalNumber}</span>.
              Настоящий акт фиксирует перечень, описание, объёмы и стоимость выполненных работ.
              Подписание акта обеими сторонами свидетельствует об отсутствии взаимных претензий по объёму и качеству выполненных работ.
            </p>
          </div>

          {/* Section 1: Services table */}
          <div className="mb-7">
            <h2 className="text-sm font-bold text-gray-800 mb-1">1. Состав и стоимость выполненных работ</h2>
            <p className="text-xs text-gray-400 mb-3">Стоимость указана в соответствии с Коммерческим предложением. НДС не облагается.</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-y border-gray-200 bg-gray-50">
                  <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 w-8">№</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">Наименование работ / услуг</th>
                  <th className="py-2 px-3 text-center text-xs font-semibold text-gray-500 w-14">Ед.</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500 w-18">Кол-во</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500 w-28">Цена, ₽</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500 w-28">Стоимость, ₽</th>
                </tr>
              </thead>
              <tbody>
                {sortedLines.map((line, i) => (
                  <tr key={line.id} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="py-2.5 px-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-2.5 px-3">
                      <p className="text-gray-900 font-medium leading-snug">{line.serviceName}</p>
                      {line.serviceDesc && <p className="text-xs text-gray-400 mt-0.5">{line.serviceDesc}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-500 text-xs">{line.unit || 'шт.'}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{Number(line.quantity)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{Number(line.unitPrice).toLocaleString('ru-RU')}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{Number(line.totalPrice).toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={4} className="py-3 px-3 text-right text-xs text-gray-500 uppercase tracking-wide font-semibold">НДС:</td>
                  <td className="py-3 px-3 text-right text-xs text-gray-500" colSpan={2}>Не облагается</td>
                </tr>
                <tr className="bg-violet-50 border-b-2 border-violet-200">
                  <td colSpan={4} className="py-3 px-3 text-right font-bold text-gray-900 text-sm uppercase tracking-wide">Итого к оплате:</td>
                  <td className="py-3 px-3 text-right font-bold text-lg text-violet-700" colSpan={2}>{fmtMoney(Number(proposal.totalAmount))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 2: Status of each work */}
          <div className="mb-7">
            <h2 className="text-sm font-bold text-gray-800 mb-3">2. Акт выполненных работ по позициям</h2>
            <div className="space-y-2">
              {sortedLines.map((line, i) => {
                const ws = line.workStatus;
                const isDone = ws === 'done';
                const isInProgress = ws === 'in_progress';
                return (
                  <div key={line.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${isDone ? 'border-green-200 bg-green-50' : isInProgress ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${isDone ? 'bg-green-500' : isInProgress ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      {isDone ? (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : isInProgress ? (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-100" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{i + 1}. {line.serviceName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Number(line.quantity)} {line.unit || 'шт.'} × {Number(line.unitPrice).toLocaleString('ru-RU')} ₽ = <span className="font-semibold">{Number(line.totalPrice).toLocaleString('ru-RU')} ₽</span>
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${isDone ? 'text-green-700 bg-green-100' : isInProgress ? 'text-blue-700 bg-blue-100' : 'text-gray-500 bg-gray-200'}`}>
                      {isDone ? 'Выполнено' : isInProgress ? 'В работе' : 'Не начато'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Guarantee & claims */}
          <div className="mb-7">
            <h2 className="text-sm font-bold text-gray-800 mb-2">3. Гарантийные обязательства и претензии</h2>
            <p className="text-sm text-gray-600 leading-relaxed text-justify">
              Исполнитель гарантирует надлежащее качество выполненных работ в течение <span className="font-semibold text-gray-800">12 (двенадцати) месяцев</span> с даты подписания настоящего акта. На момент подписания настоящего акта Заказчик претензий к качеству, объёму и срокам выполненных работ не имеет.
            </p>
            {proposal.notes && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Примечания</p>
                <p className="text-sm text-amber-900 leading-relaxed">{proposal.notes}</p>
              </div>
            )}
          </div>

          {/* Section 4: Signatures */}
          <div className="mb-2">
            <h2 className="text-sm font-bold text-gray-800 mb-5">4. Подписи сторон</h2>
            <div className="grid grid-cols-2 gap-12">
              <div>
                <p className={labelCls}>Исполнитель</p>
                <p className="text-sm text-gray-700 font-medium mb-1">{managerName || projectName || '________________'}</p>
                {projectName && <p className="text-xs text-gray-500 mb-6">{projectName}</p>}
                {!projectName && <div className="mb-6" />}
                <div className="border-b-2 border-gray-300 mb-1.5 mt-8" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Подпись / дата</p>
              </div>
              <div>
                <p className={labelCls}>Заказчик</p>
                <p className="text-sm text-gray-700 font-medium mb-1">{proposal.clientName || '________________'}</p>
                {proposal.clientPhone && <p className="text-xs text-gray-500 mb-6">{proposal.clientPhone}</p>}
                {!proposal.clientPhone && <div className="mb-6" />}
                <div className="border-b-2 border-gray-300 mb-1.5 mt-8" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Подпись / дата</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[10px] text-gray-300">{actNumber}</p>
            <p className="text-[10px] text-gray-300">Сформировано {dateStr}</p>
          </div>

        </div>
      </div>
    </div>
  );
}

function ProposalLineRow({ line, proposalId, onUpdate, onDelete }: {
  line: ProposalLine;
  proposalId: number;
  onUpdate: (proposalId: number, lineId: number, data: { quantity: number; unitPrice: number }) => Promise<void>;
  onDelete: (proposalId: number, lineId: number) => void;
}) {
  const [qty, setQty] = useState(String(line.quantity));
  const [price, setPrice] = useState(String(line.unitPrice));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const q = Number(qty);
    const p = Number(price);
    if (q === Number(line.quantity) && p === Number(line.unitPrice)) return;
    setSaving(true);
    await onUpdate(proposalId, line.id, { quantity: q, unitPrice: p }).finally(() => setSaving(false));
  };

  const numCls = `w-full text-right px-2 py-1.5 text-sm rounded border border-transparent focus:border-violet-400 focus:outline-none bg-transparent focus:bg-white dark:focus:bg-gray-700 transition-colors ${saving ? 'opacity-50' : ''}`;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/20 group">
      <td className="py-2.5 px-4">
        <div className="font-medium text-gray-800 dark:text-gray-200 leading-snug">{line.serviceName}</div>
        {line.serviceDesc && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{line.serviceDesc}</div>}
      </td>
      <td className="py-2.5 px-4 text-center text-gray-500 dark:text-gray-400 text-xs">{line.unit || '—'}</td>
      <td className="py-2.5 px-2">
        <input type="number" min="0" step="0.01" value={qty} disabled={saving}
          onChange={e => setQty(e.target.value)} onBlur={save}
          className={numCls} />
      </td>
      <td className="py-2.5 px-2">
        <input type="number" min="0" step="0.01" value={price} disabled={saving}
          onChange={e => setPrice(e.target.value)} onBlur={save}
          className={numCls} />
      </td>
      <td className="py-2.5 px-4 text-right font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
        {fmtMoney(Number(qty) * Number(price))}
      </td>
      <td className="py-2.5 px-4">
        <button onClick={() => onDelete(proposalId, line.id)} className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </td>
    </tr>
  );
}

function AddLineModal({ proposalId, onAdd }: {
  proposalId: number;
  onAdd: (id: number, line: { serviceName: string; unit?: string; quantity: number; unitPrice: number; totalPrice: number; workStatus: string; sortOrder: number }) => Promise<void>;
}) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ serviceName: '', unit: '', quantity: '1', unitPrice: '0' });
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serviceName.trim()) return;
    setSaving(true);
    try {
      const qty = Number(form.quantity) || 1;
      const price = Number(form.unitPrice) || 0;
      await onAdd(proposalId, { serviceName: form.serviceName.trim(), unit: form.unit || undefined, quantity: qty, unitPrice: price, totalPrice: qty * price, workStatus: 'not_started', sortOrder: 0 });
      setForm({ serviceName: '', unit: '', quantity: '1', unitPrice: '0' });
      setShow(false);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return (
    <button onClick={() => setShow(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
      Добавить позицию
    </button>
  );

  return (
    <ModalShell title="Добавить позицию" onClose={() => setShow(false)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Услуга <span className="text-red-500">*</span></label>
            <input required value={form.serviceName} onChange={e => setForm(p => ({ ...p, serviceName: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ед.</label>
              <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Кол-во</label>
              <input type="number" min="0" step="0.01" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Цена</label>
              <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(p => ({ ...p, unitPrice: e.target.value }))} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button type="button" onClick={() => setShow(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Отмена</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Добавление...' : 'Добавить'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ProjectDetailPage />
    </Suspense>
  );
}
