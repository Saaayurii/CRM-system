'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useChatStore, ChatChannel, ChatTopic } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/lib/i18n';
import TopicFormModal from './TopicFormModal';

const GLASS_SURFACE =
  'bg-white/72 dark:bg-gray-900/55 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]';

function fmtTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

interface TopicListViewProps {
  channel: ChatChannel;
  onBack: () => void;
  onOpenInfo: () => void;
  /** 'main' — на месте ленты (по центру); 'sidebar' — в левой колонке (режим «Список»). */
  variant?: 'main' | 'sidebar';
}

export default function TopicListView({ channel, onBack, onOpenInfo, variant = 'main' }: TopicListViewProps) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const topicsByChannel = useChatStore((s) => s.topicsByChannel);
  const activeTopicId = useChatStore((s) => s.activeTopicId);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const fetchTopics = useChatStore((s) => s.fetchTopics);
  const setActiveTopic = useChatStore((s) => s.setActiveTopic);
  const createTopic = useChatStore((s) => s.createTopic);
  const updateTopic = useChatStore((s) => s.updateTopic);
  const deleteTopic = useChatStore((s) => s.deleteTopic);
  const muteTopic = useChatStore((s) => s.muteTopic);
  const hideTopic = useChatStore((s) => s.hideTopic);

  const topics = topicsByChannel[channel.id];
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ChatTopic | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = (topicId: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuId(topicId);
  };
  const closeMenu = () => { setMenuId(null); setMenuPos(null); };

  const copyTopicLink = (topicId: number) => {
    const url = `${window.location.origin}/dashboard/chat?channelId=${channel.id}&topicId=${topicId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
  };

  // Управляющий: владелец или админ (оба обходят гранулярные права)
  const isAdmin = channel.myRole === 'admin' || channel.myRole === 'owner';
  const canCreate = (channel.createTopicsPermission ?? 'all') === 'all' || isAdmin;

  // Освежаем список тем при открытии канала: не только когда кэша нет, но и при
  // каждой смене канала — иначе счётчики непрочитанного остаются устаревшими
  // (WS обновляет их, но при возврате в канал нужен актуальный снимок с сервера).
  useEffect(() => {
    fetchTopics(channel.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  useEffect(() => {
    if (menuId === null) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    };
    const onScroll = () => closeMenu();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [menuId]);

  // Закреплённые темы — вверху списка, далее по времени последнего сообщения
  const sortTopics = (a: ChatTopic, b: ChatTopic) => {
    if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  };
  const list = topics ?? [];
  const visible = list.filter((tp) => !tp.isHiddenForMe).toSorted(sortTopics);
  const hidden = list.filter((tp) => tp.isHiddenForMe);

  const renderRow = (topic: ChatTopic) => {
    const canEdit = isAdmin || topic.createdByUserId === user?.id;
    const canDelete = canEdit && !topic.isGeneral;
    // Тема считается открытой только когда активен именно этот канал (иначе
    // прошлый activeTopicId подсветил бы тему в другом канале).
    const isActive = activeChannelId === channel.id && activeTopicId === topic.id;
    return (
      <div
        key={topic.id}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors ${GLASS_SURFACE} ${
          isActive
            ? 'ring-2 ring-violet-500 bg-violet-50/80 dark:bg-violet-900/30'
            : 'hover:bg-white/90 dark:hover:bg-gray-900/70'
        }`}
        onClick={() => setActiveTopic(channel.id, topic.id)}
      >
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${topic.color || '#64748b'}22` }}
        >
          <span>{topic.iconEmoji || '💬'}</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {topic.isPinned && (
              <svg className="w-3 h-3 text-violet-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
            )}
            {topic.isClosed && (
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            {!topic.isClosed && topic.postPermission === 'admins' && (
              <span className="shrink-0 text-[10px] leading-none px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-500 dark:text-violet-300" title={t('Писать могут только администраторы')}>
                {t('админы')}
              </span>
            )}
            {topic.isMutedForMe && (
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l4-4m0 4l-4-4" />
              </svg>
            )}
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{topic.name}</h4>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {topic.lastMessage
              ? `${topic.lastMessage.senderName ? topic.lastMessage.senderName + ': ' : ''}${topic.lastMessage.text}`
              : t('Нет сообщений')}
          </p>
        </div>

        {/* Meta */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
            {fmtTime(topic.lastMessage?.createdAt || topic.lastMessageAt)}
          </span>
          {topic.unreadCount > 0 && (
            <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full ${topic.isMutedForMe ? 'bg-gray-400 dark:bg-gray-600' : 'bg-violet-500'}`}>
              {topic.unreadCount > 99 ? '99+' : topic.unreadCount}
            </span>
          )}
        </div>

        {/* Actions menu (доступно всем; редактирование/закрытие/удаление — по правам) */}
        <button
          onClick={(e) => { e.stopPropagation(); if (menuId === topic.id) { closeMenu(); } else { openMenu(topic.id, e.currentTarget); } }}
          className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
          title={t('Действия')}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>

        {menuId === topic.id && menuPos && createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="z-[200] w-52 py-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
          >
            <button
              onClick={() => { copyTopicLink(topic.id); closeMenu(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('Скопировать ссылку')}
            </button>
            <button
              onClick={() => { muteTopic(channel.id, topic.id, topic.isMutedForMe ? null : new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000)); closeMenu(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {topic.isMutedForMe ? t('Включить уведомления') : t('Выключить уведомления')}
            </button>
            <button
              onClick={() => { hideTopic(channel.id, topic.id, !topic.isHiddenForMe); closeMenu(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {topic.isHiddenForMe ? t('Показать тему') : t('Скрыть тему')}
            </button>
            {canEdit && (
              <button
                onClick={() => { setEditing(topic); closeMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t('Изменить')}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { updateTopic(channel.id, topic.id, { isPinned: !topic.isPinned }); closeMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {topic.isPinned ? t('Открепить') : t('Закрепить')}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { updateTopic(channel.id, topic.id, { postPermission: topic.postPermission === 'admins' ? 'all' : 'admins' }); closeMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {topic.postPermission === 'admins' ? t('Разрешить писать всем') : t('Писать могут только админы')}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { updateTopic(channel.id, topic.id, { isClosed: !topic.isClosed }); closeMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {topic.isClosed ? t('Переоткрыть') : t('Закрыть')}
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => {
                  if (confirm(t('Удалить тему вместе с сообщениями?'))) deleteTopic(channel.id, topic.id);
                  closeMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                {t('Удалить')}
              </button>
            )}
          </div>,
          document.body,
        )}
      </div>
    );
  };

  const isSidebar = variant === 'sidebar';
  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 relative bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0 z-10">
        <button
          onClick={onBack}
          className={`${isSidebar ? 'hidden' : 'lg:hidden'} shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-200 ${GLASS_SURFACE}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onOpenInfo}
          className={`flex items-center gap-2.5 min-w-0 mr-auto pl-1.5 pr-3.5 py-1.5 rounded-full text-left cursor-pointer ${GLASS_SURFACE}`}
        >
          <div className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden relative shrink-0">
            {channel.avatarUrl ? (
              <img src={channel.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              (channel.channelName || 'Г').slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {channel.channelName || t('Группа')}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {visible.length} {t('тем')}
            </p>
          </div>
        </button>

        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-violet-600 dark:text-violet-400 ${GLASS_SURFACE}`}
            title={t('Создать тему')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        <button
          onClick={onOpenInfo}
          className={`shrink-0 p-2.5 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${GLASS_SURFACE}`}
          title={t('Информация')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {topics === undefined && (
          <div className="flex justify-center items-center h-32">
            <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {topics !== undefined && list.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400 dark:text-gray-500 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-sm">{t('Тем пока нет')}</p>
          </div>
        )}

        {visible.map(renderRow)}

        {/* Скрытые темы */}
        {hidden.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setShowHidden((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span>{t('Скрытые темы')} ({hidden.length})</span>
              <svg className={`w-4 h-4 transition-transform ${showHidden ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showHidden && <div className="space-y-0.5 opacity-70">{hidden.map(renderRow)}</div>}
          </div>
        )}
      </div>

      {showCreate && (
        <TopicFormModal
          mode="create"
          onSubmit={async (data) => { await createTopic(channel.id, data); }}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editing && (
        <TopicFormModal
          mode="edit"
          initial={{ name: editing.name, iconEmoji: editing.iconEmoji, color: editing.color }}
          onSubmit={async (data) => { await updateTopic(channel.id, editing.id, data); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
