// Настройки оформления в стиле Telegram: темы-пресеты, акцентные цвета,
// обои чатов, размер текста, автосмена ночной темы.

import type { CSSProperties } from 'react';

export type ThemeMode = 'classic' | 'day' | 'night' | 'system';
export type NightMode = 'off' | 'system' | 'scheduled';
export type Density = 'comfortable' | 'compact';

/** Тихие часы уведомлений (настраивает каждый пользователь для себя) */
export interface QuietHours {
  enabled: boolean;
  start: string; // 'HH:MM'
  end: string;   // 'HH:MM'
  muteSound: boolean;
  mutePush: boolean;
}
export type AccentId =
  | 'violet'
  | 'blue'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'cyan'
  | 'pink';
/** Цвет исходящих сообщений: 'accent' — следовать акценту приложения */
export type BubbleColorId = 'accent' | AccentId;
export type WallpaperId =
  | 'default'
  | 'classic'
  | 'sky'
  | 'peach'
  | 'lilac'
  | 'mint'
  | 'sunset'
  | 'graphite'
  | 'custom'
  | 'color';

export interface AppearanceSettings {
  /** Тема-пресет: классическая/дневная — светлые, ночная — тёмная, системная — за ОС */
  mode: ThemeMode;
  /** Акцентный цвет всего приложения */
  accent: AccentId;
  /** Свой акцент по цветовому кругу (#RRGGBB) — перекрывает пресет accent */
  customAccent: string | null;
  /** Пользователь выбирал акцент сам (иначе действует фирменный акцент компании) */
  accentSetByUser?: boolean;
  /** Базовый размер текста (px на корневом элементе), 16 — по умолчанию */
  fontSize: number;
  /** Размер текста сообщений в чате (px), 14 — по умолчанию */
  chatFontSize: number;
  /** Сообщения «пузырями» (true) или блоками во всю ширину (false) */
  chatBubbles: boolean;
  /** Цвет исходящих сообщений (пузырей) */
  bubbleColor: BubbleColorId;
  /** Свой цвет сообщений по цветовому кругу (#RRGGBB) — перекрывает bubbleColor */
  customBubbleColor: string | null;
  /** Дополнительные цвета сообщений — вместе с customBubbleColor дают градиент (как в Telegram) */
  customBubbleColors: string[] | null;
  /** Градиент «по всем сообщениям»: один градиент на весь чат, пузыри показывают свой срез */
  bubbleGradientFlow: boolean;
  /** Анимация градиента сообщений — цвета плавно переливаются */
  bubbleGradientAnimate: boolean;
  /** Обои для чатов */
  chatWallpaper: WallpaperId;
  /** URL собственной картинки-обоев (chatWallpaper === 'custom') */
  customWallpaperUrl: string | null;
  /** Свой цвет фона чата (#RRGGBB, chatWallpaper === 'color') */
  customWallpaperColor: string | null;
  /** Полупрозрачный узор-doodle поверх обоев */
  chatPattern: boolean;
  /** Контрастность узора — непрозрачность штрихов, % (14 — как раньше) */
  patternContrast: number;
  /** Контрастность текста, % (0 — стандартная; выше — серый текст ближе к чёрному/белому) */
  textContrast: number;
  /** Цветные имена собеседников в чате */
  nameColors: boolean;
  /** Тема «жидкое стекло» (Liquid Glass, как в iOS): полупрозрачные панели с блюром */
  liquidGlass: boolean;
  /** Плотность интерфейса: компактный режим уменьшает отступы таблиц */
  density: Density;
  /** Раздел, который открывается после входа */
  startPage: string;
  /** Тихие часы уведомлений */
  quietHours: QuietHours;
  /** Автосмена тёмной темы для светлых пресетов */
  nightMode: NightMode;
  nightStart: string; // 'HH:MM'
  nightEnd: string;   // 'HH:MM'
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'classic',
  accent: 'violet',
  customAccent: null,
  fontSize: 16,
  chatFontSize: 14,
  chatBubbles: true,
  bubbleColor: 'accent',
  customBubbleColor: null,
  customBubbleColors: null,
  bubbleGradientFlow: false,
  bubbleGradientAnimate: false,
  chatWallpaper: 'default',
  customWallpaperUrl: null,
  customWallpaperColor: null,
  chatPattern: false,
  patternContrast: 14,
  textContrast: 0,
  nameColors: true,
  liquidGlass: false,
  density: 'comfortable',
  startPage: '/dashboard',
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    muteSound: true,
    mutePush: true,
  },
  nightMode: 'off',
  nightStart: '22:00',
  nightEnd: '07:00',
};

