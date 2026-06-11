'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.appearance.accent);
  const fontSize = useThemeStore((s) => s.appearance.fontSize);
  const nightMode = useThemeStore((s) => s.appearance.nightMode);
  const initialize = useThemeStore((s) => s.initialize);
  const refreshResolved = useThemeStore((s) => s.refreshResolved);
  const syncFromServer = useThemeStore((s) => s.syncFromServer);
  const initLanguage = useLanguageStore((s) => s.initialize);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    initialize();
    initLanguage();
  }, [initialize, initLanguage]);

  // После входа подтягиваем настройки оформления с сервера
  useEffect(() => {
    if (userId) syncFromServer();
  }, [userId, syncFromServer]);

  // Реакция на смену системной темы (режимы «Системная» и автосмена ночью)
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => refreshResolved();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [refreshResolved]);

  // Тик для смены темы по расписанию
  useEffect(() => {
    if (nightMode !== 'scheduled') return;
    const id = setInterval(refreshResolved, 30_000);
    return () => clearInterval(id);
  }, [nightMode, refreshResolved]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('**:transition-none!');
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    if (accent && accent !== 'violet') {
      root.setAttribute('data-accent', accent);
    } else {
      root.removeAttribute('data-accent');
    }
    root.style.fontSize = fontSize && fontSize !== 16 ? `${fontSize}px` : '';
    const timeout = setTimeout(() => {
      root.classList.remove('**:transition-none!');
    }, 1);
    return () => clearTimeout(timeout);
  }, [theme, accent, fontSize]);

  return <>{children}</>;
}
