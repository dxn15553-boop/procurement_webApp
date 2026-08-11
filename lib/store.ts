import { create } from "zustand";

interface LayoutState {
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  unreadNotificationCount: number;
  setUnreadNotificationCount: (count: number) => void;
  decrementUnreadNotificationCount: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  unreadNotificationCount: 0,
  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),
  decrementUnreadNotificationCount: () => set((state) => ({ unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1) })),
}));
