'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToastStore } from '@/stores/toastStore';
import { Note, noteColorClass, notesApi } from '@/lib/notes';
import NoteFormModal from '@/components/notes/NoteFormModal';

type Tab = 'active' | 'scheduled' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Активные' },
  { key: 'scheduled', label: 'Запланированные' },
  { key: 'history', label: 'История' },
];

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotesPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notesApi.list();
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      addToast('error', 'Не удалось загрузить заметки');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const { active, scheduled, history } = useMemo(() => {
    const now = Date.now();
    const active: Note[] = [];
    const scheduled: Note[] = [];
    const history: Note[] = [];
    for (const n of notes) {
      if (n.dismissedAt) history.push(n);
      else if (n.remindAt && new Date(n.remindAt).getTime() > now) scheduled.push(n);
      else active.push(n);
    }
    return { active, scheduled, history };
  }, [notes]);

  const visible = tab === 'active' ? active : tab === 'scheduled' ? scheduled : history;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (note: Note) => {
    setEditing(note);
    setModalOpen(true);
  };

  const handleDismiss = async (note: Note) => {
    try {
      await notesApi.dismiss(note.id);
      addToast('success', 'Перенесено в историю');
      load();
    } catch {
      addToast('error', 'Ошибка');
    }
  };

  const handleRestore = async (note: Note) => {
    try {
      await notesApi.restore(note.id);
      addToast('success', 'Заметка снова активна');
      load();
    } catch {
      addToast('error', 'Ошибка');
    }
  };

  const handleDelete = async (note: Note) => {
    if (!confirm('Удалить заметку?')) return;
    try {
      await notesApi.remove(note.id);
      addToast('success', 'Заметка удалена');
      load();
    } catch {
      addToast('error', 'Ошибка');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Заметки</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600"
        >
          + Новая заметка
        </button>
      </div>

      <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => {
          const count = t.key === 'active' ? active.length : t.key === 'scheduled' ? scheduled.length : history.length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t.key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label} {count > 0 && <span className="text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Загрузка…</p>
      ) : visible.length === 0 ? (
        <p className="text-gray-400 text-sm py-10 text-center">Здесь пока пусто.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((note) => (
            <div
              key={note.id}
              className={`relative rounded-xl border p-4 shadow-sm flex flex-col ${noteColorClass(note.color)} ${
                note.dismissedAt ? 'opacity-70' : ''
              }`}
            >
              {note.title && (
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1 break-words">{note.title}</h3>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words flex-1">
                {note.content}
              </p>
              {note.remindAt && (
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                  </svg>
                  {formatDate(note.remindAt)}
                </p>
              )}

              <div className="mt-3 flex items-center gap-3 text-xs">
                <button onClick={() => openEdit(note)} className="text-gray-600 dark:text-gray-300 hover:underline">
                  Изменить
                </button>
                {note.dismissedAt ? (
                  <button onClick={() => handleRestore(note)} className="text-emerald-700 dark:text-emerald-300 hover:underline">
                    Вернуть
                  </button>
                ) : (
                  <button onClick={() => handleDismiss(note)} className="text-gray-600 dark:text-gray-300 hover:underline">
                    В историю
                  </button>
                )}
                <button onClick={() => handleDelete(note)} className="text-red-600 dark:text-red-400 hover:underline ml-auto">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <NoteFormModal note={editing} onClose={() => setModalOpen(false)} onSaved={load} />
      )}
    </div>
  );
}
