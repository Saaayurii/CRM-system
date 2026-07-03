/**
 * Типизированная обёртка над общим axios-инстансом (`@/lib/api`).
 *
 * Зачем: тело запроса и форма ответа берутся из OpenAPI бэкенда (`./schema`,
 * генерируется `npm run gen:api`). Бэкенд поменял поле → перегенерировали →
 * TypeScript подсветит все сломанные места ещё на компиляции, а не в рантайме.
 *
 * Почему поверх axios, а не отдельный клиент: сохраняем ЕДИНЫЙ pipeline
 * авторизации/refresh токена (interceptors в lib/api.ts). Обёртка — тонкая,
 * внедряется инкрементально: старые вызовы `api.get(...)` работают как раньше.
 *
 * Строго типизируем тело+ответ; path/query параметры принимаем мягко
 * (подстановка `{id}` в рантайме) — этого достаточно для контрактной защиты.
 */
import type {
  PathsWithMethod,
  SuccessResponseJSON,
  RequestBodyJSON,
} from 'openapi-typescript-helpers';
import api from '@/lib/api';
import type { paths } from './schema';

// Извлечение operation-объекта конкретного метода из записи пути.
type OpOf<P extends keyof paths, M extends string> = paths[P] extends Record<M, infer O>
  ? O
  : never;

// Guard: SuccessResponseJSON требует Record<string|number, any> — оборачиваем.
type ResOf<O> = O extends Record<string | number, unknown> ? SuccessResponseJSON<O> : unknown;

/** Ответ (JSON) для пары путь+метод из OpenAPI. */
export type ApiResponse<
  P extends keyof paths,
  M extends keyof paths[P],
> = SuccessResponseJSON<paths[P][M] extends Record<string | number, unknown> ? paths[P][M] : never>;

/** Тело запроса (JSON) для пары путь+метод из OpenAPI. */
export type ApiBody<P extends keyof paths, M extends keyof paths[P]> = RequestBodyJSON<paths[P][M]>;

interface RequestOptions {
  /** Значения path-параметров: подставляются в `{key}` в url. */
  path?: Record<string, string | number>;
  /** Query-параметры. */
  query?: Record<string, unknown>;
}

/** Подставляет path-параметры в шаблон url (`/api/v1/users/{id}` → `/api/v1/users/7`). */
function buildUrl(url: string, path?: Record<string, string | number>): string {
  if (!path) return url;
  return url.replace(/\{([^}]+)\}/g, (_, k) => encodeURIComponent(String(path[k] ?? `{${k}}`)));
}

export async function apiGet<P extends PathsWithMethod<paths, 'get'>>(
  url: P,
  opts?: RequestOptions,
): Promise<ResOf<OpOf<P, 'get'>>> {
  const { data } = await api.get(buildUrl(url as string, opts?.path), { params: opts?.query });
  return data;
}

export async function apiDelete<P extends PathsWithMethod<paths, 'delete'>>(
  url: P,
  opts?: RequestOptions,
): Promise<ResOf<OpOf<P, 'delete'>>> {
  const { data } = await api.delete(buildUrl(url as string, opts?.path), { params: opts?.query });
  return data;
}

export async function apiPost<P extends PathsWithMethod<paths, 'post'>>(
  url: P,
  body: RequestBodyJSON<OpOf<P, 'post'>>,
  opts?: RequestOptions,
): Promise<ResOf<OpOf<P, 'post'>>> {
  const { data } = await api.post(buildUrl(url as string, opts?.path), body, { params: opts?.query });
  return data;
}

export async function apiPut<P extends PathsWithMethod<paths, 'put'>>(
  url: P,
  body: RequestBodyJSON<OpOf<P, 'put'>>,
  opts?: RequestOptions,
): Promise<ResOf<OpOf<P, 'put'>>> {
  const { data } = await api.put(buildUrl(url as string, opts?.path), body, { params: opts?.query });
  return data;
}

export async function apiPatch<P extends PathsWithMethod<paths, 'patch'>>(
  url: P,
  body: RequestBodyJSON<OpOf<P, 'patch'>>,
  opts?: RequestOptions,
): Promise<ResOf<OpOf<P, 'patch'>>> {
  const { data } = await api.patch(buildUrl(url as string, opts?.path), body, { params: opts?.query });
  return data;
}
