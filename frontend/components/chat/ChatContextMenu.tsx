'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatChannel } from '@/stores/chatStore';
import { useT } from '@/lib/i18n';

export interface ChatContextMenuActions {
  onOpenInNewWindow: () => void;
  onTogglePin: () => void;
  onMute: (mutedUntil: Date | null) => void;
  onToggleMarkUnread: () => void;
  onPreview: () => void;
  onArchive: (isArchived: boolean) => void;
  onClearHistory: () => void;
  onDelete: () => void;
}

interface Props {
  channel: ChatChannel;
  position: { x: number; y: number } | null; // null = closed
  variant: 'popover' | 'sheet'; // popover at cursor (desktop) or bottom sheet (mobile)
  isArchived: boolean; // whether viewing archive
  hasUnread: boolean;
  canClearHistory: boolean;
  canDelete: boolean;
  onClose: () => void;
  actions: ChatContextMenuActions;
}

const MUTE_DURATIONS: { label: string; value: () => Date | null }[] = [
  { label: 'На 1 час', value: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: 'На 8 часов', value: () => new Date(Date.now() + 8 * 60 * 60 * 1000) },
  { label: 'На 1 день', value: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  { label: 'На 1 неделю', value: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  { label: 'Навсегда', value: () => new Date('9999-12-31T23:59:59Z') },
];

export default function ChatContextMenu({
  channel,
  position,
  variant,
  isArchived,
  hasUnread,
  canClearHistory,
  canDelete,
  onClose,
  actions,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMuteSub, setShowMuteSub] = useState(false);
  const [adjustedPos, setAdjustedPos] = useState<{ left: number; top: number } | null>(null);

  // Reset submenu when reopened
  useEffect(() => {
    setShowMuteSub(false);
  }, [position]);

  // Adjust popover position to stay in viewport
  useEffect(() => {
    if (variant !== 'popover' || !position || !menuRef.current) {
      setAdjustedPos(null);
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const PAD = 8;
    let left = position.x;
    let top = position.y;
    if (left + rect.width + PAD > vw) left = Math.max(PAD, vw - rect.width - PAD);
    if (top + rect.height + PAD > vh) top = Math.max(PAD, vh - rect.height - PAD);
    setAdjustedPos({ left, top });
  }, [position, variant]);

  // Close on Escape
  useEffect(() => {
    if (!position) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [position, onClose]);

  if (!position) return null;
  if (typeof document === 'undefined') return null;

  const isMutedForMe = !!channel.isMutedForMe;
  const isPinned = !!channel.isPinned;

  const renderItem = (
    key: string,
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    options: { danger?: boolean; hasSubmenu?: boolean; disabled?: boolean } = {}
  ) => (
    <button
      key={key}
      onClick={onClick}
      disabled={options.disabled}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        options.danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <span className={`shrink-0 w-5 h-5 flex items-center justify-center ${options.danger ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {options.hasSubmenu && (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );

  // Icons
  const iExternal = (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>);
  const iPin = (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14M16.5 6.5l-9 9-3 7 7-3 9-9-4-4z"/></svg>);
  const iBell = (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"/></svg>);
  const iBellOff = (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M13.73 21a2 2 0 01-3.46 0M18.63 13A17.9 17.9 0 0118 8a6 6 0 00-9.33-5M6.26 6.26A6 6 0 006 8c0 7-3 9-3 9h14"/></svg>);
  const iUnread = (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none"/></svg>);
  const iEye = (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>);
  const iArchive = (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>);
  const iBroom = (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21l6-6m6-12l-3 3m6 0l-9 9m9-9l-3 9-6 0 3-9 6 0z"/></svg>);
  const iTrash = (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>);

  const menuItems = (
    <div className="py-1.5 min-w-[240px]">
      {renderItem('open', 'Открыть в отдельном окне', iExternal, () => {
        actions.onOpenInNewWindow();
        onClose();
      })}

      {renderItem('pin', isPinned ? 'Открепить' : 'Закрепить', iPin, () => {
        actions.onTogglePin();
        onClose();
      })}

      {isMutedForMe
        ? renderItem('unmute', 'Включить уведомления', iBell, () => {
            actions.onMute(null);
            onClose();
          })
        : renderItem(
            'mute',
            'Выключить уведомления',
            iBellOff,
            () => setShowMuteSub((v) => !v),
            { hasSubmenu: true }
          )}

      {showMuteSub && !isMutedForMe && (
        <div className="mx-2 my-1 rounded-md bg-gray-50 dark:bg-gray-900/50">
          {MUTE_DURATIONS.map((d) => (
            <button
              key={d.label}
              onClick={() => {
                actions.onMute(d.value());
                onClose();
              }}
              className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {renderItem(
        'unread',
        hasUnread ? 'Пометить как прочитанное' : 'Пометить как непрочитанное',
        iUnread,
        () => {
          actions.onToggleMarkUnread();
          onClose();
        }
      )}

      {renderItem('preview', 'Предпросмотр', iEye, () => {
        actions.onPreview();
        onClose();
      })}

      {renderItem(isArchived ? 'unarchive' : 'archive', isArchived ? 'Из архива' : 'В архив', iArchive, () => {
        actions.onArchive(!isArchived);
        onClose();
      })}

      {canClearHistory && (
        <>
          <div className="my-1 mx-3 h-px bg-gray-200 dark:bg-gray-700" />
          {renderItem('clear', 'Очистить историю', iBroom, () => {
            actions.onClearHistory();
            onClose();
          })}
        </>
      )}

      {canDelete && renderItem('delete', 'Удалить чат', iTrash, () => {
        actions.onDelete();
        onClose();
      }, { danger: true })}
    </div>
  );

  const overlay = (
    <div
      data-chat-menu
      className="fixed inset-0 z-[9999]"
      onClick={onClose}
      onContextMenu={(e) => { e.preventDefault(); onClose(); }}
    >
      {variant === 'popover' ? (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: adjustedPos?.left ?? position.x,
            top: adjustedPos?.top ?? position.y,
            visibility: adjustedPos ? 'visible' : 'hidden',
          }}
          className="rounded-lg shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {menuItems}
        </div>
      ) : (
        <>
          <div className="absolute inset-0 bg-black/40" />
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white dark:bg-gray-800 shadow-2xl animate-[slideUp_0.2s_ease-out] max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="px-4 pt-1 pb-2 text-xs font-medium text-gray-400 truncate">
              {channel.channelName || (channel.channelType === 'group' ? 'Группа' : 'Чат')}
            </div>
            {menuItems}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </>
      )}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
}
