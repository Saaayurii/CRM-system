'use client';

// Исчезающие медиа (как в Telegram): вложение с ttl у получателя закрыто
// шторкой; по клику открывается и через ttl секунд исчезает навсегда
// (ttl = -1 — «один просмотр»: исчезает после закрытия).
// Факт просмотра хранится в localStorage этого устройства.

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';

const LS_KEY = 'chatExpiredMedia';

function expiredSetLoad(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markExpired(key: string) {
  try {
    const set = expiredSetLoad();
    set.add(key);
    // ограничиваем рост — последние 500 записей
    localStorage.setItem(LS_KEY, JSON.stringify([...set].slice(-500)));
  } catch {
    // ignore
  }
}

export function ttlLabel(ttl: number, t: (s: string) => string): string {
  if (ttl === -1) return t('1 просмотр');
  return `${ttl} ${t('сек')}`;
}

interface SelfDestructMediaProps {
  messageId: number;
  fileUrl: string;
  /** ttl в секундах; -1 — один просмотр */
  ttl: number;
  /** Отправитель видит контент всегда (с пометкой) */
  isOwn: boolean;
  children: React.ReactNode;
}

export default function SelfDestructMedia({ messageId, fileUrl, ttl, isOwn, children }: SelfDestructMediaProps) {
  const t = useT();
  const key = `${messageId}:${fileUrl}`;
  const [expired, setExpired] = useState(() => {
    if (isOwn || typeof window === 'undefined') return false;
    return expiredSetLoad().has(key);
  });
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const expire = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    markExpired(key);
    setRevealed(false);
    setExpired(true);
  };

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    if (ttl > 0) {
      setSecondsLeft(ttl);
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s === null) return s;
          if (s <= 1) { expire(); return null; }
          return s - 1;
        });
      }, 1000);
    }
  };

  // Отправитель: контент виден, только бейдж-пометка
  if (isOwn) {
    return (
      <div className="relative w-fit max-w-full">
        {children}
        <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-medium pointer-events-none">
          <FlameIcon />
          {ttlLabel(ttl, t)}
        </span>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm w-fit">
        <FlameIcon />
        {t('Медиа исчезло')}
      </div>
    );
  }

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={reveal}
        className="mt-1 relative flex flex-col items-center justify-center gap-1.5 w-48 h-36 rounded-lg bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-gray-300/80 dark:hover:bg-gray-600/80 transition-colors"
      >
        <FlameIcon large />
        <span className="text-xs font-medium">{t('Исчезающее медиа')}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {ttl === -1 ? t('Исчезнет после просмотра') : `${t('Исчезнет через')} ${ttl} ${t('сек')}`}
        </span>
      </button>
    );
  }

  return (
    <div className="relative w-fit max-w-full">
      {children}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 pointer-events-none">
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-medium">
          <FlameIcon />
          {ttl === -1 ? t('1 просмотр') : `${secondsLeft ?? ttl} ${t('сек')}`}
        </span>
      </div>
      {ttl === -1 && (
        <button
          type="button"
          onClick={expire}
          className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/55 hover:bg-black/75 text-white text-[10px] font-medium transition-colors"
        >
          {t('Закрыть')}
        </button>
      )}
    </div>
  );
}

function FlameIcon({ large }: { large?: boolean }) {
  return (
    <svg className={large ? 'w-7 h-7' : 'w-3 h-3'} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    </svg>
  );
}
