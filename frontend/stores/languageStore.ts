import { create } from 'zustand';

export type Language = 'ru' | 'en';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  initialize: () => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'ru',

  setLanguage: (language) => {
    set({ language });
    localStorage.setItem('language', language);
  },

  toggleLanguage: () => {
    const next: Language = get().language === 'ru' ? 'en' : 'ru';
    set({ language: next });
    localStorage.setItem('language', next);
  },

  initialize: () => {
    const persisted = localStorage.getItem('language') as Language | null;
    if (persisted === 'ru' || persisted === 'en') {
      set({ language: persisted });
    }
  },
}));
