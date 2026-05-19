import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string, organization?: Organization) => void;
  logout: () => void;
  setOrganization: (org: Organization) => void;
  setUser: (user: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  token: null,
  isLoading: true,

  setAuth: (user, token, organization) => {
    api.setToken(token);
    set({ user, token, organization: organization || null, isLoading: false });
  },

  logout: () => {
    api.setToken(null);
    set({ user: null, token: null, organization: null });
  },

  setOrganization: (org) => set({ organization: org }),

  setUser: (partial) => set((state) => ({ user: state.user ? { ...state.user, ...partial } : null })),

  checkAuth: async () => {
    const token = api.getToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const user = await api.get<any>('/auth/me');
      const org = user.memberships?.[0]?.organization;
      set({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        token,
        organization: org || null,
        isLoading: false,
      });
    } catch {
      api.setToken(null);
      set({ user: null, token: null, organization: null, isLoading: false });
    }
  },
}));