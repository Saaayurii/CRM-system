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
  progress: number; // 0-100
  compressed: boolean; // true = compress image, false = send as original file
}

export default function ChatInput({ channelId, projectId, onFilesSent }: ChatInputProps) {
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const [tasks, setTasks] = useState<{ id: number; title: string; status: number; priority: number; dueDate: string }[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskQuery, setTaskQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const taskPickerRef = useRef<HTMLDivElement>(null);
  const xhrMapRef = useRef<Map<string, XMLHttpRequest[]>>(new Map());
  // Refs to always-current picker state — used inside event handlers to avoid stale closures
  const showTaskPickerRef = useRef(false);
  const filteredTaskMentionsRef = useRef<{ id: number; title: string; status: number; priority: number; dueDate: string }[]>([]);
  const selectedTaskIndexRef = useRef(0);

  // Voice recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const startTyping = useChatStore((s) => s.startTyping);
  const stopTyping = useChatStore((s) => s.stopTyping);
  const replyToMessage = useChatStore((s) => s.replyToMessage);
  const setReplyToMessage = useChatStore((s) => s.setReplyToMessage);

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

  // Load tasks only for project-linked channels
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

  const insertEmoji = useCallback((emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    startTyping(channelId);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
      ta.focus();
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    });
  }, [text, channelId, startTyping]);

  const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB
  const CHUNK_SIZE   = 4 * 1024 * 1024;           // 4 MB per chunk

  // Upload a single file in chunks via XHR to bypass Next.js body-size limits
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
            // Register XHR so it can be aborted on file remove
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
                  // Last chunk returns the final attachment info
                  res(data.fileUrl ? (data as UploadedAttachment) : null);
                } catch {
                  rej(new Error('Invalid response'));
                }
              } else {
                rej(new Error(`Chunk ${chunkIndex} failed: ${xhr.status}`));
              }
            };

            xhr.onerror = () => rej(new Error('Network error'));
            xhr.send(chunk);
          });

        try {
          let result: UploadedAttachment | null = null;
          for (let i = 0; i < chunkTotal; i++) {
            result = await sendChunk(i);
          }
          if (result) resolve(result);
          else reject(new Error('Upload incomplete'));
        } catch (err) {
          reject(err);
        }
      });
    },
    [CHUNK_SIZE]
  );

  const detectMention = useCallback((value: string, cursorPos: number) => {
    if (!projectId) return;
    const textBeforeCursor = value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/#([^\s]*)$/);
    if (match) {
      setMentionStart(cursorPos - match[0].length);
      setTaskQuery(match[1]);
      setShowTaskPicker(true);
      setSelectedTaskIndex(0);
    } else {
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

  // Keep refs in sync so event handlers always see the latest values
  showTaskPickerRef.current = showTaskPicker;
  filteredTaskMentionsRef.current = filteredTaskMentions;
  selectedTaskIndexRef.current = selectedTaskIndex;

  const insertTaskMention = useCallback((task: { id: number; title: string; status: number; priority: number; dueDate: string }) => {
    const ta = textareaRef.current;
    const cursor = ta?.selectionStart ?? text.length;
    const before = text.slice(0, mentionStart) + `#[${task.title}](task:${task.id}|${task.status}|${task.priority}|${task.dueDate}) `;
    const after = text.slice(cursor);
    const newText = before + after;
    setText(newText);
    setShowTaskPicker(false);
    setTaskQuery('');
    setMentionStart(-1);
    requestAnimationFrame(() => {
      if (ta) {
        ta.selectionStart = ta.selectionEnd = before.length;
        ta.focus();
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
      }
    });
  }, [text, mentionStart]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    // Validate file sizes
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
        // Upload files in parallel, each with its own real progress
        uploadedAttachments = await Promise.all(
          pendingFiles.map((pf) => uploadFileWithProgress(pf))
        );
      } catch (err) {
        setUploadError('Не удалось загрузить файл. Попробуйте ещё раз.');
        setIsSending(false);
        return;
      }
    }

    sendMessage(
      channelId,
      trimmed,
      uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      replyToMessage?.id
    );

    if (uploadedAttachments.length > 0) {
      onFilesSent?.(uploadedAttachments);
    }

    setText('');
    setPendingFiles([]);
    xhrMapRef.current.clear();
    stopTyping(channelId);
    setIsSending(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, channelId, pendingFiles, sendMessage, stopTyping, replyToMessage, uploadFileWithProgress]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
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
  }, [insertTaskMention, handleSend]);

  const handleTextChange = (value: string, cursorPos: number) => {
    setText(value);
    startTyping(channelId);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
    detectMention(value, cursorPos);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024;
    const oversized = Array.from(files).find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setUploadError(`Файл "${oversized.name}" превышает максимальный размер 1 ГБ.`);
      e.target.value = '';
      return;
    }

    setUploadError(null);
    const newPending: PendingFile[] = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      progress: 0,
      compressed: file.type.startsWith('image/'),
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
    e.target.value = '';
  };

  const toggleCompression = (id: string) => {
    setPendingFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, compressed: !f.compressed } : f))
    );
  };

  const removeFile = (id: string) => {
    // Abort any in-progress XHR chunks for this file
    xhrMapRef.current.get(id)?.forEach((xhr) => xhr.abort());
    xhrMapRef.current.delete(id);
    setPendingFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      // If no files left, reset sending state
      if (next.length === 0) setIsSending(false);
      return next;
    });
  };

  // ── Voice recording ──────────────────────────────────────

  const sendVoiceMessage = useCallback(async (audioFile: File) => {
    setIsSending(true);
    try {
      const uploadId = crypto.randomUUID();
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: {
          'x-upload-id':   uploadId,
          'x-chunk-index': '0',
          'x-chunk-total': '1',
          'x-file-name':   encodeURIComponent(audioFile.name),
          'x-file-size':   String(audioFile.size),
          'x-file-type':   audioFile.type || 'audio/webm',
          'Content-Type':  'application/octet-stream',
        },
        body: audioFile,
      });
      if (res.ok) {
        const attachment: UploadedAttachment = await res.json();
        if (attachment.fileUrl) {
          sendMessage(channelId, '', [attachment], replyToMessage?.id, 'voice');
        }
      }
    } catch {
      // upload failed — discard silently
    } finally {
      setIsSending(false);
    }
  }, [channelId, sendMessage, replyToMessage]);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      cancelledRef.current = false;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (cancelledRef.current) return; // discard

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mimeType });

        await sendVoiceMessage(audioFile);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      // permission denied or not supported
    }
  }, [sendVoiceMessage]);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    cancelledRef.current = false;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    cancelledRef.current = true;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const canSend = (text.trim().length > 0 || pendingFiles.length > 0) && !isSending;

  return (
    <div className="relative border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
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

      {/* Reply preview */}
      {replyToMessage && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-2 border-violet-500">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-violet-500">{replyToMessage.senderName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{replyToMessage.text}</p>
          </div>
          <button
            onClick={() => setReplyToMessage(null)}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
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
                {/* File type icon / thumbnail */}
                <div className="shrink-0">
                  {isImage ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600">
                      <img
                        src={URL.createObjectURL(pf.file)}
                        alt=""
                        className="w-full h-full object-cover"
                        onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                      />
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

                {/* Name + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{pf.file.name}</p>
                    <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                      {isSending ? `${pf.progress}%` : formatSize(pf.file.size)}
                    </span>
                  </div>

                  {/* Compression toggle — only for images, only before sending */}
                  {isImage && !isSending && (
                    <div className="flex items-center gap-1 mb-1">
                      <button
                        onClick={() => toggleCompression(pf.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                          pf.compressed
                            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                        }`}
                        title={pf.compressed ? 'Отправить как файл (без сжатия)' : 'Отправить как фото (со сжатием)'}
                      >
                        {pf.compressed ? (
                          <>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Фото
                          </>
                        ) : (
                          <>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Файл
                          </>
                        )}
                      </button>
                      <span className="text-[10px] text-gray-400">
                        {pf.compressed ? '· сожмётся' : '· без изменений'}
                      </span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        isDone
                          ? 'bg-green-500'
                          : 'bg-gradient-to-r from-violet-500 to-violet-400'
                      } ${isUploading ? 'animate-pulse' : ''}`}
                      style={{ width: `${pf.progress}%` }}
                    />
                  </div>

                  {/* File size below bar */}
                  {isSending && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatSize(Math.round(pf.file.size * pf.progress / 100))} / {formatSize(pf.file.size)}
                    </p>
                  )}
                </div>

                {/* Remove button — always visible, aborts upload if in progress */}
                <button
                  onClick={() => removeFile(pf.id)}
                  className="shrink-0 p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                  title="Удалить файл"
                >
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
          {/* Cancel */}
          <button
            onClick={cancelRecording}
            className="shrink-0 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Отменить"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Animated recording indicator */}
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <RecordingWaveform />
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300 shrink-0 tabular-nums">
              {formatDuration(recordingTime)}
            </span>
          </div>

          {/* Stop & send */}
          <button
            onClick={stopRecording}
            disabled={isSending}
            className="shrink-0 p-2 text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 rounded-xl transition-colors"
            title="Остановить и отправить"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {/* Attach button */}
          <button
            onClick={handleFileSelect}
            disabled={isSending}
            className="shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Прикрепить файл"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="*/*"
            multiple
            onChange={handleFileChange}
          />

          {/* Emoji picker */}
          <div className="relative shrink-0" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker((v) => !v)}
              disabled={isSending}
              className="shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              title="Смайлики"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <button
                      key={cat.label}
                      onClick={() => setActiveCategory(idx)}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${
                        activeCategory === idx
                          ? 'text-violet-600 border-b-2 border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
                  {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
            onKeyDown={handleKeyDown}
            placeholder={projectId ? 'Написать сообщение... (# для упоминания задачи)' : 'Написать сообщение...'}
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:outline-none max-h-[120px] disabled:opacity-50"
          />

          {/* Mic button — always visible */}
          <button
            onClick={startRecording}
            disabled={isSending}
            className="shrink-0 p-2 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl transition-colors disabled:opacity-50"
            title="Записать голосовое сообщение"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* Send button — always visible */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 p-2 text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            title="Отправить"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
        <div
          key={i}
          className="rounded-full bg-violet-400 animate-pulse"
          style={{
            width: 2,
            height: h,
            animationDelay: `${(i * 80) % 600}ms`,
            animationDuration: `${600 + (i * 37) % 400}ms`,
          }}
        />
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
