'use client';

import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import {
  getChannelDisplayName,
  getDirectChannelAvatarUrl,
  isSelfChat,
  getInitials,
  profileColorBg,
} from '@/lib/chat/channelDisplay';

interface ChatAvatarRailProps {
  /** Вернуться к полному списку чатов. */
  onBack: () => void;
  /** Поиск по имени чата (из общей шапки). */
  search?: string;
  /** Активная папка-проект ('all' или projectId). */
  activeFolder?: 'all' | number;
}

/**
 * Узкий вертикальный рельс аватарок чатов (свёрнутый список чатов).
 * Показывается слева, когда открыт форум в режиме «Список» — чаты остаются
 * доступны иконками, а список тем занимает колонку правее.
 */
export default function ChatAvatarRail({ onBack, search = '', activeFolder = 'all' }: ChatAvatarRailProps) {
  const user = useAuthStore((s) => s.user);
  const channels = useChatStore((s) => s.channels);
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);

  // Фильтрация как в полном списке чатов: сначала папка-проект, затем поиск.
  const folderFiltered =
    activeFolder === 'all' ? channels : channels.filter((ch) => ch.projectId === activeFolder);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? folderFiltered.filter((ch) => {
        const name = isSelfChat(ch, user?.id) ? 'Избранное' : getChannelDisplayName(ch, user?.id);
        return name.toLowerCase().includes(q);
      })
    : folderFiltered;

  const selfChat = activeFolder === 'all' ? filtered.find((ch) => isSelfChat(ch, user?.id)) : undefined;
  const others = filtered.filter((ch) => !isSelfChat(ch, user?.id));
  const pinned = others.filter((ch) => ch.isPinned);
  const rest = others.filter((ch) => !ch.isPinned);
  const ordered = [...(selfChat ? [selfChat] : []), ...pinned, ...rest];

  return (
    <div className="shrink-0 w-[68px] min-h-0 flex flex-col border-r border-gray-200 dark:border-gray-700/70 bg-gray-50 dark:bg-gray-900">
      {/* Назад к полному списку чатов */}
      <button
        onClick={onBack}
        title="Все чаты"
        className="shrink-0 h-12 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex-1 overflow-y-auto scrollbar-none py-1.5 flex flex-col items-center gap-1.5">
        {ordered.map((ch) => {
          const self = isSelfChat(ch, user?.id);
          const name = self ? 'Избранное' : getChannelDisplayName(ch, user?.id);
          const avatarUrl = ch.avatarUrl ?? getDirectChannelAvatarUrl(ch, user?.id);
          const unread = unreadCounts[ch.id] || 0;
          const active = ch.id === activeChannelId;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              title={name}
              className="relative w-full flex justify-center py-0.5"
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-violet-500" />}
              {/* Обёртка relative без overflow — чтобы бейдж не обрезался
                  круглым аватаром (overflow-hidden) и висел снаружи, внизу справа */}
              <span className="relative inline-flex">
                <span
                  className={`relative w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden transition-transform ${
                    self ? 'bg-amber-400' : ch.channelType === 'group' ? profileColorBg(ch.profileColor) : 'bg-sky-500'
                  } ${active ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}`}
                >
                  {self ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  ) : (
                    getInitials(name)
                  )}
                  {avatarUrl && (
                    <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
                </span>
                {unread > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-violet-500 rounded-full ring-2 ring-gray-50 dark:ring-gray-900 z-10">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
