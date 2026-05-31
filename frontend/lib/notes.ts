import api from '@/lib/api';

export interface Note {
  id: number;
  accountId: number;
  userId: number;
  title?: string | null;
  content: string;
  color: string;
  remindAt?: string | null;
  dismissedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotePayload {
  title?: string;
  content: string;
  color?: string;
  remindAt?: string | null;
}

/** Sticker palette: name → tailwind classes for light/dark. */
export const NOTE_COLORS: Record<
  string,
  { label: string; card: string; swatch: string }
> = {
  yellow: {
    label: 'Жёлтый',
    card: 'bg-amber-100 dark:bg-amber-300/20 border-amber-300 dark:border-amber-400/40',
    swatch: 'bg-amber-300',
  },
  pink: {
    label: 'Розовый',
    card: 'bg-pink-100 dark:bg-pink-300/20 border-pink-300 dark:border-pink-400/40',
    swatch: 'bg-pink-300',
  },
  blue: {
    label: 'Синий',
    card: 'bg-sky-100 dark:bg-sky-300/20 border-sky-300 dark:border-sky-400/40',
    swatch: 'bg-sky-300',
  },
  green: {
    label: 'Зелёный',
    card: 'bg-emerald-100 dark:bg-emerald-300/20 border-emerald-300 dark:border-emerald-400/40',
    swatch: 'bg-emerald-300',
  },
  orange: {
    label: 'Оранжевый',
    card: 'bg-orange-100 dark:bg-orange-300/20 border-orange-300 dark:border-orange-400/40',
    swatch: 'bg-orange-300',
  },
  purple: {
    label: 'Фиолетовый',
    card: 'bg-violet-100 dark:bg-violet-300/20 border-violet-300 dark:border-violet-400/40',
    swatch: 'bg-violet-300',
  },
};

export function noteColorClass(color?: string | null): string {
  return (NOTE_COLORS[color || 'yellow'] || NOTE_COLORS.yellow).card;
}

export const notesApi = {
  list: (status?: 'active' | 'history') =>
    api.get<Note[]>('/notes', { params: status ? { status } : undefined }),
  due: () => api.get<Note[]>('/notes/due'),
  create: (payload: NotePayload) => api.post<Note>('/notes', payload),
  update: (id: number, payload: Partial<NotePayload>) =>
    api.put<Note>(`/notes/${id}`, payload),
  dismiss: (id: number) => api.put<Note>(`/notes/${id}/dismiss`),
  restore: (id: number) => api.put<Note>(`/notes/${id}/restore`),
  remove: (id: number) => api.delete(`/notes/${id}`),
};
