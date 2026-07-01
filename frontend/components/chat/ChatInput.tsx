'use client';

import { useState, useRef, useCallback, KeyboardEvent, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useChatStore, UploadedAttachment } from '@/stores/chatStore';
import { useVoiceRecorderStore } from '@/stores/voiceRecorderStore';
import { useToastStore } from '@/stores/toastStore';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { readFileDims } from '@/lib/mediaAspect';

const TaskFormModal = dynamic(() => import('@/components/dashboard/TaskFormModal'), { ssr: false });
const PhotoEditor = dynamic(() => import('./PhotoEditor'), { ssr: false });

/* Плавающие «стеклянные» поверхности input-бара (в едином стиле с шапкой чата,
   как в Telegram iOS): полупрозрачное стекло + блюр + тонкая рамка и тень. */
const GLASS_SURFACE =
  'bg-white/72 dark:bg-gray-900/55 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]';

/** Варианты исчезновения медиа (сек; -1 — один просмотр; undefined — не исчезает) */
const TTL_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Не исчезает' },
  { value: -1, label: '1 просмотр' },
  { value: 3, label: '3 сек' },
  { value: 10, label: '10 сек' },
  { value: 30, label: '30 сек' },
];

const SLASH_TASK_RE = /^\/task(?:\s+([\s\S]*))?$/;
// Бот-ввод: распознаём «в инпуте только чип задачи» и триггер #new / #нов*
const SINGLE_CHIP_RE = /^\s*#\[([^\]]+)\]\(task:(\d+)\|(\d+)\|(\d+)\|([^)]*)\)\s*$/;
const NEW_TASK_TRIGGER_RE = /^\s*#(?:new|нов\w*)\s*$/i;

const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024;
const CHUNK_SIZE = 4 * 1024 * 1024;

const HEIC_RE = /\.(heic|heif)$/i;

// HEIC (iPhone) не декодируется в Chromium — конвертируем в JPEG на клиенте
// при прикреплении, чтобы превью работало у всех получателей.
async function normalizeHeic(file: File): Promise<File> {
  if (!HEIC_RE.test(file.name) && !/hei[cf]/i.test(file.type)) return file;
  try {
    const heic2any = (await import('heic2any')).default;
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(out) ? out[0] : out;
    const name = HEIC_RE.test(file.name) ? file.name.replace(HEIC_RE, '.jpg') : `${file.name}.jpg`;
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

const EMOJI_CATEGORIES = [
  {
    label: 'Смайлики',
    emojis: ['😀','😂','🤣','😍','🥰','😊','😎','🤔','😢','😅','😭','😱','🤗','🤩','😤','🙄','😏','😒','🥴','😴','🤐','😬','🤫','🫡','😇'],
  },
  {
    label: 'Жесты',
    emojis: ['👍','👎','👏','🙌','🤝','✌️','🤞','🤜','👋','✋','🖐️','👌','🤌','🤙','💪','🙏','🫶','🤲','👐','🫱'],
  },
  {
    label: 'Сердца',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💘','💝','❤️‍🔥','💔','🩷','🩵','🩶'],
  },
  {
    label: 'Разное',
    emojis: ['🔥','⭐','💯','✅','❌','⚡','🎉','🎊','🚀','💡','🏆','📌','🔔','💬','🤦','🤷','💀','👀','🫠','🫣'],
  },
];

interface ChatInputProps {
  channelId: number;
  projectId?: number;
  channelType?: string;
  onFilesSent?: (attachments: UploadedAttachment[]) => void;
  /** Открыть экран «Отложенная отправка» (по клику на часы в инпуте). */
  onOpenScheduled?: () => void;
}

interface PendingFile {
  file: File;
  id: string;
  progress: number;
  compressed: boolean;
  /** Исчезающее медиа: секунды; -1 — один просмотр; 0/undefined — обычное */
  ttl?: number;
}

const DRAFT_KEY = (channelId: number) => `chat-draft-${channelId}`;
const SHARE_MEDIA_KEY = (channelId: number) => `chat-share-media-${channelId}`;

/** Тип активности для индикатора «отправляет …» по набору вложений */
function activityKindOf(files: PendingFile[]): string {
  if (files.length === 0) return 'file';
  const types = files.map((f) => f.file.type || '');
  if (types.every((t) => t.startsWith('image/'))) return 'photo';
  if (types.every((t) => t.startsWith('video/'))) return 'video';
  if (types.every((t) => t.startsWith('audio/'))) return 'voice';
  return 'file';
}

// ── Pure DOM helpers (no React) ───────────────────────────────────────────

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function createUserChipElement(user: { id: number; name: string }): HTMLSpanElement {
  const chip = document.createElement('span');
  chip.setAttribute('contenteditable', 'false');
  chip.dataset.userId = String(user.id);
  chip.dataset.name = user.name;
  chip.className = 'user-mention-chip';
  chip.textContent = `@${user.name}`;
  return chip;
}

function createChipElement(task: { id: number; title: string; status: number; priority: number; dueDate: string }): HTMLSpanElement {
  const chip = document.createElement('span');
  chip.setAttribute('contenteditable', 'false');
  chip.dataset.taskId = String(task.id);
  chip.dataset.title = task.title;
  chip.dataset.status = String(task.status);
  chip.dataset.priority = String(task.priority);
  chip.dataset.dueDate = task.dueDate || '';
  chip.className = 'task-mention-chip';
  chip.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><span>#${escapeHtml(task.title)}</span>`;
  return chip;
}

function serializeEditor(el: HTMLDivElement): string {
  const process = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node instanceof HTMLElement) {
      if (node.dataset.userId) {
        const { userId, name } = node.dataset;
        return `@[${name}](user:${userId}) `;
      }
      if (node.dataset.taskId) {
        const { taskId, title, status, priority, dueDate } = node.dataset;
        return `#[${title}](task:${taskId}|${status}|${priority}|${dueDate}) `;
      }
      if (node.tagName === 'BR') return '\n';
      // Живое форматирование: стилизованные ноды → markdown-маркеры
      const innerOf = () => [...node.childNodes].map(process).join('');
      if (node.dataset.spoiler) return `||${innerOf()}||`;
      const tag = node.tagName;
      if (tag === 'STRONG' || tag === 'B') return `**${innerOf()}**`;
      if (tag === 'EM' || tag === 'I') return `_${innerOf()}_`;
      if (tag === 'U') return `__${innerOf()}__`;
      if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') return `~~${innerOf()}~~`;
      if (tag === 'CODE') return `\`${innerOf()}\``;
      if (tag === 'A' && node.getAttribute('href')) return `[${innerOf()}](${node.getAttribute('href')})`;
      if (node.tagName === 'DIV' || node.tagName === 'P') {
        const inner = [...node.childNodes].map(process).join('');
        return node.previousSibling ? '\n' + inner : inner;
      }
      return [...node.childNodes].map(process).join('');
    }
    return '';
  };
  // zero-width пробел, которым «выходим» из форматирования; в текст не нужен
  return [...el.childNodes].map(process).join('').replace(/​/g, '');
}

