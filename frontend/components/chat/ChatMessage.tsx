'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useToastStore } from '@/stores/toastStore';
import { ChatMessage as ChatMessageType, useChatStore } from '@/stores/chatStore';
import MediaViewer, { MediaItem } from './MediaViewer';
import SelfDestructMedia, { BurnedMediaPlaceholder } from './SelfDestructMedia';
import FilePreviewModal from '@/components/ui/FilePreviewModal';
import UserProfileModal from './UserProfileModal';
import { haptic } from '@/lib/haptics';
import { useVoicePlayerStore } from '@/stores/voicePlayerStore';
import { useThemeStore } from '@/stores/themeStore';
import { nameColorClass } from '@/lib/appearance';
import { useT } from '@/lib/i18n';

const QUICK_EMOJIS = ['❤️', '🤗', '👍', '😄', '👎', '🔥', '👏'];

// Desktop context-menu (right-click) styling — matches ChatContextMenu
const CTX_ITEM =
  'w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';
const CTX_ITEM_DANGER =
  'w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors';
const CTX_ICON = 'shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400';

const ICON_REPLY = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);
const ICON_COPY = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const ICON_EDIT = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const ICON_PIN = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14M16.5 6.5l-9 9-3 7 7-3 9-9-4-4z" />
  </svg>
);
const ICON_FORWARD = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ICON_TRASH = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const ICON_COPY_MEDIA = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
  </svg>
);
const ICON_SAVE_AS = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
  </svg>
);

interface Reader {
  id: number;
  name: string;
  avatarUrl?: string;
}

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
  showAvatar: boolean;
  isRead: boolean;
  readers?: Reader[];
  onReply: () => void;
  onScrollToReply?: () => void;
  onReact: (messageId: number, emoji: string) => void;
  onDelete: (message: ChatMessageType) => void;
  onEdit?: (newText: string) => void;
  onPin?: (message: ChatMessageType) => void;
  onForward?: (message: ChatMessageType) => void;
  onGoToOriginalChannel?: (channelId: number) => void;
  isPinned?: boolean;
  canPin?: boolean;
  highlightQuery?: string;
  readOnly?: boolean;
}

const DELETED_EMAIL_RE = /^deleted_\d+_\d+@crm\.deleted$/;
const TG_SENDER_RE = /^\*\*(.+?):\*\* ?([\s\S]*)$/;

