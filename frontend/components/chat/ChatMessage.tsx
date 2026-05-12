'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useToastStore } from '@/stores/toastStore';
import { ChatMessage as ChatMessageType, useChatStore } from '@/stores/chatStore';
import MediaViewer, { MediaItem } from './MediaViewer';
import FilePreviewModal from '@/components/ui/FilePreviewModal';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

// Desktop side action buttons — defined here so TypeScript sees it before ChatMessage uses it
function ActionButtons({ isOwn, isPinned, canPin, emojiRef, showEmojiPicker, setShowEmojiPicker, onReply, onPin, onDelete, onEdit, onReact, canEdit }: {
  isOwn: boolean; isPinned?: boolean; canPin?: boolean; canEdit?: boolean;
  emojiRef: React.RefObject<HTMLDivElement | null>;
  showEmojiPicker: boolean; setShowEmojiPicker: (v: boolean) => void;
  onReply: () => void; onPin?: () => void; onDelete: () => void; onEdit?: () => void;
  onReact: (emoji: string) => void;
}) {
  return (
    <>
      <div className="relative" ref={emojiRef}>
        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Реакция">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        {showEmojiPicker && (
          <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 flex gap-1`}>
            {QUICK_EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => onReact(emoji)}
                className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">{emoji}</button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onReply}
        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Ответить">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>
      {canPin && (
        <button onClick={onPin}
          className={`p-1.5 rounded-full transition-colors ${isPinned ? 'text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-violet-500'}`}
          title={isPinned ? 'Открепить' : 'Закрепить'}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z" />
          </svg>
        </button>
      )}
      {isOwn && canEdit && (
        <button onClick={onEdit}
          className="p-1.5 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/30 text-gray-400 hover:text-sky-500 transition-colors" title="Редактировать">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {isOwn && (
        <button onClick={onDelete}
          className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors" title="Удалить">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </>
  );
}

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
  isPinned?: boolean;
  canPin?: boolean;
  highlightQuery?: string;
}

const DELETED_EMAIL_RE = /^deleted_\d+_\d+@crm\.deleted$/;
const TG_SENDER_RE = /^\*\*(.+?):\*\* ?([\s\S]*)$/;

/* ─── Readers tooltip ─── */
function ReaderAvatar({ reader, size = 'sm' }: { reader: Reader; size?: 'sm' | 'xs' }) {
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

export default function ChatMessage({ message, isOwn, showAvatar, isRead, readers = [], onReply, onScrollToReply, onReact, onDelete, onEdit, onPin, isPinned, canPin, highlightQuery }: ChatMessageProps) {
  const addToast = useToastStore((s) => s.addToast);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const isVoice = message.messageType === 'voice';
  const displaySenderName = resolveDisplayName(message.senderName);
  const isSenderDeleted = !message.senderName || DELETED_EMAIL_RE.test(message.senderName);

  // Detect TG-imported message: has tg_meta attachment or **Sender:** prefix
  const tgMeta = (message.attachments as any[] ?? []).find((a: any) => a.type === 'tg_meta');
  const tgParsed = !tgMeta ? parseTgMessage(message.text) : null;
  const isTgMessage = !!tgMeta || !!tgParsed;
  const tgSender: string = tgMeta?.from || tgParsed?.sender || '';
  const tgBody: string | undefined = tgParsed?.body ?? (tgMeta ? message.text : undefined);
  const displayText = isTgMessage ? tgBody : message.text;

  const mediaItems: MediaItem[] = (message.attachments ?? [])
    .filter((a) => a.mimeType?.startsWith('image/') || a.mimeType?.startsWith('video/'))
    .map((a) => ({
      url: a.fileUrl,
      type: a.mimeType?.startsWith('video/') ? 'video' : 'image',
      name: a.fileName,
    }));

  const mediaAtts = (message.attachments ?? []).filter(
    (a) => a.mimeType?.startsWith('image/') || a.mimeType?.startsWith('video/')
  );
  const nonMediaAtts = (message.attachments ?? []).filter(
    (a: any) => !a.mimeType?.startsWith('image/') && !a.mimeType?.startsWith('video/') && a.type !== 'tg_meta'
  );
  const hasAlbum = mediaAtts.length >= 2;
  const albumCornerClass = isOwn ? 'rounded-tl-2xl rounded-tr-sm' : 'rounded-tl-sm rounded-tr-2xl';

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name?: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [msgSnapParticles, setMsgSnapParticles] = useState<{ id: number; tx: number; ty: number; size: number; hue: number; delay: number }[]>([]);

  const openViewer = useCallback((mediaIndex: number) => setViewerIndex(mediaIndex), []);
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  // Long press to show actions on touch devices
  const handleTouchStart = useCallback(() => {
    touchMoved.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) setShowMobileActions(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleDeleteWithSnap = useCallback(() => {
    if (isDeleting) return;
    const pts = Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 30 + Math.random() * 50;
      return {
        id: i,
        tx: Math.cos(angle) * dist + (Math.random() - 0.5) * 30,
        ty: Math.sin(angle) * dist + (Math.random() - 0.5) * 30 - 20,
        size: 2 + Math.random() * 5,
        hue: 260 + Math.random() * 80,
        delay: Math.random() * 150,
      };
    });
    setMsgSnapParticles(pts);
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(message);
      setConfirmDelete(false);
    }, 600);
  }, [isDeleting, onDelete, message]);

  const handleEditStart = useCallback(() => {
    if (onEdit) setEditingMessage(message);
  }, [message, onEdit, setEditingMessage]);

  // Close emoji picker and mobile actions on outside click/tap
  useEffect(() => {
    if (!showEmojiPicker && !showMobileActions) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      // Don't close if the touch/click is inside the mobile overlay menu
      if (mobileMenuRef.current?.contains(e.target as Node)) return;
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      setShowMobileActions(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showEmojiPicker, showMobileActions]);

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

  return (
    <div
      data-message-id={message.id}
      className={`flex gap-2 group select-none ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : 'mt-0.5'} ${isPinned ? 'ring-1 ring-violet-300 dark:ring-violet-700 rounded-2xl' : ''}`}
      style={{ transition: 'opacity 0.5s ease-out, transform 0.5s ease-out', opacity: isDeleting ? 0 : 1, transform: isDeleting ? 'scale(0.7)' : 'scale(1)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Avatar placeholder / real avatar */}
      <div className="w-8 shrink-0">
        {showAvatar && !isOwn && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold relative overflow-hidden ${isSenderDeleted ? 'bg-gray-400 dark:bg-gray-600' : 'bg-sky-500'}`}>
            {isSenderDeleted ? (
              <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              getInitials(displaySenderName)
            )}
            {!isSenderDeleted && message.senderAvatarUrl && (
              <img
                src={message.senderAvatarUrl}
                alt=""
                className="absolute inset-0 w-full h-full rounded-full object-cover z-10"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] min-w-[80px] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showAvatar && !isOwn && (
          <p className={`text-xs font-medium mb-0.5 ml-1 ${isSenderDeleted ? 'text-gray-400 dark:text-gray-600 italic' : 'text-gray-500 dark:text-gray-400'}`}>
            {displaySenderName}
          </p>
        )}

        {/* Reply preview */}
        {message.replyToMessage && (
          <div
            onClick={onScrollToReply}
            className={`text-xs px-2 py-1 mb-0.5 rounded-t-lg border-l-2 max-w-full ${
              isOwn
                ? 'bg-violet-400/20 border-violet-300 dark:bg-violet-500/20 dark:border-violet-400'
                : 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500'
            } ${onScrollToReply ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-all' : ''}`}
          >
            <p className="font-medium text-gray-600 dark:text-gray-300 truncate">
              {message.replyToMessage.senderName}
            </p>
            <p className="text-gray-500 dark:text-gray-400 truncate">{message.replyToMessage.text}</p>
          </div>
        )}

        <div
          className={`relative rounded-2xl px-3 py-2 w-full ${
            isOwn
              ? 'bg-violet-500 text-white rounded-tr-sm'
              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-xs rounded-tl-sm'
          }`}
        >
          {/* Thanos snap particles */}
          {msgSnapParticles.map((p) => (
            <div key={p.id}
              className="absolute top-1/2 left-1/2 rounded-full pointer-events-none z-10"
              style={{
                width: p.size, height: p.size,
                background: `hsl(${p.hue}, 65%, 60%)`,
                '--tx': `${p.tx}px`, '--ty': `${p.ty}px`,
                animation: 'thanos-particle 0.5s ease-out forwards',
                animationDelay: `${p.delay}ms`,
              } as React.CSSProperties}
            />
          ))}

          {/* Voice message — custom player */}
          {isVoice && message.attachments && message.attachments.length > 0 ? (
            <VoicePlayer src={message.attachments[0].fileUrl} isOwn={isOwn} />
          ) : (
            <>
              {/* Media album — full-width at top (Telegram style), rendered before text */}
              {hasAlbum && (
                <div className={`overflow-hidden -mx-3 -mt-2 mb-2 ${albumCornerClass}`}>
                  <MediaAlbum items={mediaAtts} mediaItems={mediaItems} onOpen={openViewer} />
                </div>
              )}

              {/* TG sender badge */}
              {isTgMessage && tgSender && (
                <div className={`flex items-center gap-1 mb-1 text-xs font-medium ${isOwn ? 'text-white/80' : 'text-sky-500 dark:text-sky-400'}`}>
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.012 9.482c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.875.739z"/>
                  </svg>
                  {tgSender}
                </div>
              )}

              {/* Text (caption if album, otherwise regular message text) */}
              {displayText && renderText(displayText, isOwn, highlightQuery)}

              {/* Single image */}
              {!hasAlbum && mediaAtts.length === 1 && mediaAtts[0].mimeType?.startsWith('image/') && (() => {
                const att = mediaAtts[0];
                const mediaIndex = mediaItems.findIndex((m) => m.url === att.fileUrl);
                return (
                  <div key={att.id} className="relative group/img mt-1">
                    <img src={att.fileUrl} alt={att.fileName}
                      className="max-w-full max-h-60 rounded-lg object-cover block cursor-zoom-in"
                      onClick={() => openViewer(mediaIndex)}
                      onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }}
                    />
                    <div className={`hidden items-center gap-2 p-2 rounded-lg text-sm ${isOwn ? 'bg-violet-400/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <FileIcon mimeType={att.mimeType} /><span className="truncate text-sm">{att.fileName}</span>
                    </div>
                    <a href={att.fileUrl} download={att.fileName} target="_blank" rel="noopener noreferrer"
                      className="absolute bottom-1.5 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 rounded-full p-1"
                      onClick={(e) => e.stopPropagation()}>
                      <DownloadIcon />
                    </a>
                  </div>
                );
              })()}

              {/* Single video */}
              {!hasAlbum && mediaAtts.length === 1 && mediaAtts[0].mimeType?.startsWith('video/') && (() => {
                const att = mediaAtts[0];
                const mediaIndex = mediaItems.findIndex((m) => m.url === att.fileUrl);
                return (
                  <div key={att.id} className="relative group/vid mt-1">
                    <div className="relative cursor-pointer rounded-lg overflow-hidden" onClick={() => openViewer(mediaIndex)}>
                      <VideoThumbnail src={att.fileUrl} className="max-w-full max-h-52 rounded-lg block" />
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
              })()}

              {/* Audio and document files */}
              {nonMediaAtts.length > 0 && (
                <div className="mt-1 space-y-1">
                  {nonMediaAtts.map((att, index) => {
                    const isAudio = att.mimeType?.startsWith('audio/');
                    if (isAudio) {
                      return (
                        <div key={att.id ?? index} className={`flex flex-col gap-1 p-2 rounded-lg ${isOwn ? 'bg-violet-400/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileIcon mimeType={att.mimeType} />
                              <span className="truncate text-sm font-medium">{att.fileName}</span>
                            </div>
                            <a href={att.fileUrl} download={att.fileName} target="_blank" rel="noopener noreferrer"
                              className={`shrink-0 p-1 rounded-full hover:bg-black/10 ${isOwn ? 'text-violet-200' : 'text-gray-500'}`}>
                              <DownloadIcon />
                            </a>
                          </div>
                          <audio src={att.fileUrl} controls className="w-full h-8" />
                        </div>
                      );
                    }
                    return (
                      <div key={att.id ?? index}
                        onClick={() => setPreviewFile({ url: att.fileUrl, name: att.fileName })}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                          isOwn ? 'bg-violet-400/30 hover:bg-violet-400/40' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}>
                        <FileIcon mimeType={att.mimeType} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">{att.fileName}</p>
                          <p className={`text-xs ${isOwn ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
                            {getFileExt(att.fileName)} · {formatSize(att.fileSize)}
                          </p>
                        </div>
                        <a href={att.fileUrl} download={att.fileName} target="_blank" rel="noopener noreferrer"
                          className={`shrink-0 p-1.5 rounded-full transition-colors ${isOwn ? 'text-violet-200 hover:bg-violet-400/30' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                          onClick={(e) => e.stopPropagation()}>
                          <DownloadIcon />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Time + edited + read checkmark + readers */}
          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {message.isEdited && (
              <span className={`text-[10px] ${isOwn ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
                ред.
              </span>
            )}
            <span className={`text-[10px] ${isOwn ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <div className="flex items-center gap-1">
                {/* Reader avatars (group chat) */}
                {readers.length > 0 && (
                  <ReadersTooltip readers={readers} />
                )}
                {/* Checkmark */}
                <span className={`text-[10px] leading-none ${isRead ? 'text-sky-300' : 'text-violet-200'}`}>
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

          {/* Action buttons — desktop: hover side panel; mobile: long-press inline toolbar */}
          {/* Desktop hover */}
          <div className={`absolute ${isOwn ? '-left-28' : '-right-28'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center gap-0.5`}>
            <ActionButtons
              isOwn={isOwn} isPinned={isPinned} canPin={canPin}
              emojiRef={emojiRef} showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
              onReply={onReply} onPin={onPin ? () => onPin(message) : undefined} onDelete={() => setConfirmDelete(true)}
              onEdit={onEdit ? handleEditStart : undefined} canEdit={!!onEdit && !!message.text}
              onReact={(emoji: string) => { onReact(message.id, emoji); setShowEmojiPicker(false); }}
            />
          </div>
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(message.id, r.emoji)}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-full border border-transparent hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
              >
                {r.emoji} <span className="text-gray-600 dark:text-gray-300">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="mt-1 flex items-center gap-2 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5">
            <span className="text-red-600 dark:text-red-400">Удалить сообщение?</span>
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

      {/* Mobile long-press context menu — Telegram style (portal) */}
      {showMobileActions && typeof document !== 'undefined' && createPortal(
        <div
          ref={mobileMenuRef}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-5 gap-3"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onClick={() => setShowMobileActions(false)}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Emoji reaction pill */}
          <div
            className="relative z-10 bg-gray-900/90 rounded-full px-2 py-1.5 flex items-center gap-0.5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact(message.id, emoji); setShowMobileActions(false); }}
                className="text-2xl p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message preview bubble */}
          <div
            className={`relative z-10 w-full flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-lg ${
              isOwn
                ? 'bg-violet-500 text-white rounded-tr-sm'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm'
            }`}>
              {message.text && (
                <p className="text-sm whitespace-pre-wrap break-words line-clamp-4">{message.text}</p>
              )}
              {!message.text && message.attachments && message.attachments.length > 0 && (
                <p className={`text-sm ${isOwn ? 'text-violet-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  📎 {message.attachments[0].fileName}
                </p>
              )}
              <div className={`text-[10px] mt-0.5 ${isOwn ? 'text-right text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {formatTime(message.createdAt)}
              </div>
            </div>
          </div>

          {/* Actions card */}
          <div
            className="relative z-10 w-full max-w-sm bg-gray-900/95 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Reply */}
            <button
              onClick={() => { onReply(); setShowMobileActions(false); }}
              className="w-full flex items-center justify-between px-5 py-3.5 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
            >
              <span className="text-[15px]">Ответить</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>

            {/* Copy */}
            {message.text && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(message.text!).then(() => {
                    addToast('success', 'Сообщение скопировано');
                  }).catch(() => {});
                  setShowMobileActions(false);
                }}
                className="w-full flex items-center justify-between px-5 py-3.5 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
              >
                <span className="text-[15px]">Скопировать</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}

            {/* Edit (own text messages only) */}
            {isOwn && message.text && onEdit && (
              <button
                onClick={() => { handleEditStart(); setShowMobileActions(false); }}
                className="w-full flex items-center justify-between px-5 py-3.5 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
              >
                <span className="text-[15px]">Редактировать</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {/* Pin / Unpin */}
            {canPin && (
              <button
                onClick={() => { onPin?.(message); setShowMobileActions(false); }}
                className="w-full flex items-center justify-between px-5 py-3.5 text-white hover:bg-white/10 active:bg-white/15 transition-colors border-b border-white/10"
              >
                <span className="text-[15px]">{isPinned ? 'Открепить' : 'Закрепить'}</span>
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z" />
                </svg>
              </button>
            )}

            {/* Delete (own messages only) */}
            {isOwn && (
              <button
                onClick={() => { setConfirmDelete(true); setShowMobileActions(false); }}
                className="w-full flex items-center justify-between px-5 py-3.5 text-red-400 hover:bg-white/10 active:bg-white/15 transition-colors"
              >
                <span className="text-[15px]">Удалить</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Media viewer portal */}
      {viewerIndex !== null && mediaItems.length > 0 && (
        <MediaViewer
          items={mediaItems}
          initialIndex={viewerIndex}
          onClose={closeViewer}
        />
      )}

      {/* File preview portal */}
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
  const st = TASK_STATUS_LABELS[status];
  const pr = TASK_PRIORITY_LABELS[priority];
  const due = fmtDate(dueDate);

  return (
    <Link
      href={`/dashboard/tasks?edit=${id}`}
      onClick={(e) => e.stopPropagation()}
      className={`mt-1.5 flex flex-col gap-1.5 rounded-xl p-2.5 border transition-colors no-underline ${
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

function renderInlineBold(text: string, isOwn: boolean, highlightQuery?: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const boldRe = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = boldRe.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={last}>{highlightSegment(text.slice(last, m.index), highlightQuery, isOwn)}</span>);
    parts.push(<strong key={m.index} className="font-semibold">{m[1]}</strong>);
    last = boldRe.lastIndex;
  }
  if (last < text.length) parts.push(<span key={last}>{highlightSegment(text.slice(last), highlightQuery, isOwn)}</span>);
  return parts;
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
            onClick={(e) => e.stopPropagation()}
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
        <p className="text-sm whitespace-pre-wrap break-words">{textSegments}</p>
      )}
      {cards}
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
    const isVid = item.mimeType?.startsWith('video/');
    const idx = getIdx(item);
    const showOverflow = overflowCount != null && overflowCount > 0;
    return (
      <div key={key} className={`relative overflow-hidden cursor-pointer ${className}`} onClick={() => onOpen(idx)}>
        {isVid
          ? <VideoThumbnail src={item.fileUrl} className="w-full h-full object-cover" />
          : <img src={item.fileUrl} alt={item.fileName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
}

function VoicePlayer({ src, isOwn }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const handleBarClick = (index: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = (index / WAVEFORM.length) * duration;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const displayTime = isPlaying ? currentTime : duration;

  return (
    <div className="flex items-center gap-2.5 py-0.5" style={{ minWidth: 200 }}>
      <audio ref={audioRef} src={src} preload="metadata" />

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
            const ratio = (e.clientX - rect.left) / rect.width;
            const audio = audioRef.current;
            if (audio && duration) audio.currentTime = ratio * duration;
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
        <span className={`text-[10px] tabular-nums ${isOwn ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
          {formatAudioDuration(displayTime)}
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
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
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