/** Варианты стартовой страницы после входа */
export const START_PAGES: { value: string; name: string }[] = [
  { value: '/dashboard', name: 'Обзор' },
  { value: '/dashboard/projects', name: 'Проекты' },
  { value: '/dashboard/tasks', name: 'Задачи' },
  { value: '/dashboard/chat', name: 'Чат' },
  { value: '/dashboard/calendar', name: 'Календарь' },
  { value: '/dashboard/notes', name: 'Заметки' },
];

export const FONT_SIZE_MIN = 13;
export const FONT_SIZE_MAX = 20;
export const PATTERN_CONTRAST_MIN = 5;
export const PATTERN_CONTRAST_MAX = 60;
export const PATTERN_CONTRAST_DEFAULT = 14;
export const TEXT_CONTRAST_MIN = 0;
export const TEXT_CONTRAST_MAX = 100;
export const CHAT_FONT_SIZE_MIN = 12;
export const CHAT_FONT_SIZE_MAX = 22;
export const CHAT_FONT_SIZE_DEFAULT = 14;

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

/* ── Свой цвет по цветовому кругу (как редактор тем в Telegram) ──────────────
   Из одного выбранного hex генерируется вся палитра оттенков через color-mix:
   светлые шейды — подмес белого, тёмные — чёрного. Значения кладутся
   inline-переменными на <html> и перекрывают пресетные палитры. */

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && HEX_COLOR_RE.test(v);
}

/** Доли подмеса для шейдов акцента: положительное — белый, отрицательное — чёрный */
export const ACCENT_SHADE_MIX: Record<string, number> = {
  '50': 94, '100': 88, '200': 75, '300': 55, '400': 28,
  '500': 0, '600': -12, '700': -26, '800': -40, '900': -52, '950': -66,
};

/** Доли подмеса для шейдов пузырей сообщений */
export const BUBBLE_SHADE_MIX: Record<string, number> = {
  '200': 65, '300': 40, '400': 18, '500': 0, '600': -20,
};

function mixShade(hex: string, mix: number): string {
  if (mix === 0) return hex;
  const into = mix > 0 ? '#ffffff' : '#000000';
  return `color-mix(in srgb, ${hex}, ${into} ${Math.abs(mix)}%)`;
}

/** CSS-переменные --color-violet-* для своего акцента */
export function accentCssVars(hex: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [shade, mix] of Object.entries(ACCENT_SHADE_MIX)) {
    vars[`--color-violet-${shade}`] = mixShade(hex, mix);
  }
  return vars;
}

/** CSS-переменные --color-bubble-* для своего цвета сообщений */
export function bubbleCssVars(hex: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [shade, mix] of Object.entries(BUBBLE_SHADE_MIX)) {
    vars[`--color-bubble-${shade}`] = mixShade(hex, mix);
  }
  return vars;
}

export const ACCENT_VAR_NAMES = Object.keys(ACCENT_SHADE_MIX).map((s) => `--color-violet-${s}`);
export const BUBBLE_VAR_NAMES = Object.keys(BUBBLE_SHADE_MIX).map((s) => `--color-bubble-${s}`);

/** Максимум цветов в градиенте сообщений (как в Telegram) */
export const BUBBLE_GRADIENT_MAX = 4;

/** CSS-градиент для пузырей из 2+ цветов */
export function bubbleGradientCss(colors: string[]): string {
  return `linear-gradient(135deg, ${colors.join(', ')})`;
}

