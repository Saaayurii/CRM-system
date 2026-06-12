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
  merged.chatFontSize = Math.min(22, Math.max(12, Number(merged.chatFontSize) || 14));
  // свои обои без загруженной картинки невозможны
  if (merged.chatWallpaper === 'custom' && !merged.customWallpaperUrl) {
    merged.chatWallpaper = 'default';
  }
  if (merged.density !== 'compact') merged.density = 'comfortable';
  merged.liquidGlass = merged.liquidGlass === true;
  merged.patternContrast = Math.min(60, Math.max(5, Number(merged.patternContrast) || 14));
  merged.textContrast = Math.min(100, Math.max(0, Number(merged.textContrast) || 0));
  merged.quietHours = { ...DEFAULT_APPEARANCE.quietHours, ...(merged.quietHours || {}) };
  if (typeof merged.startPage !== 'string' || !merged.startPage.startsWith('/dashboard')) {
    merged.startPage = DEFAULT_APPEARANCE.startPage;
  }
  return merged;
}

interface ThemeState {
  appearance: AppearanceSettings;
  /** Фирменный акцент компании (settings.defaultAccent аккаунта) — действует,
   *  пока пользователь не выбрал акцент сам */
  companyAccent: string | null;
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
  companyAccent: null,
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
    let companyAccent: string | null = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        appearance = sanitize(JSON.parse(raw));
      } else if (localStorage.getItem('theme') === 'dark') {
        // миграция со старого ключа light/dark
        appearance = { ...DEFAULT_APPEARANCE, mode: 'night' };
        persistLocal(appearance);
      }
      companyAccent = localStorage.getItem('companyAccent');
    } catch {
      // ignore
    }
    set({ appearance, companyAccent, theme: resolveTheme(appearance, systemPrefersDark()) });
  },

  syncFromServer: async () => {
    if (serverSynced) return;
    // Фирменный акцент компании (доступен всем авторизованным)
    api
      .get('/system-settings')
      .then(({ data }) => {
        const accent = data?.settings?.defaultAccent || null;
        set({ companyAccent: accent });
        try {
          if (accent) localStorage.setItem('companyAccent', accent);
          else localStorage.removeItem('companyAccent');
        } catch {
          // ignore
        }
      })
      .catch(() => {});
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
