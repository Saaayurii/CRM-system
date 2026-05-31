'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Note, noteColorClass, notesApi } from '@/lib/notes';

// Module-level guard so the reminder is fetched once per full app load,
// not on every client-side route change (layout stays mounted).
let alreadyChecked = false;

export default function NoteReminder() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [queue, setQueue] = useState<Note[]>([]);

  useEffect(() => {
    if (!user || user.roleId === 15 || alreadyChecked) return;
    alreadyChecked = true;
    notesApi
      .due()
      .then(({ data }) => setQueue(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [user]);

  if (queue.length === 0) return null;

  const current = queue[0];
  const remaining = queue.length;

  const next = () => setQueue((q) => q.slice(1));

  const handleDone = async () => {
    try {
      await notesApi.dismiss(current.id);
    } catch {
      /* keep it due — будет показано при следующем входе */
    }
    next();
  };

  const openNotes = () => {
    setQueue([]);
    router.push('/dashboard/notes');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 p-4">
      <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-6 ${noteColorClass(current.color)}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
            Напоминание
          </span>
          {remaining > 1 && (
            <span className="text-xs text-gray-600 dark:text-gray-300">ещё {remaining - 1}</span>
          )}
        </div>

        {current.title && (
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 break-words">{current.title}</h2>
        )}
        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words mb-5">
          {current.content}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDone}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gray-800 dark:bg-gray-900 hover:bg-gray-700"
          >
            Готово
          </button>
          <button
            onClick={openNotes}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/60 dark:bg-gray-800/60 hover:bg-white/90"
          >
            Открыть заметки
          </button>
        </div>
      </div>
    </div>
  );
}
