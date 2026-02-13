import { create } from 'zustand';
import api from '@/lib/api';
import type { User, LoginRequest, LoginResponse, JwtPayload } from '@/types/auth';

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

function roleFromId(roleId: number | null) {
  if (!roleId) return undefined;
  const r = ROLE_MAP[roleId];
  return r ? { id: roleId, code: r.code, name: r.name } : { id: roleId, code: 'unknown', name: 'Unknown' };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials: LoginRequest) => {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    document.cookie = `crm-session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    const user = data.user;
    user.role = roleFromId(user.roleId ?? null);
    set({ user, isAuthenticated: true });

    console.log('[Auth] Login successful for user:', user.email);

  } catch (err: unknown) {
    // Логируем ошибку в консоль для отладки
    if (err && typeof err === 'object' && 'response' in err) {
      const resp = (err as { response?: { status: number; data?: { message?: string } } }).response;
      console.error('[Auth] Login failed:', resp?.status, resp?.data?.message);
    } else {
      console.error('[Auth] Login failed (network/error):', err);
    }

    // пробрасываем ошибку дальше, чтобы компонент LoginPage её обработал
    throw err;
  }
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
  },
}));
