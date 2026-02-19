'use client';

import { useState, useRef, useCallback, KeyboardEvent, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimers = useRef<ReturnType<typeof setInterval>[]>([]);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const startTyping = useChatStore((s) => s.startTyping);
  const stopTyping = useChatStore((s) => s.stopTyping);
  const replyToMessage = useChatStore((s) => s.replyToMessage);
  const setReplyToMessage = useChatStore((s) => s.setReplyToMessage);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      progressTimers.current.forEach(clearInterval);
    };
  }, []);

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

    // Animate progress for all pending files
    const intervals = pendingFiles.map((pf) => animateProgress(pf.id));

    // Small delay to show progress animation
    if (pendingFiles.length > 0) {
      await new Promise((r) => setTimeout(r, 800));
    }

    // Complete progress
    intervals.forEach(clearInterval);
    progressTimers.current = progressTimers.current.filter((t) => !intervals.includes(t));

    setPendingFiles((prev) => prev.map((f) => ({ ...f, progress: 100 })));

    sendMessage(
      channelId,
      trimmed,
      pendingFiles.length > 0 ? pendingFiles.map((pf) => pf.file) : undefined,
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
              {/* File icon */}
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

              {/* Name + progress */}
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

              {/* Remove */}
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

        {/* Send button */}
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
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
