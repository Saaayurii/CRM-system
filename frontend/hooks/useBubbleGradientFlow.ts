'use client';

// «Градиент по всем сообщениям» (как в Telegram): один вертикальный градиент
// натянут на ВСЮ высоту переписки (scrollHeight), а не на видимую область.
// Поэтому цвет пузыря зависит от его места в ленте — фиксирован за сообщением:
// верхние (старые) у первого цвета, нижние (свежие) у последнего. При скролле
// цвет каждого сообщения НЕ дёргается — просто видно разные участки градиента.
// background-attachment: fixed на iOS не работает, поэтому срез позиционируем
// вручную: --grad-h = полная высота контента, --grad-y = минус смещение пузыря
// от верха контента (background-position сдвигает градиент к нужному участку).

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
      const scrollTop = container.scrollTop;
      const fullH = container.scrollHeight; // высота всей переписки
      const rects = Array.from(bubbles, (el) => el.getBoundingClientRect());
      bubbles.forEach((el, i) => {
        // Смещение пузыря от верха контента (scroll-независимое):
        // при прокрутке rect.top и scrollTop меняются встречно и сокращаются.
        const offsetInContent = rects[i].top - cRect.top + scrollTop;
        el.style.setProperty('--grad-h', `${fullH}px`);
        el.style.setProperty('--grad-y', `${-offsetInContent}px`);
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    schedule();
    // Скролл не меняет цвет (математически), но держим слушатель: новые порции
    // истории/медиа меняют scrollHeight, и пересчёт по факту скролла надёжнее.
    container.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Новые/удалённые сообщения меняют высоту → сдвигают все смещения
    const mo = new MutationObserver(schedule);
    mo.observe(container, { childList: true, subtree: true });
    // Подгрузка медиа меняет высоту без мутаций — ловим load в capture-фазе
    container.addEventListener('load', schedule, true);

    return () => {
      container.removeEventListener('scroll', schedule);
      container.removeEventListener('load', schedule, true);
      window.removeEventListener('resize', schedule);
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
      container.querySelectorAll<HTMLElement>('.bg-bubble-500').forEach((el) => {
        el.style.removeProperty('--grad-h');
        el.style.removeProperty('--grad-y');
      });
    };
  }, [containerRef, enabled]);
}
