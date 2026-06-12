'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import {
  ACCENT_VAR_NAMES,
  BUBBLE_VAR_NAMES,
  accentCssVars,
  bubbleCssVars,
  bubbleGradientCss,
  isHexColor,
} from '@/lib/appearance';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  // Свой выбор акцента перекрывает фирменный акцент компании
  const accent = useThemeStore((s) =>
    s.appearance.accentSetByUser ? s.appearance.accent : (s.companyAccent ?? s.appearance.accent),
  );
  // Свой цвет по цветовому кругу перекрывает пресеты
  const customAccent = useThemeStore((s) =>
    s.appearance.accentSetByUser ? s.appearance.customAccent : null,
  );
  const customBubbleColor = useThemeStore((s) => s.appearance.customBubbleColor);
  const customBubbleColors = useThemeStore((s) => s.appearance.customBubbleColors);
  const bubbleGradientFlow = useThemeStore((s) => s.appearance.bubbleGradientFlow);
  const bubbleGradientAnimate = useThemeStore((s) => s.appearance.bubbleGradientAnimate);
  const fontSize = useThemeStore((s) => s.appearance.fontSize);
  const chatFontSize = useThemeStore((s) => s.appearance.chatFontSize);
  const bubbleColor = useThemeStore((s) => s.appearance.bubbleColor);
  const density = useThemeStore((s) => s.appearance.density);
  const liquidGlass = useThemeStore((s) => s.appearance.liquidGlass);
  const textContrast = useThemeStore((s) => s.appearance.textContrast);
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
    if (isHexColor(customAccent)) {
      // Свой акцент: inline-переменные палитры вместо data-accent
      root.removeAttribute('data-accent');
      for (const [name, value] of Object.entries(accentCssVars(customAccent))) {
        root.style.setProperty(name, value);
      }
    } else {
      ACCENT_VAR_NAMES.forEach((name) => root.style.removeProperty(name));
      if (accent && accent !== 'violet') {
        root.setAttribute('data-accent', accent);
      } else {
        root.removeAttribute('data-accent');
      }
    }
    if (isHexColor(customBubbleColor)) {
      // Шейды пузырей — от первого (основного) цвета
      root.removeAttribute('data-bubble');
      for (const [name, value] of Object.entries(bubbleCssVars(customBubbleColor))) {
        root.style.setProperty(name, value);
      }
    } else {
      BUBBLE_VAR_NAMES.forEach((name) => root.style.removeProperty(name));
      if (bubbleColor && bubbleColor !== 'accent') {
        root.setAttribute('data-bubble', bubbleColor);
      } else {
        root.removeAttribute('data-bubble');
      }
    }
    // Градиент сообщений из 2+ своих цветов
    const gradientStops = (customBubbleColors ?? []).filter(isHexColor);
    const gradientActive = isHexColor(customBubbleColor) && gradientStops.length >= 2;
    if (gradientActive) {
      root.setAttribute('data-bubble-gradient', '');
      root.style.setProperty('--bubble-gradient', bubbleGradientCss(gradientStops));
    } else {
      root.removeAttribute('data-bubble-gradient');
      root.style.removeProperty('--bubble-gradient');
    }
    // Режимы градиента: «по всему чату» (срез на пузыре через CSS-переменные
    // от useBubbleGradientFlow) и анимация перелива
    if (gradientActive && bubbleGradientFlow) {
      root.setAttribute('data-bubble-grad-flow', '');
    } else {
      root.removeAttribute('data-bubble-grad-flow');
    }
    if (gradientActive && bubbleGradientAnimate) {
      root.setAttribute('data-bubble-grad-anim', '');
    } else {
      root.removeAttribute('data-bubble-grad-anim');
    }
    if (density === 'compact') {
      root.setAttribute('data-density', 'compact');
    } else {
      root.removeAttribute('data-density');
    }
    if (liquidGlass) {
      root.setAttribute('data-glass', '');
    } else {
      root.removeAttribute('data-glass');
    }
    if (textContrast > 0) {
      root.setAttribute('data-text-contrast', '');
      root.style.setProperty('--text-contrast', `${textContrast}%`);
    } else {
      root.removeAttribute('data-text-contrast');
      root.style.removeProperty('--text-contrast');
    }
    root.style.fontSize = fontSize && fontSize !== 16 ? `${fontSize}px` : '';
    if (chatFontSize && chatFontSize !== 14) {
      root.style.setProperty('--chat-font-size', `${chatFontSize}px`);
    } else {
      root.style.removeProperty('--chat-font-size');
    }
    const timeout = setTimeout(() => {
      root.classList.remove('**:transition-none!');
    }, 1);
    return () => clearTimeout(timeout);
  }, [theme, accent, customAccent, fontSize, chatFontSize, bubbleColor, customBubbleColor, customBubbleColors, bubbleGradientFlow, bubbleGradientAnimate, density, liquidGlass, textContrast]);

  return <>{children}</>;
}
