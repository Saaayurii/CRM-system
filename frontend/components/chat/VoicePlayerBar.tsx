'use client';

import { useVoicePlayerStore } from '@/stores/voicePlayerStore';
import { useT } from '@/lib/i18n';

const RATES = [1, 1.5, 2];

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * Полоска плеера голосового вверху чата (как в Telegram). Сам звук играет
 * через глобальный <audio> в voicePlayerStore, поэтому продолжается при
 * навигации; бар виден в полном чате и в мини-чате.
 */
export default function VoicePlayerBar() {
  const t = useT();
  const track = useVoicePlayerStore((s) => s.track);
  const isPlaying = useVoicePlayerStore((s) => s.isPlaying);
  const currentTime = useVoicePlayerStore((s) => s.currentTime);
  const duration = useVoicePlayerStore((s) => s.duration);
  const playbackRate = useVoicePlayerStore((s) => s.playbackRate);
  const toggle = useVoicePlayerStore((s) => s.toggle);
  const seek = useVoicePlayerStore((s) => s.seek);
  const setRate = useVoicePlayerStore((s) => s.setRate);
  const stop = useVoicePlayerStore((s) => s.stop);

  if (!track) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
  };

  const nextRate = () => {
    const idx = RATES.indexOf(playbackRate);
    setRate(RATES[(idx + 1) % RATES.length]);
  };

  return (
    <div className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <button
          onClick={toggle}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-violet-500 hover:bg-violet-600 text-white transition-colors"
          title={isPlaying ? t('Пауза') : t('Воспроизвести')}
        >
          {isPlaying ? (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate leading-tight">
            {track.senderName || 'Голосовое сообщение'}
          </p>
          <p className="text-[10px] text-violet-500 leading-tight tabular-nums">
            {fmt(currentTime)} / {fmt(duration)}
          </p>
        </div>
        <button
          onClick={nextRate}
          className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors tabular-nums"
          title={t('Скорость воспроизведения')}
        >
          {playbackRate}×
        </button>
        <button
          onClick={stop}
          className="shrink-0 p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
          title={t('Остановить')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Прогресс-полоска по нижней кромке */}
      <div className="h-0.5 bg-gray-100 dark:bg-gray-700 cursor-pointer" onClick={handleSeek}>
        <div className="h-full bg-violet-500 transition-[width]" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
