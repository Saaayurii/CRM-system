import { create } from 'zustand';

interface SidebarState {
  sidebarOpen: boolean;
  sidebarExpanded: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarExpanded: (expanded: boolean) => void;
  initialize: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  sidebarOpen: false,
  sidebarExpanded: false,

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  setSidebarExpanded: (expanded: boolean) => {
    set({ sidebarExpanded: expanded });
    localStorage.setItem('sidebar-expanded', String(expanded));
    if (expanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  },

  initialize: () => {
    // Сайдбар управляется наведением мыши: в покое он свёрнут.
    set({ sidebarExpanded: false });
    document.querySelector('body')?.classList.remove('sidebar-expanded');
  },
}));
