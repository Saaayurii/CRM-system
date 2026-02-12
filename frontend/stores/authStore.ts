import { create } from 'zustand';
import api from '@/lib/api';
import type { User, LoginRequest, LoginResponse, JwtPayload } from '@/types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  initialize: () => void;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials: LoginRequest) => {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    document.cookie = `crm-session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    set({ user: data.user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    document.cookie = 'crm-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    set({ user: null, isAuthenticated: false });
    window.location.href = '/auth/login';
  },

  initialize: () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    const payload = decodeJwt(token);
    if (!payload || payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      document.cookie = 'crm-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    set({
      user: {
        id: payload.sub,
        email: payload.email,
        firstName: '',
        lastName: '',
        role: { id: '', code: payload.role, name: payload.role },
      },
      isAuthenticated: true,
      isLoading: false,
    });
  },
}));
