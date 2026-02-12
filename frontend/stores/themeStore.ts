import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  initialize: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
  },

  initialize: () => {
    const persisted = localStorage.getItem('theme') as Theme | null;
    if (persisted) {
      set({ theme: persisted });
    }
  },
}));
