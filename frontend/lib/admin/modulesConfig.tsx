import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { CrudModuleConfig, ModuleCategory } from '@/types/admin';
import { useToastStore } from '@/stores/toastStore';

// ─── UserName component ───────────────────────────────────────────────────────

const userNameCache = new Map<number, string>();

function UserName({ userId }: { userId: number }) {
  const [name, setName] = useState<string | null>(userNameCache.get(userId) ?? null);
  useEffect(() => {
    if (name !== null) return;
    api.get(`/users/${userId}`).then(({ data }) => {
      const n = data?.name ?? data?.firstName ?? String(userId);
      userNameCache.set(userId, n);
      setName(n);
    }).catch(() => setName(String(userId)));
  }, [userId]);
  return <span>{name ?? '...'}</span>;
}

// ─── Email render helper ──────────────────────────────────────────────────────

function renderEmail(v: unknown) {
  if (!v) return <span className="text-gray-400">—</span>;
  const email = String(v);
  const handleCopy = () => {
    navigator.clipboard.writeText(email).then(() => {
      useToastStore.getState().addToast('success', 'Скопировано в буфер обмена');
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-violet-500 underline hover:text-violet-600 cursor-pointer truncate max-w-[200px] block text-left"
      title="Нажмите чтобы скопировать"
    >
      {email}
    </button>
  );
}

// ─── Money render helper ──────────────────────────────────────────────────────

function renderMoney(v: unknown) {
  if (v == null || v === '') return <span className="text-gray-400">—</span>;
  return (
    <span className="font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
      {Number(v).toLocaleString('ru-RU')} ₽
    </span>
  );
}

// ─── Phone render helper ──────────────────────────────────────────────────────

function renderPhone(v: unknown) {
  if (!v) return <span className="text-gray-400">—</span>;
  const digits = String(v).replace(/\D/g, '');
  const tel = digits.startsWith('7') || digits.startsWith('8')
    ? '+7' + digits.slice(1)
    : '+' + digits;
  const display = tel.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4');
  return (
    <a href={`tel:${tel}`} className="text-violet-500 underline hover:text-violet-600 whitespace-nowrap">
      {display}
    </a>
  );
}

// ─── PasswordCell ─────────────────────────────────────────────────────────────

function PasswordCell({ value }: { value: unknown }) {
  const [show, setShow] = useState(false);
  const hash = value ? String(value) : null;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-sm select-none ${show ? 'text-gray-700 dark:text-gray-200 max-w-[180px] truncate' : 'tracking-widest text-gray-400'}`}>
        {show ? (hash ?? '—') : '••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-gray-400 hover:text-violet-500 transition-colors flex-shrink-0"
        title={show ? 'Скрыть' : 'Показать'}
      >
        {show ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(v: unknown): string {
  if (!v) return '—';
  try {
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return String(v);
  }
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  );
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

const TASK_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая', color: 'gray' },
  1: { label: 'Назначена', color: 'blue' },
  2: { label: 'В работе', color: 'yellow' },
  3: { label: 'На проверке', color: 'purple' },
  4: { label: 'Завершена', color: 'green' },
  5: { label: 'Отменена', color: 'red' },
};

const TASK_PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкий', color: 'green' },
  2: { label: 'Средний', color: 'yellow' },
  3: { label: 'Высокий', color: 'orange' },
  4: { label: 'Критический', color: 'red' },
};

// ─── Projects ─────────────────────────────────────────────────────────────────

const PROJECT_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Планирование', color: 'gray' },
  1: { label: 'Активный', color: 'green' },
  2: { label: 'Приостановлен', color: 'yellow' },
  3: { label: 'Завершён', color: 'blue' },
  4: { label: 'Отменён', color: 'red' },
};

// ─── Module configs ───────────────────────────────────────────────────────────

export const ADMIN_MODULES: Record<string, CrudModuleConfig> = {
  users: {
    slug: 'users',
    title: 'Пользователи',
    apiEndpoint: '/users',
    searchField: 'имени',
    hasPdf: true,
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'name', header: 'Имя', sortable: true },
      { key: 'email', header: 'Email', sortable: true, render: renderEmail },
      { key: 'phone', header: 'Телефон', render: renderPhone },
    ],
    formFields: [
      { key: 'name', label: 'Имя', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      {
        key: 'roleId',
        label: 'Роль',
        type: 'select',
        required: true,
        options: [
          { value: 1, label: 'Супер-админ' },
          { value: 2, label: 'Админ' },
          { value: 3, label: 'HR' },
          { value: 4, label: 'PM' },
          { value: 5, label: 'Прораб' },
          { value: 6, label: 'Снабженец' },
          { value: 7, label: 'Кладовщик' },
          { value: 8, label: 'Бухгалтер' },
          { value: 9, label: 'Инспектор' },
          { value: 10, label: 'Рабочий' },
        ],
      },
      { key: 'phone', label: 'Телефон', type: 'text' },
      { key: 'newPassword', label: 'Пароль', type: 'password' },
    ],
  },
  projects: {
    slug: 'projects',
    title: 'Проекты',
    apiEndpoint: '/projects',
    searchField: 'названию',
    hasPdf: true,
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'name', header: 'Название', sortable: true },
      {
        key: 'status',
        header: 'Статус',
        sortable: true,
        render: (v) => {
          const s = PROJECT_STATUS_MAP[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span>{String(v ?? '—')}</span>;
        },
      },
      {
        key: 'budget',
        header: 'Бюджет',
        sortable: true,
        render: renderMoney,
      },
      { key: 'startDate', header: 'Начало', render: (v) => fmtDate(v) },
      { key: 'plannedEndDate', header: 'Окончание', render: (v) => fmtDate(v) },
    ],
    formFields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'description', label: 'Описание', type: 'textarea' },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 0, label: 'Планирование' },
          { value: 1, label: 'Активный' },
          { value: 2, label: 'Приостановлен' },
          { value: 3, label: 'Завершён' },
          { value: 4, label: 'Отменён' },
        ],
      },
      { key: 'budget', label: 'Бюджет (₽)', type: 'number' },
      { key: 'startDate', label: 'Дата начала', type: 'date' },
      { key: 'plannedEndDate', label: 'Дата окончания', type: 'date' },
    ],
  },
  'construction-sites': {
    slug: 'construction-sites',
    title: 'Стройплощадки',
    apiEndpoint: '/construction-sites',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'name', header: 'Название', sortable: true },
      { key: 'address', header: 'Адрес' },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<number, { label: string; color: string }> = {
            0: { label: 'Планирование', color: 'gray' },
            1: { label: 'Активная', color: 'green' },
            2: { label: 'Приостановлена', color: 'yellow' },
            3: { label: 'Завершена', color: 'blue' },
          };
          const s = map[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span>{String(v ?? '—')}</span>;
        },
      },
      {
        key: 'projectId',
        header: 'Проект',
        render: (v, row) => {
          const name = (row as Record<string, any>).project?.name;
          if (name) return <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>;
          if (!v) return <span className="text-gray-400">—</span>;
          return <span className="text-sm text-gray-500">#{String(v)}</span>;
        },
      },
    ],
    formFields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'address', label: 'Адрес', type: 'text' },
      { key: 'projectId', label: 'Проект', type: 'select', fetchOptions: { endpoint: '/projects', valueKey: 'id', labelKey: 'name' } },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 0, label: 'Планирование' },
          { value: 1, label: 'Активная' },
          { value: 2, label: 'Приостановлена' },
          { value: 3, label: 'Завершена' },
        ],
      },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
  },
  tasks: {
    slug: 'tasks',
    title: 'Задачи',
    apiEndpoint: '/tasks',
    searchField: 'названию',
    hasPdf: true,
    customRowActions: [
      { key: 'assign', label: 'Исполнители', title: 'Назначить исполнителей' },
    ],
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'title', header: 'Название', sortable: true },
      {
        key: 'projectId',
        header: 'Проект',
        render: (v, row) => {
          const name = (row as Record<string, unknown>).projectName as string | undefined;
          if (name) return <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>;
          if (!v) return <span className="text-gray-400">—</span>;
          return <span className="text-sm text-gray-500">#{String(v)}</span>;
        },
      },
      {
        key: 'status',
        header: 'Статус',
        sortable: true,
        render: (v) => {
          const s = TASK_STATUS_MAP[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span>{String(v ?? '—')}</span>;
        },
      },
      {
        key: 'priority',
        header: 'Приоритет',
        sortable: true,
        render: (v) => {
          const p = TASK_PRIORITY_MAP[Number(v)];
          return p ? <StatusBadge label={p.label} color={p.color} /> : <span>{String(v ?? '—')}</span>;
        },
      },
      { key: 'dueDate', header: 'Срок', render: (v) => fmtDate(v) },
      {
        key: 'assignees',
        header: 'Исполнители',
        render: (v) => {
          if (!v || !Array.isArray(v) || v.length === 0) return <span className="text-gray-400">—</span>;
          return (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {(v as Array<{ userId: number; userName?: string }>)
                .map((a) => a.userName || `#${a.userId}`)
                .join(', ')}
            </span>
          );
        },
      },
    ],
    formFields: [
      { key: 'title', label: 'Название', type: 'text', required: true },
      {
        key: 'projectId',
        label: 'Проект',
        type: 'select',
        fetchOptions: { endpoint: '/projects', valueKey: 'id', labelKey: 'name' },
      },
      { key: 'description', label: 'Описание', type: 'textarea' },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 0, label: 'Новая' },
          { value: 1, label: 'Назначена' },
          { value: 2, label: 'В работе' },
          { value: 3, label: 'На проверке' },
          { value: 4, label: 'Завершена' },
          { value: 5, label: 'Отменена' },
        ],
      },
      {
        key: 'priority',
        label: 'Приоритет',
        type: 'select',
        options: [
          { value: 1, label: 'Низкий' },
          { value: 2, label: 'Средний' },
          { value: 3, label: 'Высокий' },
          { value: 4, label: 'Критический' },
        ],
      },
      { key: 'dueDate', label: 'Срок', type: 'date' },
    ],
  },
  clients: {
    slug: 'clients',
    title: 'Клиенты',
    apiEndpoint: '/clients',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      {
        key: 'companyName',
        header: 'Название / ФИО',
        sortable: true,
        render: (v, row) => {
          const r = row as Record<string, any>;
          const name = r.companyName || [r.lastName, r.firstName, r.middleName].filter(Boolean).join(' ');
          return name ? <span>{name}</span> : <span className="text-gray-400">—</span>;
        },
      },
      {
        key: 'clientType',
        header: 'Тип',
        render: (v) => {
          const map: Record<string, string> = { company: 'Компания', individual: 'Физ. лицо', government: 'Гос. орган' };
          return <span>{map[String(v ?? '')] ?? String(v ?? '—')}</span>;
        },
      },
      { key: 'email', header: 'Email', render: renderEmail },
      { key: 'phone', header: 'Телефон', render: renderPhone },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<string, { label: string; color: string }> = {
            active:   { label: 'Активен',   color: 'green' },
            inactive: { label: 'Неактивен', color: 'gray' },
            blocked:  { label: 'Заблокирован', color: 'red' },
          };
          const s = map[String(v ?? '')];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
    ],
    formFields: [
      {
        key: 'clientType',
        label: 'Тип клиента',
        type: 'select',
        options: [
          { value: 'company', label: 'Компания' },
          { value: 'individual', label: 'Физ. лицо' },
          { value: 'government', label: 'Гос. орган' },
        ],
      },
      { key: 'companyName', label: 'Название компании', type: 'text' },
      { key: 'firstName', label: 'Имя', type: 'text' },
      { key: 'lastName', label: 'Фамилия', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Телефон', type: 'text' },
      { key: 'address', label: 'Адрес', type: 'textarea' },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 'active', label: 'Активен' },
          { value: 'inactive', label: 'Неактивен' },
          { value: 'blocked', label: 'Заблокирован' },
        ],
      },
    ],
  },
  materials: {
    slug: 'materials',
    title: 'Материалы',
    apiEndpoint: '/materials',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'name', header: 'Название', sortable: true },
      { key: 'unit', header: 'Ед. изм.' },
      { key: 'minStockLevel', header: 'Мин. запас', sortable: true },
      { key: 'basePrice', header: 'Цена', sortable: true, render: renderMoney },
    ],
    formFields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'unit', label: 'Единица измерения', type: 'text' },
      { key: 'basePrice', label: 'Цена', type: 'number' },
      { key: 'minStockLevel', label: 'Мин. запас', type: 'number' },
      { key: 'maxStockLevel', label: 'Макс. запас', type: 'number' },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
  },
  equipment: {
    slug: 'equipment',
    title: 'Оборудование',
    apiEndpoint: '/equipment',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'name', header: 'Название', sortable: true },
      { key: 'equipmentType', header: 'Тип' },
      {
        key: 'status', header: 'Статус', sortable: true,
        render: (v) => {
          const map: Record<number, { label: string; color: string }> = {
            1: { label: 'Доступно',        color: 'green'  },
            2: { label: 'В использовании', color: 'blue'   },
            3: { label: 'На обслуживании', color: 'yellow' },
            4: { label: 'Сломано',         color: 'red'    },
          };
          const s = map[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
      { key: 'currentLocation', header: 'Расположение' },
    ],
    formFields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'equipmentType', label: 'Тип', type: 'text' },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 1, label: 'Доступно' },
          { value: 2, label: 'В использовании' },
          { value: 3, label: 'На обслуживании' },
          { value: 4, label: 'Сломано' },
        ],
      },
      { key: 'currentLocation', label: 'Расположение', type: 'text' },
      { key: 'manufacturer', label: 'Производитель', type: 'text' },
      { key: 'model', label: 'Модель', type: 'text' },
      { key: 'serialNumber', label: 'Серийный номер', type: 'text' },
      { key: 'notes', label: 'Заметки', type: 'textarea' },
    ],
  },
  suppliers: {
    slug: 'suppliers',
    title: 'Поставщики',
    apiEndpoint: '/suppliers',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'name', header: 'Название', sortable: true },
      { key: 'contactPerson', header: 'Контакт' },
      { key: 'phone', header: 'Телефон', render: renderPhone },
      { key: 'email', header: 'Email', render: renderEmail },
    ],
    formFields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'contactPerson', label: 'Контактное лицо', type: 'text' },
      { key: 'phone', label: 'Телефон', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Адрес', type: 'textarea' },
    ],
  },
  documents: {
    slug: 'documents',
    title: 'Документы',
    apiEndpoint: '/documents',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'title', header: 'Название', sortable: true },
      { key: 'type', header: 'Тип' },
      { key: 'createdAt', header: 'Создан', sortable: true },
    ],
    formFields: [
      { key: 'title', label: 'Название', type: 'text', required: true },
      {
        key: 'type',
        label: 'Тип',
        type: 'select',
        options: [
          { value: 'contract', label: 'Договор' },
          { value: 'act', label: 'Акт' },
          { value: 'invoice', label: 'Счёт' },
          { value: 'report', label: 'Отчёт' },
          { value: 'other', label: 'Прочее' },
        ],
      },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
  },
  payments: {
    slug: 'payments',
    title: 'Платежи',
    apiEndpoint: '/payments',
    searchField: 'описанию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'paymentNumber', header: 'Номер', sortable: true },
      {
        key: 'amount',
        header: 'Сумма',
        sortable: true,
        render: renderMoney,
      },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<number, { label: string; color: string }> = {
            0: { label: 'Ожидает', color: 'yellow' },
            1: { label: 'Проведён', color: 'green' },
            2: { label: 'Отменён', color: 'red' },
          };
          const s = map[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
      { key: 'paymentDate', header: 'Дата', sortable: true, render: (v) => fmtDate(v) },
      { key: 'description', header: 'Описание' },
    ],
    formFields: [
      { key: 'paymentNumber', label: 'Номер платежа', type: 'text', required: true },
      { key: 'amount', label: 'Сумма (₽)', type: 'number', required: true },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 0, label: 'Ожидает' },
          { value: 1, label: 'Проведён' },
          { value: 2, label: 'Отменён' },
        ],
      },
      { key: 'paymentDate', label: 'Дата', type: 'date', required: true },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
  },
  budgets: {
    slug: 'budgets',
    title: 'Бюджеты',
    apiEndpoint: '/budgets',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      { key: 'budgetName', header: 'Название', sortable: true },
      { key: 'budgetPeriod', header: 'Период' },
      {
        key: 'totalBudget',
        header: 'Бюджет',
        sortable: true,
        render: renderMoney,
      },
      {
        key: 'spentAmount',
        header: 'Потрачено',
        sortable: true,
        render: (v, row) => {
          const spent = Number(v ?? 0);
          const total = Number((row as Record<string, any>).totalBudget ?? 0);
          const pct = total > 0 ? Math.round((spent / total) * 100) : 0;
          const color = pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-orange-500' : 'text-green-600';
          return (
            <span className={`font-medium ${color}`}>
              {spent.toLocaleString('ru-RU')} ₽
              <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<number, { label: string; color: string }> = {
            0: { label: 'Черновик',  color: 'gray' },
            1: { label: 'Активный',  color: 'green' },
            2: { label: 'Завершён',  color: 'blue' },
            3: { label: 'Отменён',   color: 'red' },
          };
          const s = map[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
    ],
    formFields: [
      { key: 'budgetName', label: 'Название', type: 'text', required: true },
      { key: 'budgetPeriod', label: 'Период (напр. 2026)', type: 'text' },
      { key: 'totalBudget', label: 'Общий бюджет (₽)', type: 'number', required: true },
      { key: 'startDate', label: 'Дата начала', type: 'date' },
      { key: 'endDate', label: 'Дата окончания', type: 'date' },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 0, label: 'Черновик' },
          { value: 1, label: 'Активный' },
          { value: 2, label: 'Завершён' },
          { value: 3, label: 'Отменён' },
        ],
      },
    ],
  },
  acts: {
    slug: 'acts',
    title: 'Акты',
    apiEndpoint: '/acts',
    searchField: 'номеру',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'actNumber', header: 'Номер', sortable: true },
      { key: 'actType', header: 'Тип' },
      {
        key: 'totalAmount',
        header: 'Сумма',
        render: renderMoney,
      },
      { key: 'actDate', header: 'Дата', sortable: true, render: (v) => fmtDate(v) },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<number, { label: string; color: string }> = {
            0: { label: 'Черновик', color: 'gray' },
            1: { label: 'На проверке', color: 'yellow' },
            2: { label: 'Подписан', color: 'green' },
            3: { label: 'Отклонён', color: 'red' },
          };
          const s = map[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
    ],
    formFields: [
      { key: 'actNumber', label: 'Номер акта', type: 'text', required: true },
      { key: 'actType', label: 'Тип', type: 'text' },
      { key: 'actDate', label: 'Дата', type: 'date', required: true },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
  },
  salaries: {
    slug: 'salaries',
    title: 'Зарплата',
    apiEndpoint: '/payroll',
    searchField: 'сотруднику',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      {
        key: 'userId',
        header: 'Сотрудник',
        sortable: true,
        render: (v) => v ? <UserName userId={Number(v)} /> : <span className="text-gray-400">—</span>,
      },
      {
        key: 'totalAmount',
        header: 'Итого',
        sortable: true,
        render: renderMoney,
      },
      { key: 'payrollPeriod', header: 'Период' },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<number, { label: string; color: string }> = {
            0: { label: 'Черновик', color: 'gray' },
            1: { label: 'Одобрен', color: 'blue' },
            2: { label: 'Выплачен', color: 'green' },
          };
          const s = map[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
    ],
    formFields: [
      { key: 'userId', label: 'Сотрудник', type: 'select', required: true, fetchOptions: { endpoint: '/users', valueKey: 'id', labelKey: 'name' } },
      { key: 'baseSalary', label: 'Оклад (₽)', type: 'number', required: true },
      { key: 'totalAmount', label: 'Итого (₽)', type: 'number' },
      { key: 'payrollPeriod', label: 'Период (напр. Январь 2026)', type: 'text', required: true },
      { key: 'paymentDate', label: 'Дата выплаты', type: 'date' },
    ],
  },
  bonuses: {
    slug: 'bonuses',
    title: 'Бонусы',
    apiEndpoint: '/bonuses',
    searchField: 'сотруднику',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      {
        key: 'userId',
        header: 'Сотрудник',
        sortable: true,
        render: (v) => v ? <UserName userId={Number(v)} /> : <span className="text-gray-400">—</span>,
      },
      {
        key: 'amount',
        header: 'Сумма',
        sortable: true,
        render: renderMoney,
      },
      { key: 'bonusType', header: 'Тип' },
      { key: 'description', header: 'Описание' },
      { key: 'paymentDate', header: 'Дата', sortable: true, render: (v) => fmtDate(v) },
    ],
    formFields: [
      { key: 'userId', label: 'Сотрудник', type: 'select', required: true, fetchOptions: { endpoint: '/users', valueKey: 'id', labelKey: 'name' } },
      { key: 'amount', label: 'Сумма (₽)', type: 'number', required: true },
      { key: 'bonusType', label: 'Тип бонуса', type: 'text' },
      { key: 'periodStart', label: 'Период с', type: 'date' },
      { key: 'periodEnd', label: 'Период по', type: 'date' },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
  },
  'employee-documents': {
    slug: 'employee-documents',
    title: 'Документы сотрудников',
    apiEndpoint: '/employee-documents',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'employeeName', header: 'Сотрудник', sortable: true },
      { key: 'documentType', header: 'Тип документа', sortable: true },
      { key: 'documentNumber', header: 'Номер' },
      {
        key: 'createdAt',
        header: 'Загружен',
        render: (value) => {
          if (!value) return <span className="text-gray-400">—</span>;
          const d = new Date(String(value));
          return (
            <span className="text-sm">
              {d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          );
        },
      },
      {
        key: 'fileUrl',
        header: 'Файл',
        render: (value) => value ? (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-violet-500 hover:text-violet-600 text-sm"
            title="Открыть файл"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Открыть
          </a>
        ) : <span className="text-gray-400 text-sm">—</span>,
      },
    ],
    formFields: [
      { key: 'userId', label: 'Сотрудник', type: 'select', required: true, fetchOptions: { endpoint: '/users', valueKey: 'id', labelKey: 'name' } },
      { key: 'documentType', label: 'Тип документа', type: 'text' },
      { key: 'documentNumber', label: 'Номер документа', type: 'text' },
      { key: 'issueDate', label: 'Дата выдачи', type: 'date' },
      { key: 'expiryDate', label: 'Дата истечения', type: 'date' },
      { key: 'issuingAuthority', label: 'Кем выдан', type: 'text' },
      { key: 'fileUrl', label: 'Файл документа', type: 'file', uploadEndpoint: '/employee-documents/upload', accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png' },
      { key: 'notes', label: 'Заметки', type: 'textarea' },
    ],
  },
  leaves: {
    slug: 'leaves',
    title: 'Отпуска',
    apiEndpoint: '/time-off-requests',
    searchField: 'сотруднику',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      {
        key: 'userId',
        header: 'Сотрудник',
        sortable: true,
        render: (v) => v ? <UserName userId={Number(v)} /> : <span className="text-gray-400">—</span>,
      },
      {
        key: 'requestType',
        header: 'Тип',
        render: (v) => {
          const map: Record<string, string> = { vacation: 'Отпуск', sick: 'Больничный', personal: 'Личные' };
          return <span>{map[String(v ?? '')] ?? String(v ?? '—')}</span>;
        },
      },
      { key: 'startDate', header: 'Начало', sortable: true, render: (v) => fmtDate(v) },
      { key: 'endDate', header: 'Окончание', render: (v) => fmtDate(v) },
      { key: 'daysCount', header: 'Дней' },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<string | number, { label: string; color: string }> = {
            0: { label: 'Ожидает', color: 'yellow' },
            1: { label: 'Одобрен', color: 'green' },
            2: { label: 'Отклонён', color: 'red' },
            pending: { label: 'Ожидает', color: 'yellow' },
            approved: { label: 'Одобрен', color: 'green' },
            rejected: { label: 'Отклонён', color: 'red' },
          };
          const s = map[String(v ?? '')];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
    ],
    formFields: [
      {
        key: 'requestType',
        label: 'Тип',
        type: 'select',
        options: [
          { value: 'vacation', label: 'Отпуск' },
          { value: 'sick', label: 'Больничный' },
          { value: 'personal', label: 'Личные' },
        ],
      },
      { key: 'startDate', label: 'Начало', type: 'date', required: true },
      { key: 'endDate', label: 'Окончание', type: 'date', required: true },
      { key: 'daysCount', label: 'Количество дней', type: 'number' },
      { key: 'reason', label: 'Причина', type: 'textarea' },
    ],
  },
  attendance: {
    slug: 'attendance',
    title: 'Посещаемость',
    apiEndpoint: '/attendance',
    searchField: 'сотруднику',
    canCreate: true,
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      {
        key: 'userId',
        header: 'Сотрудник',
        sortable: true,
        render: (v) => v ? <UserName userId={Number(v)} /> : <span className="text-gray-400">—</span>,
      },
      { key: 'attendanceDate', header: 'Дата', sortable: true, render: (v) => fmtDate(v) },
      {
        key: 'checkInTime',
        header: 'Приход',
        render: (v) => {
          if (!v) return <span className="text-gray-400">—</span>;
          const d = new Date(v as string);
          return <span>{String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}</span>;
        },
      },
      {
        key: 'checkOutTime',
        header: 'Уход',
        render: (v) => {
          if (!v) return <span className="text-gray-400">—</span>;
          const d = new Date(v as string);
          return <span>{String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}</span>;
        },
      },
      {
        key: 'workedHours',
        header: 'Часов',
        render: (v) => v != null ? <span>{Number(v).toFixed(1)} ч</span> : <span className="text-gray-400">—</span>,
      },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<string, { label: string; color: string }> = {
            present:  { label: 'Присутствует', color: 'green' },
            absent:   { label: 'Отсутствует',  color: 'red' },
            late:     { label: 'Опоздание',     color: 'orange' },
            sick:     { label: 'Больничный',    color: 'yellow' },
            vacation: { label: 'Отпуск',        color: 'blue' },
          };
          const s = map[String(v ?? '')];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
      {
        key: 'photoUrl',
        header: 'Фото',
        width: '70px',
        render: (v) => {
          if (!v) return <span className="text-gray-400">—</span>;
          return (
            <a href={String(v)} target="_blank" rel="noopener noreferrer">
              <img src={String(v)} alt="Фото" className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
            </a>
          );
        },
      },
    ],
    formFields: [
      { key: 'userId', label: 'Сотрудник', type: 'select', required: true, fetchOptions: { endpoint: '/users', valueKey: 'id', labelKey: 'name' } },
      { key: 'attendanceDate', label: 'Дата', type: 'date', required: true },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 'present',  label: 'Присутствует' },
          { value: 'absent',   label: 'Отсутствует' },
          { value: 'late',     label: 'Опоздание' },
          { value: 'sick',     label: 'Больничный' },
          { value: 'vacation', label: 'Отпуск' },
        ],
      },
      { key: 'workedHours',   label: 'Отработано (ч)',  type: 'number' },
      { key: 'overtimeHours', label: 'Переработка (ч)', type: 'number' },
      { key: 'photoUrl', label: 'Фото прихода', type: 'file', uploadEndpoint: '/attendance/upload', accept: '.jpg,.jpeg,.png,.webp,.heic' },
      { key: 'notes', label: 'Заметки', type: 'textarea' },
    ],
  },
  teams: {
    slug: 'teams',
    title: 'Команды',
    apiEndpoint: '/teams',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'name', header: 'Название', sortable: true },
      {
        key: 'teamLeadId',
        header: 'Руководитель',
        render: (v, row) => {
          const name = (row as Record<string, any>).teamLead?.name;
          return name ? <span>{name}</span> : <span className="text-gray-400">—</span>;
        },
      },
      {
        key: '_count',
        header: 'Участники',
        render: (v) => {
          const count = (v as Record<string, any>)?.members;
          return count != null ? <span className="font-medium">{count}</span> : <span className="text-gray-400">—</span>;
        },
      },
    ],
    formFields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'teamLeadId', label: 'Руководитель', type: 'select', fetchOptions: { endpoint: '/users', valueKey: 'id', labelKey: 'name' } },
    ],
    customRowActions: [
      { key: 'members', label: 'Участники', title: 'Управление участниками' },
    ],
  },
  chat: {
    slug: 'chat',
    title: 'Каналы чата',
    apiEndpoint: '/chat-channels',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'name', header: 'Название', sortable: true },
      {
        key: 'channelType',
        header: 'Тип',
        render: (v) => {
          const map: Record<string, string> = { direct: 'Личный', group: 'Группа', public: 'Публичный', project: 'Проект' };
          return <span>{map[String(v)] ?? String(v ?? '—')}</span>;
        },
      },
      {
        key: 'isPrivate',
        header: 'Приватный',
        render: (v) => <span>{v ? 'Да' : 'Нет'}</span>,
      },
      {
        key: 'createdAt',
        header: 'Создан',
        render: (v) => v ? (
          <span>{new Date(String(v)).toLocaleDateString('ru-RU')}</span>
        ) : <span>—</span>,
      },
    ],
    formFields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      {
        key: 'channelType',
        label: 'Тип канала',
        type: 'select',
        options: [
          { value: 'group', label: 'Группа' },
          { value: 'public', label: 'Публичный' },
          { value: 'project', label: 'Проект' },
        ],
      },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'isPrivate', label: 'Приватный', type: 'checkbox' },
    ],
  },
  notifications: {
    slug: 'notifications',
    title: 'Уведомления',
    apiEndpoint: '/notifications',
    searchField: 'тексту',
    canEdit: false,
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'title', header: 'Заголовок', sortable: true },
      { key: 'type', header: 'Тип' },
      { key: 'createdAt', header: 'Создано', sortable: true },
      { key: 'read', header: 'Прочитано', render: (v) => (v ? 'Да' : 'Нет') },
    ],
    formFields: [
      { key: 'title', label: 'Заголовок', type: 'text', required: true },
      { key: 'message', label: 'Сообщение', type: 'textarea', required: true },
      {
        key: 'type',
        label: 'Тип',
        type: 'select',
        options: [
          { value: 'info', label: 'Информация' },
          { value: 'warning', label: 'Предупреждение' },
          { value: 'urgent', label: 'Срочное' },
        ],
      },
    ],
  },
  calendar: {
    slug: 'calendar',
    title: 'Календарь',
    apiEndpoint: '/calendar-events',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'title', header: 'Название', sortable: true },
      { key: 'startDate', header: 'Начало', sortable: true },
      { key: 'endDate', header: 'Окончание' },
      { key: 'type', header: 'Тип' },
    ],
    formFields: [
      { key: 'title', label: 'Название', type: 'text', required: true },
      { key: 'startDate', label: 'Начало', type: 'date', required: true },
      { key: 'endDate', label: 'Окончание', type: 'date' },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
  },
  inspections: {
    slug: 'inspections',
    title: 'Инспекции',
    apiEndpoint: '/inspections',
    searchField: 'номеру',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '70px' },
      { key: 'inspectionNumber', header: 'Номер', sortable: true, width: '160px' },
      {
        key: 'inspectionType',
        header: 'Тип',
        width: '120px',
        render: (v) => {
          const map: Record<string, string> = {
            quality: 'Качество', safety: 'Безопасность', compliance: 'Соответствие', routine: 'Плановая',
          };
          return v ? <span className="text-sm text-gray-700 dark:text-gray-200">{map[String(v)] ?? String(v)}</span> : <span className="text-gray-400">—</span>;
        },
      },
      {
        key: 'status',
        header: 'Статус',
        sortable: true,
        width: '140px',
        render: (v) => {
          const map: Record<number, { label: string; color: string }> = {
            0: { label: 'Запланирована', color: 'gray' },
            1: { label: 'В процессе',   color: 'yellow' },
            2: { label: 'Завершена',     color: 'green' },
            3: { label: 'Не пройдена',   color: 'red' },
          };
          const s = map[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
      {
        key: 'projectId',
        header: 'Проект',
        render: (v) => v ? <span className="text-sm text-gray-500 dark:text-gray-400">#{String(v)}</span> : <span className="text-gray-400">—</span>,
      },
      { key: 'scheduledDate', header: 'Дата', sortable: true, width: '120px', render: (v) => fmtDate(v) },
      {
        key: 'inspectorId',
        header: 'Инспектор',
        width: '110px',
        render: (v) => v ? <span className="text-sm text-gray-500 dark:text-gray-400">#{String(v)}</span> : <span className="text-gray-400">—</span>,
      },
      {
        key: 'inspectionArea',
        header: 'Область',
        render: (v) => v ? <span className="text-sm text-gray-700 dark:text-gray-200">{String(v)}</span> : <span className="text-gray-400">—</span>,
      },
    ],
    formFields: [
      { key: 'inspectionNumber', label: 'Номер инспекции', type: 'text', required: true },
      {
        key: 'inspectionType',
        label: 'Тип',
        type: 'select',
        options: [
          { value: 'quality',     label: 'Качество' },
          { value: 'safety',      label: 'Безопасность' },
          { value: 'compliance',  label: 'Соответствие' },
          { value: 'routine',     label: 'Плановая' },
        ],
      },
      { key: 'projectId', label: 'Проект', type: 'select', fetchOptions: { endpoint: '/projects', valueKey: 'id', labelKey: 'name' } },
      { key: 'inspectorId', label: 'Инспектор', type: 'select', fetchOptions: { endpoint: '/users', valueKey: 'id', labelKey: 'name' } },
      { key: 'scheduledDate', label: 'Дата (план)', type: 'date' },
      { key: 'actualDate', label: 'Дата (факт)', type: 'date' },
      { key: 'inspectionArea', label: 'Область проверки', type: 'text' },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 0, label: 'Запланирована' },
          { value: 1, label: 'В процессе' },
          { value: 2, label: 'Завершена' },
          { value: 3, label: 'Не пройдена' },
        ],
      },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'findings', label: 'Выводы', type: 'textarea' },
      { key: 'recommendations', label: 'Рекомендации', type: 'textarea' },
    ],
  },
  'supplier-orders': {
    slug: 'supplier-orders',
    title: 'Заказы поставщикам',
    apiEndpoint: '/supplier-orders',
    searchField: 'номеру',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'orderNumber', header: 'Номер', sortable: true },
      {
        key: 'supplierId',
        header: 'Поставщик',
        render: (v, row) => {
          const name = (row as Record<string, any>).supplier?.name;
          return name ? <span>{name}</span> : <span className="text-gray-400">#{String(v ?? '—')}</span>;
        },
      },
      {
        key: 'totalAmount',
        header: 'Сумма',
        sortable: true,
        render: renderMoney,
      },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<number, { label: string; color: string }> = {
            0: { label: 'Черновик', color: 'gray' },
            1: { label: 'Отправлен', color: 'blue' },
            2: { label: 'Подтверждён', color: 'green' },
            3: { label: 'Доставлен', color: 'purple' },
            4: { label: 'Отменён', color: 'red' },
          };
          const s = map[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
      { key: 'orderDate', header: 'Дата', sortable: true, render: (v) => fmtDate(v) },
    ],
    formFields: [
      { key: 'supplierId', label: 'Поставщик', type: 'select', required: true, fetchOptions: { endpoint: '/suppliers', valueKey: 'id', labelKey: 'name' } },
      { key: 'totalAmount', label: 'Сумма (₽)', type: 'number' },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 0, label: 'Черновик' },
          { value: 1, label: 'Отправлен' },
          { value: 2, label: 'Подтверждён' },
          { value: 3, label: 'Доставлен' },
          { value: 4, label: 'Отменён' },
        ],
      },
      { key: 'orderDate', label: 'Дата заказа', type: 'date', required: true },
      { key: 'deliveryDate', label: 'Дата доставки', type: 'date' },
      { key: 'notes', label: 'Примечания', type: 'textarea' },
    ],
  },
  'material-requests': {
    slug: 'material-requests',
    title: 'Заявки на материалы',
    apiEndpoint: '/material-requests',
    searchField: 'описанию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'requestNumber', header: 'Номер', sortable: true },
      {
        key: 'materialId',
        header: 'Материал',
        render: (v, row) => {
          const name = (row as Record<string, any>).material?.name;
          return name ? <span>{name}</span> : <span className="text-gray-400">#{String(v ?? '—')}</span>;
        },
      },
      { key: 'quantity', header: 'Кол-во', sortable: true },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<number, { label: string; color: string }> = {
            0: { label: 'Ожидает', color: 'yellow' },
            1: { label: 'Одобрена', color: 'green' },
            2: { label: 'Отклонена', color: 'red' },
            3: { label: 'Выдана', color: 'blue' },
          };
          const s = map[Number(v)];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
      { key: 'createdAt', header: 'Дата', sortable: true, render: (v) => fmtDate(v) },
    ],
    formFields: [
      { key: 'materialId', label: 'Материал', type: 'select', required: true, fetchOptions: { endpoint: '/materials', valueKey: 'id', labelKey: 'name' } },
      { key: 'quantity', label: 'Количество', type: 'number', required: true },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 0, label: 'Ожидает' },
          { value: 1, label: 'Одобрена' },
          { value: 2, label: 'Отклонена' },
          { value: 3, label: 'Выдана' },
        ],
      },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
  },
  defects: {
    slug: 'defects',
    title: 'Дефекты',
    apiEndpoint: '/defects',
    searchField: 'описанию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      { key: 'title', header: 'Название', sortable: true },
      {
        key: 'severity',
        header: 'Серьёзность',
        render: (v) => {
          const map: Record<string, { label: string; color: string }> = {
            low:      { label: 'Низкая',      color: 'green' },
            medium:   { label: 'Средняя',     color: 'yellow' },
            high:     { label: 'Высокая',     color: 'orange' },
            critical: { label: 'Критическая', color: 'red' },
          };
          const s = map[String(v ?? '')];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">{String(v ?? '—')}</span>;
        },
      },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<string, { label: string; color: string }> = {
            open:        { label: 'Открыт',     color: 'red' },
            in_progress: { label: 'В работе',   color: 'yellow' },
            resolved:    { label: 'Исправлен',  color: 'green' },
            closed:      { label: 'Закрыт',     color: 'gray' },
          };
          const s = map[String(v ?? '')];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">{String(v ?? '—')}</span>;
        },
      },
      { key: 'createdAt', header: 'Дата', sortable: true, render: (v) => fmtDate(v) },
    ],
    formFields: [
      { key: 'title', label: 'Название', type: 'text', required: true },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'inspectionId', label: 'Инспекция', type: 'select', fetchOptions: { endpoint: '/inspections', valueKey: 'id', labelKey: 'title' } },
      {
        key: 'severity',
        label: 'Серьёзность',
        type: 'select',
        options: [
          { value: 'low', label: 'Низкая' },
          { value: 'medium', label: 'Средняя' },
          { value: 'high', label: 'Высокая' },
          { value: 'critical', label: 'Критическая' },
        ],
      },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 'open', label: 'Открыт' },
          { value: 'in_progress', label: 'В работе' },
          { value: 'resolved', label: 'Исправлен' },
          { value: 'closed', label: 'Закрыт' },
        ],
      },
    ],
  },
  'equipment-maintenance': {
    slug: 'equipment-maintenance',
    title: 'Обслуживание оборудования',
    apiEndpoint: '/equipment-maintenance',
    searchField: 'описанию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      {
        key: 'equipmentId',
        header: 'Оборудование',
        render: (v, row) => {
          const name = (row as Record<string, any>).equipment?.name;
          return name ? <span>{name}</span> : <span className="text-gray-400">#{String(v ?? '—')}</span>;
        },
      },
      { key: 'maintenanceType', header: 'Тип' },
      {
        key: 'status',
        header: 'Статус',
        render: (v) => {
          const map: Record<string, { label: string; color: string }> = {
            scheduled:   { label: 'Запланировано', color: 'gray' },
            in_progress: { label: 'В процессе',   color: 'yellow' },
            completed:   { label: 'Завершено',     color: 'green' },
          };
          const s = map[String(v ?? '')];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">{String(v ?? '—')}</span>;
        },
      },
      { key: 'scheduledDate', header: 'Дата', sortable: true, render: (v) => fmtDate(v) },
    ],
    formFields: [
      { key: 'equipmentId', label: 'Оборудование', type: 'select', required: true, fetchOptions: { endpoint: '/equipment', valueKey: 'id', labelKey: 'name' } },
      { key: 'maintenanceType', label: 'Тип обслуживания', type: 'text' },
      {
        key: 'status',
        label: 'Статус',
        type: 'select',
        options: [
          { value: 'scheduled', label: 'Запланировано' },
          { value: 'in_progress', label: 'В процессе' },
          { value: 'completed', label: 'Завершено' },
        ],
      },
      { key: 'scheduledDate', label: 'Дата', type: 'date', required: true },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
  },
  audit: {
    slug: 'audit',
    title: 'Аудит',
    apiEndpoint: '/event-logs',
    searchField: 'действию',
    canCreate: false,
    canEdit: false,
    canDelete: false,
    columns: [
      {
        key: 'action',
        header: 'Действие',
        sortable: true,
        width: '130px',
        render: (v) => {
          const map: Record<string, { label: string; color: string }> = {
            login:    { label: 'Вход',        color: 'blue'   },
            logout:   { label: 'Выход',       color: 'gray'   },
            create:   { label: 'Создание',    color: 'green'  },
            update:   { label: 'Изменение',   color: 'yellow' },
            delete:   { label: 'Удаление',    color: 'red'    },
            approve:  { label: 'Одобрение',   color: 'purple' },
            reject:   { label: 'Отклонение',  color: 'red'    },
            export:   { label: 'Экспорт',     color: 'indigo' },
            view:     { label: 'Просмотр',    color: 'gray'   },
          };
          const s = map[String(v ?? '')];
          return s
            ? <StatusBadge label={s.label} color={s.color} />
            : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{String(v ?? '—')}</span>;
        },
      },
      {
        key: 'description',
        header: 'Описание',
        render: (v) => v
          ? <span className="text-sm text-gray-700 dark:text-gray-200">{String(v)}</span>
          : <span className="text-gray-400">—</span>,
      },
      {
        key: 'entityType',
        header: 'Тип',
        width: '130px',
        render: (v) => {
          const labels: Record<string, string> = {
            user: 'Пользователь', task: 'Задача', project: 'Проект',
            construction_site: 'Объект', material: 'Материал',
            supplier: 'Поставщик', payment: 'Платёж', budget: 'Бюджет',
            invoice: 'Счёт', inspection: 'Инспекция', defect: 'Дефект',
            hr_record: 'HR', employee: 'Сотрудник', payroll: 'Зарплата',
            calendar_event: 'Событие', equipment: 'Оборудование',
            document: 'Документ', client: 'Клиент', wiki_article: 'Статья',
            training: 'Обучение', registration: 'Заявка', role: 'Роль',
            setting: 'Настройка', auth: 'Сессия',
          };
          const label = v ? (labels[String(v)] ?? String(v)) : null;
          return label
            ? <span className="text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded">{label}</span>
            : <span className="text-gray-400">—</span>;
        },
      },
      {
        key: 'userId',
        header: 'Пользователь',
        render: (_v, row: Record<string, unknown>) => {
          const email = (row?.metadata as Record<string, unknown>)?.userEmail as string | undefined;
          if (email) return <span className="text-sm text-gray-700 dark:text-gray-200">{email}</span>;
          if (_v != null) return <span className="text-sm text-gray-500 dark:text-gray-400">#{String(_v)}</span>;
          return <span className="text-gray-400">—</span>;
        },
      },
      {
        key: 'ipAddress',
        header: 'IP',
        width: '130px',
        render: (v) => v
          ? <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{String(v)}</span>
          : <span className="text-gray-400">—</span>,
      },
      {
        key: 'changes',
        header: 'Изменения',
        width: '110px',
        render: (v) => {
          if (!v || typeof v !== 'object' || Object.keys(v as object).length === 0) {
            return <span className="text-gray-400">—</span>;
          }
          const json = JSON.stringify(v, null, 2);
          return (
            <button
              title={json}
              onClick={() => {
                const win = window.open('', '_blank', 'width=600,height=500');
                if (win) {
                  win.document.write(
                    `<html><head><title>Изменения</title><style>body{font-family:monospace;padding:16px;white-space:pre;font-size:13px;background:#1e1e2e;color:#cdd6f4}</style></head><body>${json.replace(/</g,'&lt;')}</body></html>`
                  );
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              JSON
            </button>
          );
        },
      },
      { key: 'createdAt', header: 'Дата', sortable: true, width: '155px', render: (v) => fmtDate(v) },
    ],
    formFields: [],
  },
  reports: {
    slug: 'reports',
    title: 'Отчёты',
    apiEndpoint: '/report-templates',
    searchField: 'названию',
    columns: [
      { key: 'id', header: 'ID', sortable: true, width: '80px' },
      {
        key: 'name',
        header: 'Название',
        sortable: true,
        render: (v) => v ? <span className="font-medium">{String(v)}</span> : <span className="text-gray-400">—</span>,
      },
      {
        key: 'reportType',
        header: 'Тип',
        render: (v) => {
          const map: Record<string, { label: string; color: string }> = {
            financial:  { label: 'Финансовый', color: 'green' },
            progress:   { label: 'Прогресс',   color: 'blue'  },
            inspection: { label: 'Инспекция',  color: 'orange' },
            other:      { label: 'Прочее',     color: 'gray'  },
          };
          const s = map[String(v ?? '')];
          return s ? <StatusBadge label={s.label} color={s.color} /> : <span className="text-gray-400">—</span>;
        },
      },
      { key: 'description', header: 'Описание', render: (v) => v ? <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs block">{String(v)}</span> : <span className="text-gray-400">—</span> },
      {
        key: 'fileUrl',
        header: 'Файл',
        render: (value) => value ? (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-violet-500 hover:text-violet-600 text-sm"
            title="Открыть файл"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Открыть
          </a>
        ) : <span className="text-gray-400 text-sm">—</span>,
      },
      { key: 'createdAt', header: 'Создан', sortable: true, render: (v) => fmtDate(v) },
    ],
    formFields: [
      { key: 'name', label: 'Название', type: 'text', required: true },
      {
        key: 'reportType',
        label: 'Тип',
        type: 'select',
        options: [
          { value: 'financial', label: 'Финансовый' },
          { value: 'progress', label: 'Прогресс' },
          { value: 'inspection', label: 'Инспекция' },
          { value: 'other', label: 'Прочее' },
        ],
      },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'fileUrl', label: 'Файл отчёта', type: 'file', uploadEndpoint: '/report-templates/upload', accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png' },
    ],
  },
};

export const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    name: 'Основные',
    modules: [ADMIN_MODULES.users, ADMIN_MODULES.projects, ADMIN_MODULES.tasks, ADMIN_MODULES.clients],
  },
  {
    name: 'Ресурсы',
    modules: [ADMIN_MODULES.materials, ADMIN_MODULES.equipment, ADMIN_MODULES.suppliers],
  },
  {
    name: 'Финансы',
    modules: [ADMIN_MODULES.payments, ADMIN_MODULES.budgets, ADMIN_MODULES.acts, ADMIN_MODULES.salaries, ADMIN_MODULES.bonuses],
  },
  {
    name: 'HR',
    modules: [ADMIN_MODULES['employee-documents'], ADMIN_MODULES.leaves, ADMIN_MODULES.attendance, ADMIN_MODULES.teams],
  },
  {
    name: 'Коммуникации',
    modules: [ADMIN_MODULES.chat, ADMIN_MODULES.notifications, ADMIN_MODULES.calendar],
  },
  {
    name: 'Контроль',
    modules: [ADMIN_MODULES.inspections, ADMIN_MODULES.audit, ADMIN_MODULES.reports],
  },
];
