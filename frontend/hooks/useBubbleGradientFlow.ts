'use client';

// «Градиент по всем сообщениям» (как в Telegram): один вертикальный градиент
// натянут на ВИДИМУЮ область чата (как background-attachment: fixed, которого
// нет на iOS). Верх экрана — первый цвет, низ — последний; пузырь показывает
// срез под своей позицией на экране. При простое значения не меняются (высота
// экрана постоянна → пересчёт идемпотентен, нет дёрганья от «печатает»/«в сети»
// /галочек), а при прокрутке сообщение плавно перетекает из цвета в цвет.
// Позиционируем вручную: --grad-h = высота видимой области, --grad-y = смещение
// верха экрана относительно пузыря (сдвиг градиента к нужному срезу).

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
      const cRect = container.getBoundingClientRect();
      const rects = Array.from(bubbles, (el) => el.getBoundingClientRect());
      bubbles.forEach((el, i) => {
        // Высота среза = видимая область (постоянна → нет перемасштабирования
        // при изменении высоты контента). Сдвиг = позиция пузыря на экране.
        el.style.setProperty('--grad-h', `${cRect.height}px`);
        el.style.setProperty('--grad-y', `${cRect.top - rects[i].top}px`);
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    schedule();
    // Контейнер сообщений (flex-1) получает реальную высоту асинхронно —
    // ResizeObserver пересчитывает срез, когда размер появился/изменился
    // (иначе первый замер ловит height 0 и градиент не виден в чате).
    const ro = new ResizeObserver(schedule);
    ro.observe(container);
    // Прокрутка двигает срез — это и есть «перелив» (как в Telegram)
    container.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Новые/удалённые сообщения — выставить переменные на новых пузырях.
    // Для существующих пузырей значения не меняются (высота экрана та же),
    // поэтому индикатор «печатает»/«в сети» не вызывает видимого сдвига.
    const mo = new MutationObserver(schedule);
    mo.observe(container, { childList: true, subtree: true });
    // Подгрузка медиа сдвигает пузыри — ловим load в capture-фазе
    container.addEventListener('load', schedule, true);

    return () => {
      container.removeEventListener('scroll', schedule);
      container.removeEventListener('load', schedule, true);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
      container.querySelectorAll<HTMLElement>('.bg-bubble-500').forEach((el) => {
        el.style.removeProperty('--grad-h');
        el.style.removeProperty('--grad-y');
      });
    };
  }, [containerRef, enabled]);
}
