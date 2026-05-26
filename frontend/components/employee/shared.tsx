'use client';

import { useState } from 'react';
import { useToastStore } from '@/stores/toastStore';

export interface EmployeeData {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  position?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  availability?: number;
  hireDate?: string | null;
  hire_date?: string | null;
  birthDate?: string | null;
  birth_date?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  role?: { name?: string; code?: string } | null;
  roleId?: number;
  role_id?: number;
}

export const ROLE_NAMES: Record<number, string> = {
  1: 'Супер Администратор',
  2: 'Администратор',
  3: 'HR Менеджер',
  4: 'Менеджер проектов',
  5: 'Прораб',
  6: 'Снабженец',
  7: 'Кладовщик',
  8: 'Бухгалтер',
  9: 'Инспектор',
  10: 'Рабочий',
  11: 'Поставщик',
  12: 'Подрядчик',
  13: 'Наблюдатель',
  14: 'Аналитик',
  15: 'Клиент',
};

export function getRoleName(e: EmployeeData): string {
  return e.role?.name || ROLE_NAMES[e.roleId ?? e.role_id ?? 0] || '—';
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

export function getAvatarUrl(e: EmployeeData): string | null | undefined {
  return e.avatarUrl || e.avatar_url;
}

export function isOnline(e: EmployeeData): boolean {
  const a = e.availability ?? 1;
  return a === 1 || a === 2;
}

export function fmtDate(v: string | null | undefined): string | null {
  if (!v) return null;
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return null;
  }
}

export function EmployeeAvatar({
  employee,
  size = 'md',
  showStatus = true,
}: {
  employee: EmployeeData;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
}) {
  const sizes = {
    sm: { box: 'w-10 h-10', text: 'text-sm', dot: 'w-2.5 h-2.5 right-0 bottom-0' },
    md: { box: 'w-14 h-14', text: 'text-base', dot: 'w-3 h-3 right-0 bottom-0' },
    lg: { box: 'w-16 h-16', text: 'text-lg', dot: 'w-3.5 h-3.5 right-0.5 bottom-0.5' },
    xl: { box: 'w-20 h-20', text: 'text-xl', dot: 'w-4 h-4 right-1 bottom-1' },
  } as const;
  const s = sizes[size];
  const url = getAvatarUrl(employee);
  const online = isOnline(employee);

  return (
    <div className="relative shrink-0">
      {url ? (
        <img
          src={url}
          alt={employee.name}
          className={`${s.box} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${s.box} ${s.text} rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center font-semibold uppercase`}
        >
          {getInitials(employee.name || '?')}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute ${s.dot} rounded-full border-2 border-white dark:border-gray-800 ${
            online ? 'bg-green-500' : 'bg-gray-400'
          }`}
          title={online ? 'Онлайн' : 'Офлайн'}
        />
      )}
    </div>
  );
}

export function OnlineBadge({ employee }: { employee: EmployeeData }) {
  const online = isOnline(employee);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        online
          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      }`}
    >
      {online ? 'Онлайн' : 'Офлайн'}
    </span>
  );
}

export function CopyButton({ value, title }: { value: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => addToast('error', 'Не удалось скопировать'));
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title || 'Скопировать'}
      className="shrink-0 p-1 text-gray-400 hover:text-violet-500 transition-colors"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export function ModalShell({
  children,
  onClose,
  maxWidth = 'max-w-md',
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90dvh] overflow-hidden flex flex-col`}
      >
        {children}
      </div>
    </div>
  );
}
