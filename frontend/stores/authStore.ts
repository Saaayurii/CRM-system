import axios from 'axios';
import { create } from 'zustand';
import api from '@/lib/api';
import { updateBadge } from '@/stores/notificationStore';
import { normalizeFileUrl } from '@/lib/utils';
import type { User, LoginRequest, LoginResponse, JwtPayload } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Map of known roleId -> code (seeded in DB)
export const ROLE_MAP: Record<number, { code: string; name: string }> = {
  1: { code: 'super_admin', name: 'Супер Администратор' },
  2: { code: 'admin', name: 'Администратор' },
  3: { code: 'hr_manager', name: 'HR Менеджер' },
  4: { code: 'project_manager', name: 'Менеджер проектов' },
  5: { code: 'foreman', name: 'Прораб' },
  6: { code: 'supplier_manager', name: 'Снабженец' },
  7: { code: 'warehouse_keeper', name: 'Кладовщик' },
  8: { code: 'accountant', name: 'Бухгалтер' },
  9: { code: 'inspector', name: 'Инспектор' },
  10: { code: 'worker', name: 'Рабочий' },
  11: { code: 'supplier', name: 'Поставщик' },
  12: { code: 'contractor', name: 'Подрядчик' },
  13: { code: 'observer', name: 'Наблюдатель' },
  14: { code: 'analyst', name: 'Аналитик' },
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  initialize: () => void;
  refreshRole: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
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

function roleFromId(roleId: number | null | undefined) {
  if (!roleId) return undefined;
  const r = ROLE_MAP[roleId];
  return r ? { id: roleId, code: r.code, name: r.name } : { id: roleId, code: 'unknown', name: 'Unknown' };
}

// Fetch fresh tokens via refresh endpoint (bypasses api interceptor to avoid loops)
async function silentRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    return data;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials: LoginRequest) => {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', credentials);

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      if (data.sessionId) localStorage.setItem('sessionId', String(data.sessionId));
      document.cookie = `crm-session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          const sw = reg.active;
          if (sw) {
            sw.postMessage({ type: 'SET_TOKEN', token: data.accessToken });
            sw.postMessage({ type: 'SYNC_NOW' });
          }
        }).catch(() => {});
      }

      const user = data.user;
      user.role = roleFromId(user.roleId ?? null);
      if (user.avatarUrl) user.avatarUrl = normalizeFileUrl(user.avatarUrl) ?? undefined;
      set({ user, isAuthenticated: true });

      console.log('[Auth] Login successful for user:', user.email);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { status: number; data?: { message?: string } } }).response;
        console.error('[Auth] Login failed:', resp?.status, resp?.data?.message);
      } else {
        console.error('[Auth] Login failed (network/error):', err);
      }
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionId');
    document.cookie = 'crm-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    updateBadge(0);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: 'SET_TOKEN', token: null });
      }).catch(() => {});
    }

    set({ user: null, isAuthenticated: false });
    window.location.href = '/auth/login';
  },

  updateUser: (patch: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : state.user,
    }));
  },

  // Fetch fresh role from DB and update tokens if role changed.
  // Called on initialize() and can be called manually.
  refreshRole: async () => {
    try {
      const { data: me } = await api.get<User>('/auth/me');
      const tokenRoleId = decodeJwt(localStorage.getItem('accessToken') ?? '')?.roleId;
      const freshRoleId = me.roleId ?? null;

      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              roleId: freshRoleId ?? undefined,
              role: roleFromId(freshRoleId),
              name: me.name || state.user.name,
              email: me.email || state.user.email,
              avatarUrl: me.avatarUrl ? (normalizeFileUrl(me.avatarUrl) ?? undefined) : state.user.avatarUrl,
              isActive: me.isActive,
            }
          : state.user,
      }));

      // If role changed in DB vs token, silently get fresh tokens so
      // subsequent API calls (and the next initialize) carry the new role.
      if (freshRoleId !== tokenRoleId) {
        const tokens = await silentRefresh();
        if (tokens) {
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
        }
      }
    } catch {
      // Network failure — keep the token-based data as-is
    }
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

    // Fast path: set user from cached token immediately (no flicker)
    set({
      user: {
        id: payload.sub,
        email: payload.email,
        name: '',
        accountId: payload.accountId,
        roleId: payload.roleId ?? undefined,
        isActive: true,
        createdAt: '',
        role: roleFromId(payload.roleId),
      },
      isAuthenticated: true,
      isLoading: false,
    });

    // Background: refresh role from DB so changes made by admin take effect
    get().refreshRole();
  },
}));
