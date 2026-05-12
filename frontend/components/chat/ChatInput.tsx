'use client';

import { useState, useRef, useCallback, KeyboardEvent, useEffect, useMemo } from 'react';
import { useChatStore, UploadedAttachment } from '@/stores/chatStore';
import api from '@/lib/api';

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
  onFilesSent?: (attachments: UploadedAttachment[]) => void;
}

interface PendingFile {
  file: File;
  id: string;
  progress: number;
  compressed: boolean;
}

const DRAFT_KEY = (channelId: number) => `chat-draft-${channelId}`;

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
      if (node.tagName === 'DIV' || node.tagName === 'P') {
        const inner = [...node.childNodes].map(process).join('');
        return node.previousSibling ? '\n' + inner : inner;
      }
      return [...node.childNodes].map(process).join('');
    }
    return '';
  };
  return [...el.childNodes].map(process).join('');
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

export default function ChatInput({ channelId, projectId, onFilesSent }: ChatInputProps) {
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY(channelId)) ?? ''; } catch { return ''; }
  });
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const [isDraft, setIsDraft] = useState(() => {
    try { return !!localStorage.getItem(DRAFT_KEY(channelId)); } catch { return false; }
  });

  const [tasks, setTasks] = useState<{ id: number; title: string; status: number; priority: number; dueDate: string }[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskQuery, setTaskQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);


  const [members, setMembers] = useState<{ id: number; name: string; avatarUrl?: string }[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [atMentionStart, setAtMentionStart] = useState(-1);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const startTyping = useChatStore((s) => s.startTyping);
  const stopTyping = useChatStore((s) => s.stopTyping);
  const replyToMessage = useChatStore((s) => s.replyToMessage);
  const setReplyToMessage = useChatStore((s) => s.setReplyToMessage);
  const editingMessage = useChatStore((s) => s.editingMessage);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);

  // Restore draft when switching channels
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY(channelId)) ?? '';
      setText(saved);
      setIsDraft(!!saved);
      renderMarkdownInEditor(el, saved);
      if (saved) {
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
        if (text) localStorage.setItem(DRAFT_KEY(channelId), text);
        else localStorage.removeItem(DRAFT_KEY(channelId));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [text, channelId]);

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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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

  const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024;
  const CHUNK_SIZE   = 4 * 1024 * 1024;

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

  const handleSend = useCallback(async () => {
    const el = editorRef.current;
    const raw = el ? serializeEditor(el) : text;
    const trimmed = raw.trim();

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
      try {
        uploadedAttachments = await Promise.all(pendingFiles.map((pf) => uploadFileWithProgress(pf)));
      } catch {
        setUploadError('Не удалось загрузить файл. Попробуйте ещё раз.');
        setIsSending(false);
        return;
      }
    }

    sendMessage(channelId, trimmed, uploadedAttachments.length > 0 ? uploadedAttachments : undefined, replyToMessage?.id);

    if (uploadedAttachments.length > 0) onFilesSent?.(uploadedAttachments);

    clearEditor();
    setPendingFiles([]);
    xhrMapRef.current.clear();
    stopTyping(channelId);
    setIsSending(false);
  }, [text, channelId, pendingFiles, sendMessage, editMessage, editingMessage, setEditingMessage, clearEditor, stopTyping, replyToMessage, uploadFileWithProgress, onFilesSent]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [insertUserMention, insertTaskMention, handleSend]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const md = serializeEditor(el);
    setText(md);
    if (isDraft) setIsDraft(false);
    startTyping(channelId);
    detectMention();
  }, [isDraft, channelId, startTyping, detectMention]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
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
  }, []);

  const handleFileSelect = () => fileInputRef.current?.click();
  const handleCameraSelect = () => cameraInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const oversized = Array.from(files).find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setUploadError(`Файл "${oversized.name}" превышает максимальный размер 1 ГБ.`);
      e.target.value = '';
      return;
    }
    setUploadError(null);
    const newPending: PendingFile[] = Array.from(files).map((file) => ({
      file, id: `${file.name}-${Date.now()}-${Math.random()}`, progress: 0,
      compressed: file.type.startsWith('image/'),
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
    e.target.value = '';
  };

  const toggleCompression = (id: string) =>
    setPendingFiles((prev) => prev.map((f) => (f.id === id ? { ...f, compressed: !f.compressed } : f)));

  const removeFile = (id: string) => {
    xhrMapRef.current.get(id)?.forEach((xhr) => xhr.abort());
    xhrMapRef.current.delete(id);
    setPendingFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (next.length === 0) setIsSending(false);
      return next;
    });
  };

  // ── Voice recording ──────────────────────────────────────

  const sendVoiceMessage = useCallback(async (audioFile: File) => {
    setIsSending(true);
    try {
      const uploadId = crypto.randomUUID();
      let token = '';
      try { token = localStorage.getItem('accessToken') ?? ''; } catch { /* ignore */ }
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: {
          'x-upload-id': uploadId, 'x-chunk-index': '0', 'x-chunk-total': '1',
          'x-file-name': encodeURIComponent(audioFile.name), 'x-file-size': String(audioFile.size),
          'x-file-type': audioFile.type || 'audio/webm', 'Content-Type': 'application/octet-stream',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: audioFile,
      });
      if (res.ok) {
        const attachment: UploadedAttachment = await res.json();
        if (attachment.fileUrl) sendMessage(channelId, '', [attachment], replyToMessage?.id, 'voice');
      }
    } catch { /* discard */ } finally { setIsSending(false); }
  }, [channelId, sendMessage, replyToMessage]);

  const startRecording = useCallback(async () => {
    if (isRecording || mediaRecorderRef.current?.state === 'recording') return;
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      cancelledRef.current = false;
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (cancelledRef.current) return;
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await sendVoiceMessage(new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mimeType }));
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch { /* permission denied */ }
  }, [sendVoiceMessage]);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    cancelledRef.current = false;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    cancelledRef.current = true;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const canSend = (text.trim().length > 0 || pendingFiles.length > 0) && !isSending;

  return (
    <div className="relative border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
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
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">↑↓ выбор · Enter вставить · Esc закрыть</p>
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
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">↑↓ выбор · Enter вставить · Esc закрыть</p>
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
      {isDraft && text && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span className="text-xs text-amber-500 dark:text-amber-400">Черновик восстановлен</span>
        </div>
      )}

      {/* Edit banner */}
      {editingMessage && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-2 border-sky-500">
          <svg className="w-4 h-4 shrink-0 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sky-500">Редактирование</p>
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
        <div className="flex flex-col gap-2 mb-2">
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
                          </svg>Фото</>
                        ) : (
                          <><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>Файл</>
                        )}
                      </button>
                      <span className="text-[10px] text-gray-400">{pf.compressed ? '· сожмётся' : '· без изменений'}</span>
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
                  className="shrink-0 p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors" title="Удалить файл">
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
        <div className="flex items-center gap-3">
          <button onClick={cancelRecording}
            className="shrink-0 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Отменить">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <RecordingWaveform />
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300 shrink-0 tabular-nums">{formatDuration(recordingTime)}</span>
          </div>
          <button onClick={stopRecording} disabled={isSending}
            className="shrink-0 p-2 text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 rounded-xl transition-colors" title="Остановить и отправить">
            {isSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {/* Left: Attach dropdown */}
          <div className="relative shrink-0" ref={attachMenuRef}>
            <button
              onClick={() => setShowAttachMenu((v) => !v)}
              disabled={isSending}
              className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${showAttachMenu ? 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
              title="Прикрепить файл"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
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
              data-placeholder={projectId ? 'Сообщение... (# задача, @ упоминание)' : 'Сообщение'}
              className={`w-full py-2 pl-3 pr-9 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none overflow-y-auto min-h-[38px] max-h-[120px] break-words leading-relaxed ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {/* Emoji button inside the input */}
            <div className="absolute right-1.5 bottom-1 z-10" ref={emojiPickerRef}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowEmojiPicker((v) => !v)}
                disabled={isSending}
                className="p-1 text-gray-400 hover:text-yellow-500 transition-colors disabled:opacity-50 rounded"
                title="Смайлики"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 right-0 z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
                  <div className="flex border-b border-gray-100 dark:border-gray-700">
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                      <button key={cat.label} onClick={() => setActiveCategory(idx)}
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${activeCategory === idx
                          ? 'text-violet-600 border-b-2 border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
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

          {/* Right: Mic → Send depending on content */}
          <button
            onClick={canSend ? handleSend : startRecording}
            disabled={isSending || isRecording}
            title={canSend ? 'Отправить' : 'Записать голосовое'}
            className={`shrink-0 p-2 rounded-xl transition-all duration-150 disabled:opacity-50 ${
              canSend
                ? 'text-white bg-violet-500 hover:bg-violet-600'
                : 'text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20'
            }`}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : canSend ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Animated waveform bars during recording ────────────────
const WAVEFORM_HEIGHTS = [4, 8, 12, 6, 10, 14, 8, 5, 12, 9, 7, 11, 6, 10, 8, 13, 5, 9, 7, 11];

function RecordingWaveform() {
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
