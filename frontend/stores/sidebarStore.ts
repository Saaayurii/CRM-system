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
    const stored = localStorage.getItem('sidebar-expanded');
    const expanded = stored === 'true';
    set({ sidebarExpanded: expanded });
    if (expanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    }
  },
}));
