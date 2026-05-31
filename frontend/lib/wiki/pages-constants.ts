export interface WikiPageItem {
  id: number;
  title: string;
  category?: string | null;
  parentPageId?: number | null;
  tags?: any[];
  version?: number;
  viewCount?: number;
  updatedAt?: string;
}

export interface WikiPageDetail extends WikiPageItem {
  blocks: any[];
  content?: string | null;
  isPublic?: boolean;
  allowedRoles?: any[];
  createdByUserId?: number | null;
  updatedByUserId?: number | null;
  createdAt?: string;
  parentPage?: { id: number; title: string } | null;
  childPages?: { id: number; title: string }[];
}

export interface WikiDraft {
  id: number;
  wikiPageId?: number | null;
  accountId: number;
  title: string;
  category?: string | null;
  parentPageId?: number | null;
  tags?: any[];
  blocks: any[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  authorId: number;
  reviewerId?: number | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  page?: { id: number; title: string } | null;
  comments?: { id: number; userId: number; text: string; createdAt: string }[];
}

export interface WikiVersion {
  id: number;
  wikiPageId: number;
  versionNum: number;
  title: string;
  blocks: any[];
  changeNote?: string | null;
  createdByUserId?: number | null;
  createdAt: string;
}

export const DRAFT_STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  pending: 'На проверке',
  approved: 'Опубликован',
  rejected: 'Отклонён',
};

export const DRAFT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
};

export function fmtDate(v?: string | null): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return String(v); }
}

export function fmtDateTime(v?: string | null): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return String(v); }
}
