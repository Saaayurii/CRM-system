'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChatMessage as ChatMessageType } from '@/stores/chatStore';
import MediaViewer, { MediaItem } from './MediaViewer';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
  showAvatar: boolean;
  isRead: boolean;
  onReply: () => void;
}

export default function ChatMessage({ message, isOwn, showAvatar, isRead, onReply }: ChatMessageProps) {
  const isVoice = message.messageType === 'voice';

  // Build list of all media (image + video) attachments for the viewer
  const mediaItems: MediaItem[] = (message.attachments ?? [])
    .filter((a) => a.mimeType?.startsWith('image/') || a.mimeType?.startsWith('video/'))
    .map((a) => ({
      url: a.fileUrl,
      type: a.mimeType?.startsWith('video/') ? 'video' : 'image',
      name: a.fileName,
    }));

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const openViewer = useCallback((mediaIndex: number) => {
    setViewerIndex(mediaIndex);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
  }, []);

  return (
    <div
      className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}
    >
      {/* Avatar placeholder / real avatar */}
      <div className="w-8 shrink-0">
        {showAvatar && !isOwn && (
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-semibold">
            {message.senderAvatarUrl ? (
              <img src={message.senderAvatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(message.senderName)
            )}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] min-w-[80px] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showAvatar && !isOwn && (
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 ml-1">
            {message.senderName}
          </p>
        )}

        {/* Reply preview */}
        {message.replyToMessage && (
          <div
            className={`text-xs px-2 py-1 mb-0.5 rounded-t-lg border-l-2 max-w-full ${
              isOwn
                ? 'bg-violet-400/20 border-violet-300 dark:bg-violet-500/20 dark:border-violet-400'
                : 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500'
            }`}
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
          {/* Voice message — custom player */}
          {isVoice && message.attachments && message.attachments.length > 0 ? (
            <VoicePlayer src={message.attachments[0].fileUrl} isOwn={isOwn} />
          ) : (
            <>
              {/* Text */}
              {message.text && renderText(message.text, isOwn)}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-1 space-y-1">
                  {message.attachments.map((att, index) => {
                    const isImage = att.mimeType?.startsWith('image/');
                    const isVideo = att.mimeType?.startsWith('video/');
                    const isAudio = att.mimeType?.startsWith('audio/');

                    if (isImage) {
                      const mediaIndex = mediaItems.findIndex((m) => m.url === att.fileUrl);
                      return (
                        <div key={att.id ?? index} className="relative group/img">
                          <img
                            src={att.fileUrl}
                            alt={att.fileName}
                            className="max-w-full max-h-60 rounded-lg object-cover block cursor-zoom-in"
                            onClick={() => openViewer(mediaIndex)}
                            onError={(e) => {
                              const el = e.currentTarget;
                              el.style.display = 'none';
                              el.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className={`hidden items-center gap-2 p-2 rounded-lg text-sm ${isOwn ? 'bg-violet-400/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            <FileIcon mimeType={att.mimeType} />
                            <span className="truncate text-sm">{att.fileName}</span>
                          </div>
                          <a
                            href={att.fileUrl}
                            download={att.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-1.5 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 rounded-full p-1"
                            title="Скачать"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DownloadIcon />
                          </a>
                        </div>
                      );
                    }

                    if (isVideo) {
                      const mediaIndex = mediaItems.findIndex((m) => m.url === att.fileUrl);
                      return (
                        <div key={att.id ?? index} className="relative group/vid">
                          {/* Thumbnail overlay — click opens viewer */}
                          <div
                            className="relative cursor-pointer rounded-lg overflow-hidden"
                            onClick={() => openViewer(mediaIndex)}
                          >
                            <VideoThumbnail
                              src={att.fileUrl}
                              className="max-w-full max-h-52 rounded-lg block"
                            />
                            {/* Play button overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover/vid:bg-black/40 transition-colors rounded-lg">
                              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <svg className="w-5 h-5 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <a
                            href={att.fileUrl}
                            download={att.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-1.5 right-1.5 opacity-0 group-hover/vid:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 rounded-full p-1"
                            title="Скачать"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DownloadIcon />
                          </a>
                        </div>
                      );
                    }

                    if (isAudio) {
                      return (
                        <div key={att.id ?? index} className={`flex flex-col gap-1 p-2 rounded-lg ${isOwn ? 'bg-violet-400/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileIcon mimeType={att.mimeType} />
                              <span className="truncate text-sm font-medium">{att.fileName}</span>
                            </div>
                            <a
                              href={att.fileUrl}
                              download={att.fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`shrink-0 p-1 rounded-full hover:bg-black/10 ${isOwn ? 'text-violet-200' : 'text-gray-500'}`}
                              title="Скачать"
                            >
                              <DownloadIcon />
                            </a>
                          </div>
                          <audio src={att.fileUrl} controls className="w-full h-8" />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={att.id ?? index}
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                          isOwn
                            ? 'bg-violet-400/30'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        <FileIcon mimeType={att.mimeType} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">{att.fileName}</p>
                          <p className={`text-xs ${isOwn ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
                            {getFileExt(att.fileName)} · {formatSize(att.fileSize)}
                          </p>
                        </div>
                        <a
                          href={att.fileUrl}
                          download={att.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`shrink-0 p-1.5 rounded-full transition-colors ${
                            isOwn
                              ? 'text-violet-200 hover:bg-violet-400/30'
                              : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title="Скачать"
                        >
                          <DownloadIcon />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Time + edited + read checkmark */}
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
            )}
          </div>

          {/* Reply button (hover) */}
          <button
            onClick={onReply}
            className={`absolute ${isOwn ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700`}
            title="Ответить"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r) => (
              <span
                key={r.emoji}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full"
              >
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media viewer portal */}
      {viewerIndex !== null && mediaItems.length > 0 && (
        <MediaViewer
          items={mediaItems}
          initialIndex={viewerIndex}
          onClose={closeViewer}
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

function renderText(text: string, isOwn: boolean) {
  const textSegments: React.ReactNode[] = [];
  const cards: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;

  while ((match = MENTION_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      textSegments.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
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
    textSegments.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
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
