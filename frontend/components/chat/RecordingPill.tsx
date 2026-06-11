'use client';

import { useState, useRef, useCallback } from 'react';
import { useVoiceRecorderStore } from '@/stores/voiceRecorderStore';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { isSelfChat, getChannelDisplayName } from '@/lib/chat/channelDisplay';
import { useT } from '@/lib/i18n';

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Плавающая плашка записи голосового: появляется, когда запись идёт, а инпут
 * чата с этим каналом не виден (ушли на другую страницу / закрыли мини-чат).
 * Запись продолжается; плашку можно таскать по экрану; отправить/отменить —
 * прямо с неё. Дефолтная позиция — правый нижний угол, не перекрывая плюсик.
 */
export default function RecordingPill() {
  const t = useT();
  const isRecording = useVoiceRecorderStore((s) => s.isRecording);
  const isSending = useVoiceRecorderStore((s) => s.isSending);
  const recordingTime = useVoiceRecorderStore((s) => s.recordingTime);
  const channelId = useVoiceRecorderStore((s) => s.channelId);
  const inlineConsumers = useVoiceRecorderStore((s) => s.inlineConsumers);
  const stopAndSend = useVoiceRecorderStore((s) => s.stopAndSend);
  const cancel = useVoiceRecorderStore((s) => s.cancel);
  const channels = useChatStore((s) => s.channels);
  const user = useAuthStore((s) => s.user);

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    const onMove = (ev: PointerEvent) => {
      setPos({
        x: Math.min(Math.max(8, start.left + ev.clientX - start.x), window.innerWidth - rect.width - 8),
        y: Math.min(Math.max(8, start.top + ev.clientY - start.y), window.innerHeight - rect.height - 8),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  // Плашка нужна только когда записи негде показаться инлайн
  if ((!isRecording && !isSending) || inlineConsumers > 0) return null;

  const channel = channelId != null ? channels.find((c) => c.id === channelId) : null;
  const channelName = channel
    ? (isSelfChat(channel, user?.id) ? 'Избранное' : getChannelDisplayName(channel, user?.id))
    : '';

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: 24, bottom: 168 }; // выше FAB-плюсика (bottom-6) и мини-чата

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      className="fixed z-[90] flex items-center gap-2 pl-3 pr-2 py-2 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-gray-200 dark:border-gray-700 cursor-move select-none touch-none"
      style={style}
    >
      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight tabular-nums">
          {isSending ? 'Отправка…' : fmt(recordingTime)}
        </p>
        {channelName && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[120px] leading-tight">
            {channelName}
          </p>
        )}
      </div>
      <button
        onClick={cancel}
        disabled={isSending}
        className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-40"
        title={t('Отменить запись')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      <button
        onClick={stopAndSend}
        disabled={isSending}
        className="shrink-0 w-8 h-8 flex items-center justify-center text-white bg-violet-500 hover:bg-violet-600 rounded-full transition-colors disabled:opacity-60"
        title={t('Остановить и отправить')}
      >
        {isSending ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        )}
      </button>
    </div>
  );
}
