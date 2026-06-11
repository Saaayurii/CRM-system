'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { useLanguageStore } from '@/stores/languageStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, initialize } = useThemeStore();
  const { initialize: initLanguage } = useLanguageStore();

  useEffect(() => {
    initialize();
    initLanguage();
  }, [initialize, initLanguage]);

  useEffect(() => {
    document.documentElement.classList.add('**:transition-none!');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    const timeout = setTimeout(() => {
      document.documentElement.classList.remove('**:transition-none!');
    }, 1);
    return () => clearTimeout(timeout);
  }, [theme]);

  return <>{children}</>;
}
