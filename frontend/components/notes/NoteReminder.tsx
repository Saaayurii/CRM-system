'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Note, notesApi } from '@/lib/notes';

// Module-level guard so the reminder is fetched once per full app load,
// not on every client-side route change (layout stays mounted).
let alreadyChecked = false;

// Paper tones per sticker color: base sheet + folded-corner (back) shade.
const PAPER: Record<string, { base: string; fold: string }> = {
  yellow: { base: '#f6edc8', fold: '#e7d9a4' },
  pink: { base: '#f8dbe6', fold: '#ecc2d2' },
  blue: { base: '#d9ecf8', fold: '#c1dcee' },
  green: { base: '#daf0e2', fold: '#c1e3cd' },
  orange: { base: '#f9e3cd', fold: '#eccfad' },
  purple: { base: '#e8ddf8', fold: '#d4c2ec' },
};

function Paperclip() {
  return (
    <svg
      viewBox="0 0 50 140"
      className="absolute -top-7 left-7 w-9 h-28 z-20 drop-shadow-[1px_2px_2px_rgba(0,0,0,0.3)]"
      fill="none"
      stroke="#dc2626"
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 40 a9 9 0 0 1 18 0 V104 a16.5 16.5 0 0 1 -33 0 V32 a13.5 13.5 0 0 1 27 0 V96" />
    </svg>
  );
}

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
  const paper = PAPER[current.color] || PAPER.yellow;

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 p-4">
      <div className="relative" style={{ transform: 'rotate(-1.5deg)' }}>
        <Paperclip />

        {/* Paper sheet */}
        <div
          className="relative w-[22rem] max-w-[90vw] min-h-[15rem] px-8 pt-9 pb-7 flex flex-col rounded-[3px]"
          style={{
            backgroundColor: paper.base,
            boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
              Напоминание
            </span>
            {remaining > 1 && (
              <span className="text-[11px] text-gray-500">ещё {remaining - 1}</span>
            )}
          </div>

          {current.title && (
            <h2 className="text-xl font-bold text-gray-800 mb-2 break-words leading-snug">
              {current.title}
            </h2>
          )}
          <p className="text-[15px] text-gray-700 whitespace-pre-wrap break-words flex-1 leading-relaxed">
            {current.content}
          </p>

          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={handleDone}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gray-800 hover:bg-gray-700 transition"
            >
              Готово
            </button>
            <button
              onClick={openNotes}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-black/5 hover:bg-black/10 transition"
            >
              Открыть заметки
            </button>
          </div>

          {/* Folded bottom-right corner (dog-ear) */}
          <div
            className="absolute bottom-0 right-0"
            style={{
              width: 38,
              height: 38,
              backgroundColor: paper.fold,
              clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
              boxShadow: '-3px -3px 6px rgba(0,0,0,0.18)',
              borderBottomRightRadius: '3px',
            }}
          />
        </div>
      </div>
    </div>
  );
}
