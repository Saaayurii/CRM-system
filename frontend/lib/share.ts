import api from './api';

export interface ShareLink {
  id: number;
  token: string;
  accountId: number;
  entityType: string;
  entityId: number;
  title: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
}

export interface ResolvedShare {
  entityType: string;
  label: string;
  title: string | null;
  entity: unknown;
}

// Публичный URL шаре-ссылки (строится от текущего origin).
export function shareUrl(token: string): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/share/${token}`;
}

export async function listShareLinks(
  entityType: string,
  entityId: number,
): Promise<ShareLink[]> {
  const { data } = await api.get('/share-links', {
    params: { entityType, entityId },
  });
  return Array.isArray(data) ? data : (data?.data ?? []);
}

export async function createShareLink(input: {
  entityType: string;
  entityId: number;
  title?: string;
  expiresAt?: string | null;
}): Promise<ShareLink> {
  const { data } = await api.post('/share-links', input);
  return data;
}

export async function revokeShareLink(id: number): Promise<void> {
  await api.delete(`/share-links/${id}`);
}

// Публичный резолв (без авторизации) — используется страницей /share/[token].
export async function resolveShare(token: string): Promise<ResolvedShare> {
  const { data } = await api.get(`/share/${token}`);
  return data;
}
