'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

export interface VideoQuality {
  label: string;
  url: string;
}

interface VideoPlayerProps {
  src: string;
  qualities?: VideoQuality[];
  className?: string;
  style?: React.CSSProperties;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HIDE_CONTROLS_AFTER = 3000;

function buildStreamUrl(src: string): string {
  return src;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({ src, qualities, className, style }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState<string>('auto');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [seeking, setSeeking] = useState(false);

  // Resolve source URL
  const allQualities: VideoQuality[] = qualities?.length
    ? qualities
    : [{ label: 'Auto', url: src }];

  const activeSource = allQualities.find((q) => q.label === quality)?.url ?? src;
  const streamUrl = buildStreamUrl(activeSource);

  // ── Controls visibility ────────────────────────────────────────
  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), HIDE_CONTROLS_AFTER);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    if (playing) scheduleHide();
  }, [playing, scheduleHide]);

  useEffect(() => {
    if (!playing) {
      clearTimeout(hideTimer.current);
      setShowControls(true);
    } else {
      scheduleHide();
    }
    return () => clearTimeout(hideTimer.current);
  }, [playing, scheduleHide]);

  // ── Fullscreen sync ────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Keyboard (Space = play/pause, only when focused) ──────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Video event handlers ───────────────────────────────────────
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBufferedPct((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    }
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setLoading(false);
    v.playbackRate = speed;
  };

  const onEnded = () => setPlaying(false);
  const onWaiting = () => setLoading(true);
  const onCanPlay = () => setLoading(false);
  const onError = () => { setLoading(false); setError(true); };

  // ── Controls ───────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = parseFloat(e.target.value);
    v.volume = vol;
    setVolume(vol);
    if (vol === 0) { v.muted = true; setMuted(true); }
    else { v.muted = false; setMuted(false); }
  };

  const changeSpeed = (s: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  };

  const changeQuality = (q: VideoQuality) => {
    const v = videoRef.current;
    const savedTime = v?.currentTime ?? 0;
    const wasPlaying = !v?.paused;
    setQuality(q.label);
    setShowQualityMenu(false);
    setLoading(true);
    // After re-render, restore position
    setTimeout(() => {
      const vid = videoRef.current;
      if (!vid) return;
      vid.currentTime = savedTime;
      if (wasPlaying) vid.play().catch(() => null);
    }, 300);
  };

  const toggleFullscreen = async () => {
    const c = containerRef.current;
    if (!c) return;
    if (!document.fullscreenElement) {
      await c.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  // ── Progress bar seek ──────────────────────────────────────────
  const seekTo = (clientX: number) => {
    const bar = progressRef.current;
    const v = videoRef.current;
    if (!bar || !v || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const onProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setSeeking(true);
    seekTo(e.clientX);
    const onMove = (ev: MouseEvent) => seekTo(ev.clientX);
    const onUp = () => { setSeeking(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasQualityOptions = allQualities.length > 1;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`relative bg-black rounded-lg overflow-hidden select-none outline-none ${className ?? ''}`}
      style={style}
      onMouseMove={revealControls}
      onMouseEnter={revealControls}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={() => { setShowSpeedMenu(false); setShowQualityMenu(false); }}
    >
      {/* ── Video element ── */}
      <video
        ref={videoRef}
        key={streamUrl}
        src={streamUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onWaiting={onWaiting}
        onCanPlay={onCanPlay}
        onError={onError}
        onEnded={onEnded}
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        playsInline
        preload="metadata"
      />

      {/* ── Loading spinner ── */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-2 text-white/60">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-sm">Не удалось загрузить видео</span>
          </div>
        </div>
      )}

      {/* ── Big play button (paused, no error) ── */}
      {!playing && !loading && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        >
          <div className="w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center hover:bg-black/70 transition-colors">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Controls overlay ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls || seeking ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)', paddingTop: '48px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="px-3 pb-2">
          <div
            ref={progressRef}
            className="relative h-1 bg-white/20 rounded-full cursor-pointer group/bar"
            style={{ height: seeking ? '6px' : undefined }}
            onMouseDown={onProgressMouseDown}
            onMouseEnter={(e) => (e.currentTarget.style.height = '6px')}
            onMouseLeave={(e) => { if (!seeking) e.currentTarget.style.height = '4px'; }}
          >
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full pointer-events-none"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Played */}
            <div
              className="absolute inset-y-0 left-0 bg-violet-500 rounded-full pointer-events-none"
              style={{ width: `${progressPct}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none"
              style={{ left: `${progressPct}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center gap-1 px-3 pb-3">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="p-1.5 text-white hover:text-violet-300 transition-colors"
            title={playing ? 'Пауза' : 'Играть'}
          >
            {playing ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1 group/vol">
            <button
              onClick={toggleMute}
              className="p-1.5 text-white hover:text-violet-300 transition-colors"
              title={muted ? 'Включить звук' : 'Выключить звук'}
            >
              {muted || volume === 0 ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18V19.8c1.13-.28 2.17-.76 3.08-1.4L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : volume < 0.5 ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={muted ? 0 : volume}
              onChange={changeVolume}
              className="w-0 group-hover/vol:w-16 overflow-hidden transition-all duration-200 accent-violet-500 cursor-pointer"
              title="Громкость"
            />
          </div>

          {/* Time */}
          <span className="text-white/75 text-xs tabular-nums ml-1">
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Speed */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSpeedMenu((v) => !v); setShowQualityMenu(false); }}
              className="text-white/80 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors font-medium"
              title="Скорость воспроизведения"
            >
              {speed === 1 ? '1×' : `${speed}×`}
            </button>
            {showSpeedMenu && (
              <div
                className="absolute bottom-full mb-2 right-0 bg-zinc-900/95 border border-white/10 rounded-xl py-1.5 shadow-2xl min-w-[72px] z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1 text-white/40 text-[10px] uppercase tracking-wider">Скорость</div>
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`w-full px-3 py-1.5 text-xs text-left transition-colors hover:bg-white/10 ${s === speed ? 'text-violet-400 font-medium' : 'text-white/80'}`}
                  >
                    {s === 1 ? 'Обычная' : `${s}×`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quality */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowQualityMenu((v) => !v); setShowSpeedMenu(false); }}
              className="text-white/80 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors font-medium flex items-center gap-1"
              title="Качество"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {quality === 'auto' ? 'Auto' : quality}
            </button>
            {showQualityMenu && (
              <div
                className="absolute bottom-full mb-2 right-0 bg-zinc-900/95 border border-white/10 rounded-xl py-1.5 shadow-2xl min-w-[100px] z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1 text-white/40 text-[10px] uppercase tracking-wider">Качество</div>
                {allQualities.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => changeQuality(q)}
                    className={`w-full px-3 py-1.5 text-xs text-left transition-colors hover:bg-white/10 flex items-center justify-between gap-2 ${q.label === quality ? 'text-violet-400 font-medium' : 'text-white/80'}`}
                  >
                    <span>{q.label}</span>
                    {q.label === quality && (
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </button>
                ))}
                {!hasQualityOptions && (
                  <div className="px-3 py-1.5 text-white/40 text-xs">Только Auto</div>
                )}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-white/80 hover:text-white transition-colors"
            title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полный экран'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M15 15v4.5M15 15h4.5M9 15H4.5M9 15v4.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
