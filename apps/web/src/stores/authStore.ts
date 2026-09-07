import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  selectedOrganizationId: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setSelectedOrganizationId: (organizationId: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      selectedOrganizationId: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          selectedOrganizationId:
            user.role === 'super_admin' ? null : (user.organizationId ?? null),
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setSelectedOrganizationId: (selectedOrganizationId) => set({ selectedOrganizationId }),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          selectedOrganizationId: null,
        }),
    }),
    { name: 'auth-store' },
  ),
);
