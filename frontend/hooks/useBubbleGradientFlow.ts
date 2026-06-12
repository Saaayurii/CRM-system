'use client';

// «Градиент по всем сообщениям» (как в Telegram): один градиент растянут на
// весь видимый чат, каждый исходящий пузырь показывает свой срез и
// «переливается» при скролле. background-attachment: fixed на iOS не
// поддерживается, поэтому срез позиционируется вручную:
// background-size = размер контейнера, background-position = смещение
// пузыря относительно контейнера (пересчёт на скролл/ресайз/новые сообщения).

import { useEffect, type RefObject } from 'react';
import { useThemeStore } from '@/stores/themeStore';

export function useBubbleGradientFlow(containerRef: RefObject<HTMLElement | null>) {
  const enabled = useThemeStore(
    (s) =>
      s.appearance.bubbleGradientFlow &&
      (s.appearance.customBubbleColors?.length ?? 0) >= 2,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const bubbles = container.querySelectorAll<HTMLElement>('.bg-bubble-500');
      if (bubbles.length === 0) return;
      // Сначала все чтения, потом все записи — иначе layout thrashing.
      // Пишем CSS-переменные, а не background-* напрямую: на них ссылаются
      // правила html[data-bubble-grad-flow] и keyframes анимации перелива.
      const cRect = container.getBoundingClientRect();
      const rects = Array.from(bubbles, (el) => el.getBoundingClientRect());
      bubbles.forEach((el, i) => {
        el.style.setProperty('--grad-w', `${cRect.width}px`);
        el.style.setProperty('--grad-h', `${cRect.height}px`);
        el.style.setProperty('--grad-x', `${cRect.left - rects[i].left}px`);
        el.style.setProperty('--grad-y', `${cRect.top - rects[i].top}px`);
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    schedule();
    container.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Новые/удалённые сообщения
    const mo = new MutationObserver(schedule);
    mo.observe(container, { childList: true, subtree: true });
    // Подгрузка медиа сдвигает пузыри без мутаций — ловим load в capture-фазе
    container.addEventListener('load', schedule, true);

    return () => {
      container.removeEventListener('scroll', schedule);
      container.removeEventListener('load', schedule, true);
      window.removeEventListener('resize', schedule);
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
      container.querySelectorAll<HTMLElement>('.bg-bubble-500').forEach((el) => {
        el.style.removeProperty('--grad-w');
        el.style.removeProperty('--grad-h');
        el.style.removeProperty('--grad-x');
        el.style.removeProperty('--grad-y');
      });
    };
  }, [containerRef, enabled]);
}
