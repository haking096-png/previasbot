import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface ChannelState {
  selectedChannelId: string | null;
  setSelectedChannelId: (id: string | null) => void;
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set) => ({
      selectedChannelId: null,
      setSelectedChannelId: (id) => set({ selectedChannelId: id }),
    }),
    {
      name: 'channel-storage',
    }
  )
);
