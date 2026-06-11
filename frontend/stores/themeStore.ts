import { create } from 'zustand';
import api from '@/lib/api';
import {
  AppearanceSettings,
  DEFAULT_APPEARANCE,
  ThemeMode,
  resolveTheme,
  systemPrefersDark,
} from '@/lib/appearance';

const LS_KEY = 'appearance';
const LS_LAST_LIGHT = 'appearance:lastLight';

// Последний полученный с сервера объект user.settings — нужен, чтобы при
// сохранении не затереть чужие ключи в JSONB (PUT заменяет объект целиком).
let serverSettings: Record<string, unknown> = {};
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let serverSynced = false;

function persistLocal(a: AppearanceSettings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(a));
  } catch {
    // ignore
  }
}

function schedulePush(a: AppearanceSettings) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    api
      .put('/user-preferences', { settings: { ...serverSettings, appearance: a } })
      .then(() => {
        serverSettings = { ...serverSettings, appearance: a };
      })
      .catch(() => {
        // нет сети/не авторизован — настройки остаются в localStorage
      });
  }, 800);
}

function sanitize(raw: unknown): AppearanceSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppearanceSettings>;
  const merged = { ...DEFAULT_APPEARANCE, ...src };
  merged.fontSize = Math.min(20, Math.max(13, Number(merged.fontSize) || 16));
  return merged;
}

interface ThemeState {
  appearance: AppearanceSettings;
  /** Разрешённая тема — для обратной совместимости и условного рендера */
  theme: 'light' | 'dark';
  setAppearance: (patch: Partial<AppearanceSettings>) => void;
  /** Пересчитать разрешённую тему (смена системной темы, тик расписания) */
  refreshResolved: () => void;
  /** Быстрый переключатель тёмного оформления (шапка/сайдбар/лендинг) */
  toggleTheme: () => void;
  initialize: () => void;
  /** Подтянуть настройки из user-preferences (settings.appearance) */
  syncFromServer: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  appearance: DEFAULT_APPEARANCE,
  theme: 'light',

  setAppearance: (patch) => {
    const appearance = { ...get().appearance, ...patch };
    if (appearance.mode === 'classic' || appearance.mode === 'day') {
      try {
        localStorage.setItem(LS_LAST_LIGHT, appearance.mode);
      } catch {
        // ignore
      }
    }
    set({ appearance, theme: resolveTheme(appearance, systemPrefersDark()) });
    persistLocal(appearance);
    schedulePush(appearance);
  },

  refreshResolved: () => {
    const next = resolveTheme(get().appearance, systemPrefersDark());
    if (next !== get().theme) set({ theme: next });
  },

  toggleTheme: () => {
    const { theme, appearance, setAppearance } = get();
    if (theme === 'dark') {
      let last: ThemeMode = 'day';
      try {
        const stored = localStorage.getItem(LS_LAST_LIGHT);
        if (stored === 'classic' || stored === 'day') last = stored;
      } catch {
        // ignore
      }
      const patch: Partial<AppearanceSettings> = { mode: last };
      // Если тёмная сейчас навязана автосменой ночью — отключаем её,
      // иначе переключатель не сработает.
      if (resolveTheme({ ...appearance, mode: last }, systemPrefersDark()) === 'dark') {
        patch.nightMode = 'off';
      }
      setAppearance(patch);
    } else {
      setAppearance({ mode: 'night' });
    }
  },

  initialize: () => {
    let appearance = DEFAULT_APPEARANCE;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        appearance = sanitize(JSON.parse(raw));
      } else if (localStorage.getItem('theme') === 'dark') {
        // миграция со старого ключа light/dark
        appearance = { ...DEFAULT_APPEARANCE, mode: 'night' };
        persistLocal(appearance);
      }
    } catch {
      // ignore
    }
    set({ appearance, theme: resolveTheme(appearance, systemPrefersDark()) });
  },

  syncFromServer: async () => {
    if (serverSynced) return;
    try {
      const { data } = await api.get('/user-preferences');
      serverSynced = true;
      serverSettings =
        data?.settings && typeof data.settings === 'object' ? data.settings : {};
      const remote = (serverSettings as { appearance?: unknown }).appearance;
      if (remote && typeof remote === 'object') {
        const appearance = sanitize(remote);
        set({ appearance, theme: resolveTheme(appearance, systemPrefersDark()) });
        persistLocal(appearance);
      } else {
        // на сервере ещё пусто — сохраняем локальные настройки
        schedulePush(get().appearance);
      }
    } catch {
      // не авторизован/сервис недоступен — работаем от localStorage
    }
  },
}));
