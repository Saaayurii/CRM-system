import { create } from 'zustand';

export interface VoiceTrack {
  /** Уникальный ключ источника (url) — по нему сообщение понимает «это играю я» */
  src: string;
  senderName: string;
  channelId?: number;
  messageId?: number;
}

/**
 * Глобальный плеер голосовых: единый <audio> живёт вне React-дерева, поэтому
 * воспроизведение продолжается при навигации между страницами. UI — бар
 * вверху чата (VoicePlayerBar) и кнопки в пузырях сообщений (VoicePlayer).
 */
interface VoicePlayerState {
  track: VoiceTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  play: (track: VoiceTrack) => void;
  toggle: () => void;
  seek: (time: number) => void;
  setRate: (rate: number) => void;
  stop: () => void;
}

let audioEl: HTMLAudioElement | null = null;

function getAudio(set: (p: Partial<VoicePlayerState>) => void): HTMLAudioElement {
  if (audioEl) return audioEl;
  audioEl = new Audio();
  audioEl.preload = 'metadata';
  audioEl.addEventListener('timeupdate', () => set({ currentTime: audioEl!.currentTime }));
  audioEl.addEventListener('durationchange', () => {
    if (isFinite(audioEl!.duration)) set({ duration: audioEl!.duration });
  });
  audioEl.addEventListener('play', () => set({ isPlaying: true }));
  audioEl.addEventListener('pause', () => set({ isPlaying: false }));
  audioEl.addEventListener('ended', () => set({ isPlaying: false, currentTime: 0, track: null }));
  return audioEl;
}

export const useVoicePlayerStore = create<VoicePlayerState>((set, get) => ({
  track: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,

  play: (track) => {
    const audio = getAudio(set);
    const current = get().track;
    if (current?.src === track.src) {
      // Тот же трек — просто продолжить
      audio.play().catch(() => {});
      return;
    }
    audio.src = track.src;
    audio.playbackRate = get().playbackRate;
    set({ track, currentTime: 0, duration: 0 });
    audio.play().catch(() => {});
  },

  toggle: () => {
    const audio = getAudio(set);
    if (!get().track) return;
    if (get().isPlaying) audio.pause();
    else audio.play().catch(() => {});
  },

  seek: (time) => {
    const audio = getAudio(set);
    audio.currentTime = time;
    set({ currentTime: time });
  },

  setRate: (rate) => {
    const audio = getAudio(set);
    audio.playbackRate = rate;
    set({ playbackRate: rate });
  },

  stop: () => {
    const audio = getAudio(set);
    audio.pause();
    audio.src = '';
    set({ track: null, isPlaying: false, currentTime: 0, duration: 0 });
  },
}));
