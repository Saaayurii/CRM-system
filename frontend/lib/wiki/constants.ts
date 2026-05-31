// Строительная ВИКИ — справочные константы для нормативной базы.

export type DocType = 'snip' | 'gost' | 'sp' | 'regional' | 'other';
export type DocStatus = 'active' | 'superseded' | 'draft';

export interface NormCategory {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  icon?: string | null;
  parentId?: number | null;
  sortOrder?: number;
  documentCount?: number;
}

export interface NormDocumentListItem {
  id: number;
  categoryId?: number | null;
  docType: DocType;
  code?: string | null;
  title: string;
  summary?: string | null;
  status: DocStatus;
  effectiveDate?: string | null;
  supersededDate?: string | null;
  tags?: string[];
  viewCount?: number;
  updatedAt?: string;
  category?: { id: number; name: string } | null;
  isBookmarked?: boolean;
}

export interface NormDocumentDetail extends NormDocumentListItem {
  content?: string | null;
  keywords?: string | null;
  attachments?: { url: string; name?: string }[];
  relatedIds?: number[];
  supersededById?: number | null;
  supersededBy?: { id: number; code?: string | null; title: string } | null;
  supersedes?: { id: number; code?: string | null; title: string }[];
  related?: {
    id: number;
    code?: string | null;
    title: string;
    docType: DocType;
    status: DocStatus;
  }[];
  createdByUserId?: number | null;
  createdAt?: string;
}

export const DOC_TYPES: { value: DocType; label: string; short: string }[] = [
  { value: 'snip', label: 'СНиП', short: 'СНиП' },
  { value: 'gost', label: 'ГОСТ', short: 'ГОСТ' },
  { value: 'sp', label: 'СП (свод правил)', short: 'СП' },
  { value: 'regional', label: 'Региональная норма', short: 'Рег.' },
  { value: 'other', label: 'Другое', short: 'Док.' },
];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  snip: 'СНиП',
  gost: 'ГОСТ',
  sp: 'СП',
  regional: 'Региональная',
  other: 'Документ',
};

export const DOC_TYPE_COLORS: Record<DocType, string> = {
  snip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  gost: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  sp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  regional: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export const DOC_STATUSES: { value: DocStatus; label: string }[] = [
  { value: 'active', label: 'Действующий' },
  { value: 'superseded', label: 'Устаревший' },
  { value: 'draft', label: 'Черновик' },
];

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  active: 'Действующий',
  superseded: 'Устаревший',
  draft: 'Черновик',
};

export const DOC_STATUS_COLORS: Record<DocStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  superseded: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export function fmtDate(v?: string | null): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(v);
  }
}
