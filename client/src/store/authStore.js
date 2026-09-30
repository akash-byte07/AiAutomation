import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist((set) => ({
  token: null,
  user: null,
  hydrated: false,
  setSession: ({ token, user }) => set({ token, user }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ token: null, user: null }),
}), {
  name: 'agent-automation-session',
  partialize: (state) => ({ token: state.token, user: state.user }),
  onRehydrateStorage: () => (state) => state?.setState?.({ hydrated: true }),
}));