import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { writeSsoTokens, clearSsoTokens } from '@/lib/ssoCookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach Bearer token and optional account override
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // For FormData let the browser set Content-Type with the correct boundary
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const selectedAccountId = localStorage.getItem('selectedAccountId');
    if (selectedAccountId && config.headers) {
      config.headers['X-Account-Id'] = selectedAccountId;
    }
  }
  return config;
});

// Response interceptor — handle 401 with token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip token refresh for auth endpoints (login, register, client portal) —
    // let the caller handle 401 directly (e.g. show "wrong login/password")
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/portal/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        writeSsoTokens(accessToken, newRefreshToken);

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        document.cookie = 'crm-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        clearSsoTokens();
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (window.location.hostname.startsWith('chat.')) {
            // Чат-поддомен: сессия истекла — на форму входа (middleware вернёт в чат)
            window.location.href = '/auth/login';
          } else if (path.startsWith('/portal')) {
            // Клиента портала возвращаем на его форму входа, а не на сотрудничью
            window.location.href = '/portal/login';
          } else if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
            window.location.href = '/auth/login';
          }
          // Публичные страницы (лендинг, /auth/*, privacy): токены уже очищены,
          // принудительный редирект на форму входа не нужен — остаёмся на месте.
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
