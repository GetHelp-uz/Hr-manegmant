import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../lib/i18n';

interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  userRole: string | null;
  setUserRole: (role: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      userRole: null,
      setUserRole: (role) => set({ userRole: role }),
    }),
    {
      name: 'hr-app-storage',
      partialize: (state) => ({ language: state.language }),
    }
  )
);