export const WALLPAPERS: {
  id: Exclude<WallpaperId, 'custom' | 'color'>;
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

/** CSS background для пресетных обоев чата с учётом текущей темы */
export function getWallpaperBackground(
  id: WallpaperId,
  theme: 'light' | 'dark',
): string | null {
  const wp = WALLPAPERS.find((w) => w.id === id);
  if (!wp) return null;
  return theme === 'dark' ? wp.dark : wp.light;
}

// Узор-doodle (содержимое public/chat-pattern.svg) с параметризованной
// непрозрачностью штрихов — генерируется как data-URI, чтобы настройка
// «Контрастность узора» работала без отдельного DOM-слоя.
const PATTERN_PATHS =
  '<path d="M20 50 L34 36 L48 50 M25 48 v14 h18 v-14"/>' +
  '<circle cx="120" cy="32" r="8"/>' +
  '<path d="M120 20 v-4 M120 44 v4 M108 32 h-4 M132 32 h4 M111 23 l-3 -3 M129 41 l3 3 M129 23 l3 -3 M111 41 l-3 3"/>' +
  '<path d="M196 30 l14 14 M203 23 l10 10 l-6 6 l-10 -10 z"/>' +
  '<path d="M28 116 h36 v20 h-36 z M28 126 h36 M46 116 v10 M37 126 v10 M55 126 v10"/>' +
  '<path d="M118 106 a8 8 0 1 0 6 13 l18 18 l5 -5 l-18 -18 a8 8 0 0 0 -11 -8"/>' +
  '<path d="M188 130 a16 16 0 0 1 32 0 z M192 124 a12 10 0 0 1 24 0"/>' +
  '<path d="M30 198 l26 -26 M36 192 l3 3 M42 186 l3 3 M48 180 l3 3"/>' +
  '<path d="M108 192 h24 v8 h-24 z M132 196 h8 v-6 M120 200 v12"/>' +
  '<circle cx="208" cy="200" r="7"/>' +
  '<path d="M204 196 l8 8 M204 204 l8 -8"/>' +
  '<path d="M70 78 l2 5 5 1 -4 4 1 5 -4 -3 -5 3 1 -5 -4 -4 5 -1 z"/>' +
  '<path d="M152 74 a6 6 0 0 1 6 -6 a7 7 0 0 1 13 2 a5 5 0 0 1 -1 10 h-13 a5 5 0 0 1 -5 -6"/>';

function patternUrl(opacityPct: number): string {
  const o = Math.min(1, Math.max(0.02, opacityPct / 100));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">` +
    `<g fill="none" stroke="#8a8f98" stroke-opacity="${o}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">` +
    PATTERN_PATHS +
    `</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Полный фон чата: узор (поверх) + обои (пресет-градиент или своя картинка).
 * Для своей картинки в тёмной теме добавляется затемняющий слой.
 * Возвращает null, когда нужен стандартный фон (классы bg-*).
 */
export function getChatBackground(
  a: Pick<AppearanceSettings, 'chatWallpaper' | 'customWallpaperUrl' | 'chatPattern'> & {
    patternContrast?: number;
    customWallpaperColor?: string | null;
  },
  theme: 'light' | 'dark',
): CSSProperties | null {
  type Layer = { image: string; size: string; repeat: string };
  const layers: Layer[] = [];

  if (a.chatPattern) {
    layers.push({
      image: patternUrl(a.patternContrast ?? PATTERN_CONTRAST_DEFAULT),
      size: 'auto',
      repeat: 'repeat',
    });
  }

  if (a.chatWallpaper === 'custom' && a.customWallpaperUrl) {
    if (theme === 'dark') {
      layers.push({
        image: 'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45))',
        size: 'auto',
        repeat: 'no-repeat',
      });
    }
    layers.push({
      image: `url('${a.customWallpaperUrl}')`,
      size: 'cover',
      repeat: 'no-repeat',
    });
  } else if (a.chatWallpaper === 'color' && isHexColor(a.customWallpaperColor)) {
    // Свой цвет фона: лёгкий вертикальный градиент вокруг выбранного тона,
    // чтобы фон не выглядел плоской заливкой (как пресетные обои)
    const c = a.customWallpaperColor;
    layers.push({
      image: `linear-gradient(180deg, color-mix(in srgb, ${c}, #fff 8%) 0%, color-mix(in srgb, ${c}, #000 8%) 100%)`,
      size: 'auto',
      repeat: 'no-repeat',
    });
  } else {
    const gradient = getWallpaperBackground(a.chatWallpaper, theme);
    if (gradient) layers.push({ image: gradient, size: 'auto', repeat: 'no-repeat' });
  }

  if (layers.length === 0) return null;
  return {
    backgroundImage: layers.map((l) => l.image).join(', '),
    backgroundSize: layers.map((l) => l.size).join(', '),
    backgroundRepeat: layers.map((l) => l.repeat).join(', '),
    backgroundPosition: 'center',
  };
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

/** Активны ли тихие часы прямо сейчас */
export function isQuietNow(q: QuietHours, now: Date = new Date()): boolean {
  if (!q.enabled) return false;
  return isNightNow(q.start, q.end, now);
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
