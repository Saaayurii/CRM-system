// Настройки оформления в стиле Telegram: темы-пресеты, акцентные цвета,
// обои чатов, размер текста, автосмена ночной темы.

export type ThemeMode = 'classic' | 'day' | 'night' | 'system';
export type NightMode = 'off' | 'system' | 'scheduled';
export type AccentId =
  | 'violet'
  | 'blue'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'cyan'
  | 'pink';
export type WallpaperId =
  | 'default'
  | 'classic'
  | 'sky'
  | 'peach'
  | 'lilac'
  | 'mint'
  | 'sunset'
  | 'graphite';

export interface AppearanceSettings {
  /** Тема-пресет: классическая/дневная — светлые, ночная — тёмная, системная — за ОС */
  mode: ThemeMode;
  /** Акцентный цвет всего приложения */
  accent: AccentId;
  /** Базовый размер текста (px на корневом элементе), 16 — по умолчанию */
  fontSize: number;
  /** Сообщения «пузырями» (true) или блоками во всю ширину (false) */
  chatBubbles: boolean;
  /** Обои для чатов */
  chatWallpaper: WallpaperId;
  /** Цветные имена собеседников в чате */
  nameColors: boolean;
  /** Автосмена тёмной темы для светлых пресетов */
  nightMode: NightMode;
  nightStart: string; // 'HH:MM'
  nightEnd: string;   // 'HH:MM'
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'classic',
  accent: 'violet',
  fontSize: 16,
  chatBubbles: true,
  chatWallpaper: 'default',
  nameColors: true,
  nightMode: 'off',
  nightStart: '22:00',
  nightEnd: '07:00',
};

export const FONT_SIZE_MIN = 13;
export const FONT_SIZE_MAX = 20;

export const THEME_PRESETS: { id: ThemeMode; name: string }[] = [
  { id: 'classic', name: 'Классическая' },
  { id: 'day', name: 'Дневная' },
  { id: 'night', name: 'Ночная' },
  { id: 'system', name: 'Системная' },
];

export const ACCENTS: { id: AccentId; name: string; color: string }[] = [
  { id: 'violet', name: 'Фиолетовый', color: '#7c6bc4' },
  { id: 'blue', name: 'Синий', color: '#3b82f6' },
  { id: 'red', name: 'Красный', color: '#ef4444' },
  { id: 'orange', name: 'Оранжевый', color: '#f97316' },
  { id: 'amber', name: 'Жёлтый', color: '#f59e0b' },
  { id: 'green', name: 'Зелёный', color: '#10b981' },
  { id: 'cyan', name: 'Бирюзовый', color: '#06b6d4' },
  { id: 'pink', name: 'Розовый', color: '#ec4899' },
];

export const WALLPAPERS: {
  id: WallpaperId;
  name: string;
  light: string | null;
  dark: string | null;
}[] = [
  { id: 'default', name: 'Стандартные', light: null, dark: null },
  {
    id: 'classic',
    name: 'Классические',
    light: 'linear-gradient(180deg, #dcead0 0%, #cfe3c3 100%)',
    dark: 'linear-gradient(180deg, #11201a 0%, #16281e 100%)',
  },
  {
    id: 'sky',
    name: 'Небо',
    light: 'linear-gradient(180deg, #d8ecf8 0%, #c3def2 100%)',
    dark: 'linear-gradient(180deg, #0d1b2a 0%, #14283c 100%)',
  },
  {
    id: 'peach',
    name: 'Персик',
    light: 'linear-gradient(180deg, #fdeadb 0%, #f9d9c4 100%)',
    dark: 'linear-gradient(180deg, #261812 0%, #2f1e14 100%)',
  },
  {
    id: 'lilac',
    name: 'Сирень',
    light: 'linear-gradient(180deg, #eae1f7 0%, #ddd0f0 100%)',
    dark: 'linear-gradient(180deg, #1d1730 0%, #251c3d 100%)',
  },
  {
    id: 'mint',
    name: 'Мята',
    light: 'linear-gradient(180deg, #dcf2ea 0%, #c8e8db 100%)',
    dark: 'linear-gradient(180deg, #10211c 0%, #152a23 100%)',
  },
  {
    id: 'sunset',
    name: 'Закат',
    light: 'linear-gradient(135deg, #fbd3e0 0%, #d8e1fb 100%)',
    dark: 'linear-gradient(135deg, #2a1530 0%, #13203a 100%)',
  },
  {
    id: 'graphite',
    name: 'Графит',
    light: 'linear-gradient(180deg, #e4e5e9 0%, #d5d7dd 100%)',
    dark: 'linear-gradient(180deg, #15161c 0%, #1c1e25 100%)',
  },
];

/** CSS background для обоев чата с учётом текущей (разрешённой) темы */
export function getWallpaperBackground(
  id: WallpaperId,
  theme: 'light' | 'dark',
): string | null {
  const wp = WALLPAPERS.find((w) => w.id === id);
  if (!wp) return null;
  return theme === 'dark' ? wp.dark : wp.light;
}

/** Количество цветов имён (классы chat-name-c0 … chat-name-c6 в globals.css) */
export const NAME_COLOR_COUNT = 7;

export function nameColorClass(userId?: number | null): string {
  const id = typeof userId === 'number' && userId > 0 ? userId : 0;
  return `chat-name-c${id % NAME_COLOR_COUNT}`;
}

function parseHM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Попадает ли текущее время в ночной интервал (поддерживает переход через полночь) */
export function isNightNow(start: string, end: string, now: Date = new Date()): boolean {
  const s = parseHM(start);
  const e = parseHM(end);
  if (s === null || e === null || s === e) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Разрешает пресет + автосмену ночью в фактическую светлую/тёмную тему */
export function resolveTheme(
  a: AppearanceSettings,
  systemDark: boolean,
): 'light' | 'dark' {
  if (a.mode === 'night') return 'dark';
  if (a.mode === 'system') return systemDark ? 'dark' : 'light';
  // светлые пресеты: проверяем автосмену ночью
  if (a.nightMode === 'system' && systemDark) return 'dark';
  if (a.nightMode === 'scheduled' && isNightNow(a.nightStart, a.nightEnd)) return 'dark';
  return 'light';
}
