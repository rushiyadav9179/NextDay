import { create } from 'zustand';
import { User } from '../types/index.js';
import { updateSocketAuth } from '../lib/socket.js';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('nextday_token'),
  isAuthenticated: Boolean(localStorage.getItem('nextday_token')),
  isLoading: true,

  login: (token: string, user: User) => {
    localStorage.setItem('nextday_token', token);
    localStorage.setItem('nextday_tenant_id', user.tenantId);
    localStorage.setItem('nextday_user', JSON.stringify(user));
    updateSocketAuth(token);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('nextday_token');
    localStorage.removeItem('nextday_tenant_id');
    localStorage.removeItem('nextday_user');
    updateSocketAuth(null);
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  setUser: (user: User) => {
    localStorage.setItem('nextday_user', JSON.stringify(user));
    set({ user });
  },

  initialize: () => {
    const token = localStorage.getItem('nextday_token');
    const storedUser = localStorage.getItem('nextday_user');
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        set({ token, user, isAuthenticated: true, isLoading: false });
        return;
      } catch {
        // Fall through
      }
    }
    set({ isLoading: false });
  },
}));
