import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Состояние плавающего мини-чата (VK-style виджет).
 * Живёт в layout дашборда, поэтому переживает навигацию между страницами;
 * persist сохраняет открытость/позицию между перезагрузками.
 */
interface MiniChatState {
  isOpen: boolean;
  isMinimized: boolean;
  /** Явная позиция (left/top) после перетаскивания; null — дефолт (правый нижний угол) */
  position: { x: number; y: number } | null;
  open: () => void;
  close: () => void;
  toggleMinimized: () => void;
  setPosition: (position: { x: number; y: number }) => void;
}

export const useMiniChatStore = create<MiniChatState>()(
  persist(
    (set) => ({
      isOpen: false,
      isMinimized: false,
      position: null,
      open: () => set({ isOpen: true, isMinimized: false }),
      close: () => set({ isOpen: false }),
      toggleMinimized: () => set((s) => ({ isMinimized: !s.isMinimized })),
      setPosition: (position) => set({ position }),
    }),
    { name: 'mini-chat-widget' }
  )
);