function renderMarkdownInEditor(el: HTMLDivElement, md: string) {
  el.innerHTML = '';
  if (!md) return;
  const combinedRe = /#\[([^\]]+)\]\(task:(\d+)\|(\d+)\|(\d+)\|([^)]*)\)|@\[([^\]]+)\]\(user:(\d+)\)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = combinedRe.exec(md)) !== null) {
    if (m.index > lastIdx) el.appendChild(document.createTextNode(md.slice(lastIdx, m.index)));
    if (m[0].startsWith('#')) {
      el.appendChild(createChipElement({ id: Number(m[2]), title: m[1], status: Number(m[3]), priority: Number(m[4]), dueDate: m[5] }));
    } else {
      el.appendChild(createUserChipElement({ id: Number(m[7]), name: m[6] }));
    }
    el.appendChild(document.createTextNode(' '));
    lastIdx = combinedRe.lastIndex;
  }
  if (lastIdx < md.length) el.appendChild(document.createTextNode(md.slice(lastIdx)));
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ChatInput({ channelId, projectId, channelType, onFilesSent, onOpenScheduled }: ChatInputProps) {
  const t = useT();
  const isDirect = channelType === 'direct';

  const [text, setText] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY(channelId)) ?? ''; } catch { return ''; }
  });

  // Per-channel toggle: whether attachments from this direct chat appear in /dashboard/media.
  // Defaults to true (shared). Persisted to localStorage.
  const [shareMedia, setShareMedia] = useState<boolean>(() => {
    if (!isDirect) return true;
    try {
      const v = localStorage.getItem(SHARE_MEDIA_KEY(channelId));
      return v === null ? true : v === '1';
    } catch { return true; }
  });

  useEffect(() => {
    if (!isDirect) { setShareMedia(true); return; }
    try {
      const v = localStorage.getItem(SHARE_MEDIA_KEY(channelId));
      setShareMedia(v === null ? true : v === '1');
    } catch { setShareMedia(true); }
  }, [channelId, isDirect]);

  const toggleShareMedia = useCallback(() => {
    if (!isDirect) return;
    setShareMedia((prev) => {
      const next = !prev;
      try { localStorage.setItem(SHARE_MEDIA_KEY(channelId), next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, [channelId, isDirect]);

  const decorateAttachments = useCallback(
    (atts: UploadedAttachment[]): UploadedAttachment[] => {
      if (!isDirect || shareMedia) return atts;
      return atts.map((a) => ({ ...a, excludeFromMedia: true }));
    },
    [isDirect, shareMedia],
  );
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const [isDraft, setIsDraft] = useState(() => {
    try { return !!localStorage.getItem(DRAFT_KEY(channelId))?.trim(); } catch { return false; }
  });

  const [tasks, setTasks] = useState<{ id: number; title: string; status: number; priority: number; dueDate: string }[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskQuery, setTaskQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);

  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
  const [taskCreateInitialTitle, setTaskCreateInitialTitle] = useState('');

  // ── Бот-визард (#задача → меню → подзадача/комментарий; #new → меню → создать задачу) ──
  type WizardTaskRef = { taskId: number; taskTitle: string; status: number; priority: number; dueDate: string };
  type Wizard =
    | ({ kind: 'action-menu' } & WizardTaskRef)
    | { kind: 'new-menu' }
    | ({ kind: 'subtask' } & WizardTaskRef)
    | ({ kind: 'comment' } & WizardTaskRef);
  const [wizard, setWizard] = useState<Wizard | null>(null);
  const [wizardMenuIdx, setWizardMenuIdx] = useState(0);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const wizardRef = useRef<Wizard | null>(null);
  wizardRef.current = wizard;
  const wizardMenuIdxRef = useRef(0);
  wizardMenuIdxRef.current = wizardMenuIdx;
  const addToast = useToastStore((s) => s.addToast);


  const [members, setMembers] = useState<{ id: number; name: string; avatarUrl?: string }[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [atMentionStart, setAtMentionStart] = useState(-1);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  // Голосовая запись живёт в глобальном сторе (переживает навигацию);
  // инпут показывает её UI только для своего канала.
  const recorderChannelId = useVoiceRecorderStore((s) => s.channelId);
  const recorderIsRecording = useVoiceRecorderStore((s) => s.isRecording);
  const recorderIsSending = useVoiceRecorderStore((s) => s.isSending);
  const recordingTime = useVoiceRecorderStore((s) => s.recordingTime);
  const startVoiceRecording = useVoiceRecorderStore((s) => s.start);
  const stopVoiceAndSend = useVoiceRecorderStore((s) => s.stopAndSend);
  const cancelVoiceRecording = useVoiceRecorderStore((s) => s.cancel);
  const registerInline = useVoiceRecorderStore((s) => s.registerInline);
  const unregisterInline = useVoiceRecorderStore((s) => s.unregisterInline);
  const isRecording = recorderIsRecording && recorderChannelId === channelId;

  // Пока этот инпут показывает запись своего канала — плавающая плашка не нужна
  useEffect(() => {
    if (!isRecording) return;
    registerInline();
    return () => unregisterInline();
  }, [isRecording, registerInline, unregisterInline]);

  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordingTime, setVideoRecordingTime] = useState(0);
  const [showCancelVideoConfirm, setShowCancelVideoConfirm] = useState(false);
  const [recordMode, setRecordMode] = useState<'voice' | 'video'>('voice');
  const [showRecordTooltip, setShowRecordTooltip] = useState(false);
  // The record hint should appear only once (first visit), not after every message
  const [recordHintSeen, setRecordHintSeen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try { return localStorage.getItem('voiceRecordHintSeen') === '1'; } catch { return false; }
  });
  const markRecordHintSeen = useCallback(() => {
    setShowRecordTooltip(false);
    setRecordHintSeen(true);
    try { localStorage.setItem('voiceRecordHintSeen', '1'); } catch { /* ignore */ }
  }, []);
  // Auto-dismiss the first-visit hint after a few seconds (touch devices rarely fire mouseleave)
  useEffect(() => {
    if (!showRecordTooltip || recordHintSeen) return;
    const t = setTimeout(markRecordHintSeen, 3500);
    return () => clearTimeout(t);
  }, [showRecordTooltip, recordHintSeen, markRecordHintSeen]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const taskPickerRef = useRef<HTMLDivElement>(null);
  const xhrMapRef = useRef<Map<string, XMLHttpRequest[]>>(new Map());

  // Ref to the text node containing the current '#' trigger
  const mentionNodeRef = useRef<Text | null>(null);

  const showTaskPickerRef = useRef(false);
  const filteredTaskMentionsRef = useRef<{ id: number; title: string; status: number; priority: number; dueDate: string }[]>([]);
  const selectedTaskIndexRef = useRef(0);

  const atMentionNodeRef = useRef<Text | null>(null);
  const userPickerRef = useRef<HTMLDivElement>(null);
  const showUserPickerRef = useRef(false);
  const filteredUserMentionsRef = useRef<{ id: number; name: string; avatarUrl?: string }[]>([]);
  const selectedUserIndexRef = useRef(0);

  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoRecordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoCancelledRef = useRef(false);
  const videoRecordingTimeRef = useRef(0);

  // Hold-to-record detection
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const isLockedRef = useRef(false);
  const holdStartYRef = useRef(0);
  const holdRecordModeRef = useRef<'voice' | 'video'>('voice');

  const sendMessage = useChatStore((s) => s.sendMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const startTyping = useChatStore((s) => s.startTyping);
  const stopTyping = useChatStore((s) => s.stopTyping);
  const startActivity = useChatStore((s) => s.startActivity);
  const stopActivity = useChatStore((s) => s.stopActivity);
  const replyToMessage = useChatStore((s) => s.replyToMessage);
  const setReplyToMessage = useChatStore((s) => s.setReplyToMessage);
  const editingMessage = useChatStore((s) => s.editingMessage);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const scheduleMessageStore = useChatStore((s) => s.scheduleMessage);
  const scheduledCount = useChatStore((s) => s.scheduledByChannel[channelId]?.length ?? 0);

  // Меню кнопки отправки («Без звука» / «Позже») + пикер даты
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  // Restore draft when switching channels
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY(channelId)) ?? '';
      const hasContent = !!saved.trim();
      setText(hasContent ? saved : '');
      setIsDraft(hasContent);
      renderMarkdownInEditor(el, hasContent ? saved : '');
      if (hasContent) {
        // Move cursor to end
        requestAnimationFrame(() => {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        });
      }
    } catch { /* ignore */ }
  }, [channelId]);

  // Debounced draft save
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (text.trim()) localStorage.setItem(DRAFT_KEY(channelId), text);
        else localStorage.removeItem(DRAFT_KEY(channelId));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [text, channelId]);

  // Focus editor when reply is set
  useEffect(() => {
    if (replyToMessage) editorRef.current?.focus();
  }, [replyToMessage]);

  // Populate editor when edit mode is activated
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (editingMessage) {
      renderMarkdownInEditor(el, editingMessage.text ?? '');
      setText(editingMessage.text ?? '');
      requestAnimationFrame(() => {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        el.focus();
      });
    }
  }, [editingMessage]);

  // Cleanup timers on unmount. Голосовую запись НЕ трогаем — она глобальная
  // и продолжается после ухода со страницы (плавающая плашка в layout).
  useEffect(() => {
    return () => {
      if (videoRecordingTimerRef.current) clearInterval(videoRecordingTimerRef.current);
      videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Attach camera stream to preview element once recording starts
  useEffect(() => {
    if (!isRecordingVideo) return;
    const video = videoPreviewRef.current;
    const stream = videoStreamRef.current;
    if (video && stream) {
      video.srcObject = stream;
    }
  }, [isRecordingVideo]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  // Close task picker on outside click
  useEffect(() => {
    if (!showTaskPicker) return;
    const handler = (e: MouseEvent) => {
      if (taskPickerRef.current && !taskPickerRef.current.contains(e.target as Node)) {
        setShowTaskPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTaskPicker]);

  // Close user picker on outside click
  useEffect(() => {
    if (!showUserPicker) return;
    const handler = (e: MouseEvent) => {
      if (userPickerRef.current && !userPickerRef.current.contains(e.target as Node)) {
        setShowUserPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserPicker]);

  // Close attach menu on outside click
  useEffect(() => {
    if (!showAttachMenu) return;
    const handler = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAttachMenu]);

  // Закрытие меню форматирования по клику вне
  useEffect(() => {
    if (!showFormatMenu) return;
    const handler = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) {
        setShowFormatMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFormatMenu]);

  const addFilesToPending = useCallback((fileList: File[]) => {
    if (fileList.length === 0) return;
    const oversized = fileList.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setUploadError(`Файл "${oversized.name}" превышает максимальный размер 1 ГБ.`);
      return;
    }
    setUploadError(null);
    void (async () => {
      const normalized = await Promise.all(fileList.map(normalizeHeic));
      const newPending: PendingFile[] = normalized.map((file) => ({
        file, id: `${file.name}-${Date.now()}-${Math.random()}`, progress: 0,
        compressed: file.type.startsWith('image/'),
      }));
      setPendingFiles((prev) => [...prev, ...newPending]);
    })();
  }, [MAX_FILE_SIZE]);

  // Document-level drag-and-drop support
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) setIsDragOver(true);
    };
    const onDragLeave = () => {
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) setIsDragOver(false);
    };
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) addFilesToPending(files);
    };
    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
      dragCounterRef.current = 0;
    };
  }, [addFilesToPending]);

  // Load tasks for project-linked channels
  useEffect(() => {
    if (!projectId) return;
    api.get('/tasks', { params: { limit: 200, projectId } })
      .then((res) => {
        const arr = res.data.tasks || res.data.data || [];
        setTasks(arr.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: Number(t.status ?? 0),
          priority: Number(t.priority ?? 0),
          dueDate: (t.dueDate || t.due_date || '').slice(0, 10),
        })));
      })
      .catch(() => {});
  }, [projectId]);

  // Load channel members for @ mentions
  useEffect(() => {
    api.get(`/chat-channels/${channelId}/members`)
      .then((res) => {
        const arr = res.data?.members || res.data || [];
        setMembers(arr.map((m: any) => {
          const u = m.user || m;
          return {
            id: m.userId || u.id,
            name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '',
            avatarUrl: u.avatarUrl || u.avatar || null,
          };
        }).filter((m: any) => m.name));
      })
      .catch(() => {});
  }, [channelId]);

  const insertEmoji = useCallback((emoji: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(emoji);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      el.appendChild(document.createTextNode(emoji));
    }
    // Sync state
    const md = serializeEditor(el);
    setText(md);
    startTyping(channelId);
    setShowEmojiPicker(false);
  }, [channelId, startTyping]);

  // Оборачивает выделение markdown-маркерами (текст хранится как markdown,
  // рендерится форматированным). Без выделения — вставляет плейсхолдер.
  const applyFormat = useCallback((prefix: string, suffix: string, placeholder = '') => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    const selected = range.toString();
    const node = document.createTextNode(prefix + (selected || placeholder) + suffix);
    range.deleteContents();
    range.insertNode(node);
    const newRange = document.createRange();
    if (selected) {
      newRange.setStartAfter(node);
      newRange.collapse(true);
    } else {
      // каретку — между маркерами (или выделяем плейсхолдер)
      newRange.setStart(node, prefix.length);
      newRange.setEnd(node, prefix.length + placeholder.length);
    }
    sel.removeAllRanges();
    sel.addRange(newRange);
    setText(serializeEditor(el));
    startTyping(channelId);
  }, [channelId, startTyping]);

  // Живое форматирование: оборачивает выделение настоящей стилизованной нодой
  // (видно сразу в поле); serializeEditor превратит её обратно в markdown.
  const wrapInline = useCallback((make: () => HTMLElement, placeholder = '') => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    const selected = range.toString();
    const wrapper = make();
    wrapper.textContent = selected || placeholder;
    range.deleteContents();
    range.insertNode(wrapper);
    // ZWSP после ноды — чтобы при печати можно было «выйти» из форматирования
    const zwsp = document.createTextNode('​');
    wrapper.after(zwsp);
    const r = document.createRange();
    if (selected) { r.setStartAfter(zwsp); r.collapse(true); }
    else { r.selectNodeContents(wrapper); }
    sel.removeAllRanges();
    sel.addRange(r);
    setText(serializeEditor(el));
    startTyping(channelId);
  }, [channelId, startTyping]);

  const mkSpoiler = () => {
    const s = document.createElement('span');
    s.dataset.spoiler = '1';
    s.style.background = 'rgba(128,128,128,0.35)';
    s.style.borderRadius = '3px';
    return s;
  };
  const mkCode = () => {
    const c = document.createElement('code');
    c.style.fontFamily = 'monospace';
    c.style.background = 'rgba(128,128,128,0.18)';
    c.style.borderRadius = '3px';
    c.style.padding = '0 2px';
    return c;
  };

  const applyLink = useCallback(() => {
    const raw = window.prompt(t('Ссылка (URL):'));
    if (!raw) return;
    const url = raw.trim();
    wrapInline(() => {
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.style.textDecoration = 'underline';
      a.style.color = '#3b82f6';
      return a;
    }, t('текст'));
  }, [wrapInline, t]);

  // Цитата: каждую выделенную строку префиксуем «> » (или вставляем «> » на строке)
  const applyQuote = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    const selected = range.toString();
    const quoted = selected
      ? selected.split('\n').map((l) => `> ${l}`).join('\n')
      : '> ';
    const node = document.createTextNode(quoted);
    range.deleteContents();
    range.insertNode(node);
    const r = document.createRange();
    r.setStartAfter(node);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    setText(serializeEditor(el));
  }, []);

  // MAX_FILE_SIZE and CHUNK_SIZE are defined at module level

  const uploadFileWithProgress = useCallback(
    (pf: PendingFile): Promise<UploadedAttachment> => {
      return new Promise(async (resolve, reject) => {
        const file       = pf.file;
        const uploadId   = crypto.randomUUID();
        const chunkTotal = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

        const sendChunk = (chunkIndex: number): Promise<UploadedAttachment | null> =>
          new Promise((res, rej) => {
            const start = chunkIndex * CHUNK_SIZE;
            const end   = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            const xhr = new XMLHttpRequest();
            const xhrList = xhrMapRef.current.get(pf.id) ?? [];
            xhrList.push(xhr);
            xhrMapRef.current.set(pf.id, xhrList);

            xhr.open('POST', '/api/chat/upload');
            xhr.setRequestHeader('x-upload-id',    uploadId);
            xhr.setRequestHeader('x-chunk-index',  String(chunkIndex));
            xhr.setRequestHeader('x-chunk-total',  String(chunkTotal));
            xhr.setRequestHeader('x-file-name',    encodeURIComponent(file.name));
            xhr.setRequestHeader('x-file-size',    String(file.size));
            xhr.setRequestHeader('x-file-type',    file.type || '');
            xhr.setRequestHeader('x-compress',     String(pf.compressed));
            xhr.setRequestHeader('Content-Type',   'application/octet-stream');
            try {
              const token = localStorage.getItem('accessToken');
              if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
            } catch { /* ignore */ }

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const doneBytes = chunkIndex * CHUNK_SIZE;
                const total = Math.min(doneBytes + (e.loaded / e.total) * (end - start), file.size);
                const pct = Math.round((total / file.size) * 100);
                setPendingFiles((prev) =>
                  prev.map((f) => (f.id === pf.id ? { ...f, progress: pct } : f))
                );
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = JSON.parse(xhr.responseText);
                  res(data.fileUrl ? (data as UploadedAttachment) : null);
                } catch { rej(new Error('Invalid response')); }
              } else {
                rej(new Error(`Chunk ${chunkIndex} failed: ${xhr.status}`));
              }
            };

            xhr.onerror = () => rej(new Error('Network error'));
            xhr.send(chunk);
          });

        try {
          let result: UploadedAttachment | null = null;
          for (let i = 0; i < chunkTotal; i++) result = await sendChunk(i);
          if (result) resolve(result);
          else reject(new Error('Upload incomplete'));
        } catch (err) { reject(err); }
      });
    },
    [CHUNK_SIZE]
  );

  const detectMention = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);

    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      setShowTaskPicker(false); setTaskQuery(''); mentionNodeRef.current = null;
      setShowUserPicker(false); setUserQuery(''); atMentionNodeRef.current = null;
      return;
    }

    const textNode = range.startContainer as Text;
    const textBefore = (textNode.textContent ?? '').slice(0, range.startOffset);

    // @ user mention
    const atMatch = textBefore.match(/@([^\s@]*)$/);
    if (atMatch) {
      atMentionNodeRef.current = textNode;
      setAtMentionStart(range.startOffset - atMatch[0].length);
      setUserQuery(atMatch[1]);
      setShowUserPicker(true);
      setSelectedUserIndex(0);
      setShowTaskPicker(false); setTaskQuery(''); mentionNodeRef.current = null;
      return;
    }
    atMentionNodeRef.current = null;
    setShowUserPicker(false);
    setUserQuery('');
    setAtMentionStart(-1);

    // # task mention
    if (!projectId) return;
    const hashMatch = textBefore.match(/#([^\s]*)$/);
    if (hashMatch) {
      mentionNodeRef.current = textNode;
      setMentionStart(range.startOffset - hashMatch[0].length);
      setTaskQuery(hashMatch[1]);
      setShowTaskPicker(true);
      setSelectedTaskIndex(0);
    } else {
      mentionNodeRef.current = null;
      setShowTaskPicker(false);
      setTaskQuery('');
      setMentionStart(-1);
    }
  }, [projectId]);

  const filteredTaskMentions = useMemo(() => {
    if (!taskQuery) return tasks.slice(0, 8);
    const q = taskQuery.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 8);
  }, [tasks, taskQuery]);

  showTaskPickerRef.current = showTaskPicker;
  filteredTaskMentionsRef.current = filteredTaskMentions;
  selectedTaskIndexRef.current = selectedTaskIndex;

  const filteredUserMentions = useMemo(() => {
    if (!userQuery) return members.slice(0, 8);
    const q = userQuery.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [members, userQuery]);

  showUserPickerRef.current = showUserPicker;
  filteredUserMentionsRef.current = filteredUserMentions;
  selectedUserIndexRef.current = selectedUserIndex;

  const insertTaskMention = useCallback((task: { id: number; title: string; status: number; priority: number; dueDate: string }) => {
    const el = editorRef.current;
    if (!el) return;

    const textNode = mentionNodeRef.current;
    const hashOffset = mentionStart;
    const sel = window.getSelection();
    if (!textNode || hashOffset < 0 || !sel?.rangeCount) {
      setShowTaskPicker(false);
      return;
    }

    const cursorOffset = sel.getRangeAt(0).startOffset;

    // Delete '#query' text in the text node
    const deleteRange = document.createRange();
    deleteRange.setStart(textNode, hashOffset);
    deleteRange.setEnd(textNode, Math.min(cursorOffset, textNode.length));
    deleteRange.deleteContents();

    // Insert chip at the deletion point
    const chip = createChipElement(task);
    const insertRange = document.createRange();
    insertRange.setStart(textNode, hashOffset);
    insertRange.collapse(true);
    insertRange.insertNode(chip);

    // Space after chip for cursor placement
    const space = document.createTextNode(' ');
    chip.after(space);

    // Move cursor after space
    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    el.focus();

    // Sync to state
    const newText = serializeEditor(el);
    setText(newText);
    setShowTaskPicker(false);
    setTaskQuery('');
    setMentionStart(-1);
    mentionNodeRef.current = null;
  }, [mentionStart]);

  const insertUserMention = useCallback((user: { id: number; name: string }) => {
    const el = editorRef.current;
    if (!el) return;

    const textNode = atMentionNodeRef.current;
    const atOffset = atMentionStart;
    const sel = window.getSelection();
    if (!textNode || atOffset < 0 || !sel?.rangeCount) {
      setShowUserPicker(false);
      return;
    }

    const cursorOffset = sel.getRangeAt(0).startOffset;

    const deleteRange = document.createRange();
    deleteRange.setStart(textNode, atOffset);
    deleteRange.setEnd(textNode, Math.min(cursorOffset, textNode.length));
    deleteRange.deleteContents();

    const chip = createUserChipElement(user);
    const insertRange = document.createRange();
    insertRange.setStart(textNode, atOffset);
    insertRange.collapse(true);
    insertRange.insertNode(chip);

    const space = document.createTextNode(' ');
    chip.after(space);

    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    el.focus();

    const newText = serializeEditor(el);
    setText(newText);
    setShowUserPicker(false);
    setUserQuery('');
    setAtMentionStart(-1);
    atMentionNodeRef.current = null;
  }, [atMentionStart]);

  const clearEditor = useCallback(() => {
    const el = editorRef.current;
    setText('');
    if (el) el.innerHTML = '';
    try { localStorage.removeItem(DRAFT_KEY(channelId)); } catch { /* ignore */ }
  }, [channelId]);

  const openTaskCreateModal = useCallback((title: string) => {
    setTaskCreateInitialTitle(title);
    setShowTaskCreateModal(true);
  }, []);

  const sendTaskCardMessage = useCallback((created: {
    id: number;
    title: string;
    description?: string | null;
    status: number;
    priority: number;
    dueDate: string | null;
    projectId: number | null;
    assignees: { userId: number; userName?: string }[];
  }) => {
    const cardAttachment = {
      type: 'task_card' as const,
      taskId: created.id,
      title: created.title,
      status: created.status,
      priority: created.priority,
      dueDate: created.dueDate,
      projectId: created.projectId,
      assignees: created.assignees,
    };
    sendMessage(channelId, '', [cardAttachment as unknown as UploadedAttachment], replyToMessage?.id, 'task_card');
    clearEditor();
  }, [channelId, sendMessage, replyToMessage, clearEditor]);

  // ── Wizard handlers ─────────────────────────────────────────────────────
  const closeWizard = useCallback(() => {
    setWizard(null);
    setWizardMenuIdx(0);
    clearEditor();
  }, [clearEditor]);

  const pickWizardAction = useCallback((action: 'subtask' | 'comment') => {
    const w = wizardRef.current;
    if (!w || w.kind !== 'action-menu') return;
    setWizard({ kind: action, taskId: w.taskId, taskTitle: w.taskTitle, status: w.status, priority: w.priority, dueDate: w.dueDate });
    setWizardMenuIdx(0);
    clearEditor();
    requestAnimationFrame(() => editorRef.current?.focus());
  }, [clearEditor]);

  const submitWizardSubtask = useCallback(async (title: string) => {
    const w = wizardRef.current;
    if (!w || w.kind !== 'subtask') return;
    const trimmed = title.trim();
    if (!trimmed) { addToast('error', 'Введите название подзадачи'); return; }
    setWizardSubmitting(true);
    try {
      const res = await api.post('/tasks', {
        title: trimmed,
        projectId: projectId ?? null,
        parentTaskId: w.taskId,
        status: 0,
        priority: 2,
      });
      const created = res.data;
      sendTaskCardMessage({
        id: Number(created.id),
        title: created.title ?? trimmed,
        description: created.description ?? null,
        status: Number(created.status ?? 0),
        priority: Number(created.priority ?? 2),
        dueDate: created.dueDate ?? null,
        projectId: projectId ?? null,
        assignees: [],
      });
      addToast('success', `Подзадача создана к «${w.taskTitle}»`);
      setWizard(null);
      setWizardMenuIdx(0);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join(', ') : (msg || 'Не удалось создать подзадачу'));
    } finally {
      setWizardSubmitting(false);
    }
  }, [projectId, sendTaskCardMessage, addToast]);

  const submitWizardComment = useCallback(async (text: string) => {
    const w = wizardRef.current;
    if (!w || w.kind !== 'comment') return;
    const trimmed = text.trim();
    if (!trimmed) { addToast('error', 'Введите текст комментария'); return; }
    setWizardSubmitting(true);
    try {
      await api.post('/task-comments', { taskId: w.taskId, commentText: trimmed });
      // Сообщение в чат: упоминание задачи + сам комментарий
      const mention = `#[${w.taskTitle}](task:${w.taskId}|${w.status}|${w.priority}|${w.dueDate ?? ''})`;
      sendMessage(channelId, `💬 ${mention} ${trimmed}`, undefined, replyToMessage?.id);
      addToast('success', `Комментарий добавлен к «${w.taskTitle}»`);
      setWizard(null);
      setWizardMenuIdx(0);
      clearEditor();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join(', ') : (msg || 'Не удалось добавить комментарий'));
    } finally {
      setWizardSubmitting(false);
    }
  }, [channelId, sendMessage, replyToMessage, clearEditor, addToast]);

  // Open «#new → Создать задачу» — reuse existing TaskFormModal
  const pickNewMenuCreateTask = useCallback(() => {
    setWizard(null);
    setWizardMenuIdx(0);
    clearEditor();
    setTaskCreateInitialTitle('');
    setShowTaskCreateModal(true);
  }, [clearEditor]);

  const handleSend = useCallback(async (opts?: { silent?: boolean }) => {
    const el = editorRef.current;
    const raw = el ? serializeEditor(el) : text;
    const trimmed = raw.trim();

    // Wizard режим: маршрутизируем submit в нужный обработчик
    const w = wizardRef.current;
    if (w?.kind === 'subtask') { submitWizardSubtask(raw); return; }
    if (w?.kind === 'comment') { submitWizardComment(raw); return; }
    if (w?.kind === 'action-menu') {
      pickWizardAction(wizardMenuIdxRef.current === 0 ? 'subtask' : 'comment');
      return;
    }
    if (w?.kind === 'new-menu') { pickNewMenuCreateTask(); return; }

    // Slash command: /task → open TaskFormModal instead of sending text
    const slashMatch = !editingMessage && projectId ? trimmed.match(SLASH_TASK_RE) : null;
    if (slashMatch) {
      openTaskCreateModal((slashMatch[1] ?? '').trim());
      return;
    }

    // Edit mode
    if (editingMessage) {
      if (!trimmed) return;
      editMessage(editingMessage.id, trimmed);
      setEditingMessage(null);
      clearEditor();
      return;
    }

    if (!trimmed && pendingFiles.length === 0) return;

    const oversized = pendingFiles.find((pf) => pf.file.size > MAX_FILE_SIZE);
    if (oversized) {
      setUploadError(`Файл "${oversized.file.name}" превышает максимальный размер 1 ГБ.`);
      return;
    }

    setIsSending(true);
    setUploadError(null);

    let uploadedAttachments: UploadedAttachment[] = [];

    if (pendingFiles.length > 0) {
      // Сообщаем собеседникам «отправляет фото/видео/файл…» на время загрузки
      stopTyping(channelId);
      startActivity(channelId, activityKindOf(pendingFiles));
      try {
        uploadedAttachments = await Promise.all(pendingFiles.map((pf) => uploadFileWithProgress(pf)));
        // Прокидываем таймер исчезновения + пиксельные размеры (Promise.all
        // сохраняет порядок). Размеры читаем из самого файла, чтобы у получателя
        // бокс резервировался сразу, без прыжка ленты при первой загрузке.
        uploadedAttachments = await Promise.all(
          uploadedAttachments.map(async (att, i) => {
            const pf = pendingFiles[i];
            const ttl = pf?.ttl;
            const dims = pf?.file ? await readFileDims(pf.file).catch(() => null) : null;
            return {
              ...att,
              ...(ttl ? { ttl } : {}),
              ...(dims ? { width: dims.w, height: dims.h } : {}),
            };
          }),
        );
      } catch {
        setUploadError('Не удалось загрузить файл. Попробуйте ещё раз.');
        stopActivity(channelId);
        setIsSending(false);
        return;
      }
      stopActivity(channelId);
    }

    const decorated = decorateAttachments(uploadedAttachments);
    sendMessage(channelId, trimmed, decorated.length > 0 ? decorated : undefined, replyToMessage?.id, undefined, opts?.silent);

    if (decorated.length > 0) onFilesSent?.(decorated);

    clearEditor();
    setPendingFiles([]);
    xhrMapRef.current.clear();
    stopTyping(channelId);
    setIsSending(false);
  }, [text, channelId, pendingFiles, sendMessage, editMessage, editingMessage, setEditingMessage, clearEditor, stopTyping, startActivity, stopActivity, replyToMessage, uploadFileWithProgress, onFilesSent, projectId, openTaskCreateModal, decorateAttachments, pickNewMenuCreateTask, pickWizardAction, submitWizardComment, submitWizardSubtask]);

  // Отложенная отправка: собираем текст + вложения и планируем на дату
  const handleScheduleSend = useCallback(async (scheduledAt: string) => {
    const el = editorRef.current;
    const raw = el ? serializeEditor(el) : text;
    const trimmed = raw.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    setIsSending(true);
    setUploadError(null);
    let uploaded: UploadedAttachment[] = [];
    try {
      if (pendingFiles.length > 0) {
        uploaded = await Promise.all(pendingFiles.map((pf) => uploadFileWithProgress(pf)));
      }
    } catch {
      setUploadError('Не удалось загрузить файл. Попробуйте ещё раз.');
      setIsSending(false);
      return;
    }
    const decorated = decorateAttachments(uploaded);
    const ok = await scheduleMessageStore(channelId, {
      messageText: trimmed,
      attachments: decorated.length > 0 ? decorated : undefined,
      replyToMessageId: replyToMessage?.id,
      scheduledAt,
    });
    if (ok) {
      clearEditor();
      setPendingFiles([]);
      xhrMapRef.current.clear();
      stopTyping(channelId);
    }
    setIsSending(false);
  }, [text, channelId, pendingFiles, scheduleMessageStore, replyToMessage, uploadFileWithProgress, decorateAttachments, clearEditor, stopTyping]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    // Шорткаты форматирования (Ctrl/Cmd + B/I/U)
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); wrapInline(() => document.createElement('strong'), t('текст')); return; }
      if (k === 'i') { e.preventDefault(); wrapInline(() => document.createElement('em'), t('текст')); return; }
      if (k === 'u') { e.preventDefault(); wrapInline(() => document.createElement('u'), t('текст')); return; }
    }
    // ── Wizard режим: Enter → меню / submit подзадачи или комментария ──
    const w = wizardRef.current;
    if (w) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeWizard();
        return;
      }
      // Меню выбора действия — ArrowUp/Down + Enter
      if (w.kind === 'action-menu') {
        const total = 2; // 0 — подзадача, 1 — комментарий
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = Math.min(wizardMenuIdxRef.current + 1, total - 1);
          setWizardMenuIdx(next);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const next = Math.max(wizardMenuIdxRef.current - 1, 0);
          setWizardMenuIdx(next);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          pickWizardAction(wizardMenuIdxRef.current === 0 ? 'subtask' : 'comment');
          return;
        }
        // Любой другой ввод выходит из меню (вернёт к обычному вводу с упоминанием)
      }
      if (w.kind === 'new-menu') {
        if (e.key === 'Enter') {
          e.preventDefault();
          pickNewMenuCreateTask();
          return;
        }
      }
      if (w.kind === 'subtask' || w.kind === 'comment') {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const el = editorRef.current;
          const raw = el ? serializeEditor(el) : text;
          if (w.kind === 'subtask') submitWizardSubtask(raw);
          else submitWizardComment(raw);
          return;
        }
      }
    }

    // User mention picker has priority
    const userPickerOpen = showUserPickerRef.current;
    const userMentions = filteredUserMentionsRef.current;
    const userSelIdx = selectedUserIndexRef.current;
    if (userPickerOpen && userMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(userSelIdx + 1, userMentions.length - 1);
        setSelectedUserIndex(next);
        selectedUserIndexRef.current = next;
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.max(userSelIdx - 1, 0);
        setSelectedUserIndex(next);
        selectedUserIndexRef.current = next;
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertUserMention(userMentions[userSelIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowUserPicker(false);
        showUserPickerRef.current = false;
        return;
      }
    }

    const pickerOpen = showTaskPickerRef.current;
    const mentions = filteredTaskMentionsRef.current;
    const selIdx = selectedTaskIndexRef.current;
    if (pickerOpen && mentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(selIdx + 1, mentions.length - 1);
        setSelectedTaskIndex(next);
        selectedTaskIndexRef.current = next;
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.max(selIdx - 1, 0);
        setSelectedTaskIndex(next);
        selectedTaskIndexRef.current = next;
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertTaskMention(mentions[selIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowTaskPicker(false);
        showTaskPickerRef.current = false;
        return;
      }
    }
    // На сенсорных устройствах Enter переносит строку, а не отправляет —
    // отправка только по кнопке (как в мобильном Telegram). На ПК работает
    // привычно: Enter — отправить, Shift+Enter — перенос.
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)').matches
    ) {
      return; // default contenteditable — вставка переноса строки
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      // ── Триггеры визарда: чип задачи в одиночку / #new ──
      const el = editorRef.current;
      const raw = el ? serializeEditor(el) : text;
      const chipMatch = raw.match(SINGLE_CHIP_RE);
      if (chipMatch) {
        e.preventDefault();
        setWizard({
          kind: 'action-menu',
          taskId: Number(chipMatch[2]),
          taskTitle: chipMatch[1],
          status: Number(chipMatch[3]),
          priority: Number(chipMatch[4]),
          dueDate: chipMatch[5] ?? '',
        });
        setWizardMenuIdx(0);
        return;
      }
      if (projectId && NEW_TASK_TRIGGER_RE.test(raw)) {
        e.preventDefault();
        setWizard({ kind: 'new-menu' });
        setWizardMenuIdx(0);
        return;
      }
      e.preventDefault();
      handleSend();
    }
  }, [insertUserMention, insertTaskMention, handleSend, text, projectId, pickWizardAction, pickNewMenuCreateTask, submitWizardSubtask, submitWizardComment, closeWizard]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const md = serializeEditor(el);
    setText(md);
    if (isDraft) setIsDraft(false);
    startTyping(channelId);
    detectMention();
    // Закрываем меню-действия, если контент инпута уже не подходит под триггер
    const w = wizardRef.current;
    if (w?.kind === 'action-menu' && !SINGLE_CHIP_RE.test(md)) {
      setWizard(null);
      setWizardMenuIdx(0);
    }
    if (w?.kind === 'new-menu' && !NEW_TASK_TRIGGER_RE.test(md)) {
      setWizard(null);
      setWizardMenuIdx(0);
    }
  }, [isDraft, channelId, startTyping, detectMention]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    // Files pasted from OS (Finder drag-copy, etc.)
    const pastedFiles = Array.from(e.clipboardData.files);
    if (pastedFiles.length > 0) {
      e.preventDefault();
      addFilesToPending(pastedFiles);
      return;
    }
    // Clipboard items — catches screenshots and browser-copied images
    const items = Array.from(e.clipboardData.items);
    const fileItems = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean) as File[];
    if (fileItems.length > 0) {
      e.preventDefault();
      addFilesToPending(fileItems);
      return;
    }
    // Plain text paste
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    if (!plain) return;
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(plain);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const el = editorRef.current;
    if (el) {
      const md = serializeEditor(el);
      setText(md);
    }
  }, [addFilesToPending]);

  const handleFileSelect = () => fileInputRef.current?.click();
  const handleCameraSelect = () => cameraInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    addFilesToPending(files);
  };

  const toggleCompression = (id: string) =>
    setPendingFiles((prev) => prev.map((f) => (f.id === id ? { ...f, compressed: !f.compressed } : f)));

  const setFileTtl = (id: string, ttl: number) =>
    setPendingFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ttl: ttl || undefined } : f)));

  // Редактор фото: id ожидающего файла, который сейчас редактируется
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const editingPhoto = pendingFiles.find((f) => f.id === editingPhotoId) ?? null;

  const applyEditedPhoto = (edited: File) => {
    setPendingFiles((prev) =>
      prev.map((f) => (f.id === editingPhotoId ? { ...f, file: edited, compressed: true } : f)),
    );
    setEditingPhotoId(null);
  };

  // «Изменить и отправить» из просмотрщика медиа: ChatMessage кидает событие
  // с файлом — добавляем во вложения и сразу открываем редактор.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { file?: File; channelId?: number } | undefined;
      const file = detail?.file;
      if (!file) return;
      // Инпутов может быть несколько (страница чата + мини-виджет) — берёт свой канал
      if (detail?.channelId != null && detail.channelId !== channelId) return;
      const pf: PendingFile = {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        progress: 0,
        compressed: true,
      };
      setPendingFiles((prev) => [...prev, pf]);
      setEditingPhotoId(pf.id);
    };
    window.addEventListener('chat:edit-and-send', handler);
    return () => window.removeEventListener('chat:edit-and-send', handler);
  }, [channelId]);

  const removeFile = (id: string) => {
    xhrMapRef.current.get(id)?.forEach((xhr) => xhr.abort());
    xhrMapRef.current.delete(id);
    setPendingFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (next.length === 0) setIsSending(false);
      return next;
    });
  };

  // ── Voice recording — глобальный стор (useVoiceRecorderStore) ────────────

  const startRecording = useCallback(() => {
    startVoiceRecording(channelId);
  }, [startVoiceRecording, channelId]);

  const stopRecording = useCallback(() => {
    stopVoiceAndSend();
  }, [stopVoiceAndSend]);

  const cancelRecording = useCallback(() => {
    cancelVoiceRecording();
  }, [cancelVoiceRecording]);

  // ── Video note recording ──────────────────────────────────

  const sendVideoNote = useCallback(async (videoFile: File) => {
    setIsSending(true);
    try {
      const uploadId = crypto.randomUUID();
      let token = '';
      try { token = localStorage.getItem('accessToken') ?? ''; } catch { /* ignore */ }
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: {
          'x-upload-id': uploadId, 'x-chunk-index': '0', 'x-chunk-total': '1',
          'x-file-name': encodeURIComponent(videoFile.name),
          'x-file-size': String(videoFile.size),
          'x-file-type': videoFile.type || 'video/webm',
          'Content-Type': 'application/octet-stream',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: videoFile,
      });
      if (res.ok) {
        const attachment: UploadedAttachment = await res.json();
        if (attachment.fileUrl) {
          const [decorated] = decorateAttachments([attachment]);
          sendMessage(channelId, '', [decorated], replyToMessage?.id, 'video_note');
        }
      }
    } catch { /* discard */ } finally { setIsSending(false); }
  }, [channelId, sendMessage, replyToMessage, decorateAttachments]);

  const startVideoRecording = useCallback(async () => {
    if (isRecordingVideo) return;
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true,
      });
      videoStreamRef.current = stream;
      videoCancelledRef.current = false;
      videoChunksRef.current = [];
      videoRecordingTimeRef.current = 0;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      videoRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        videoStreamRef.current = null;
        if (videoCancelledRef.current) return;
        const mType = recorder.mimeType || 'video/webm';
        const ext = mType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(videoChunksRef.current, { type: mType });
        await sendVideoNote(new File([blob], `video_note-${Date.now()}.${ext}`, { type: mType }));
      };
      recorder.start(100);
      setIsRecordingVideo(true);
      setVideoRecordingTime(0);

      videoRecordingTimerRef.current = setInterval(() => {
        videoRecordingTimeRef.current += 1;
        setVideoRecordingTime(videoRecordingTimeRef.current);
        if (videoRecordingTimeRef.current >= 60) {
          if (videoRecordingTimerRef.current) { clearInterval(videoRecordingTimerRef.current); videoRecordingTimerRef.current = null; }
          videoCancelledRef.current = false;
          recorder.stop();
          setIsRecordingVideo(false);
          videoRecordingTimeRef.current = 0;
          setVideoRecordingTime(0);
        }
      }, 1000);
    } catch { /* permission denied */ }
  }, [isRecordingVideo, sendVideoNote]);

  const stopVideoRecording = useCallback(() => {
    if (videoRecordingTimerRef.current) { clearInterval(videoRecordingTimerRef.current); videoRecordingTimerRef.current = null; }
    videoCancelledRef.current = false;
    videoRecorderRef.current?.stop();
    setIsRecordingVideo(false);
    setVideoRecordingTime(0);
    videoRecordingTimeRef.current = 0;
  }, []);

  const cancelVideoRecording = useCallback(() => {
    if (videoRecordingTimerRef.current) { clearInterval(videoRecordingTimerRef.current); videoRecordingTimerRef.current = null; }
    videoCancelledRef.current = true;
    videoRecorderRef.current?.stop();
    videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    videoStreamRef.current = null;
    setIsRecordingVideo(false);
    setVideoRecordingTime(0);
    videoRecordingTimeRef.current = 0;
    setShowCancelVideoConfirm(false);
  }, []);

  // ── Hold-to-record button handler ───────────────────────────
  const handleRecordBtnMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isHoldingRef.current = false;
    isLockedRef.current = false;
    holdStartYRef.current = e.clientY;
    holdRecordModeRef.current = recordMode;

    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      if (holdRecordModeRef.current === 'voice') {
        startRecording();
      } else {
        startVideoRecording();
      }
    }, 250);

    const cleanup = () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };

    const handleMouseUp = () => {
      if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      if (!isHoldingRef.current) {
        // Quick press = toggle mode
        setRecordMode((m) => m === 'voice' ? 'video' : 'voice');
      } else if (!isLockedRef.current) {
        // Hold release without locking = stop + send
        if (holdRecordModeRef.current === 'voice') stopRecording();
        else stopVideoRecording();
      }
      isHoldingRef.current = false;
      cleanup();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHoldingRef.current || isLockedRef.current) return;
      if (e.clientY - holdStartYRef.current < -40) {
        isLockedRef.current = true; // dragged up → lock recording
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
  }, [recordMode, startRecording, startVideoRecording, stopRecording, stopVideoRecording]);

  // Slash command: /task [title] — only available in project-linked channels (not for ongoing edit)
  const slashTaskMatch = useMemo<RegExpMatchArray | null>(() => {
    if (!projectId || editingMessage) return null;
    return text.match(SLASH_TASK_RE);
  }, [text, projectId, editingMessage]);
  const isTaskSlash = !!slashTaskMatch;
  const taskSlashTitle = (slashTaskMatch?.[1] ?? '').trim();

  const canSend = (text.trim().length > 0 || pendingFiles.length > 0) && !isSending;

  return (
    <div className="relative px-3 pb-3 pt-2">
      {/* Video note recording overlay — Telegram style */}
      {isRecordingVideo && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9998]"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !showCancelVideoConfirm && setShowCancelVideoConfirm(true)}
        >
          {/* Large circle — centered, responsive */}
          <div
            className="absolute"
            style={{
              width: 'min(68vw, 68vh)',
              height: 'min(68vw, 68vh)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -55%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Thin progress arc (cyan, from 12 o'clock clockwise) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 200">
              <circle
                cx="100" cy="100" r="97"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
              />
              <circle
                cx="100" cy="100" r="97"
                fill="none"
                stroke="#29B6F6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 97}`}
                strokeDashoffset={`${2 * Math.PI * 97 * (1 - videoRecordingTime / 60)}`}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            {/* Circular video */}
            <div className="absolute bg-black" style={{ inset: '3%', borderRadius: '50%', overflow: 'hidden' }}>
              <video
                ref={videoPreviewRef}
                muted
                playsInline
                autoPlay
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          </div>

          {/* Timer — bottom left */}
          <div className="absolute bottom-5 left-6 text-white text-sm font-mono tabular-nums select-none pointer-events-none">
            {formatDuration(videoRecordingTime)}
          </div>

          {/* Cancel hint — bottom center */}
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 text-sm select-none pointer-events-none whitespace-nowrap">
            Для отмены нажмите вне поля
          </p>

          {/* Stop & send button — bottom right */}
          <button
            onClick={(e) => { e.stopPropagation(); stopVideoRecording(); }}
            className="absolute bottom-3 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
            </svg>
          </button>

          {/* Cancel confirm dialog */}
          {showCancelVideoConfirm && (
            <div className="absolute inset-0 flex items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gray-900 rounded-2xl p-6 max-w-xs w-full mx-5 text-center shadow-2xl">
                <p className="text-white font-semibold text-base mb-1">{t('Прекратить запись?')}</p>
                <p className="text-gray-300 text-sm mb-5">{t('Вы точно хотите прекратить запись и сбросить записанное сообщение?')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelVideoConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
                  >
                    Нет
                  </button>
                  <button
                    onClick={cancelVideoRecording}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors"
                  >
                    Сброс
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Drag-and-drop overlay (portal) */}
      {isDragOver && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9997] pointer-events-none">
          <div className="absolute inset-3 sm:inset-6 rounded-2xl border-2 border-dashed border-violet-400 dark:border-violet-500 bg-violet-500/10 dark:bg-violet-500/15 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-violet-500/20 dark:bg-violet-500/30 flex items-center justify-center animate-pulse">
              <svg className="w-10 h-10 text-violet-500 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-violet-600 dark:text-violet-400 font-semibold text-xl">{t('Перетащите файлы сюда')}</p>
              <p className="text-violet-500/80 dark:text-violet-400/70 text-sm mt-1">{t('Отпустите для прикрепления к сообщению')}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* User mention picker */}
      {showUserPicker && filteredUserMentions.length > 0 && (
        <div
          ref={userPickerRef}
          className="absolute bottom-full left-0 right-0 z-50 mx-4 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('↑↓ выбор · Enter вставить · Esc закрыть')}</p>
          </div>
          <div className="overflow-y-auto max-h-44">
            {filteredUserMentions.map((user, idx) => (
              <button
                key={user.id}
                onMouseDown={(e) => { e.preventDefault(); insertUserMention(user); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  idx === selectedUserIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="truncate">{user.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task mention picker */}
      {showTaskPicker && filteredTaskMentions.length > 0 && (
        <div
          ref={taskPickerRef}
          className="absolute bottom-full left-0 right-0 z-50 mx-4 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('↑↓ выбор · Enter вставить · Esc закрыть')}</p>
          </div>
          <div className="overflow-y-auto max-h-44">
            {filteredTaskMentions.map((task, idx) => (
              <button
                key={task.id}
                onMouseDown={(e) => { e.preventDefault(); insertTaskMention(task); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  idx === selectedTaskIndex
                    ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="truncate">{task.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-600 dark:text-red-400 flex-1">{uploadError}</p>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Draft indicator */}
      {isDraft && text.trim() && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-xs text-amber-500 dark:text-amber-400">{t('Черновик восстановлен')}</span>
        </div>
      )}

      {/* Edit banner */}
      {editingMessage && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-2 border-sky-500">
          <svg className="w-4 h-4 shrink-0 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sky-500">{t('Редактирование')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{editingMessage.text}</p>
          </div>
          <button
            onClick={() => { setEditingMessage(null); clearEditor(); }}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Bot-wizard: меню действий после Enter на одиноком чипе #задача */}
      {wizard?.kind === 'action-menu' && (
        <div className="mb-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg border-l-2 border-violet-500">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400 truncate">
              Действие с задачей «{wizard.taskTitle}»
            </p>
            <button
              type="button"
              onClick={closeWizard}
              className="shrink-0 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title={t('Отмена (Esc)')}
            >Esc</button>
          </div>
          <div className="flex flex-col gap-1">
            {[
              { label: 'Добавить подзадачу', action: 'subtask' as const, icon: '➕' },
              { label: 'Добавить комментарий', action: 'comment' as const, icon: '💬' },
            ].map((opt, idx) => (
              <button
                key={opt.action}
                type="button"
                onClick={() => pickWizardAction(opt.action)}
                onMouseEnter={() => setWizardMenuIdx(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  wizardMenuIdx === idx
                    ? 'bg-violet-500 text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-violet-100 dark:hover:bg-violet-900/40'
                }`}
              >
                <span>{opt.icon}</span>
                <span className="flex-1">{opt.label}</span>
                {wizardMenuIdx === idx && <span className="text-xs opacity-70">↵</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bot-wizard: меню после #new */}
      {wizard?.kind === 'new-menu' && (
        <div className="mb-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg border-l-2 border-violet-500">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400">{t('Что создать?')}</p>
            <button
              type="button"
              onClick={closeWizard}
              className="shrink-0 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title={t('Отмена (Esc)')}
            >Esc</button>
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={pickNewMenuCreateTask}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left bg-violet-500 text-white"
            >
              <span>➕</span>
              <span className="flex-1">{t('Создать задачу')}</span>
              <span className="text-xs opacity-70">↵</span>
            </button>
          </div>
        </div>
      )}

      {/* Bot-wizard: ввод подзадачи или комментария */}
      {(wizard?.kind === 'subtask' || wizard?.kind === 'comment') && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg border-l-2 border-violet-500">
          <span className="shrink-0 text-base">{wizard.kind === 'subtask' ? '➕' : '💬'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
              {wizard.kind === 'subtask' ? 'Подзадача к задаче' : 'Комментарий к задаче'} «{wizard.taskTitle}»
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {wizardSubmitting ? 'Отправка…' : 'Введите текст и нажмите Enter. Esc — отмена.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeWizard}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title={t('Отмена (Esc)')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Slash command hint: /task */}
      {isTaskSlash && !editingMessage && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg border-l-2 border-violet-500">
          <svg className="w-4 h-4 shrink-0 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400">{t('Создать задачу')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {taskSlashTitle ? `«${taskSlashTitle}» — Enter, чтобы открыть форму` : 'Введите название после /task и нажмите Enter'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openTaskCreateModal(taskSlashTitle)}
            className="shrink-0 px-3 py-1 text-xs font-medium rounded-lg bg-violet-500 hover:bg-violet-600 text-white transition-colors"
          >
            Открыть
          </button>
        </div>
      )}

      {/* Reply preview */}
      {replyToMessage && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-2 border-violet-500">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-violet-500">{replyToMessage.senderName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{replyToMessage.text}</p>
          </div>
          <button onClick={() => setReplyToMessage(null)} className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-col gap-2 mb-2 max-h-64 overflow-y-auto overscroll-contain pr-1">
          {pendingFiles.map((pf) => {
            const isImage = pf.file.type.startsWith('image/');
            const isVideo = pf.file.type.startsWith('video/');
            const isUploading = isSending && pf.progress > 0 && pf.progress < 100;
            const isDone = pf.progress === 100;
            return (
              <div key={pf.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-600/50">
                <div className="shrink-0">
                  {isImage ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600">
                      <img src={URL.createObjectURL(pf.file)} alt="" className="w-full h-full object-cover"
                        onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
                    </div>
                  ) : isVideo ? (
                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.693v6.614a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{pf.file.name}</p>
                    <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                      {isSending ? `${pf.progress}%` : formatSize(pf.file.size)}
                    </span>
                  </div>
                  {isImage && !isSending && (
                    <div className="flex items-center gap-1 mb-1">
                      <button onClick={() => toggleCompression(pf.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                          pf.compressed ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'}`}
                        title={pf.compressed ? 'Отправить как файл (без сжатия)' : 'Отправить как фото (со сжатием)'}>
                        {pf.compressed ? (
                          <><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>{t('Фото')}</>
                        ) : (
                          <><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>{t('Файл')}</>
                        )}
                      </button>
                      <span className="text-[10px] text-gray-400">{pf.compressed ? '· сожмётся' : '· без изменений'}</span>
                      <button
                        onClick={() => setEditingPhotoId(pf.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900/40 dark:hover:text-violet-400 transition-colors"
                        title={t('Редактировать фото: кадр, рисунок, текст')}
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897l12.682-12.68z" />
                        </svg>
                        {t('Изменить')}
                      </button>
                    </div>
                  )}
                  {(isImage || isVideo) && !isSending && (
                    <div className="flex items-center gap-1 mb-1">
                      <svg className={`w-3 h-3 shrink-0 ${pf.ttl ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                      </svg>
                      <select
                        value={pf.ttl ?? 0}
                        onChange={(e) => setFileTtl(pf.id, Number(e.target.value))}
                        title={t('Через какое время после открытия медиа исчезнет у получателя')}
                        className={`text-[10px] font-medium bg-transparent border-0 p-0 pr-4 rounded focus:ring-0 cursor-pointer ${pf.ttl ? 'text-orange-500' : 'text-gray-400 dark:text-gray-400'}`}
                      >
                        {TTL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{t(o.label)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-200 ${isDone ? 'bg-green-500' : 'bg-gradient-to-r from-violet-500 to-violet-400'} ${isUploading ? 'animate-pulse' : ''}`}
                      style={{ width: `${pf.progress}%` }} />
                  </div>
                  {isSending && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatSize(Math.round(pf.file.size * pf.progress / 100))} / {formatSize(pf.file.size)}
                    </p>
                  )}
                </div>
                <button onClick={() => removeFile(pf.id)}
                  className="shrink-0 p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors" title={t('Удалить файл')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Recording UI */}
      {isRecording ? (
        <div className="flex items-center gap-2">
          <button onClick={cancelRecording}
            className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-300 hover:text-red-500 transition-colors ${GLASS_SURFACE}`} title={t('Отменить')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <div className={`flex items-center gap-2 flex-1 rounded-full px-4 py-2 ${GLASS_SURFACE}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <RecordingWaveform />
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300 shrink-0 tabular-nums">{formatDuration(recordingTime)}</span>
          </div>
          <button onClick={stopRecording} disabled={recorderIsSending}
            className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-violet-500 hover:text-violet-600 disabled:opacity-50 transition-colors ${GLASS_SURFACE}`} title={t('Остановить и отправить')}>
            {recorderIsSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {/* Left capsule: скрепка + переключатель медиа — сгруппированы (как в шапке) */}
          <div className="relative shrink-0" ref={attachMenuRef}>
            <div className={`flex items-center h-11 rounded-full overflow-hidden divide-x divide-black/[0.06] dark:divide-white/[0.08] ${GLASS_SURFACE}`}>
              <button
                onClick={() => setShowAttachMenu((v) => !v)}
                disabled={isSending}
                className={`h-full px-3 flex items-center justify-center transition-colors disabled:opacity-50 ${showAttachMenu ? 'text-violet-500' : 'text-gray-500 dark:text-gray-300 hover:text-violet-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                title={t('Прикрепить файл')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              {/* Direct-chat only: видимость медиа из чата в разделе «Медиа» */}
              {isDirect && (
                <button
                  type="button"
                  onClick={toggleShareMedia}
                  disabled={isSending}
                  className={`h-full px-3 flex items-center justify-center transition-colors disabled:opacity-50 ${
                    shareMedia
                      ? 'text-violet-500'
                      : 'text-gray-500 dark:text-gray-300 hover:text-violet-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                  title={shareMedia
                    ? 'Медиа из этого чата видны в разделе «Медиа». Нажмите, чтобы скрыть.'
                    : 'Медиа из этого чата скрыты из раздела «Медиа». Нажмите, чтобы делиться.'}
                >
                  {shareMedia ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            {showAttachMenu && (
              <div className="absolute bottom-full mb-2 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden min-w-[170px]">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { handleFileSelect(); setShowAttachMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                >
                  <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Файл
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { handleCameraSelect(); setShowAttachMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors border-t border-gray-100 dark:border-gray-700"
                >
                  <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Снять фото / видео
                </button>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="*/*" multiple onChange={handleFileChange} />
          <input ref={cameraInputRef} type="file" className="hidden" accept="image/*,video/*" capture="environment" onChange={handleFileChange} />

          {/* Center: input with emoji button inside */}
          <div className="relative flex-1">
            <div
              ref={editorRef}
              contentEditable={!isSending}
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              data-placeholder={
                wizard?.kind === 'subtask'
                  ? 'Название подзадачи…'
                  : wizard?.kind === 'comment'
                    ? 'Текст комментария…'
                    : projectId ? 'Сообщение... (# задача, @ упоминание, #new)' : 'Сообщение'
              }
              className={`w-full py-2.5 pl-4 pr-[5rem] rounded-3xl text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none overflow-y-auto min-h-[44px] max-h-[120px] break-words leading-relaxed ${GLASS_SURFACE} ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {/* Кнопки в нижней зоне input (высота 44px) — форматирование + смайлики */}
            <div className="absolute right-1.5 bottom-0 h-[44px] flex items-center gap-0.5 z-10" ref={emojiPickerRef}>
              {/* Форматирование текста */}
              <div className="relative" ref={formatMenuRef}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setShowFormatMenu((v) => !v); setShowEmojiPicker(false); }}
                  disabled={isSending}
                  className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-violet-500 transition-colors disabled:opacity-50 rounded-full"
                  title={t('Форматирование')}
                >
                  <span className="text-[15px] font-semibold leading-none"><span className="font-bold">A</span><span className="italic text-[11px]">a</span></span>
                </button>
                {showFormatMenu && (
                  <div className="absolute bottom-full mb-2 right-0 z-50 w-44 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl">
                    {[
                      { label: t('Жирный'), run: () => wrapInline(() => document.createElement('strong'), t('текст')), cls: 'font-bold' },
                      { label: t('Курсив'), run: () => wrapInline(() => document.createElement('em'), t('текст')), cls: 'italic' },
                      { label: t('Подчёркнутый'), run: () => wrapInline(() => document.createElement('u'), t('текст')), cls: 'underline' },
                      { label: t('Зачёркнутый'), run: () => wrapInline(() => document.createElement('s'), t('текст')), cls: 'line-through' },
                      { label: t('Спойлер'), run: () => wrapInline(mkSpoiler, t('текст')), cls: '' },
                      { label: t('Моноширинный'), run: () => wrapInline(mkCode, t('код')), cls: 'font-mono' },
                      { label: t('Ссылка'), run: applyLink, cls: '' },
                      { label: t('Цитата'), run: applyQuote, cls: '' },
                      { label: t('Код'), run: () => applyFormat('```\n', '\n```', t('код')), cls: 'font-mono' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { item.run(); setShowFormatMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${item.cls}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setShowEmojiPicker((v) => !v); setShowFormatMenu(false); }}
                disabled={isSending}
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-yellow-500 transition-colors disabled:opacity-50 rounded-full"
                title={t('Смайлики')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 right-0 z-50 w-64 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
                  <div className="flex border-b border-gray-100 dark:border-gray-700">
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                      <button key={cat.label} onClick={() => setActiveCategory(idx)}
                        className={`flex-1 py-2 text-[11px] font-medium transition-colors truncate px-1 ${activeCategory === idx
                          ? 'text-violet-600 border-b-2 border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 p-2 max-h-48 overflow-y-auto">
                    {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                      <button key={emoji} onClick={() => insertEmoji(emoji)}
                        className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Часы «Отложенная отправка» — видны, когда есть запланированные сообщения */}
          {scheduledCount > 0 && onOpenScheduled && (
            <button
              type="button"
              onClick={onOpenScheduled}
              title={t('Отложенная отправка')}
              className={`relative w-9 h-9 flex items-center justify-center rounded-full shrink-0 text-gray-500 dark:text-gray-300 hover:text-violet-500 transition-colors ${GLASS_SURFACE}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-violet-500 rounded-full">
                {scheduledCount > 99 ? '99+' : scheduledCount}
              </span>
            </button>
          )}

          {/* Send / Record button (single, Telegram-style) */}
          <div className="relative shrink-0">
            {/* Tooltip on hover */}
            {showRecordTooltip && !recordHintSeen && !canSend && !isRecording && !isRecordingVideo && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-xl px-3 py-2 text-center pointer-events-none shadow-xl z-50 leading-relaxed">
                {recordMode === 'video'
                  ? 'Удерживайте для записи видео. Нажмите для переключения на голос.'
                  : 'Удерживайте для записи голоса. Нажмите для переключения на видео.'
                }
                <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
              </div>
            )}

            {/* Меню отправки (ПКМ / долгое нажатие по кнопке отправки) */}
            {showSendMenu && canSend && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSendMenu(false)} />
                <div className="absolute bottom-full right-0 mb-2 z-50 w-56 py-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => { setShowSendMenu(false); handleSend({ silent: true }); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9M3 3l18 18" />
                    </svg>
                    {t('Отправить без звука')}
                  </button>
                  <button
                    onClick={() => { setShowSendMenu(false); setShowSchedulePicker(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('Отправить позже')}
                  </button>
                </div>
              </>
            )}
            <button
              onClick={canSend ? () => handleSend() : undefined}
              onContextMenu={canSend ? (e) => { e.preventDefault(); setShowSendMenu((v) => !v); } : undefined}
              onMouseDown={!canSend ? handleRecordBtnMouseDown : undefined}
              onMouseEnter={() => { if (!recordHintSeen) setShowRecordTooltip(true); }}
              onMouseLeave={() => { if (showRecordTooltip) markRecordHintSeen(); }}
              disabled={isSending}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-150 disabled:opacity-50 ${GLASS_SURFACE} ${
                canSend
                  ? 'text-violet-500 hover:text-violet-600'
                  : 'text-gray-500 dark:text-gray-300 hover:text-violet-500'
              }`}
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : canSend ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              ) : recordMode === 'video' ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9a1 1 0 011-1h3a1 1 0 011 1v1.6l2.4-1.2A.5.5 0 0117 9.9v4.2a.5.5 0 01-.72.45L14 13.4V15a1 1 0 01-1 1h-3a1 1 0 01-1-1V9z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Task create modal (opened via /task slash command) */}
      {showTaskCreateModal && projectId && (
        <TaskFormModal
          task={null}
          initialProjectId={projectId}
          initialTitle={taskCreateInitialTitle}
          lockProjectId
          onClose={() => setShowTaskCreateModal(false)}
          onSaved={() => setShowTaskCreateModal(false)}
          onSavedTask={(created) => {
            sendTaskCardMessage(created);
            setShowTaskCreateModal(false);
          }}
        />
      )}

      {/* Редактор фото перед отправкой (кадр, рисунок, текст) */}
      {editingPhoto && (
        <PhotoEditor
          file={editingPhoto.file}
          onCancel={() => setEditingPhotoId(null)}
          onDone={applyEditedPhoto}
        />
      )}

      {/* Пикер даты для отложенной отправки */}
      {showSchedulePicker && (
        <SchedulePickerModal
          onClose={() => setShowSchedulePicker(false)}
          onSchedule={(iso) => { setShowSchedulePicker(false); handleScheduleSend(iso); }}
        />
      )}
    </div>
  );
}

// ── Пикер даты/времени для отложенной отправки ─────────────
function SchedulePickerModal({ onClose, onSchedule }: { onClose: () => void; onSchedule: (iso: string) => void }) {
  const t = useT();
  const pad = (n: number) => String(n).padStart(2, '0');

  // Дата (YYYY-MM-DD) и время (HH:MM) — по умолчанию через час, округлённое до 5 минут
  const [dateVal, setDateVal] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [timeVal, setTimeVal] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [error, setError] = useState<string | null>(null);

  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();

  const dayLabel = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sel = new Date(dateVal + 'T00:00:00');
    const diff = Math.round((sel.getTime() - today.getTime()) / 86_400_000);
    if (diff === 0) return t('сегодня');
    if (diff === 1) return t('завтра');
    return sel.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
  }, [dateVal, t]);

  const confirm = () => {
    const d = new Date(`${dateVal}T${timeVal}:00`);
    if (isNaN(d.getTime())) { setError(t('Некорректная дата')); return; }
    if (d.getTime() - Date.now() < 10_000) { setError(t('Выберите время в будущем')); return; }
    onSchedule(d.toISOString());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#17212b] rounded-2xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="text-base font-semibold text-gray-100">{t('Время отправки')}</h3>
        </div>

        {/* День + время */}
        <div className="flex items-center gap-3 mb-4">
          <label className="relative">
            <span className="px-4 py-2 rounded-lg bg-white/5 text-sm text-gray-100 capitalize cursor-pointer inline-block min-w-[96px] text-center">{dayLabel}</span>
            <input
              type="date"
              value={dateVal}
              min={todayStr}
              onChange={(e) => { setDateVal(e.target.value); setError(null); }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
          <span className="text-sm text-gray-400">{t('в')}</span>
          <input
            type="time"
            value={timeVal}
            onChange={(e) => { setTimeVal(e.target.value); setError(null); }}
            className="px-3 py-2 rounded-lg bg-white/5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-sky-500 [color-scheme:dark]"
          />
        </div>

        {/* Повторять */}
        <div className="flex items-center justify-between py-2 mb-4">
          <span className="text-sm text-gray-300">{t('Повторять')}</span>
          <span className="text-sm text-gray-400">{t('Никогда')}</span>
        </div>

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <button
          onClick={confirm}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 transition-colors"
        >
          {t('Отправить')} {dayLabel} {t('в')} {timeVal}
        </button>
      </div>
    </div>
  );
}

// ── Animated waveform bars during recording ────────────────
const WAVEFORM_HEIGHTS = [4, 8, 12, 6, 10, 14, 8, 5, 12, 9, 7, 11, 6, 10, 8, 13, 5, 9, 7, 11];

function RecordingWaveform() {
  const t = useT();
  return (
    <div className="flex items-center gap-0.5 flex-1 h-6">
      {WAVEFORM_HEIGHTS.map((h, i) => (
        <div key={i} className="rounded-full bg-violet-400 animate-pulse"
          style={{ width: 2, height: h, animationDelay: `${(i * 80) % 600}ms`, animationDuration: `${600 + (i * 37) % 400}ms` }} />
      ))}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
