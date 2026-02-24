'use client';

import { useState, useRef, useCallback, KeyboardEvent, useEffect } from 'react';
import { useChatStore, UploadedAttachment } from '@/stores/chatStore';

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
}

interface PendingFile {
  file: File;
  id: string;
  progress: number; // 0-100
}

export default function ChatInput({ channelId }: ChatInputProps) {
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const progressTimers = useRef<ReturnType<typeof setInterval>[]>([]);

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
      progressTimers.current.forEach(clearInterval);
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

  const animateProgress = useCallback((fileId: string) => {
    const interval = setInterval(() => {
      setPendingFiles((prev) =>
        prev.map((f) => {
          if (f.id !== fileId) return f;
          const next = Math.min(f.progress + Math.random() * 15 + 5, 95);
          return { ...f, progress: next };
        })
      );
    }, 120);
    progressTimers.current.push(interval);
    return interval;
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && pendingFiles.length === 0) return;

    setIsSending(true);

    let uploadedAttachments: UploadedAttachment[] = [];

    if (pendingFiles.length > 0) {
      const intervals = pendingFiles.map((pf) => animateProgress(pf.id));

      try {
        const formData = new FormData();
        pendingFiles.forEach((pf) => formData.append('files', pf.file));

        const res = await fetch('/api/chat/upload', {
          method: 'POST',
          body: formData,
        });
        const data: UploadedAttachment[] = res.ok ? await res.json() : [];

        uploadedAttachments = Array.isArray(data) ? data : [];
      } catch {
        uploadedAttachments = [];
      }

      intervals.forEach(clearInterval);
      progressTimers.current = progressTimers.current.filter((t) => !intervals.includes(t));
      setPendingFiles((prev) => prev.map((f) => ({ ...f, progress: 100 })));
    }

    sendMessage(
      channelId,
      trimmed,
      uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      replyToMessage?.id
    );

    setText('');
    setPendingFiles([]);
    stopTyping(channelId);
    setIsSending(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, channelId, pendingFiles, sendMessage, stopTyping, replyToMessage, animateProgress]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    startTyping(channelId);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPending: PendingFile[] = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      progress: 0,
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // ── Voice recording ──────────────────────────────────────

  const sendVoiceMessage = useCallback(async (audioFile: File) => {
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('files', audioFile);

      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });
      const data: UploadedAttachment[] = res.ok ? await res.json() : [];
      const attachments = Array.isArray(data) ? data : [];

      if (attachments.length > 0) {
        sendMessage(channelId, '', attachments, replyToMessage?.id, 'voice');
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
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
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
        <div className="flex flex-col gap-1.5 mb-2">
          {pendingFiles.map((pf) => (
            <div key={pf.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <div className="shrink-0">
                {pf.file.type.startsWith('image/') ? (
                  <div className="w-8 h-8 rounded overflow-hidden bg-gray-200 dark:bg-gray-600">
                    <img
                      src={URL.createObjectURL(pf.file)}
                      alt=""
                      className="w-full h-full object-cover"
                      onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                    />
                  </div>
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{pf.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-150"
                      style={{ width: `${pf.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatSize(pf.file.size)}
                  </span>
                </div>
              </div>

              {!isSending && (
                <button
                  onClick={() => removeFile(pf.id)}
                  className="shrink-0 p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
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
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение..."
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