/* ─── Readers tooltip ─── */
function ReaderAvatar({ reader, size = 'sm' }: { reader: Reader; size?: 'sm' | 'xs' }) {
  const t = useT();
  const sz = size === 'xs' ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[10px]';
  const initials = (reader.name || '').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div className={`${sz} rounded-full bg-sky-500 flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden relative ring-1 ring-white dark:ring-gray-800`}>
      {initials}
      {reader.avatarUrl && (
        <img
          src={reader.avatarUrl}
          alt={reader.name}
          className="absolute inset-0 w-full h-full object-cover z-10"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
    </div>
  );
}

function ReadersTooltip({ readers }: { readers: Reader[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const MAX_VISIBLE = 3;
  const visible = readers.slice(0, MAX_VISIBLE);
  const extra = readers.length - MAX_VISIBLE;

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Stacked mini avatars */}
      <div className="flex items-center">
        {visible.map((r, i) => (
          <div key={r.id} className={i > 0 ? '-ml-1' : ''}>
            <ReaderAvatar reader={r} size="xs" />
          </div>
        ))}
        {extra > 0 && (
          <div className="-ml-1 w-4 h-4 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-[8px] text-white font-semibold ring-1 ring-white dark:ring-gray-800">
            +{extra}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {open && (
        <div className="absolute bottom-full right-0 mb-1.5 z-50 bg-gray-900 dark:bg-gray-700 rounded-xl shadow-xl py-2 px-2 min-w-[140px] max-w-[220px]">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">
            Прочитали ({readers.length})
          </p>
          <div className="space-y-1.5">
            {readers.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <ReaderAvatar reader={r} size="sm" />
                <span className="text-xs text-white truncate">{r.name}</span>
              </div>
            ))}
          </div>
          {/* Arrow */}
          <div className="absolute -bottom-1 right-3 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
        </div>
      )}
    </div>
  );
}

function resolveDisplayName(name?: string): string {
  if (!name || DELETED_EMAIL_RE.test(name)) return 'Удалённый пользователь';
  return name;
}

function parseTgMessage(text?: string): { sender: string; body: string } | null {
  if (!text) return null;
  const m = TG_SENDER_RE.exec(text);
  if (!m) return null;
  return { sender: m[1], body: m[2] };
}

// Parse old-style "↩️ Переслано от X:\n\ntext" format for backwards compat
const OLD_FORWARD_RE = /^↩️ Переслано от (.+?):\n\n([\s\S]*)$/;

// Image/video detection with filename fallback when mimeType is absent
const isImageAtt = (a: any): boolean =>
  !!a.mimeType?.startsWith('image/') ||
  (!a.mimeType && /\.(jpe?g|png|gif|webp|bmp|svg|heic|avif)$/i.test(a.fileName || ''));
const isVideoAtt = (a: any): boolean =>
  !!a.mimeType?.startsWith('video/') ||
  (!a.mimeType && /\.(mp4|mov|avi|webm|mkv|m4v|3gp)$/i.test(a.fileName || ''));

function ChatMessage({ message, isOwn, showAvatar, isRead, readers = [], onReply, onScrollToReply, onReact, onDelete, onEdit, onPin, onForward, onGoToOriginalChannel, isPinned, canPin, highlightQuery, readOnly = false }: ChatMessageProps) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const isVoice = message.messageType === 'voice';
  const isVideoNote = message.messageType === 'video_note';

  // Настройки оформления: «сообщения блоками» и цветные имена (как в Telegram).
  // В режиме блоков все сообщения рендерятся плоским списком слева; isOwn
  // продолжает управлять правами (редактирование/удаление/галочки), а `own` —
  // только внешним видом «своего» пузыря.
  const chatBubbles = useThemeStore((s) => s.appearance.chatBubbles);
  const nameColors = useThemeStore((s) => s.appearance.nameColors);
  const blockMode = !chatBubbles;
  const own = isOwn && !blockMode;

  // Forwarded message detection
  const forwardMeta = message.forwardMeta ?? null;
  const oldForwardMatch = !forwardMeta ? OLD_FORWARD_RE.exec(message.text || '') : null;
  const isForwarded = !!forwardMeta || !!oldForwardMatch;
  const forwardSenderName = forwardMeta?.originalSenderName ?? oldForwardMatch?.[1] ?? '';
  const forwardChannelId = forwardMeta?.fromChannelId ?? null;
  // The text to actually display (strip prefix for old format)
  const displayText = forwardMeta ? (message.text || '') : (oldForwardMatch ? oldForwardMatch[2] : message.text);

  const displaySenderName = resolveDisplayName(message.senderName);
  const isSenderDeleted = !message.senderName || DELETED_EMAIL_RE.test(message.senderName);

  // Detect TG-imported message: has tg_meta attachment or **Sender:** prefix
  const tgMeta = (message.attachments as any[] ?? []).find((a: any) => a.type === 'tg_meta');
  const tgParsed = !tgMeta ? parseTgMessage(message.text) : null;
  const isTgMessage = !!tgMeta || !!tgParsed;
  const tgSender: string = tgMeta?.from || tgParsed?.sender || '';
  const tgBody: string | undefined = tgParsed?.body ?? (tgMeta ? message.text : undefined);
  // displayText: tg overrides forward which overrides raw
  const resolvedDisplayText = isTgMessage ? tgBody : displayText;

  // Sender avatar/name open the employee profile — only for real CRM users
  const canOpenProfile = !isSenderDeleted && !forwardMeta && !isTgMessage && !!message.senderId;
  const openProfile = useCallback((e: React.MouseEvent) => {
    if (!canOpenProfile) return;
    e.stopPropagation();
    setShowProfile(true);
  }, [canOpenProfile]);

  // Сгоревшие исчезающие медиа: файла больше нет — вместо картинки плашка
  const burnedAtts = (message.attachments ?? []).filter((a) => a.burned);

  const mediaItems: MediaItem[] = (message.attachments ?? [])
    .filter((a) => !a.burned && (isImageAtt(a) || isVideoAtt(a)))
    .map((a) => ({
      url: a.fileUrl,
      type: isVideoAtt(a) ? 'video' : 'image',
      name: a.fileName,
    }));

  const mediaAtts = (message.attachments ?? []).filter(
    (a: any) => !a.burned && (isImageAtt(a) || isVideoAtt(a))
  );
  const nonMediaAtts = (message.attachments ?? []).filter(
    (a: any) => !a.burned && !isImageAtt(a) && !isVideoAtt(a) && a.type !== 'tg_meta' && a.type !== 'forward_meta'
  );
  const hasAlbum = mediaAtts.length >= 2;
  const albumCornerClass = own ? 'rounded-tl-2xl rounded-tr-sm' : 'rounded-tl-sm rounded-tr-2xl';

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name?: string; mimeType?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  // Палец удерживает сообщение — пузырь плавно «вжимается» (как в Telegram)
  const [isPressing, setIsPressing] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  // Desktop right-click context menu (compact popover at cursor);
  // mediaUrl — медиа, по которому кликнули (для «Копировать медиа»/«Сохранить как…» в альбоме)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; mediaUrl?: string | null } | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);
  const [ctxAdjusted, setCtxAdjusted] = useState<{ left: number; top: number } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = useRef(false);
  const lastTapRef = useRef(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snapParticles, setSnapParticles] = useState<{
    id: number; left: number; top: number;
    tx: number; ty: number;
    size: number; alpha: number; delay: number; duration: number;
  }[]>([]);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const openViewer = useCallback((mediaIndex: number) => setViewerIndex(mediaIndex), []);

  // «Копировать медиа» — картинка в буфер обмена. Clipboard API принимает
  // только PNG, поэтому JPEG/WebP перекодируем через canvas.
  const handleCopyMedia = useCallback(async (media: MediaItem | null) => {
    if (!media || media.type !== 'image') return;
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      addToast('error', 'Браузер не поддерживает копирование изображений');
      return;
    }
    try {
      const resp = await fetch(media.url);
      const blob = await resp.blob();
      let pngBlob = blob;
      if (blob.type !== 'image/png') {
        const bmp = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        canvas.getContext('2d')!.drawImage(bmp, 0, 0);
        pngBlob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
        );
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      addToast('success', 'Изображение скопировано');
    } catch {
      addToast('error', 'Не удалось скопировать изображение');
    }
  }, [addToast]);

  // «Сохранить как…» — нативный диалог выбора места (Chrome/Edge),
  // в остальных браузерах обычное скачивание с именем файла
  const handleSaveMedia = useCallback(async (media: MediaItem | null) => {
    if (!media) return;
    const name = media.name || media.url.split('/').pop() || 'file';
    try {
      const picker = (window as unknown as {
        showSaveFilePicker?: (opts: { suggestedName: string }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker;
      const resp = await fetch(media.url);
      const blob = await resp.blob();
      if (picker) {
        const handle = await picker.call(window, { suggestedName: name });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return; // пользователь закрыл диалог
      addToast('error', 'Не удалось сохранить файл');
    }
  }, [addToast]);

  // Медиа, к которому относятся пункты меню: на десктопе — то, по которому
  // кликнули правой кнопкой; иначе (мобильный sheet, клик мимо медиа) — первое
  const ctxMedia = (ctxMenu?.mediaUrl && mediaItems.find((m) => m.url === ctxMenu.mediaUrl))
    || mediaItems[0] || null;
  const ctxCopyableImage = ctxMedia?.type === 'image'
    ? ctxMedia
    : mediaItems.find((m) => m.type === 'image') ?? null;
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  // Long press to show actions on touch devices
  const handleTouchStart = useCallback(() => {
    if (readOnly) return;
    touchMoved.current = false;
    setIsPressing(true); // запускает медленное вжатие на время удержания
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        haptic(50);          // haptic feedback on long-press (Android + iOS fallback)
        setIsPressing(false); // пузырь пружинит обратно вместе с появлением меню
        setIsSelected(true); // brief selection glow on the bubble
        setShowMobileActions(true);
      }
    }, 350);
  }, [readOnly]);

  // Double-tap / double-click anywhere on the message → quick ❤️ (Telegram-style)
  const quickHeart = useCallback((target: EventTarget | null) => {
    if (readOnly) return;
    const el = target as HTMLElement | null;
    // Skip when interacting with media/controls inside the bubble
    if (el && el.closest('button, a, img, video, input, textarea')) return;
    onReact(message.id, '❤️');
  }, [readOnly, onReact, message.id]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setIsPressing(false);
    if (touchMoved.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      quickHeart(e.target);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [quickHeart]);

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true;
    setIsPressing(false); // скролл — отпускаем вжатие сразу
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Plays the "disintegrate" particle + fade animation on the bubble.
  const playDeleteAnimation = useCallback(() => {
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (rect) {
      const pts = Array.from({ length: 130 }, (_, i) => {
        const startX = rect.left + Math.random() * rect.width;
        const startY = rect.top + Math.random() * rect.height;
        // Fan pattern: scattered left/right/up, slight downward drift
        const angle = (Math.random() - 0.5) * Math.PI * 1.4;
        const dist = 35 + Math.random() * 110;
        const bias = own ? 35 : -35; // own msgs scatter right, others left
        return {
          id: i,
          left: startX,
          top: startY,
          tx: Math.cos(angle) * dist + bias,
          ty: Math.sin(angle) * dist + 15,
          size: 1 + Math.random() * 2.5,
          alpha: 0.5 + Math.random() * 0.5,
          delay: Math.random() * 380,
          duration: 420 + Math.random() * 320,
        };
      });
      setSnapParticles(pts);
    }
    setIsDeleting(true);
  }, [own]);

  const handleDeleteWithSnap = useCallback(() => {
    if (isDeleting) return;
    playDeleteAnimation();
    setTimeout(() => {
      onDelete(message);
      setConfirmDelete(false);
      setSnapParticles([]);
    }, 820);
  }, [isDeleting, playDeleteAnimation, onDelete, message]);

  // Another user deleted their message — play the same animation locally.
  // The store flags `isDeleting` then removes the message after the animation.
  const remoteDeleting = (message as { isDeleting?: boolean }).isDeleting === true;
  useEffect(() => {
    if (remoteDeleting && !isDeleting) playDeleteAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteDeleting]);

  const handleEditStart = useCallback(() => {
    if (onEdit) setEditingMessage(message);
  }, [message, onEdit, setEditingMessage]);

  // Close context menu on outside click/tap
  useEffect(() => {
    if (!showMobileActions) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (mobileMenuRef.current?.contains(e.target as Node)) return;
      setShowMobileActions(false);
      setIsSelected(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showMobileActions]);

  // Keep the desktop context menu within the viewport
  useEffect(() => {
    if (!ctxMenu) {
      setCtxAdjusted(null);
      return;
    }
    const el = ctxMenuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const PAD = 8;
    let left = ctxMenu.x;
    let top = ctxMenu.y;
    if (left + rect.width + PAD > vw) left = Math.max(PAD, vw - rect.width - PAD);
    if (top + rect.height + PAD > vh) top = Math.max(PAD, vh - rect.height - PAD);
    setCtxAdjusted({ left, top });
  }, [ctxMenu]);

  // Close desktop context menu on Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctxMenu]);

  // Системное сообщение (закрепление, открепление и т.п.)
  if (message.messageType === 'system') {
    return (
      <div data-message-id={message.id} className="flex justify-center py-1.5">
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/80 px-3 py-1 rounded-full select-none">
          {message.text}
        </span>
      </div>
    );
  }

  // Карточка-задача, созданная через slash-команду /task
  if (message.messageType === 'task_card') {
    const card = (message.attachments as any[] ?? []).find((a: any) => a.type === 'task_card');
    if (card) {
      return (
        <TaskCardMessage
          card={card}
          isOwn={own}
          senderName={displaySenderName}
          createdAt={message.createdAt}
          messageId={message.id}
        />
      );
    }
  }

  return (
    <div
      data-message-id={message.id}
      className={`flex gap-2 group [@media(pointer:coarse)]:select-none ${own ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : 'mt-0.5'} ${isPinned ? 'ring-1 ring-violet-300 dark:ring-violet-700 rounded-2xl' : ''}`}
      style={{
        // Вжатие при удержании: медленный ease-out пока палец держит,
        // быстрый пружинистый возврат при отпускании/открытии меню.
        // Анимация удаления сохраняет свои исходные 0.7s.
        transition: isDeleting
          ? 'opacity 0.7s ease-out, transform 0.7s ease-out, filter 0.7s ease-out'
          : isPressing
          ? 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)'
          : 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        opacity: isDeleting ? 0 : 1,
        transform: isDeleting ? 'scale(0.95)' : isPressing ? 'scale(0.96)' : 'scale(1)',
        filter: isDeleting ? 'blur(6px)' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onDoubleClick={(e) => quickHeart(e.target)}
      onContextMenu={(e) => {
        if (readOnly) return;
        e.preventDefault();
        const isCoarse =
          typeof window !== 'undefined' &&
          window.matchMedia('(pointer: coarse)').matches;
        if (isCoarse) {
          setShowMobileActions(true);
        } else {
          // Запоминаем медиа под курсором — в альбоме «Копировать/Сохранить»
          // должны работать именно с той картинкой, по которой кликнули
          const mediaEl = (e.target as HTMLElement).closest?.('img, video');
          const mediaUrl = mediaEl?.getAttribute('src')
            ?? mediaEl?.querySelector('source')?.getAttribute('src')
            ?? null;
          setCtxMenu({ x: e.clientX, y: e.clientY, mediaUrl });
        }
      }}
    >
      {/* Avatar placeholder / real avatar — только для чужих сообщений.
          У своих колонка-аватар не нужна: иначе flex-row-reverse держит её
          справа и пузырь не доходит до края (паразитный отступ справа). */}
      {!own && (
      <div className="w-8 shrink-0">
        {showAvatar && (() => {
          // For left-side forwarded messages use original sender's avatar/initials
          const avatarName = forwardMeta ? forwardSenderName : displaySenderName;
          const avatarUrl = forwardMeta ? (forwardMeta.originalSenderAvatarUrl || message.senderAvatarUrl) : message.senderAvatarUrl;
          return (
            <div
              onClick={openProfile}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold relative overflow-hidden ${isSenderDeleted ? 'bg-gray-400 dark:bg-gray-600' : 'bg-sky-500'} ${canOpenProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            >
              {isSenderDeleted ? (
                <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                getInitials(avatarName)
              )}
              {!isSenderDeleted && avatarUrl && (
                <img
                  src={avatarUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full rounded-full object-cover z-10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </div>
          );
        })()}
      </div>
      )}

      {/* Bubble */}
      <div className={`${blockMode ? 'w-full max-w-full' : 'max-w-[70%]'} min-w-[80px] flex flex-col ${own ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showAvatar && !own && (
          <p
            onClick={openProfile}
            className={`text-xs font-medium mb-0.5 ml-1 ${
              isSenderDeleted
                ? 'text-gray-400 dark:text-gray-600 italic'
                : nameColors
                  ? `${nameColorClass(message.senderId)} font-semibold`
                  : 'text-gray-500 dark:text-gray-400'
            } ${canOpenProfile ? 'cursor-pointer hover:text-violet-500 dark:hover:text-violet-400 transition-colors' : ''}`}
          >
            {forwardMeta ? forwardSenderName : displaySenderName}
          </p>
        )}

        {/* Reply preview */}
        {message.replyToMessage && (
          <div
            onClick={onScrollToReply}
            className={`text-xs px-2 py-1 mb-0.5 rounded-t-lg border-l-2 max-w-full ${
              own
                ? 'bg-bubble-400/20 border-bubble-300 dark:bg-bubble-500/20 dark:border-bubble-400'
                : 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500'
            } ${onScrollToReply ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-all' : ''}`}
          >
            <p className="font-medium text-gray-600 dark:text-gray-300 truncate">
              {message.replyToMessage.senderName}
            </p>
            <p className="text-gray-500 dark:text-gray-400 truncate">{plainText(message.replyToMessage.text)}</p>
          </div>
        )}

        <div
          ref={bubbleRef}
          className={`relative rounded-2xl w-full ${isSelected ? 'chat-msg-select' : ''} ${
            own
              ? 'bg-bubble-500 text-white rounded-tr-sm px-3 py-2'
              : blockMode
                ? 'bg-transparent text-gray-800 dark:text-gray-100 px-1 py-0.5'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-transparent shadow-sm rounded-tl-sm px-3 py-2'
          }`}
        >

          {/* Video note / Voice message / Regular content */}
          {isVideoNote && message.attachments && message.attachments.length > 0 ? (
            <VideoNotePlayer src={message.attachments[0].fileUrl} isOwn={own} />
          ) : isVoice && message.attachments && message.attachments.length > 0 ? (
            <VoicePlayer
              src={message.attachments[0].fileUrl}
              isOwn={own}
              senderName={message.senderName}
              channelId={message.channelId}
              messageId={message.id}
            />
          ) : (
            <>
              {/* Media album — full-width at top (Telegram style), rendered before text */}
              {hasAlbum && (
                <div className={`overflow-hidden mb-2 ${blockMode ? 'rounded-xl max-w-md' : `-mx-3 -mt-2 ${albumCornerClass}`}`}>
                  <MediaAlbum items={mediaAtts} mediaItems={mediaItems} onOpen={openViewer} />
                </div>
              )}

              {/* TG sender badge */}
              {isTgMessage && tgSender && (
                <div className={`flex items-center gap-1 mb-1 text-xs font-medium ${own ? 'text-white/80' : 'text-sky-500 dark:text-sky-400'}`}>
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.012 9.482c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.875.739z"/>
                  </svg>
                  {tgSender}
                </div>
              )}

              {/* Forwarded message header */}
              {isForwarded && (
                <div className={`flex items-center gap-1.5 mb-1.5 border-l-2 pl-2 ${own ? 'border-white/40' : 'border-violet-400'}`}>
                  <svg className={`w-3 h-3 shrink-0 ${own ? 'text-white/60' : 'text-violet-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3-3 3m-6 0a9 9 0 110-18 9 9 0 010 18" />
                  </svg>
                  <span className={`text-xs font-medium truncate ${own ? 'text-white/70' : 'text-violet-500 dark:text-violet-400'}`}>
                    {forwardSenderName}
                  </span>
                  {forwardChannelId && onGoToOriginalChannel && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onGoToOriginalChannel(forwardChannelId); }}
                      className={`ml-auto shrink-0 p-0.5 rounded transition-colors ${own ? 'text-white/50 hover:text-white/90' : 'text-violet-400 hover:text-violet-600'}`}
                      title={t('Перейти к оригиналу')}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Single image */}
              {!hasAlbum && mediaAtts.length === 1 && isImageAtt(mediaAtts[0]) && (() => {
                const att = mediaAtts[0];
                const mediaIndex = mediaItems.findIndex((m) => m.url === att.fileUrl);
                const imageContent = (
                  <div className="relative group/img mt-1">
                    <img src={att.fileUrl} alt={att.fileName} loading="lazy" decoding="async"
                      className="max-w-full max-h-60 rounded-lg object-cover block cursor-zoom-in"
                      onClick={() => openViewer(mediaIndex)}
                      onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }}
                    />
                    <div className={`hidden items-center gap-2 p-2 rounded-lg text-sm ${own ? 'bg-bubble-400/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <FileIcon mimeType={att.mimeType} /><span className="truncate text-sm">{att.fileName}</span>
                    </div>
                    <a href={att.fileUrl} download={att.fileName} target="_blank" rel="noopener noreferrer"
                      className="absolute bottom-1.5 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 rounded-full p-1"
                      onClick={(e) => e.stopPropagation()}>
                      <DownloadIcon />
                    </a>
                  </div>
                );
                return att.ttl ? (
                  <SelfDestructMedia key={att.id} messageId={message.id} fileUrl={att.fileUrl} ttl={att.ttl} isOwn={isOwn}>
                    {imageContent}
                  </SelfDestructMedia>
                ) : (
                  <React.Fragment key={att.id}>{imageContent}</React.Fragment>
                );
              })()}

              {/* Single video */}
              {!hasAlbum && mediaAtts.length === 1 && isVideoAtt(mediaAtts[0]) && (() => {
                const att = mediaAtts[0];
                const mediaIndex = mediaItems.findIndex((m) => m.url === att.fileUrl);
                const videoContent = (
                  <div className="relative group/vid mt-1 w-fit max-w-full">
                    <div className="relative cursor-pointer rounded-lg overflow-hidden min-w-[180px]" onClick={() => openViewer(mediaIndex)}>
                      <VideoThumbnail src={att.fileUrl} className="max-h-52 w-full rounded-lg block" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover/vid:bg-black/40 transition-colors rounded-lg">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </div>
                    <a href={att.fileUrl} download={att.fileName} target="_blank" rel="noopener noreferrer"
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover/vid:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 rounded-full p-1"
                      onClick={(e) => e.stopPropagation()}>
                      <DownloadIcon />
                    </a>
                  </div>
                );
                return att.ttl ? (
                  <SelfDestructMedia key={att.id} messageId={message.id} fileUrl={att.fileUrl} ttl={att.ttl} isOwn={isOwn}>
                    {videoContent}
                  </SelfDestructMedia>
                ) : (
                  <React.Fragment key={att.id}>{videoContent}</React.Fragment>
                );
              })()}

              {/* Сгоревшие исчезающие медиа */}
              {burnedAtts.map((att, i) => (
                <BurnedMediaPlaceholder key={att.id ?? `burned-${i}`} />
              ))}

              {/* Audio and document files */}
              {nonMediaAtts.length > 0 && (
                <div className="mt-1 space-y-1">
                  {nonMediaAtts.map((att, index) => {
                    const isAudio = att.mimeType?.startsWith('audio/');
                    if (isAudio) {
                      return (
                        <div key={att.id ?? index} className={`flex flex-col gap-1 p-2 rounded-lg ${own ? 'bg-bubble-400/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileIcon mimeType={att.mimeType} />
                              <span className="truncate text-sm font-medium">{att.fileName}</span>
                            </div>
                            <a href={att.fileUrl} download={att.fileName} target="_blank" rel="noopener noreferrer"
                              className={`shrink-0 p-1 rounded-full hover:bg-black/10 ${own ? 'text-bubble-200' : 'text-gray-500'}`}>
                              <DownloadIcon />
                            </a>
                          </div>
                          <audio src={att.fileUrl} controls className="w-full h-8" />
                        </div>
                      );
                    }
                    return (
                      <div key={att.id ?? index}
                        onClick={() => setPreviewFile({ url: att.fileUrl, name: att.fileName, mimeType: att.mimeType })}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                          own ? 'bg-bubble-400/30 hover:bg-bubble-400/40' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}>
                        <FileIcon mimeType={att.mimeType} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">{att.fileName}</p>
                          <p className={`text-xs ${own ? 'text-bubble-200' : 'text-gray-400 dark:text-gray-500'}`}>
                            {getFileExt(att.fileName)} · {formatSize(att.fileSize)}
                          </p>
                        </div>
                        <a href={att.fileUrl} download={att.fileName} target="_blank" rel="noopener noreferrer"
                          className={`shrink-0 p-1.5 rounded-full transition-colors ${own ? 'text-bubble-200 hover:bg-bubble-400/30' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                          onClick={(e) => e.stopPropagation()}>
                          <DownloadIcon />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Text / caption — always rendered below all media and attachments */}
              {resolvedDisplayText && renderText(resolvedDisplayText, own, highlightQuery)}
            </>
          )}

          {/* Time + edited + read checkmark + readers */}
          <div className={`flex items-center gap-1 mt-0.5 ${own ? 'justify-end' : 'justify-start'}`}>
            {message.isEdited && (
              <span className={`text-[10px] ${own ? 'text-bubble-200' : 'text-gray-400 dark:text-gray-500'}`}>
                ред.
              </span>
            )}
            <span className={`text-[10px] ${own ? 'text-bubble-200' : 'text-gray-400 dark:text-gray-500'}`}>
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <div className="flex items-center gap-1">
                {/* Reader avatars (group chat) */}
                {readers.length > 0 && (
                  <ReadersTooltip readers={readers} />
                )}
                {/* Checkmark */}
                <span className={`text-[10px] leading-none ${
                  isRead
                    ? own ? 'text-sky-300' : 'text-sky-500'
                    : own ? 'text-bubble-200' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {isRead ? (
                    <svg className="w-4 h-3 inline" viewBox="0 0 18 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1,6 4.5,10 10,2" />
                      <polyline points="6,6 9.5,10 17,1" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 inline" viewBox="0 0 12 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1,4.5 4.5,8 11,1" />
                    </svg>
                  )}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 select-none">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(message.id, r.emoji)}
                className="reaction-chip inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-full border border-transparent hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
              >
                <span className="reaction-emoji">{r.emoji}</span>
                <span className="text-gray-600 dark:text-gray-300">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="mt-1 flex items-center gap-2 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5">
            <span className="text-red-600 dark:text-red-400">{t('Удалить сообщение?')}</span>
            <button
              onClick={handleDeleteWithSnap}
              className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded font-medium"
            >
              Да
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Нет
            </button>
          </div>
        )}
      </div>

      {/* Context menu — right-click on desktop, long-press on mobile (portal) */}
      {showMobileActions && typeof document !== 'undefined' && createPortal(
        <div
          ref={mobileMenuRef}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-5 gap-2"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setShowMobileActions(false); setIsSelected(false); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setShowMobileActions(false); setIsSelected(false); }}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/35 backdrop-blur-md animate-ctx-backdrop-in" />

          {/* Emoji reaction row */}
          <div
            className="relative z-10 bg-[#1c1c1e]/40 backdrop-blur-2xl rounded-full px-2 py-1 flex items-center gap-0 shadow-xl animate-ctx-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact(message.id, emoji); setShowMobileActions(false); setIsSelected(false); }}
                className="text-[20px] w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message preview bubble */}
          <div
            className={`relative z-10 w-full flex animate-ctx-pop-in ${own ? 'justify-end' : 'justify-start'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-lg ${
              own
                ? 'bg-bubble-500 text-white rounded-tr-sm'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-transparent rounded-tl-sm'
            }`}>
              {message.text && (
                <p className="text-sm whitespace-pre-wrap break-words line-clamp-4">{message.text}</p>
              )}
              {!message.text && message.attachments && message.attachments.length > 0 && (
                <p className={`text-sm ${own ? 'text-bubble-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  📎 {message.attachments[0].fileName}
                </p>
              )}
              <div className={`text-[10px] mt-0.5 ${own ? 'text-right text-bubble-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {formatTime(message.createdAt)}
              </div>
            </div>
          </div>

          {/* Actions card */}
          <div
            className="relative z-10 w-full max-w-[208px] bg-[#1c1c1e]/40 backdrop-blur-2xl rounded-xl overflow-hidden shadow-xl animate-ctx-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Reply */}
            <button
              onClick={() => { onReply(); setShowMobileActions(false); setIsSelected(false); }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
            >
              <span className="text-[13px]">{t('Ответить')}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>

            {/* Copy text */}
            {message.text && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(message.text!).then(() => {
                    addToast('success', 'Текст скопирован');
                  }).catch(() => {});
                  setShowMobileActions(false);
                  setIsSelected(false);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
              >
                <span className="text-[13px]">{t('Копировать текст')}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}

            {/* Copy media (first image) */}
            {ctxCopyableImage && (
              <button
                onClick={() => { handleCopyMedia(ctxCopyableImage); setShowMobileActions(false); setIsSelected(false); }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
              >
                <span className="text-[13px]">{t('Копировать медиа')}</span>
                <span className="text-gray-400">{ICON_COPY_MEDIA}</span>
              </button>
            )}

            {/* Save as */}
            {ctxMedia && (
              <button
                onClick={() => { handleSaveMedia(ctxMedia); setShowMobileActions(false); setIsSelected(false); }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
              >
                <span className="text-[13px]">{t('Сохранить как…')}</span>
                <span className="text-gray-400">{ICON_SAVE_AS}</span>
              </button>
            )}

            {/* Edit (own text messages only) */}
            {isOwn && message.text && onEdit && (
              <button
                onClick={() => { handleEditStart(); setShowMobileActions(false); setIsSelected(false); }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
              >
                <span className="text-[13px]">{t('Редактировать')}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {/* Pin / Unpin */}
            {canPin && (
              <button
                onClick={() => { onPin?.(message); setShowMobileActions(false); setIsSelected(false); }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
              >
                <span className="text-[13px]">{isPinned ? 'Открепить' : 'Закрепить'}</span>
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z" />
                </svg>
              </button>
            )}

            {/* Forward */}
            {onForward && (
              <button
                onClick={() => { onForward(message); setShowMobileActions(false); setIsSelected(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-white hover:bg-white/10 active:bg-white/15 transition-colors ${isOwn ? 'border-b border-white/10' : ''}`}
              >
                <span className="text-[13px]">{t('Переслать')}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}

            {/* Delete (own messages only) */}
            {isOwn && (
              <button
                onClick={() => { setConfirmDelete(true); setShowMobileActions(false); setIsSelected(false); }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-red-400 hover:bg-white/10 active:bg-white/15 transition-colors"
              >
                <span className="text-[13px]">{t('Удалить')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Desktop right-click context menu — compact popover at cursor */}
      {ctxMenu && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999]"
          onClick={(e) => { e.stopPropagation(); setCtxMenu(null); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu(null); }}
        >
          <div
            ref={ctxMenuRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: ctxAdjusted?.left ?? ctxMenu.x,
              top: ctxAdjusted?.top ?? ctxMenu.y,
              visibility: ctxAdjusted ? 'visible' : 'hidden',
            }}
            className="flex flex-col gap-1.5"
          >
            {/* Emoji reaction row */}
            <div className="self-start flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl animate-ctx-pop-in">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onReact(message.id, emoji); setCtxMenu(null); }}
                  className="w-8 h-8 flex items-center justify-center text-lg rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Menu card */}
            <div className="min-w-[210px] py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden animate-ctx-pop-in">
              <button onClick={() => { onReply(); setCtxMenu(null); }} className={CTX_ITEM}>
                <span className={CTX_ICON}>{ICON_REPLY}</span>
                <span className="flex-1">{t('Ответить')}</span>
              </button>

              {message.text && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(message.text!)
                      .then(() => addToast('success', 'Текст скопирован'))
                      .catch(() => {});
                    setCtxMenu(null);
                  }}
                  className={CTX_ITEM}
                >
                  <span className={CTX_ICON}>{ICON_COPY}</span>
                  <span className="flex-1">{t('Копировать текст')}</span>
                </button>
              )}

              {ctxCopyableImage && (
                <button
                  onClick={() => { handleCopyMedia(ctxCopyableImage); setCtxMenu(null); }}
                  className={CTX_ITEM}
                >
                  <span className={CTX_ICON}>{ICON_COPY_MEDIA}</span>
                  <span className="flex-1">{t('Копировать медиа')}</span>
                </button>
              )}

              {ctxMedia && (
                <button
                  onClick={() => { handleSaveMedia(ctxMedia); setCtxMenu(null); }}
                  className={CTX_ITEM}
                >
                  <span className={CTX_ICON}>{ICON_SAVE_AS}</span>
                  <span className="flex-1">{t('Сохранить как…')}</span>
                </button>
              )}

              {isOwn && message.text && onEdit && (
                <button onClick={() => { handleEditStart(); setCtxMenu(null); }} className={CTX_ITEM}>
                  <span className={CTX_ICON}>{ICON_EDIT}</span>
                  <span className="flex-1">{t('Редактировать')}</span>
                </button>
              )}

              {canPin && onPin && (
                <button onClick={() => { onPin(message); setCtxMenu(null); }} className={CTX_ITEM}>
                  <span className={CTX_ICON}>{ICON_PIN}</span>
                  <span className="flex-1">{isPinned ? 'Открепить' : 'Закрепить'}</span>
                </button>
              )}

              {onForward && (
                <button onClick={() => { onForward(message); setCtxMenu(null); }} className={CTX_ITEM}>
                  <span className={CTX_ICON}>{ICON_FORWARD}</span>
                  <span className="flex-1">{t('Переслать')}</span>
                </button>
              )}

              {isOwn && (
                <>
                  <div className="my-1 mx-3 h-px bg-gray-200 dark:bg-gray-700" />
                  <button
                    onClick={() => { setConfirmDelete(true); setCtxMenu(null); }}
                    className={CTX_ITEM_DANGER}
                  >
                    <span className="shrink-0 w-5 h-5 flex items-center justify-center text-red-500">{ICON_TRASH}</span>
                    <span className="flex-1">{t('Удалить')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* User profile modal — opened by clicking sender avatar/name */}
      {showProfile && (
        <UserProfileModal userId={message.senderId} onClose={() => setShowProfile(false)} />
      )}

      {/* Disintegration particles portal */}
      {snapParticles.length > 0 && typeof document !== 'undefined' && createPortal(
        <>
          {snapParticles.map((p) => (
            <div
              key={p.id}
              className="fixed rounded-full pointer-events-none"
              style={{
                zIndex: 9997,
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                background: own
                  ? `color-mix(in srgb, var(--color-bubble-300) ${Math.round(p.alpha * 100)}%, transparent)`
                  : `rgba(156, 163, 175, ${p.alpha})`,
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
                opacity: 0,
                animation: `disintegrate-particle ${p.duration}ms ease-out forwards`,
                animationDelay: `${p.delay}ms`,
              } as React.CSSProperties}
            />
          ))}
        </>,
        document.body
      )}

      {/* Media viewer portal */}
      {viewerIndex !== null && mediaItems.length > 0 && (
        <MediaViewer
          items={mediaItems}
          initialIndex={viewerIndex}
          onClose={closeViewer}
          onEditAndSend={async (item) => {
            // Скачиваем картинку, передаём инпуту текущего канала — он откроет редактор
            try {
              const resp = await fetch(item.url);
              const blob = await resp.blob();
              const name = item.name || item.url.split('/').pop() || 'image.jpg';
              const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
              window.dispatchEvent(new CustomEvent('chat:edit-and-send', {
                detail: { file, channelId: message.channelId },
              }));
              closeViewer();
            } catch {
              // не скачалось — остаёмся в просмотрщике
            }
          }}
        />
      )}

      {/* File preview portal */}
      {previewFile && (
        <FilePreviewModal
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          mimeType={previewFile.mimeType}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

// Мемоизация: список сообщений перерисовывается на каждое новое сообщение,
// печатание, чтение и т.п. Объект `message` сохраняет ссылку, пока его контент
// не изменился (стор заменяет ссылку только у реально обновлённого сообщения),
// поэтому неизменные пузыри пропускают ререндер — меньше нагрузки, картинки
// не перемонтируются. Колбэки сравнивать не нужно: они стабильны по поведению.
function propsAreEqual(a: ChatMessageProps, b: ChatMessageProps): boolean {
  return (
    a.message === b.message &&
    a.isOwn === b.isOwn &&
    a.showAvatar === b.showAvatar &&
    a.isRead === b.isRead &&
    a.isPinned === b.isPinned &&
    a.canPin === b.canPin &&
    a.readOnly === b.readOnly &&
    a.highlightQuery === b.highlightQuery &&
    (a.readers?.length ?? 0) === (b.readers?.length ?? 0)
  );
}

export default memo(ChatMessage, propsAreEqual);

// ── Task mention renderer ───────────────────────────────────

// Matches #[Title](task:ID|status|priority|dueDate) and @[Name](user:ID)
const MENTION_RE = /#\[([^\]]+)\]\(task:(\d+)(?:\|(\d+)\|(\d+)\|([^)]*))?\)|@\[([^\]]+)\]\(user:(\d+)\)/g;

const TASK_STATUS_LABELS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Новая',       cls: 'bg-gray-100 text-gray-600 dark:bg-gray-600/40 dark:text-gray-300' },
  1: { label: 'Назначена',   cls: 'bg-sky-100 text-sky-700 dark:bg-sky-800/40 dark:text-sky-300' },
  2: { label: 'В работе',    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800/40 dark:text-yellow-300' },
  3: { label: 'На проверке', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-800/40 dark:text-purple-300' },
  4: { label: 'Завершена',   cls: 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300' },
  5: { label: 'Отменена',    cls: 'bg-red-100 text-red-700 dark:bg-red-800/40 dark:text-red-300' },
};

const TASK_PRIORITY_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Низкий',      cls: 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300' },
  2: { label: 'Средний',     cls: 'bg-sky-100 text-sky-700 dark:bg-sky-800/40 dark:text-sky-300' },
  3: { label: 'Высокий',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300' },
  4: { label: 'Критический', cls: 'bg-red-100 text-red-700 dark:bg-red-800/40 dark:text-red-300' },
};

function fmtDate(d: string): string {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
  } catch { return ''; }
}

function TaskCard({ id, title, status, priority, dueDate, isOwn }: {
  id: string; title: string; status: number; priority: number; dueDate: string; isOwn: boolean;
}) {
  const t = useT();
  const st = TASK_STATUS_LABELS[status];
  const pr = TASK_PRIORITY_LABELS[priority];
  const due = fmtDate(dueDate);

  return (
    <Link
      href={`/dashboard/tasks?edit=${id}`}
      onClick={(e) => {
        e.stopPropagation();
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard/chat')) {
          try { sessionStorage.setItem('taskBackTo', window.location.pathname + window.location.search); } catch {}
        }
      }}
      className={`flex flex-col gap-1.5 rounded-xl p-2.5 border transition-colors no-underline ${
        isOwn
          ? 'bg-white/10 hover:bg-white/20 border-white/20'
          : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
      }`}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <svg
          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isOwn ? 'text-white/70' : 'text-violet-400'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className={`text-xs font-semibold leading-snug ${isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
          {title}
        </span>
      </div>

      {/* Badges row */}
      {(st || pr || due) && (
        <div className="flex items-center gap-1.5 flex-wrap pl-5">
          {st && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isOwn ? 'bg-white/20 text-white' : st.cls
            }`}>
              {st.label}
            </span>
          )}
          {pr && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isOwn ? 'bg-white/20 text-white' : pr.cls
            }`}>
              {pr.label}
            </span>
          )}
          {due && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {due}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
// ── Task card message (created via /task slash command) ──────────

interface TaskCardSnapshot {
  type: 'task_card';
  taskId: number;
  title: string;
  status: number;
  priority: number;
  dueDate: string | null;
  projectId?: number | null;
  assignees?: { userId: number; userName?: string }[];
}

function TaskCardMessage({ card, isOwn, senderName, createdAt, messageId }: {
  card: TaskCardSnapshot;
  isOwn: boolean;
  senderName: string;
  createdAt: string;
  messageId: number;
}) {
  const t = useT();
  const st = TASK_STATUS_LABELS[card.status];
  const pr = TASK_PRIORITY_LABELS[card.priority];
  const due = card.dueDate ? fmtDate(card.dueDate) : '';
  const assignees = card.assignees ?? [];
  const time = (() => {
    try {
      const d = new Date(createdAt);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch { return ''; }
  })();

  return (
    <div data-message-id={messageId} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} my-1.5`}>
      <Link
        href={`/dashboard/tasks?edit=${card.taskId}`}
        onClick={(e) => {
          e.stopPropagation();
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard/chat')) {
            try { sessionStorage.setItem('taskBackTo', window.location.pathname + window.location.search); } catch {}
          }
        }}
        className="block max-w-md w-full rounded-2xl border border-violet-200 dark:border-violet-700/60 bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/30 dark:to-gray-800 hover:from-violet-100 hover:to-violet-50 dark:hover:from-violet-900/40 dark:hover:to-gray-800/80 transition-colors shadow-sm no-underline p-3"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-violet-500/15 dark:bg-violet-500/25 flex items-center justify-center text-violet-600 dark:text-violet-300">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
            Новая задача
          </span>
          {time && (
            <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">{time}</span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug mb-2 break-words">
          {card.title}
        </p>

        {/* Badges */}
        {(st || pr || due) && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {st && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${st.cls}`}>
                {st.label}
              </span>
            )}
            {pr && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${pr.cls}`}>
                {pr.label}
              </span>
            )}
            {due && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {due}
              </span>
            )}
          </div>
        )}

        {/* Footer: assignees + author */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-violet-100 dark:border-violet-800/40">
          <div className="flex items-center gap-1.5 min-w-0">
            {assignees.length > 0 ? (
              <>
                <div className="flex -space-x-1.5">
                  {assignees.slice(0, 3).map((a) => (
                    <div
                      key={a.userId}
                      className="w-6 h-6 rounded-full bg-violet-400 dark:bg-violet-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-gray-800"
                      title={a.userName || `#${a.userId}`}
                    >
                      {(a.userName || '?').slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {assignees.length === 1
                    ? (assignees[0].userName || `#${assignees[0].userId}`)
                    : `${assignees.length} исполн.`}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{t('Без исполнителей')}</span>
            )}
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            от {senderName || 'Пользователь'}
          </span>
        </div>
      </Link>
    </div>
  );
}

function highlightSegment(raw: string, query: string | undefined, isOwn: boolean): React.ReactNode {
  if (!query) return raw;
  const lower = raw.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let start = 0;
  let found = lower.indexOf(q, start);
  while (found !== -1) {
    if (found > start) parts.push(raw.slice(start, found));
    parts.push(
      <mark key={found} className={`rounded px-0.5 ${isOwn ? 'bg-white/40 text-white' : 'bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-gray-100'}`}>
        {raw.slice(found, found + query.length)}
      </mark>
    );
    start = found + query.length;
    found = lower.indexOf(q, start);
  }
  if (start < raw.length) parts.push(raw.slice(start));
  return <>{parts}</>;
}

const URL_RE = /https?:\/\/[^\s<>"']+/g;

function renderUrlsInSegment(text: string, isOwn: boolean, highlightQuery: string | undefined, baseKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  URL_RE.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<span key={`${baseKey}-t-${last}`}>{highlightSegment(text.slice(last, m.index), highlightQuery, isOwn)}</span>);
    }
    const url = m[0].replace(/[.,;:!?)\]]+$/, '');
    parts.push(
      <a
        key={`${baseKey}-u-${m.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline break-all ${isOwn ? 'text-white/90 hover:text-white' : 'text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(<span key={`${baseKey}-t-${last}`}>{highlightSegment(text.slice(last), highlightQuery, isOwn)}</span>);
  }
  return parts;
}

function renderInlineBold(text: string, isOwn: boolean, highlightQuery?: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const boldRe = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = boldRe.exec(text)) !== null) {
    if (m.index > last) parts.push(...renderUrlsInSegment(text.slice(last, m.index), isOwn, highlightQuery, last));
    parts.push(<strong key={m.index} className="font-semibold">{m[1]}</strong>);
    last = boldRe.lastIndex;
  }
  if (last < text.length) parts.push(...renderUrlsInSegment(text.slice(last), isOwn, highlightQuery, last));
  return parts;
}

function plainText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/#\[([^\]]+)\]\(task:[^)]*\)/g, '📋 $1')
    .replace(/@\[([^\]]+)\]\(user:\d+\)/g, '@$1');
}

function renderText(text: string, isOwn: boolean, highlightQuery?: string) {
  const textSegments: React.ReactNode[] = [];
  const cards: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;

  while ((match = MENTION_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const raw = text.slice(lastIndex, match.index);
      textSegments.push(<span key={lastIndex}>{renderInlineBold(raw, isOwn, highlightQuery)}</span>);
    }

    if (match[0].startsWith('@')) {
      // User mention: @[Name](user:ID)
      const userName = match[6];
      textSegments.push(
        <span
          key={match.index}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${
            isOwn
              ? 'bg-white/20 text-white'
              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
          }`}
        >
          @{userName}
        </span>
      );
    } else {
      // Task mention: #[Title](task:ID|status|priority|dueDate)
      const [, title, id, rawStatus, rawPriority, rawDue] = match;
      const status = rawStatus ? Number(rawStatus) : -1;
      const priority = rawPriority ? Number(rawPriority) : 0;
      const dueDate = rawDue ?? '';

      if (status >= 0) {
        cards.push(
          <TaskCard key={match.index} id={id} title={title} status={status} priority={priority} dueDate={dueDate} isOwn={isOwn} />
        );
      } else {
        textSegments.push(
          <Link
            key={match.index}
            href={`/dashboard/tasks?edit=${id}`}
            onClick={(e) => {
              e.stopPropagation();
              if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard/chat')) {
                try { sessionStorage.setItem('taskBackTo', window.location.pathname + window.location.search); } catch {}
              }
            }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
              isOwn
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/40 dark:hover:bg-violet-800/50 text-violet-700 dark:text-violet-300'
            }`}
          >
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {title}
          </Link>
        );
      }
    }
    lastIndex = MENTION_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    const raw = text.slice(lastIndex);
    textSegments.push(<span key={lastIndex}>{renderInlineBold(raw, isOwn, highlightQuery)}</span>);
  }

  return (
    <div>
      {textSegments.length > 0 && (
        <p className="chat-msg-text whitespace-pre-wrap break-words">{textSegments}</p>
      )}
      {cards.length > 0 && (
        <div className={textSegments.length > 0 ? 'mt-2 space-y-1.5' : 'space-y-1.5'}>
          {cards}
        </div>
      )}
    </div>
  );
}

// ── Media Album (Telegram-style grid for multiple images/videos) ─────────────

function MediaAlbum({
  items,
  mediaItems,
  onOpen,
}: {
  items: Array<{ fileUrl: string; mimeType?: string; fileName: string; id?: number }>;
  mediaItems: Array<{ url: string; type: 'image' | 'video'; name?: string }>;
  onOpen: (index: number) => void;
}) {
  const count = items.length;
  const getIdx = (item: { fileUrl: string }) => mediaItems.findIndex((m) => m.url === item.fileUrl);

  const renderCell = (
    item: typeof items[0],
    key: React.Key,
    className: string,
    overflowCount?: number,
  ) => {
    const isVid = isVideoAtt(item);
    const idx = getIdx(item);
    const showOverflow = overflowCount != null && overflowCount > 0;
    return (
      <div key={key} className={`relative overflow-hidden cursor-pointer ${className}`} onClick={() => onOpen(idx)}>
        {isVid
          ? <VideoThumbnail src={item.fileUrl} className="w-full h-full object-cover" />
          : <img src={item.fileUrl} alt={item.fileName} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        }
        {isVid && !showOverflow && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
            <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow">
              <svg className="w-3.5 h-3.5 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        )}
        {showOverflow && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
            <span className="text-white text-2xl font-bold">+{overflowCount}</span>
          </div>
        )}
      </div>
    );
  };

  if (count === 2) {
    return (
      <div className="flex gap-0.5 h-44">
        {renderCell(items[0], items[0].id ?? 0, 'flex-1')}
        {renderCell(items[1], items[1].id ?? 1, 'flex-1')}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="h-40">{renderCell(items[0], items[0].id ?? 0, 'w-full h-full')}</div>
        <div className="flex gap-0.5 h-28">
          {renderCell(items[1], items[1].id ?? 1, 'flex-1')}
          {renderCell(items[2], items[2].id ?? 2, 'flex-1')}
        </div>
      </div>
    );
  }

  // 4+ items: 1 large + up to 3 thumbnails below, last thumb shows overflow count
  const thumbs = items.slice(1, 4);
  const overflow = count - 4; // items hidden beyond what we show

  return (
    <div className="flex flex-col gap-0.5">
      <div className="h-44">{renderCell(items[0], items[0].id ?? 0, 'w-full h-full')}</div>
      <div className="flex gap-0.5 h-28">
        {thumbs.map((item, i) => {
          const isLast = i === thumbs.length - 1 && overflow > 0;
          return renderCell(item, item.id ?? (i + 1), 'flex-1', isLast ? overflow : undefined);
        })}
      </div>
    </div>
  );
}

// ── Video Thumbnail ──────────────────────────────────────────
// Renders a native <video> with a black background so the bubble
// colour never bleeds through while the frame is loading.
// Seeking to 0.001 s on metadata load forces first-frame display
// in browsers that otherwise show a blank frame.

function VideoThumbnail({ src, className }: { src: string; className?: string }) {
  const t = useT();
  return (
    <video
      src={src}
      preload="metadata"
      muted
      playsInline
      onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.001; }}
      className={className}
      style={{ background: '#000', pointerEvents: 'none', minHeight: 80, display: 'block' }}
    />
  );
}

// ── Voice Message Player ────────────────────────────────────

const WAVEFORM = [3, 5, 8, 6, 4, 9, 7, 5, 8, 6, 10, 8, 5, 7, 9, 6, 8, 5, 7, 4, 6, 8, 5, 9, 7, 6, 8, 4, 6, 9];

interface VoicePlayerProps {
  src: string;
  isOwn: boolean;
  senderName?: string;
  channelId?: number;
  messageId?: number;
}

// Воспроизведение идёт через глобальный voicePlayerStore (единый <audio>
// вне React-дерева): продолжается при навигации, бар управления — вверху чата.
function VoicePlayer({ src, isOwn, senderName, channelId, messageId }: VoicePlayerProps) {
  const t = useT();
  const metaAudioRef = useRef<HTMLAudioElement>(null);
  // Длительность до первого запуска — из локального metadata-объекта
  const [metaDuration, setMetaDuration] = useState(0);

  const track = useVoicePlayerStore((s) => s.track);
  const storePlaying = useVoicePlayerStore((s) => s.isPlaying);
  const storeTime = useVoicePlayerStore((s) => s.currentTime);
  const storeDuration = useVoicePlayerStore((s) => s.duration);
  const play = useVoicePlayerStore((s) => s.play);
  const toggle = useVoicePlayerStore((s) => s.toggle);
  const storeSeek = useVoicePlayerStore((s) => s.seek);

  const isActive = track?.src === src;
  const isPlaying = isActive && storePlaying;
  const currentTime = isActive ? storeTime : 0;
  const duration = isActive && storeDuration > 0 ? storeDuration : metaDuration;

  useEffect(() => {
    const audio = metaAudioRef.current;
    if (!audio) return;
    const onMeta = () => { if (isFinite(audio.duration)) setMetaDuration(audio.duration); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
    };
  }, []);

  const togglePlay = () => {
    if (isActive) toggle();
    else play({ src, senderName: senderName || '', channelId, messageId });
  };

  const seekRatio = (ratio: number) => {
    if (!duration) return;
    if (!isActive) play({ src, senderName: senderName || '', channelId, messageId });
    storeSeek(ratio * duration);
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const displayTime = isPlaying ? currentTime : duration;

  return (
    <div className="flex items-center gap-2.5 py-0.5" style={{ minWidth: 200 }}>
      <audio ref={metaAudioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
          isOwn
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-violet-500 hover:bg-violet-600 text-white'
        }`}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform + progress bar */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Waveform bars */}
        <div
          className="flex items-center gap-px cursor-pointer"
          style={{ height: 24 }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekRatio((e.clientX - rect.left) / rect.width);
          }}
        >
          {WAVEFORM.map((h, i) => {
            const filled = i / WAVEFORM.length < progress;
            return (
              <div
                key={i}
                className={`rounded-full flex-1 transition-colors ${
                  filled
                    ? isOwn ? 'bg-white' : 'bg-violet-500'
                    : isOwn ? 'bg-white/40' : 'bg-gray-300 dark:bg-gray-500'
                }`}
                style={{ height: h, minWidth: 2, maxWidth: 3 }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <span className={`text-[10px] tabular-nums ${isOwn ? 'text-bubble-200' : 'text-gray-400 dark:text-gray-500'}`}>
          {formatAudioDuration(displayTime)}
        </span>
      </div>
    </div>
  );
}

// ── Video Note Player ───────────────────────────────────────

interface VideoNotePlayerProps {
  src: string;
  isOwn: boolean;
}

function VideoNotePlayer({ src, isOwn }: VideoNotePlayerProps) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const SIZE = 200;
  const RADIUS = SIZE / 2 - 4;
  const circumference = 2 * Math.PI * RADIUS;
  const progress = duration > 0 ? currentTime / duration : 0;

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); } else { v.play().catch(() => {}); }
  };

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ width: SIZE, height: SIZE }}
      onClick={togglePlay}
    >
      {/* Progress ring */}
      <svg className="absolute inset-0 -rotate-90 pointer-events-none" width={SIZE} height={SIZE}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="rgba(128,128,128,0.25)" strokeWidth={3} />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
          stroke={isOwn ? 'var(--color-bubble-300)' : 'var(--color-violet-600)'} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      {/* Circular video */}
      <div className="absolute bg-black" style={{ inset: 4, borderRadius: '50%', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
          onLoadedMetadata={(e) => { if (isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration); }}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => { setIsPlaying(false); setCurrentTime(0); if (videoRef.current) videoRef.current.currentTime = 0; }}
        />
      </div>
      {/* Play overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      {/* Duration badge */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-2 py-0.5 pointer-events-none">
        <span className="text-white text-[10px] font-mono tabular-nums">
          {formatAudioDuration(isPlaying ? currentTime : duration)}
        </span>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function formatAudioDuration(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function DownloadIcon() {
  const t = useT();
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const t = useT();
  const mime = mimeType ?? '';

  if (mime === 'application/pdf') {
    return (
      <div className="w-9 h-9 shrink-0 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
        <span className="text-[10px] font-bold text-red-600 dark:text-red-400">PDF</span>
      </div>
    );
  }

  if (mime.includes('msword') || mime.includes('wordprocessingml')) {
    return (
      <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">DOC</span>
      </div>
    );
  }

  if (mime.includes('ms-excel') || mime.includes('spreadsheetml')) {
    return (
      <div className="w-9 h-9 shrink-0 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
        <span className="text-[10px] font-bold text-green-600 dark:text-green-400">XLS</span>
      </div>
    );
  }

  if (mime.includes('powerpoint') || mime.includes('presentationml')) {
    return (
      <div className="w-9 h-9 shrink-0 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">PPT</span>
      </div>
    );
  }

  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('tar') || mime.includes('gzip')) {
    return (
      <div className="w-9 h-9 shrink-0 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      </div>
    );
  }

  if (mime.startsWith('audio/')) {
    return (
      <div className="w-9 h-9 shrink-0 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
    );
  }

  if (mime.startsWith('image/')) {
    return (
      <div className="w-9 h-9 shrink-0 rounded-lg bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
        <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

function getFileExt(fileName: string): string {
  const ext = fileName?.split('.').pop()?.toUpperCase();
  return ext ?? 'FILE';
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
