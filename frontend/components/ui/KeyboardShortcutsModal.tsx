'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isMac } from '@/hooks/useNavHotkeys';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  label: string;
  key: string;
  roleOnly?: boolean;
}

const NAV_SHORTCUTS: ShortcutItem[] = [
  { label: 'Обзор', key: '1' },
  { label: 'Проекты', key: '2' },
  { label: 'Задачи', key: '3' },
  { label: 'Сотрудники', key: '4' },
  { label: 'Документы', key: '5' },
  { label: 'Команды', key: '6', roleOnly: true },
  { label: 'Заявки и инвайты', key: '7', roleOnly: true },
  { label: 'Чат', key: '8' },
  { label: 'Компания', key: '9', roleOnly: true },
  { label: 'Настройки', key: '0' },
  { label: 'Администрирование', key: 'A', roleOnly: true },
];

const ACTION_SHORTCUTS: ShortcutItem[] = [
  { label: 'Выйти', key: 'Q' },
];

function KeyBadge({ k }: { k: string }) {
  const label = isMac() ? `⌥${k}` : `Alt+${k}`;
  return (
    <kbd
      suppressHydrationWarning
      className="inline-flex items-center justify-center min-w-[2.75rem] px-1.5 py-0.5 text-[11px] font-mono font-semibold rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 select-none shrink-0"
    >
      {label}
    </kbd>
  );
}

function Section({ title, items }: { title: string; items: ShortcutItem[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
            <KeyBadge k={item.key} />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {item.label}
              {item.roleOnly && <span className="text-gray-400 dark:text-gray-500 ml-0.5 text-[10px]">*</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KeyboardShortcutsModal({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const mac = isMac();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <rect x="2" y="6" width="20" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 10.5h.01M10 10.5h.01M14 10.5h.01M18 10.5h.01M8 14.5h8" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Горячие клавиши
            </h2>
            {mac && (
              <span suppressHydrationWarning className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">macOS</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          <Section title="Навигация" items={NAV_SHORTCUTS} />
          <Section title="Действия" items={ACTION_SHORTCUTS} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            <span className="font-mono text-[10px]">*</span> Доступно в зависимости от роли &nbsp;·&nbsp; <kbd className="font-mono text-[10px]">Esc</kbd> — закрыть
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
