'use client';

import { useState } from 'react';
import { useChatStore, ChatChannel, ChatTopic } from '@/stores/chatStore';
import { useT } from '@/lib/i18n';
import TopicFormModal from './TopicFormModal';

interface TopicTabsRailProps {
  channel: ChatChannel;
}

/**
 * Вертикальный рельс вкладок тем (режим «Вкладки» — как в Telegram).
 * Рендерится слева от ленты сообщений; активная тема всегда открыта.
 */
export default function TopicTabsRail({ channel }: TopicTabsRailProps) {
  const t = useT();
  const topicsByChannel = useChatStore((s) => s.topicsByChannel);
  const activeTopicId = useChatStore((s) => s.activeTopicId);
  const setActiveTopic = useChatStore((s) => s.setActiveTopic);
  const createTopic = useChatStore((s) => s.createTopic);
  const [showCreate, setShowCreate] = useState(false);

  const list = (topicsByChannel[channel.id] ?? []).filter((tp) => !tp.isHiddenForMe);
  const isAdmin = channel.myRole === 'admin';
  const canCreate = (channel.createTopicsPermission ?? 'all') === 'all' || isAdmin;

  // «Все» — псевдо-вкладка, показывающая ленту канала (тема General/первая)
  const generalId = list.find((tp) => tp.isGeneral)?.id ?? list[0]?.id ?? null;

  const renderTab = ({ topic, label, icon, id }: { topic?: ChatTopic; label: string; icon: React.ReactNode; id: number | null }) => {
    const active = id != null && activeTopicId === id;
    const unread = topic?.unreadCount ?? 0;
    return (
      <button
        key={id ?? 'all'}
        onClick={() => id != null && setActiveTopic(channel.id, id)}
        className="relative w-full flex flex-col items-center gap-1 py-2.5 group"
        title={label}
      >
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-colors ${active ? 'bg-violet-500' : 'bg-transparent'}`} />
        <span
          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-colors ${
            active ? 'bg-violet-500/15 dark:bg-violet-500/25' : 'bg-black/[0.04] dark:bg-white/[0.06] group-hover:bg-black/[0.07] dark:group-hover:bg-white/10'
          }`}
          style={topic?.color ? { backgroundColor: active ? `${topic.color}33` : `${topic.color}18` } : undefined}
        >
          {icon}
          {unread > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full ${topic?.isMutedForMe ? 'bg-gray-400 dark:bg-gray-600' : 'bg-violet-500'}`}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </span>
        <span className={`text-[10px] leading-tight text-center px-0.5 truncate max-w-full ${active ? 'text-violet-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="shrink-0 w-[72px] flex flex-col border-r border-gray-200 dark:border-gray-700/70 bg-white/60 dark:bg-gray-900/50 backdrop-blur-xl">
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {/* «Все» = General */}
        {renderTab({
          id: generalId,
          topic: list.find((tp) => tp.id === generalId),
          label: t('Все'),
          icon: (
            <svg className="w-6 h-6 text-violet-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          ),
        })}
        {list
          .filter((tp) => tp.id !== generalId)
          .map((tp) => renderTab({ id: tp.id, topic: tp, label: tp.name, icon: <span>{tp.iconEmoji || '#'}</span> }))}
      </div>

      {canCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 m-2 h-11 rounded-2xl flex items-center justify-center text-violet-500 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
          title={t('Создать тему')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {showCreate && (
        <TopicFormModal
          mode="create"
          onSubmit={async (data) => {
            const created = await createTopic(channel.id, data);
            if (created) setActiveTopic(channel.id, created.id);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
