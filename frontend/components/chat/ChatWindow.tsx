'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useChatStore, ChatChannel, ChatMessage as ChatMessageType } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useToastStore } from '@/stores/toastStore';
import { getChatBackground, getWallpaperBackground, WALLPAPERS, type WallpaperId } from '@/lib/appearance';
import { useBubbleGradientFlow } from '@/hooks/useBubbleGradientFlow';
import { formatLastSeen } from '@/lib/chat/channelDisplay';
import api from '@/lib/api';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import UserProfileModal from './UserProfileModal';
import VoicePlayerBar from './VoicePlayerBar';
import ForwardMessageModal from './ForwardMessageModal';
import TopicListView from './TopicListView';
import TopicTabsRail from './TopicTabsRail';
import ScheduledMessagesView from './ScheduledMessagesView';
import { useT } from '@/lib/i18n';

/* Плавающие «стеклянные» поверхности шапки и input-бара чата (Liquid Glass,
   как в Telegram iOS): полупрозрачное молочное стекло + блюр + тонкая рамка и
   мягкая тень. Применяется во всех темах — куски парят поверх ленты. */
const GLASS_SURFACE =
  'bg-white/72 dark:bg-gray-900/55 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]';

/* ───────── Date helpers ───────── */

const RU_MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const RU_MONTHS_FULL = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const RU_DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function toDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateSep(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return 'Сегодня';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Вчера';
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
  }
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* ───────── Calendar Modal ───────── */

function CalendarModal({
  messageDates,
  onSelectDate,
  onClose,
}: {
  messageDates: Set<string>;
  onSelectDate: (key: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Mon=0

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Card */}
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 w-72 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{RU_MONTHS_FULL[viewMonth]} {viewYear}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {RU_DOW.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-0.5">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const key = `${viewYear}-${viewMonth}-${day}`;
            const hasMsg = messageDates.has(key);
            const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
            return (
              <button
                key={i}
                onClick={() => { if (hasMsg) { onSelectDate(key); onClose(); } }}
                disabled={!hasMsg}
                className={[
                  'relative w-full aspect-square flex items-center justify-center text-xs rounded-full transition-colors',
                  isToday ? 'font-bold ring-1 ring-violet-400' : '',
                  hasMsg
                    ? 'text-gray-800 dark:text-gray-100 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 cursor-pointer'
                    : 'text-gray-300 dark:text-gray-600 cursor-default',
                ].join(' ')}
              >
                {day}
                {hasMsg && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hint */}
        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-3">
          Дни с сообщениями помечены точкой
        </p>
      </div>
    </div>
  );
}

interface ChatWindowProps {
  onBack: () => void;
}

export default function ChatWindow({ onBack }: ChatWindowProps) {
  const chatWallpaper = useThemeStore((s) => s.appearance.chatWallpaper);
  const customWallpaperUrl = useThemeStore((s) => s.appearance.customWallpaperUrl);
  const customWallpaperColor = useThemeStore((s) => s.appearance.customWallpaperColor);
  const chatPattern = useThemeStore((s) => s.appearance.chatPattern);
  const patternContrast = useThemeStore((s) => s.appearance.patternContrast);
  const resolvedTheme = useThemeStore((s) => s.theme);
  const wallpaperStyle = getChatBackground({ chatWallpaper, customWallpaperUrl, customWallpaperColor, chatPattern, patternContrast }, resolvedTheme);
  const t = useT();
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const messages = useChatStore((s) => s.messages);
  const channels = useChatStore((s) => s.channels);
  const archivedChannels = useChatStore((s) => s.archivedChannels);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const activityUsers = useChatStore((s) => s.activityUsers);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const setReplyToMessage = useChatStore((s) => s.setReplyToMessage);
  const deleteMessageSocket = useChatStore((s) => s.deleteMessage);
  const editMessageSocket = useChatStore((s) => s.editMessage);
  const reactToMessage = useChatStore((s) => s.reactToMessage);
  const pinMessageSocket = useChatStore((s) => s.pinMessage);
  const unpinMessageSocket = useChatStore((s) => s.unpinMessage);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const channelReadAts = useChatStore((s) => s.channelReadAts);
  const topicReadAts = useChatStore((s) => s.topicReadAts);
  const setChatWindowOpen = useChatStore((s) => s.setChatWindowOpen);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const setShowArchive = useChatStore((s) => s.setShowArchive);
  const topicsByChannel = useChatStore((s) => s.topicsByChannel);
  const activeTopicId = useChatStore((s) => s.activeTopicId);
  const setActiveTopic = useChatStore((s) => s.setActiveTopic);
  const fetchScheduled = useChatStore((s) => s.fetchScheduled);
  const highlightMessageId = useChatStore((s) => s.highlightMessageId);
  const setHighlightMessageId = useChatStore((s) => s.setHighlightMessageId);
  const user = useAuthStore((s) => s.user);

  const handleGoToOriginalChannel = useCallback((channelId: number) => {
    setShowArchive(false);
    setActiveChannel(channelId);
  }, [setActiveChannel, setShowArchive]);

  useEffect(() => {
    setChatWindowOpen(true);
    return () => setChatWindowOpen(false);
  }, [setChatWindowOpen]);

  // Scroll to bottom when keyboard appears (iOS visual viewport resize)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      // Small timeout lets the container resize first
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const [forwardingMessage, setForwardingMessage] = useState<ChatMessageType | null>(null);
  // Панель «Информация» — общий флаг в сторе, чтобы кнопка (i) в списке тем
  // (в сайдбаре) и шапка чата управляли одной и той же панелью.
  const showInfo = useChatStore((s) => s.infoPanelOpen);
  const setShowInfo = useChatStore((s) => s.setInfoPanelOpen);
  const [showScheduled, setShowScheduled] = useState(false);
  // Центральная карточка профиля (в личных диалогах клик по шапке открывает её
  // вместо правой панели «О пользователе»)
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIdx, setMatchIdx] = useState(0);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  // Скрываем ленту до первого прыжка к низу при открытии канала — иначе на iOS
  // видно, как сообщения сначала рисуются сверху, а потом скачком уезжают вниз.
  const [initialScrollReady, setInitialScrollReady] = useState(false);
  // Сколько новых сообщений пришло, пока читаем историю выше — бейдж на стрелке «вниз»
  const [newBelowCount, setNewBelowCount] = useState(0);
  const [snapParticles, setSnapParticles] = useState<{ id: number; tx: number; ty: number; size: number; hue: number; delay: number }[]>([]);
  const [isSnapping, setIsSnapping] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const pendingScrollIdRef = useRef<number | null>(null);
  const scrollFetchAttemptsRef = useRef(0);
  const MAX_SCROLL_FETCHES = 20; // 20 × 50 = 1000 сообщений максимум

  const doHighlightScroll = useCallback((id: number) => {
    const container = messagesContainerRef.current;
    const el = container?.querySelector(`[data-msgid="${id}"]`);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMsgId(id);
    setTimeout(() => setHighlightedMsgId(null), 1700);
    return true;
  }, []);

  const scrollToMessage = useCallback((id: number) => {
    if (doHighlightScroll(id)) return;
    // Сообщение не загружено — запускаем подгрузку
    pendingScrollIdRef.current = id;
    scrollFetchAttemptsRef.current = 0;
  }, [doHighlightScroll]);

  // После каждой загрузки сообщений — проверяем есть ли ожидаемый элемент в DOM
  useEffect(() => {
    const id = pendingScrollIdRef.current;
    if (id === null || isLoadingMessages) return;

    if (doHighlightScroll(id)) {
      pendingScrollIdRef.current = null;
      scrollFetchAttemptsRef.current = 0;
      return;
    }

    // Ещё не нашли — грузим следующую пачку
    if (!hasMoreMessages || scrollFetchAttemptsRef.current >= MAX_SCROLL_FETCHES || !activeChannelId) {
      pendingScrollIdRef.current = null;
      scrollFetchAttemptsRef.current = 0;
      return;
    }

    const firstMsgId = messages[0]?.id;
    if (!firstMsgId) { pendingScrollIdRef.current = null; return; }

    scrollFetchAttemptsRef.current++;
    // Сохраняем scrollHeight чтобы не прыгать при prepend
    const container = messagesContainerRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    fetchMessages(activeChannelId, firstMsgId).then(() => {
      // Восстанавливаем позицию только если ещё не нашли (иначе doHighlightScroll сделает своё)
      if (pendingScrollIdRef.current !== null && container) {
        container.scrollTop = container.scrollHeight - prevHeight;
      }
    });
  }, [messages, isLoadingMessages, hasMoreMessages, activeChannelId, fetchMessages, doHighlightScroll]);

  // При смене канала сбрасываем ожидающий скролл, режим редактирования и счётчик новых
  useEffect(() => {
    pendingScrollIdRef.current = null;
    scrollFetchAttemptsRef.current = 0;
    setEditingMessage(null);
    setNewBelowCount(0);
  }, [activeChannelId, setEditingMessage]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Плавающая «жидкое-стекло» шапка лежит поверх ленты — измеряем её высоту,
  // чтобы добавить такой же отступ сверху списка сообщений (контент проступает
  // сквозь матовое стекло, как в iOS). Высота меняется при показе поиска,
  // закреплённого сообщения, плеера голосового — ResizeObserver ловит всё.
  const topStackRef = useRef<HTMLDivElement>(null);
  const [topStackHeight, setTopStackHeight] = useState(60);
  useEffect(() => {
    const el = topStackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTopStackHeight(el.offsetHeight));
    ro.observe(el);
    setTopStackHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [activeChannelId]);
  // Нижний бар (input/плашка) — тоже плавающий оверлей: лента уходит за него
  // при скролле (как за шапку). Высота динамична (вложения, многострочный ввод,
  // запись голоса) — ResizeObserver держит нижний отступ ленты в актуале.
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(64);
  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBottomBarHeight(el.offsetHeight));
    ro.observe(el);
    setBottomBarHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [activeChannelId]);
  // «Градиент по всем сообщениям» — срез общего градиента на каждом пузыре
  // revision = messages.length + активный канал: при первой загрузке/смене канала
// заново заводим серию пересчётов среза (важно для коротких, непрокручиваемых чатов)
useBubbleGradientFlow(messagesContainerRef, `${activeChannelId}:${messages.length}`);

  // Deep-link на сообщение: скроллим и подсвечиваем; если не загружено —
  // подгружаем историю старше, пока не найдём (или не кончится).
  useEffect(() => {
    if (!highlightMessageId) return;
    const el = messagesContainerRef.current?.querySelector(
      `[data-msgid="${highlightMessageId}"]`,
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background-color 0.4s';
      el.style.backgroundColor = 'rgba(139,92,246,0.16)';
      el.style.borderRadius = '12px';
      const tmr = setTimeout(() => {
        el.style.backgroundColor = '';
        setHighlightMessageId(null);
      }, 2000);
      return () => clearTimeout(tmr);
    }
    // не найдено в загруженных — тянем старше
    if (activeChannelId && messages.length > 0 && hasMoreMessages && !isLoadingMessages) {
      fetchMessages(activeChannelId, messages[0]?.id);
    } else if (!hasMoreMessages) {
      setHighlightMessageId(null); // нигде нет — прекращаем поиск
    }
  }, [messages, highlightMessageId, hasMoreMessages, isLoadingMessages, activeChannelId, fetchMessages, setHighlightMessageId]);
  // Плавающая дата сверху: при скролле показываем день, к которому относится
  // верхнее видимое сообщение (как в Telegram), и плавно прячем после паузы.
  const [floatingDate, setFloatingDate] = useState<string | null>(null);
  const [floatingDateShown, setFloatingDateShown] = useState(false);
  const floatingHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const cTop = container.getBoundingClientRect().top + topStackHeight + 8;
      const nodes = container.querySelectorAll('[data-msgid]');
      for (const node of Array.from(nodes)) {
        const r = (node as HTMLElement).getBoundingClientRect();
        if (r.bottom >= cTop) {
          const id = Number((node as HTMLElement).dataset.msgid);
          const m = messages.find((x) => x.id === id);
          if (m) setFloatingDate(formatDateSep(m.createdAt));
          break;
        }
      }
      setFloatingDateShown(true);
      if (floatingHideTimer.current) clearTimeout(floatingHideTimer.current);
      floatingHideTimer.current = setTimeout(() => setFloatingDateShown(false), 1400);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (floatingHideTimer.current) clearTimeout(floatingHideTimer.current);
    };
  }, [messages, topStackHeight]);
  const messagesInnerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef(0);
  const lastMsgIdRef = useRef<number | null>(null);
  const initialLoadRef = useRef(false);
  const isInitialLoadingRef = useRef(false);
  const wasAtBottomRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChannel = channels.find((ch) => ch.id === activeChannelId)
    ?? archivedChannels.find((ch) => ch.id === activeChannelId);
  // Обои группы (заданные админом в «Оформление») перекрывают личные обои
  // в пределах этого канала — единый фон у всех участников.
  const effectiveWallpaperStyle = useMemo(() => {
    const gw = activeChannel?.channelType === 'group' ? activeChannel.wallpaper : null;
    if (gw) {
      const gradient = getWallpaperBackground(gw as WallpaperId, resolvedTheme);
      if (gradient) {
        return {
          backgroundImage: gradient,
          backgroundSize: 'auto',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        } as React.CSSProperties;
      }
    }
    return wallpaperStyle;
  }, [activeChannel?.channelType, activeChannel?.wallpaper, resolvedTheme, wallpaperStyle]);
  // Темы (Telegram-style forum): форум-канал с включёнными темами.
  const isForum = activeChannel?.channelType === 'group' && !!activeChannel?.topicsEnabled;
  const topicsLayout = activeChannel?.topicsLayout ?? 'list';
  const channelTopics = activeChannelId ? topicsByChannel[activeChannelId] : undefined;
  const activeTopic = isForum && activeTopicId
    ? channelTopics?.find((t) => t.id === activeTopicId) ?? null
    : null;
  // Форум (главная область, список чатов слева остаётся полным):
  // «Список» — сначала полный список тем, затем лента выбранной темы.
  // «Вкладки» — сразу открывается тема + горизонтальная полоса вкладок сверху.
  const forumTabs = isForum && topicsLayout === 'tabs';
  // «Список»: список тем живёт в левой колонке (см. ChatScreen), поэтому в
  // главной области, пока тема не выбрана, показываем плейсхолдер.
  const forumListNoTopic = isForum && topicsLayout === 'list' && activeTopicId == null;

  // Набор реакций из настроек группы: 'none' → отключены, 'selected' → только выбранные
  const reactionEmojis = useMemo<string[] | undefined>(() => {
    if (!activeChannel) return undefined;
    if (activeChannel.reactionsMode === 'none') return [];
    if (activeChannel.reactionsMode === 'selected') return activeChannel.allowedReactions ?? [];
    return undefined;
  }, [activeChannel?.reactionsMode, activeChannel?.allowedReactions, activeChannel]);

  // Отложенные сообщения канала: загружаем при открытии, сбрасываем экран
  useEffect(() => {
    setShowScheduled(false);
    if (activeChannelId != null) fetchScheduled(activeChannelId);
  }, [activeChannelId, fetchScheduled]);

  // Режим «Вкладки»: при открытии форума сразу открываем тему (General/первую),
  // чтобы показать ленту + горизонтальные вкладки (а не список тем)
  useEffect(() => {
    if (!forumTabs || activeChannelId == null || activeTopicId != null) return;
    const tps = channelTopics;
    if (!tps || tps.length === 0) return;
    const first = tps.find((tp) => tp.isGeneral) ?? tps[0];
    if (first) setActiveTopic(activeChannelId, first.id);
  }, [forumTabs, activeChannelId, activeTopicId, channelTopics, setActiveTopic]);
  const channelTyping = activeChannelId ? typingUsers[activeChannelId] || [] : [];
  const channelActivity = activeChannelId ? activityUsers[activeChannelId] || [] : [];

  // Подпись индикатора: загрузка медиа/файла приоритетнее «печатает»
  const activityVerb = (kind: string): string =>
    kind === 'photo' ? 'отправляет фото'
    : kind === 'video' ? 'отправляет видео'
    : kind === 'voice' ? 'записывает голосовое'
    : 'отправляет файл';
  const presenceLabel: string | null = channelActivity.length > 0
    ? (channelActivity.length === 1
        ? `${channelActivity[0].name} ${activityVerb(channelActivity[0].kind)}…`
        : `${channelActivity.map((u) => u.name).join(', ')} отправляют файлы…`)
    : channelTyping.length > 0
    ? (channelTyping.length === 1
        ? `${channelTyping[0].name} печатает…`
        : `${channelTyping.map((u) => u.name).join(', ')} печатают…`)
    : null;

  const currentMember = useMemo(
    () => activeChannel?.members?.find((m) => m.id === user?.id),
    [activeChannel, user?.id],
  );
  const isCurrentUserMuted = currentMember?.isMuted ?? false;
  // Управляющий канала: владелец или админ (оба обходят гранулярные права)
  const isCurrentUserAdmin = currentMember?.role === 'admin' || currentMember?.role === 'owner';
  // Закрытая тема: писать могут только владелец/админы канала
  const topicClosed = !!(activeTopic?.isClosed && !isCurrentUserAdmin);
  const isCompanyAdmin = user?.roleId === 1 || user?.roleId === 2;

  // Эффективное право участника (владелец/админ обходят): право канала И личный
  // оверрайд. Зеркалит бэкенд (resolveCapabilities) — чтобы UI не предлагал то,
  // что сервер отклонит.
  const cap = useCallback((key: string): boolean => {
    if (isCurrentUserAdmin) return true;
    if ((activeChannel?.permissions?.[key]) === false) return false;
    if ((currentMember?.permissions?.[key]) === false) return false;
    return true;
  }, [isCurrentUserAdmin, activeChannel?.permissions, currentMember?.permissions]);

  // Ограничение записи в теме для обычного участника: только админы, либо
  // поимённый список (custom) — если пользователя в нём нет.
  const topicPostBlocked = !!(
    activeTopic && !isCurrentUserAdmin && (
      activeTopic.postPermission === 'admins' ||
      (activeTopic.postPermission === 'custom' &&
        !(activeTopic.allowedUserIds ?? []).includes(user?.id ?? -1))
    )
  );
  const cannotSendText = !cap('sendMessages') || topicPostBlocked;
  const composerCaps = {
    media: cap('sendMedia'),
    files: cap('sendFiles'),
    voice: cap('sendVoice'),
  };

  // Self-chat detection
  const isSelf =
    activeChannel?.channelType === 'direct' &&
    (activeChannel.members?.every((m) => m.id === user?.id) ?? false);

  // Partner info for direct chats
  const partner =
    !isSelf && activeChannel?.channelType === 'direct'
      ? activeChannel.members?.find((m) => m.id !== user?.id)
      : null;

  const isPartnerOnline = partner ? onlineUsers.has(partner.id) : false;

  // «был(а) в сети N минут назад» для офлайн-собеседника
  const lastSeenAt = useChatStore((s) => s.lastSeenAt);
  const fetchLastSeen = useChatStore((s) => s.fetchLastSeen);
  const partnerId = partner?.id;
  useEffect(() => {
    if (partnerId && !isPartnerOnline) fetchLastSeen([partnerId]);
  }, [partnerId, isPartnerOnline, fetchLastSeen]);
  // Тикер раз в минуту, чтобы «N минут назад» не застывало
  const [, setLastSeenTick] = useState(0);
  useEffect(() => {
    if (!partnerId || isPartnerOnline) return;
    const timer = setInterval(() => setLastSeenTick((v) => v + 1), 60_000);
    return () => clearInterval(timer);
  }, [partnerId, isPartnerOnline]);
  const partnerLastSeenText = partnerId ? formatLastSeen(lastSeenAt[partnerId]) : null;

  const channelDisplayName = isSelf
    ? 'Избранное'
    : activeChannel?.channelType === 'group'
    ? activeChannel.channelName || 'Группа'
    : partner?.name || partner?.email || activeChannel?.channelName || '';

  // Compute search matches
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return messages
      .map((m, idx) => ({ msg: m, idx }))
      .filter(({ msg }) => msg.text?.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  // Reset match index when query changes
  useEffect(() => { setMatchIdx(0); }, [searchQuery]);

  // Scroll to active match
  useEffect(() => {
    if (searchMatches.length === 0) return;
    const target = searchMatches[matchIdx];
    if (!target) return;
    const el = document.querySelector(`[data-msgid="${target.msg.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [matchIdx, searchMatches]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
    else setSearchQuery('');
  }, [showSearch]);

  // Ctrl+F to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const stepMatch = (dir: 1 | -1) => {
    if (searchMatches.length === 0) return;
    setMatchIdx((i) => (i + dir + searchMatches.length) % searchMatches.length);
  };

  // Date keys of all loaded messages for calendar highlighting
  const messageDates = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => set.add(toDateKey(m.createdAt)));
    return set;
  }, [messages]);

  const scrollToDate = useCallback((key: string) => {
    const first = messages.find((m) => toDateKey(m.createdAt) === key);
    if (!first) return;
    const el = messagesContainerRef.current?.querySelector(`[data-msgid="${first.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [messages]);


  // Mark initial load when channel или тема меняется (для плавного появления ленты)
  useEffect(() => {
    if (activeChannelId) {
      initialLoadRef.current = true;
      isInitialLoadingRef.current = true;
      prevMessagesLenRef.current = 0;
      setInitialScrollReady(false); // hide list until first snap-to-bottom
    }
  }, [activeChannelId, activeTopicId]);

  // Auto-scroll: instant on initial load, smooth on new messages.
  // Initial load schedules several re-scrolls because images/videos in messages
  // load asynchronously and shift layout — without retries, mobile opens
  // chat with the scroll stuck mid-way after media loads.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      isInitialLoadingRef.current = false;
      prevMessagesLenRef.current = messages.length;
      lastMsgIdRef.current = messages[messages.length - 1]?.id ?? null;
      wasAtBottomRef.current = true;

      // Snap to bottom, but stop the moment the user scrolls up. We flag the
      // scroll as programmatic only briefly (80ms) so a genuine user scroll
      // between snaps is detected — otherwise media loading keeps yanking the
      // view back to the bottom while the user is trying to read history.
      const snap = () => {
        if (!wasAtBottomRef.current) return;
        isProgrammaticScrollRef.current = true;
        // Direct scrollTop is instant & synchronous on iOS, unlike scrollIntoView
        // (which can apply a frame late → the list is revealed before the scroll
        // lands → visible jump). Fall back to the anchor if the ref isn't ready.
        const c = messagesContainerRef.current;
        if (c) c.scrollTop = c.scrollHeight;
        else messagesEndRef.current?.scrollIntoView();
        if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);
        programmaticScrollTimerRef.current = setTimeout(() => { isProgrammaticScrollRef.current = false; }, 80);
      };
      snap();
      // Reveal the list only after the snap is applied (next frames), so the
      // top→bottom jump happens off-screen instead of flashing on iOS.
      requestAnimationFrame(() => requestAnimationFrame(() => setInitialScrollReady(true)));
      // Catch layout shifts from media (img/video) loading after first paint.
      const timers = [60, 150, 300, 600, 1200].map((ms) => setTimeout(snap, ms));
      // Wire onload on every <img> currently inside the messages container.
      const imgs = container.querySelectorAll('img');
      imgs.forEach((img) => {
        if (!img.complete) img.addEventListener('load', snap, { once: true });
      });
      return () => {
        timers.forEach(clearTimeout);
        imgs.forEach((img) => img.removeEventListener('load', snap));
      };
    }

    // «Новое сообщение» — только append в конец (id последнего изменился).
    // Подгрузка истории сверху тоже растит length, но последний id тот же —
    // иначе prepend ошибочно уводил чат вниз/вверх (последнее сообщение
    // почти всегда своё, и isOwnNew срабатывал на каждую подгрузку).
    const lastMsg = messages[messages.length - 1];
    const isNewMessage =
      messages.length > prevMessagesLenRef.current &&
      lastMsg != null &&
      lastMsg.id !== lastMsgIdRef.current;
    prevMessagesLenRef.current = messages.length;
    lastMsgIdRef.current = lastMsg?.id ?? null;
    if (isNewMessage) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      // Своё сообщение всегда уводит вниз, даже если читали историю выше
      const isOwnNew = lastMsg && lastMsg.senderId === user?.id;
      if (isNearBottom || isOwnNew) {
        // Гасим якорь подгрузки истории, иначе ResizeObserver вернёт скролл
        // обратно к старой позиции и сообщение «отскроллит» в историю
        prependAnchorRef.current = null;
        if (prependStabilizeTimerRef.current) clearTimeout(prependStabilizeTimerRef.current);
        // Флаг на время smooth-анимации: события скролла не должны запускать
        // автоподгрузку истории и сбрасывать wasAtBottom
        isProgrammaticScrollRef.current = true;
        if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);
        programmaticScrollTimerRef.current = setTimeout(() => { isProgrammaticScrollRef.current = false; }, 600);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        wasAtBottomRef.current = true;
        setNewBelowCount(0);
      } else if (lastMsg) {
        // Читаем историю выше — копим счётчик на стрелке «вниз»
        setNewBelowCount((c) => c + 1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // ── Якорь при подгрузке истории ───────────────────────────────────────────
  // Восстановить позицию по разнице высот недостаточно: картинки/видео из
  // подгруженной пачки декодируются позже и снова раздувают высоту сверху —
  // чат прыгает. Поэтому держим «якорь» (первое сообщение, которое было на
  // экране до подгрузки) и при каждом изменении высоты возвращаем его на
  // прежнее место, пока медиа пачки не стабилизируется.
  const prependAnchorRef = useRef<{ id: number; top: number } | null>(null);
  const prependStabilizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const repinPrependAnchor = useCallback(() => {
    const anchor = prependAnchorRef.current;
    const container = messagesContainerRef.current;
    if (!anchor || !container) return;
    const el = container.querySelector(`[data-msgid="${anchor.id}"]`) as HTMLElement | null;
    if (!el) return;
    const delta = el.getBoundingClientRect().top - anchor.top;
    if (delta !== 0) {
      // Помечаем как программный скролл, чтобы handleScroll не сбросил якорь
      isProgrammaticScrollRef.current = true;
      container.scrollTop += delta;
      if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);
      programmaticScrollTimerRef.current = setTimeout(() => { isProgrammaticScrollRef.current = false; }, 80);
    }
  }, []);

  // Programmatic scroll helper — prevents handleScroll from falsely resetting wasAtBottomRef
  const scrollToBottomInstant = useCallback(() => {
    isProgrammaticScrollRef.current = true;
    messagesEndRef.current?.scrollIntoView();
    if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);
    programmaticScrollTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      wasAtBottomRef.current = true;
    }, 150);
  }, []);

  // ResizeObserver: re-scroll when media loads and expands the content (debounced)
  useEffect(() => {
    const inner = messagesInnerRef.current;
    if (!inner) return;
    let rafId: number;
    const ro = new ResizeObserver(() => {
      // Во время стабилизации подгруженной истории держим якорь на месте
      if (prependAnchorRef.current) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => repinPrependAnchor());
        return;
      }
      if (!wasAtBottomRef.current) return;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => scrollToBottomInstant());
    });
    ro.observe(inner);
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
  }, [scrollToBottomInstant, repinPrependAnchor]);

  const handleScrollToBottom = useCallback(() => {
    if (isSnapping) return;
    const pts = Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2;
      const dist = 24 + Math.random() * 32;
      return {
        id: i,
        tx: Math.cos(angle) * dist + (Math.random() - 0.5) * 20,
        ty: Math.sin(angle) * dist + (Math.random() - 0.5) * 20,
        size: 2 + Math.random() * 4,
        hue: 260 + Math.random() * 40,
        delay: Math.random() * 80,
      };
    });
    setSnapParticles(pts);
    setIsSnapping(true);
    setNewBelowCount(0);
    // Кнопка «вниз» отменяет якорь истории и помечает скролл программным,
    // чтобы анимация не запускала автоподгрузку и не дралась с repin
    prependAnchorRef.current = null;
    if (prependStabilizeTimerRef.current) clearTimeout(prependStabilizeTimerRef.current);
    isProgrammaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);
    programmaticScrollTimerRef.current = setTimeout(() => { isProgrammaticScrollRef.current = false; }, 600);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      setSnapParticles([]);
      setIsSnapping(false);
      setShowScrollBtn(false);
    }, 520);
  }, [isSnapping]);

  // Load more on scroll up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (!isProgrammaticScrollRef.current) {
      wasAtBottomRef.current = distFromBottom < 80;
      // Пользователь крутит сам (включая инерцию) — перебазируем якорь на его
      // новую позицию, чтобы дозагрузка медиа не дёргала обратно
      const anchor = prependAnchorRef.current;
      if (anchor) {
        const el = container.querySelector(`[data-msgid="${anchor.id}"]`) as HTMLElement | null;
        if (el) anchor.top = el.getBoundingClientRect().top;
      }
    }
    // Долистали до низа — новые сообщения увидены, счётчик гаснет
    if (distFromBottom < 80) setNewBelowCount((c) => (c === 0 ? c : 0));
    setShowScrollBtn(distFromBottom > 300);
    if (isLoadingMessages || !hasMoreMessages || !activeChannelId) return;
    // Подгружаем историю только когда пользователь сам докрутил до верха:
    // программный скролл (smooth-анимация к низу) проходит через зону <200
    // и иначе запускал бы лишний фетч с якорем, утаскивающим чат в историю
    if (!isProgrammaticScrollRef.current && container.scrollTop < 200 && messages.length > 0) {
      const firstId = messages[0].id;
      const anchorEl = container.querySelector(`[data-msgid="${firstId}"]`) as HTMLElement | null;
      const anchorTop = anchorEl?.getBoundingClientRect().top ?? container.getBoundingClientRect().top;
      fetchMessages(activeChannelId, firstId).then(() => {
        requestAnimationFrame(() => {
          prependAnchorRef.current = { id: firstId, top: anchorTop };
          repinPrependAnchor();
          // Якорь живёт, пока медиа подгруженной пачки меняет высоту
          if (prependStabilizeTimerRef.current) clearTimeout(prependStabilizeTimerRef.current);
          prependStabilizeTimerRef.current = setTimeout(() => { prependAnchorRef.current = null; }, 2500);
          const node = messagesContainerRef.current;
          if (node) {
            node.querySelectorAll('img').forEach((img) => {
              if (!img.complete) img.addEventListener('load', repinPrependAnchor, { once: true });
            });
            node.querySelectorAll('video').forEach((v) => {
              if (v.readyState < 1) v.addEventListener('loadedmetadata', repinPrependAnchor, { once: true });
            });
          }
        });
      });
    }
  }, [isLoadingMessages, hasMoreMessages, activeChannelId, messages, fetchMessages, repinPrependAnchor]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

    // Прочтения для сообщения: в форуме — по теме сообщения (topicReadAts),
  // иначе — по каналу. Без этого галочки в форум-темах брались из channel-level
  // lastReadAt, который при чтении тем не двигается → неверные ✓✓.
  const readsForMessage = useCallback(
    (msg: ChatMessageType): Record<number, string> => {
      if (activeChannelId == null) return {};
      if (activeChannel?.topicsEnabled && msg.topicId) {
        return topicReadAts[activeChannelId]?.[msg.topicId] || {};
      }
      return channelReadAts[activeChannelId] || {};
    },
    [activeChannelId, activeChannel?.topicsEnabled, topicReadAts, channelReadAts]
  );

  // Determine if an own message has been read by the partner
  const isMessageRead = useCallback(
    (msg: ChatMessageType): boolean => {
      if (!activeChannelId || msg.senderId !== user?.id) return false;
      const reads = readsForMessage(msg);
      return Object.entries(reads).some(
        ([uid, readAt]) =>
          Number(uid) !== user?.id && new Date(readAt) >= new Date(msg.createdAt)
      );
    },
    [activeChannelId, readsForMessage, user?.id]
  );

  const getMessageReaders = useCallback(
    (msg: ChatMessageType): { id: number; name: string; avatarUrl?: string }[] => {
      if (!activeChannelId || msg.senderId !== user?.id) return [];
      const reads = readsForMessage(msg);
      const members = activeChannel?.members || [];
      return Object.entries(reads)
        .filter(([uid, readAt]) => Number(uid) !== user?.id && new Date(readAt) >= new Date(msg.createdAt))
        .map(([uid]) => {
          const m = members.find((m) => m.id === Number(uid));
          return m ? { id: m.id, name: m.name || m.email || 'Пользователь', avatarUrl: m.avatarUrl } : null;
        })
        .filter(Boolean) as { id: number; name: string; avatarUrl?: string }[];
    },
    [activeChannelId, readsForMessage, user?.id, activeChannel?.members]
  );

  // Delete message + its files
  const handleDeleteMessage = useCallback(async (msg: ChatMessageType) => {
    // Delete uploaded files first
    if (msg.attachments && msg.attachments.length > 0) {
      await Promise.allSettled(
        msg.attachments.map((att) => {
          const filename = att.fileUrl?.split('/').pop();
          if (!filename) return Promise.resolve();
          return api.delete(`/chat-channels/upload/${filename}`).catch(() => {});
        })
      );
    }
    deleteMessageSocket(msg.id);
  }, [deleteMessageSocket]);

  // Pinned messages — в форум-теме закреп свой (у темы), иначе на канал
  const canPin = activeChannel?.channelType === 'direct' || isCurrentUserAdmin;
  const pinnedMessages = (activeTopic ? activeTopic.pinnedMessages : activeChannel?.pinnedMessages) ?? [];
  const [pinnedIndex, setPinnedIndex] = useState(0);

  // При смене канала/темы или изменении списка — показываем последнее закреплённое
  useEffect(() => {
    setPinnedIndex(pinnedMessages.length > 0 ? pinnedMessages.length - 1 : 0);
  }, [activeChannelId, activeTopicId, pinnedMessages.length]);

  const currentPinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedIndex] : null;

  const handlePin = useCallback((msg: ChatMessageType) => {
    if (!activeChannelId) return;
    const alreadyPinned = pinnedMessages.some((p) => p.id === msg.id);
    if (alreadyPinned) {
      unpinMessageSocket(activeChannelId, msg.id, activeTopicId ?? undefined);
    } else {
      pinMessageSocket(activeChannelId, msg.id, msg.text, msg.senderName, activeTopicId ?? undefined);
    }
  }, [activeChannelId, activeTopicId, pinnedMessages, pinMessageSocket, unpinMessageSocket]);

  const handleBannerClick = useCallback(() => {
    if (!currentPinned) return;
    const el = messagesContainerRef.current?.querySelector(`[data-msgid="${currentPinned.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Перелистываем к предыдущему (как в ТГ)
    if (pinnedMessages.length > 1) {
      setPinnedIndex((i) => (i - 1 + pinnedMessages.length) % pinnedMessages.length);
    }
  }, [currentPinned, pinnedMessages]);

  // No active channel
  if (!activeChannelId || !activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#e9e9e9] dark:bg-gray-900">
        <div className="text-center">
          <svg
            className="mx-auto w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-gray-400 dark:text-gray-500 text-lg">{t('Выберите чат для начала общения')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* Форум в режиме «Список»: список тем — в левой колонке (ChatScreen).
          Пока тема не выбрана — в главной области плейсхолдер. */}
      {forumListNoTopic ? (
        <>
          {/* Десктоп/планшет: список тем живёт в левом сайдбаре, здесь — плейсхолдер. */}
          <div className={`hidden lg:flex flex-col flex-1 min-w-0 items-center justify-center gap-3 ${effectiveWallpaperStyle ? '' : 'bg-[#e9e9e9] dark:bg-gray-900'}`} style={effectiveWallpaperStyle ?? undefined}>
            <div className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl ${GLASS_SURFACE}`}>
              <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('Выберите тему слева')}</p>
            </div>
          </div>
          {/* Мобильный: список тем — в основной области (сайдбар остаётся полным
              списком чатов с шапкой/поиском/вкладками). */}
          <div className="flex lg:hidden flex-1 min-w-0">
            <TopicListView channel={activeChannel} variant="main" onBack={onBack} onOpenInfo={() => setShowInfo(true)} />
          </div>
        </>
      ) : (
      <>
      {/* Режим «Вкладки»: слева от ленты — вертикальный рельс тем (как в Telegram) */}
      {forumTabs && <TopicTabsRail channel={activeChannel} />}
      {/* Main chat column — обои/фон на самой колонке (статичны), лента и
          input-бар прозрачны, поэтому стеклянные шапка и контролы парят над
          единым фоном (как в Telegram), а не над сплошными панелями */}
      <div
        className={`flex flex-col flex-1 min-w-0 relative ${effectiveWallpaperStyle ? '' : 'bg-[#e9e9e9] dark:bg-gray-900'}`}
        style={effectiveWallpaperStyle ?? undefined}
      >
        {/* Floating frosted "Liquid Glass" top stack — лежит поверх ленты */}
        <div
          ref={topStackRef}
          className="absolute inset-x-0 top-0 z-20"
        >
        {/* Header — плавающие стеклянные пилюли поверх ленты (как в Telegram) */}
        <div className="flex items-center gap-2 px-3 py-2.5 shrink-0">
          {/* Back button — на мобиле всегда; в теме форума виден на всех размерах
              и возвращает к списку тем (как в Telegram) */}
          <button
            onClick={() => {
              // «Список»: назад из темы → к списку тем. «Вкладки»: тема всегда
              // открыта, поэтому назад ведёт к списку чатов.
              if (activeTopic && activeChannelId && !forumTabs) setActiveTopic(activeChannelId, null);
              else onBack();
            }}
            className={`${activeTopic && !forumTabs ? '' : 'lg:hidden'} shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-200 ${GLASS_SURFACE}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Левая пилюля: аватар + имя/статус. В личных — открывает карточку
              профиля по центру; в группах/Избранном — правую инфо-панель */}
          <button
            type="button"
            onClick={() => {
              if (activeChannel.channelType === 'direct' && !isSelf && partner?.id) {
                setProfileUserId(partner.id);
              } else if (activeChannel.channelType === 'direct') {
                // Избранное / self-chat — общие настройки
                setShowInfo(true);
              } else {
                // Группа/форум: клик по названию сразу открывает список участников
                setShowInfo(true, 'members');
              }
              setShowSearch(false); setShowCalendar(false);
            }}
            className={`flex items-center gap-2.5 min-w-0 mr-auto pl-1.5 pr-3.5 py-1.5 rounded-full text-left cursor-pointer ${GLASS_SURFACE}`}
          >
          {/* Avatar */}
          <div className="relative shrink-0">
            {activeTopic ? (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: `${activeTopic.color || '#64748b'}22` }}
              >
                <span>{activeTopic.iconEmoji || '💬'}</span>
              </div>
            ) : (() => {
              const avatarSrc = activeChannel.channelType === 'direct'
                ? (partner?.avatarUrl ?? activeChannel.avatarUrl)
                : activeChannel.avatarUrl;
              return (
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden relative ${
                isSelf
                  ? 'bg-amber-400'
                  : activeChannel.channelType === 'group'
                  ? profileColorBg(activeChannel.profileColor)
                  : 'bg-sky-500'
              }`}
            >
              {isSelf ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : (
                getInitials(channelDisplayName)
              )}
              {avatarSrc && (
                <img
                  src={avatarSrc}
                  alt=""
                  className="absolute inset-0 w-full h-full rounded-full object-cover z-10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </div>
              );
            })()}
            {!isSelf && activeChannel.channelType === 'direct' && isPartnerOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
            )}
          </div>

          {/* Channel info — текст внутри пилюли */}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {activeTopic ? activeTopic.name : channelDisplayName}
              {!activeTopic && activeChannel?.channelType === 'group' && activeChannel.emojiStatus && (
                <span className="ml-1 align-middle">{activeChannel.emojiStatus}</span>
              )}
            </h3>
            <p className={`text-xs truncate ${presenceLabel ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {presenceLabel
                ? presenceLabel
                : activeTopic
                ? channelDisplayName
                : isSelf
                ? 'Личное пространство'
                : activeChannel.channelType === 'group'
                ? `${activeChannel.membersCount} участник${pluralize(activeChannel.membersCount)}`
                : isPartnerOnline
                ? 'В сети'
                : partnerLastSeenText
                ? `был(а) в сети ${partnerLastSeenText}`
                : 'Не в сети'}
            </p>
          </div>
          </button>

          {/* Правая капсула: календарь / поиск / инфо — сгруппированы с разделителями */}
          <div className={`flex items-center shrink-0 rounded-full overflow-hidden divide-x divide-black/[0.06] dark:divide-white/[0.08] ${GLASS_SURFACE}`}>
            {/* Calendar button */}
            <button
              onClick={() => { setShowCalendar((v) => !v); setShowSearch(false); setShowInfo(false); }}
              className={`p-2.5 transition-colors ${
                showCalendar
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-black/[0.04] dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/[0.06]'
              }`}
              title={t('Перейти к дате')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Search toggle */}
            <button
              onClick={() => { setShowSearch((v) => !v); setShowInfo(false); setShowCalendar(false); }}
              className={`p-2.5 transition-colors ${
                showSearch
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-black/[0.04] dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/[0.06]'
              }`}
              title={t('Поиск по сообщениям (Ctrl+F)')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Info / settings toggle — только в группах/Избранном. В личных
                дублировал бы клик по шапке (карточка профиля), поэтому скрыт. */}
            {!(activeChannel.channelType === 'direct' && !isSelf) && (
            <button
              onClick={() => { setShowInfo(!showInfo); setShowSearch(false); }}
              className={`p-2.5 cursor-pointer transition-colors ${
                showInfo
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-black/[0.04] dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/[0.06]'
              }`}
              title={t('Информация')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            )}
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className={`flex items-center gap-2 mx-3 mt-1.5 px-3 py-2 rounded-2xl shrink-0 ${GLASS_SURFACE}`}>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') stepMatch(e.shiftKey ? -1 : 1);
                if (e.key === 'Escape') setShowSearch(false);
              }}
              placeholder={t('Поиск в переписке…')}
              className="flex-1 bg-transparent text-sm outline-none focus:ring-0 focus:outline-none border-0 text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
            />
            {searchQuery.trim().length >= 2 && (
              <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                {searchMatches.length > 0 ? `${matchIdx + 1} / ${searchMatches.length}` : '0 результатов'}
              </span>
            )}
            <button
              onClick={() => stepMatch(-1)}
              disabled={searchMatches.length === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
              title={t('Предыдущее')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => stepMatch(1)}
              disabled={searchMatches.length === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
              title={t('Следующее')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => setShowSearch(false)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Pinned message banner */}
        {currentPinned && (
          <div
            className={`flex items-center gap-3 mx-3 mt-1.5 px-4 py-2 rounded-2xl cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors shrink-0 ${GLASS_SURFACE}`}
            onClick={handleBannerClick}
          >
            {/* Полоска-индикатор слева */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              {pinnedMessages.length > 1
                ? pinnedMessages.map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all ${
                        i === pinnedIndex
                          ? 'w-1 h-3 bg-violet-500'
                          : 'w-1 h-1 bg-violet-300 dark:bg-violet-700'
                      }`}
                    />
                  ))
                : <div className="w-1 h-5 bg-violet-500 rounded-full" />}
            </div>

            {/* Текст */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-violet-500 leading-none mb-0.5">
                {pinnedMessages.length > 1
                  ? `Закреплённое сообщение · ${pinnedIndex + 1}/${pinnedMessages.length}`
                  : 'Закреплённое сообщение'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                {currentPinned.text || '📎 Вложение'}
              </p>
            </div>

            {/* Открепить */}
            {canPin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeChannelId && currentPinned) unpinMessageSocket(activeChannelId, currentPinned.id, activeTopicId ?? undefined);
                }}
                className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
                title={t('Открепить')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Глобальный плеер голосового (играет и при навигации) */}
        <VoicePlayerBar />
        </div>
        {/* /Floating frosted top stack */}

        {/* Прогрессивный блюр под плавающей шапкой: сообщения, заезжающие под
            календарь/поиск/имя, мягко размываются к верхней кромке (как в iOS).
            z-10 — выше ленты, но ниже стеклянных пилюль шапки (z-20). */}
        <div
          className="absolute inset-x-0 top-0 z-10 pointer-events-none"
          style={{
            height: topStackHeight,
            WebkitBackdropFilter: 'blur(6px)',
            backdropFilter: 'blur(6px)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
          }}
        />

        {/* Плавающая дата сверху при скролле (как в Telegram) */}
        {floatingDate && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity duration-300"
            style={{ top: topStackHeight + 8, opacity: floatingDateShown ? 1 : 0 }}
          >
            <span className="text-xs text-gray-500 dark:text-gray-200 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
              {floatingDate}
            </span>
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain scrollbar-none px-4 space-y-1"
          style={{ paddingTop: topStackHeight + 12, paddingBottom: bottomBarHeight + 12, WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {/* Initial loading — full area spinner */}
          {isLoadingMessages && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Lazy loading — top spinner when loading older messages */}
          {isLoadingMessages && messages.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400 dark:text-gray-500">
              <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              {pendingScrollIdRef.current !== null ? 'Ищем сообщение…' : 'Загружаем более старые сообщения…'}
            </div>
          )}

          {/* No more messages indicator */}
          {!hasMoreMessages && messages.length > 0 && (
            <div className="flex justify-center py-2">
              <span className="text-xs text-gray-300 dark:text-gray-600">{t('Начало переписки')}</span>
            </div>
          )}

          <div
            ref={messagesInnerRef}
            style={{
              opacity: initialScrollReady || messages.length === 0 ? 1 : 0,
              transform: initialScrollReady || messages.length === 0 ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.22s ease-out, transform 0.24s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
          {messages.map((msg, idx) => {
            // In self-chat, forwarded messages from another person appear on the left
            const isOwn = isSelf && msg.forwardMeta
              ? msg.forwardMeta.originalSenderId === user?.id
              : msg.senderId === user?.id;
            // For self-chat forwarded messages, group by original sender
            const prevMsg = messages[idx - 1];
            const prevIsOwn = isSelf && prevMsg?.forwardMeta
              ? prevMsg.forwardMeta.originalSenderId === user?.id
              : prevMsg?.senderId === user?.id;
            const showAvatar = idx === 0 || prevIsOwn !== isOwn || (
              isSelf && msg.forwardMeta
                ? prevMsg?.forwardMeta?.originalSenderId !== msg.forwardMeta.originalSenderId
                : prevMsg?.senderId !== msg.senderId
            );
            const read = isOwn ? isMessageRead(msg) : false;
            const readers = isOwn ? getMessageReaders(msg) : [];
            const activeMatch = searchMatches.length > 0 && searchMatches[matchIdx]?.msg.id === msg.id;
            const isMatchedMsg = showSearch && searchQuery.trim().length >= 2 && searchMatches.some((m) => m.msg.id === msg.id);
            const isMsgPinned = pinnedMessages.some((p) => p.id === msg.id);
            const isReplyHighlighted = highlightedMsgId === msg.id;

            const showDateSep = idx === 0 || toDateKey(messages[idx - 1].createdAt) !== toDateKey(msg.createdAt);

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="flex justify-center py-3">
                    <button
                      onClick={() => setShowCalendar(true)}
                      className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700/80 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-1 rounded-full transition-colors cursor-pointer select-none"
                    >
                      {formatDateSep(msg.createdAt)}
                    </button>
                  </div>
                )}
                <div
                  data-msgid={msg.id}
                  className={[
                    activeMatch ? 'rounded-xl ring-2 ring-violet-400 dark:ring-violet-500 ring-offset-2 dark:ring-offset-gray-900' : '',
                    isReplyHighlighted ? 'chat-reply-highlight' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <ChatMessage
                    message={msg}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    isRead={read}
                    isDirect={activeChannel.channelType === 'direct'}
                    readers={readers}
                    onReply={() => setReplyToMessage(msg)}
                    onScrollToReply={msg.replyToMessage?.id ? () => scrollToMessage(msg.replyToMessage!.id) : undefined}
                    onReact={reactToMessage}
                    onDelete={handleDeleteMessage}
                    onEdit={isOwn ? (newText: string) => editMessageSocket(msg.id, newText) : undefined}
                    onPin={canPin ? handlePin : undefined}
                    onForward={setForwardingMessage}
                    onGoToOriginalChannel={msg.forwardMeta ? handleGoToOriginalChannel : undefined}
                    isPinned={isMsgPinned}
                    canPin={canPin}
                    highlightQuery={isMatchedMsg ? searchQuery.trim() : undefined}
                    reactionEmojis={reactionEmojis}
                  />
                </div>
              </div>
            );
          })}
          </div>

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll-to-bottom button with Thanos snap */}
        {(showScrollBtn || isSnapping) && (
          <div className="absolute bottom-20 right-4 z-20 pointer-events-none">
            <div className="relative pointer-events-auto">
              {snapParticles.map((p) => (
                <div
                  key={p.id}
                  className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
                  style={{
                    width: p.size,
                    height: p.size,
                    background: `hsl(${p.hue}, 65%, 60%)`,
                    '--tx': `${p.tx}px`,
                    '--ty': `${p.ty}px`,
                    animation: `thanos-particle 0.5s ease-out forwards`,
                    animationDelay: `${p.delay}ms`,
                  } as React.CSSProperties}
                />
              ))}
              <button
                onClick={handleScrollToBottom}
                style={{
                  transition: 'opacity 0.25s, transform 0.25s',
                  opacity: isSnapping ? 0 : 1,
                  transform: isSnapping ? 'scale(0.4)' : 'scale(1)',
                }}
                className="relative w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-violet-500 hover:text-violet-600 hover:shadow-xl transition-shadow"
                title={t('Вниз')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                {/* Счётчик новых сообщений, пришедших пока читали историю */}
                {newBelowCount > 0 && (
                  <span className="absolute -top-2 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-violet-500 rounded-full shadow">
                    {newBelowCount > 99 ? '99+' : newBelowCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Input — плавающий оверлей внизу (лента уходит за него при скролле);
            на мобиле приподнят над домашним индикатором (safe-area) */}
        <div
          ref={bottomBarRef}
          className="absolute inset-x-0 bottom-0 z-20"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
        {isCurrentUserMuted || topicClosed || cannotSendText ? (
          <div className="px-3 pb-3 pt-2">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${GLASS_SURFACE}`}>
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="text-sm text-red-500 dark:text-red-400">
                {topicClosed || activeTopic?.postPermission === 'admins'
                  ? t('В этой теме писать могут только администраторы')
                  : activeTopic?.postPermission === 'custom'
                    ? t('В этой теме писать могут только выбранные участники')
                    : t('Администратор ограничил возможность отправки сообщений')}
              </span>
            </div>
          </div>
        ) : (
          <ChatInput channelId={activeChannelId} projectId={activeChannel.projectId ?? undefined} channelType={activeChannel.channelType} caps={composerCaps} onOpenScheduled={() => setShowScheduled(true)} />
        )}
        </div>

        {/* Экран «Отложенная отправка» — оверлей поверх ленты внутри колонки чата */}
        {showScheduled && (
          <ScheduledMessagesView channel={activeChannel} onBack={() => setShowScheduled(false)} />
        )}
      </div>
      </>
      )}

      {/* Forward message modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          message={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
        />
      )}

      {/* Calendar modal */}
      {showCalendar && (
        <CalendarModal
          messageDates={messageDates}
          onSelectDate={scrollToDate}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Info panel — desktop: right column; mobile: overlay */}
      {showInfo && (
        <>
          {/* Desktop */}
          <div className="hidden lg:flex w-72 shrink-0 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <InfoPanel
              channel={activeChannel}
              partner={partner}
              isSelf={isSelf}
              isPartnerOnline={isPartnerOnline}
              isAdmin={isCurrentUserAdmin}
              isCompanyAdmin={isCompanyAdmin}
              currentUserId={user?.id}
              onClose={() => setShowInfo(false)}
            />
          </div>
          {/* Mobile overlay */}
          <div className="absolute inset-0 z-20 bg-white dark:bg-gray-800 overflow-y-auto lg:hidden">
            <InfoPanel
              channel={activeChannel}
              partner={partner}
              isSelf={isSelf}
              isPartnerOnline={isPartnerOnline}
              isAdmin={isCurrentUserAdmin}
              isCompanyAdmin={isCompanyAdmin}
              currentUserId={user?.id}
              onClose={() => setShowInfo(false)}
            />
          </div>
        </>
      )}

      {/* Карточка профиля по центру (личные диалоги) */}
      {profileUserId != null && (
        <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
    </div>
  );
}

/* ───────── Info Panel ───────── */

interface InfoPanelProps {
  channel: ChatChannel;
  partner: { id: number; name: string; avatarUrl?: string; email?: string } | null | undefined;
  isSelf: boolean;
  isPartnerOnline: boolean;
  isAdmin: boolean;
  isCompanyAdmin: boolean;
  currentUserId?: number;
  onClose: () => void;
}

function InfoPanel({ channel, partner, isSelf, isPartnerOnline, isAdmin, isCompanyAdmin, currentUserId, onClose }: InfoPanelProps) {
  const t = useT();
  const [userDetails, setUserDetails] = useState<any>(null);
  const lastSeenAt = useChatStore((s) => s.lastSeenAt);
  const partnerLastSeenText = partner ? formatLastSeen(lastSeenAt[partner.id]) : null;

  useEffect(() => {
    if (!isSelf && channel.channelType === 'direct' && partner?.id) {
      api.get(`/users/${partner.id}`).then(({ data }) => setUserDetails(data)).catch(() => {});
    }
  }, [isSelf, channel.channelType, partner?.id]);

  const details = userDetails;

  // Группа — полноценный Telegram-style экран настроек (аватар/имя/описание + под-экраны)
  if (channel.channelType === 'group') {
    return (
      <GroupInfoPanel
        channel={channel}
        isAdmin={isAdmin}
        isCompanyAdmin={isCompanyAdmin}
        currentUserId={currentUserId}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Info header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {'О пользователе'}
        </span>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-2 py-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold relative overflow-hidden ${
              isSelf ? 'bg-amber-400' : 'bg-sky-500'
            }`}
          >
            {isSelf ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ) : (
              getInitials(partner?.name || channel.channelName)
            )}
            {(channel.avatarUrl || (!isSelf && partner?.avatarUrl)) && (
              <img
                src={channel.avatarUrl || partner?.avatarUrl}
                alt=""
                className="absolute inset-0 w-full h-full rounded-full object-cover z-10"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>

          <div className="text-center">
            <p className="font-semibold text-gray-800 dark:text-gray-100">
              {isSelf ? 'Избранное' : partner?.name || channel.channelName}
            </p>
            {!isSelf && channel.channelType === 'direct' && (
              <span
                className={`inline-flex items-center gap-1 mt-1 text-xs ${
                  isPartnerOnline ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                {isPartnerOnline
                  ? 'В сети'
                  : partnerLastSeenText
                  ? `был(а) в сети ${partnerLastSeenText}`
                  : 'Не в сети'}
              </span>
            )}
            {isSelf && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Личное пространство
              </p>
            )}
          </div>
        </div>

        {/* User details (direct chat) */}
        {!isSelf && channel.channelType === 'direct' && (
          <div className="space-y-3">
            <InfoRow icon="email" label="Email" value={details?.email || partner?.email} />
            <InfoRow icon="phone" label={t('Телефон')} value={details?.phone} />
            <InfoRow icon="role" label={t('Роль')} value={details?.role?.name} />
            <InfoRow icon="position" label={t('Должность')} value={details?.position} />
            <InfoRow icon="team" label={t('Команда')} value={details?.team?.name} />
            <InfoRow
              icon="calendar"
              label={t('В компании с')}
              value={details?.hireDate ? new Date(details.hireDate).toLocaleDateString('ru-RU') : undefined}
            />
          </div>
        )}

      </div>
    </div>
  );
}

/* ───────── Group Info Panel (Telegram-style settings) ───────── */

type GroupView =
  | 'main'
  | 'type'
  | 'reactions'
  | 'appearance'
  | 'history'
  | 'topics'
  | 'members'
  | 'permissions'
  | 'admins'
  | 'recent';

// Палитра «цвет профиля» (как в Telegram) — swatch + класс фона аватара
const PROFILE_COLORS: { key: string; swatch: string; bg: string }[] = [
  { key: 'blue', swatch: '#5b9bd5', bg: 'bg-sky-500' },
  { key: 'green', swatch: '#4ba577', bg: 'bg-emerald-500' },
  { key: 'orange', swatch: '#d99a4e', bg: 'bg-amber-500' },
  { key: 'red', swatch: '#c15b52', bg: 'bg-red-500' },
  { key: 'purple', swatch: '#9b7bd4', bg: 'bg-violet-500' },
  { key: 'teal', swatch: '#4aa3a8', bg: 'bg-teal-500' },
  { key: 'pink', swatch: '#c56b8f', bg: 'bg-pink-500' },
  { key: 'gray', swatch: '#8a95a3', bg: 'bg-slate-500' },
  { key: 'indigo', swatch: '#6d78d6', bg: 'bg-indigo-500' },
  { key: 'lime', swatch: '#7fae4a', bg: 'bg-lime-600' },
  { key: 'amber', swatch: '#d9a441', bg: 'bg-yellow-600' },
  { key: 'rose', swatch: '#d16a6a', bg: 'bg-rose-500' },
  { key: 'fuchsia', swatch: '#b56ad1', bg: 'bg-fuchsia-500' },
];

const REACTION_EMOJIS = ['👍', '👎', '❤️', '🔥', '🎉', '😁', '😢', '🤔', '🙏', '👏', '😍', '💯', '⚡', '🥰', '😱', '🤯'];

function profileColorBg(key?: string | null): string {
  return PROFILE_COLORS.find((c) => c.key === key)?.bg ?? 'bg-violet-500';
}

/* Переиспользуемая цветная иконка-плитка строки настроек */
function RowIcon({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${bg}`}>
      {children}
    </div>
  );
}

/* Строка настройки: иконка + заголовок + значение/бейдж + шеврон */
function SettingRow({
  icon,
  label,
  value,
  badge,
  onClick,
  danger,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
        onClick ? 'hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''
      } ${danger ? 'text-red-500' : ''}`}
    >
      {icon}
      <span className={`flex-1 text-sm ${danger ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>{label}</span>
      {badge}
      {value != null && <span className="text-sm text-gray-400 dark:text-gray-500">{value}</span>}
      {onClick && !danger && (
        <svg className="w-4 h-4 text-gray-300 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

/* Заголовок под-экрана с кнопкой «назад» и опциональной кнопкой действия */
function SubScreenHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <button onClick={onBack} className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 rounded">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{title}</span>
      {action}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
        checked ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

interface GroupInfoPanelProps {
  channel: ChatChannel;
  isAdmin: boolean;
  isCompanyAdmin: boolean;
  currentUserId?: number;
  onClose: () => void;
}

function GroupInfoPanel({ channel, isAdmin, isCompanyAdmin, currentUserId, onClose }: GroupInfoPanelProps) {
  const t = useT();
  // Начальный экран: 'members' если панель открыли кликом по названию группы
  const infoPanelView = useChatStore((s) => s.infoPanelView);
  const [view, setView] = useState<GroupView>(infoPanelView === 'members' ? 'members' : 'main');
  // Клик по названию группы (infoPanelView='members') открывает участников даже
  // если панель уже была открыта на другом экране.
  useEffect(() => {
    if (infoPanelView === 'members') setView('members');
  }, [infoPanelView]);
  const canManage = isAdmin || isCompanyAdmin;

  const updateChannel = useChatStore((s) => s.updateChannel);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const addToast = useToastStore((s) => s.addToast);

  // Локальная редактируемая шапка
  const [name, setName] = useState(channel.channelName);
  const [description, setDescription] = useState(channel.description ?? '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(channel.channelName);
    setDescription(channel.description ?? '');
  }, [channel.channelName, channel.description]);

  const dirty = name.trim() !== channel.channelName || (description ?? '') !== (channel.description ?? '');

  const saveHeader = async () => {
    if (!dirty || !name.trim()) return;
    await updateChannel(channel.id, { name: name.trim(), description: description.trim() });
    fetchChannels(1);
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('files', file);
      const { data } = await api.post('/chat-channels/upload', fd);
      const url = Array.isArray(data) ? data[0]?.fileUrl : (data.fileUrl || data.url);
      if (url) {
        const ok = await updateChannel(channel.id, { avatarUrl: url });
        if (ok) fetchChannels(1);
      }
    } catch {
      addToast('error', 'Не удалось загрузить аватар');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Удалить группу «${channel.channelName || 'без названия'}»? Это действие нельзя отменить.`)) return;
    try {
      await api.delete(`/chat-channels/${channel.id}`);
      await setActiveChannel(null);
      fetchChannels(1);
      addToast('success', 'Группа удалена');
      onClose();
    } catch {
      addToast('error', 'Не удалось удалить группу');
    }
  };

  // ─── Под-экраны ───
  if (view === 'type') return <GroupTypeScreen channel={channel} canManage={canManage} onBack={() => setView('main')} />;
  if (view === 'reactions') return <ReactionsScreen channel={channel} canManage={canManage} onBack={() => setView('main')} />;
  if (view === 'appearance') return <AppearanceScreen channel={channel} canManage={canManage} onBack={() => setView('main')} />;
  if (view === 'history') return <HistoryScreen channel={channel} canManage={canManage} onBack={() => setView('main')} />;
  if (view === 'topics') return <TopicsScreen channel={channel} canManage={canManage} onBack={() => setView('main')} />;
  if (view === 'members') return <MembersScreen channel={channel} canManage={canManage} currentUserId={currentUserId} onBack={() => setView('main')} />;
  if (view === 'permissions') return <PermissionsScreen channel={channel} canManage={canManage} onBack={() => setView('main')} />;
  if (view === 'admins') return <AdminsScreen channel={channel} currentUserId={currentUserId} onBack={() => setView('main')} />;
  if (view === 'recent') return <RecentActionsScreen channel={channel} onBack={() => setView('main')} />;

  const reactionsValue = channel.reactionsMode === 'none' ? 'Выкл' : channel.reactionsMode === 'selected' ? `${channel.allowedReactions?.length ?? 0}` : 'Все';
  const membersCount = (channel.members?.filter((m) => m.name && !/^deleted_\d+_\d+@crm\.deleted$/.test(m.email ?? '')).length) ?? channel.membersCount;
  const adminCount = channel.members?.filter((m) => m.role === 'admin' || m.role === 'owner').length ?? 1;

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t('О группе')}</span>
        <div className="flex items-center gap-1">
          {canManage && dirty && (
            <button onClick={saveHeader} className="text-sm font-medium text-violet-500 hover:text-violet-600 px-2 py-1">
              {t('Готово')}
            </button>
          )}
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        {/* Аватар + камера */}
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold relative overflow-hidden ${profileColorBg(channel.profileColor)}`}>
              {channel.backgroundEmoji && (
                <span className="absolute inset-0 flex items-center justify-center text-6xl opacity-25 select-none pointer-events-none">{channel.backgroundEmoji}</span>
              )}
              <span className="relative z-[5]">{getInitials(channel.channelName)}</span>
              {channel.avatarUrl && (
                <img src={channel.avatarUrl} alt="" className="absolute inset-0 w-full h-full rounded-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              )}
              {canManage && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 opacity-0 hover:opacity-100 transition-opacity rounded-full"
                  title={t('Сменить фото')}
                >
                  {uploading ? (
                    <svg className="w-7 h-7 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  ) : (
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  )}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarPick} />
          </div>
        </div>

        {/* Имя + описание (редактируемые для админа) */}
        {canManage ? (
          <div className="px-4">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-700">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveHeader}
                placeholder={t('Название группы')}
                className="w-full bg-transparent px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-0 focus:outline-none border-0 placeholder:text-gray-400"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveHeader}
                placeholder={t('Описание')}
                className="w-full bg-transparent px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-0 focus:outline-none border-0 placeholder:text-gray-400"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 px-1">{t('Можете указать дополнительное описание для группы.')}</p>
          </div>
        ) : (
          <div className="px-4 text-center">
            <p className="font-semibold text-lg text-gray-800 dark:text-gray-100">
              {channel.channelName}
              {channel.emojiStatus && <span className="ml-1">{channel.emojiStatus}</span>}
            </p>
            {channel.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{channel.description}</p>}
            <p className="text-xs text-gray-400 mt-1">{membersCount} {t('участн.')}</p>
          </div>
        )}

        {/* Блок настроек */}
        {canManage && (
          <div className="px-4">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
              <SettingRow
                icon={<RowIcon bg="bg-sky-500"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></RowIcon>}
                label={t('Тип группы')}
                value={channel.isPrivate ? t('Частная') : t('Публичная')}
                onClick={() => setView('type')}
              />
              <SettingRow
                icon={<RowIcon bg="bg-red-500"><span className="text-sm">👏</span></RowIcon>}
                label={t('Реакции')}
                value={reactionsValue}
                onClick={() => setView('reactions')}
              />
              <SettingRow
                icon={<RowIcon bg="bg-orange-500"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 000-1.41z"/></svg></RowIcon>}
                label={t('Оформление')}
                onClick={() => setView('appearance')}
              />
              <SettingRow
                icon={<RowIcon bg="bg-emerald-500"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></RowIcon>}
                label={t('История чата для новых участников')}
                value={channel.historyVisibleToNewMembers ? t('Видна') : t('Скрыта')}
                onClick={() => setView('history')}
              />
              <SettingRow
                icon={<RowIcon bg="bg-sky-400"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 5h2v2H3V5zm0 6h2v2H3v-2zm0 6h2v2H3v-2zM7 5h14v2H7V5zm0 6h14v2H7v-2zm0 6h14v2H7v-2z"/></svg></RowIcon>}
                label={t('Темы')}
                value={channel.topicsEnabled ? (channel.topicsLayout === 'tabs' ? t('Вкладки') : t('Список')) : t('Выкл')}
                onClick={() => setView('topics')}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 px-1">{t('Чат группы будет разделён на темы, созданные администраторами и пользователями.')}</p>
          </div>
        )}

        {/* Управление */}
        <div className="px-4">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
            <SettingRow
              icon={<RowIcon bg="bg-sky-500"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></RowIcon>}
              label={t('Участники')}
              value={membersCount}
              onClick={() => setView('members')}
            />
            {canManage && (
              <SettingRow
                icon={<RowIcon bg="bg-amber-500"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.65 10A5.99 5.99 0 006.5 6 6 6 0 006 18a5.99 5.99 0 006.32-4H17v4h4v-4h2v-4H12.65zM6.5 14a2 2 0 110-4 2 2 0 010 4z"/></svg></RowIcon>}
                label={t('Разрешения')}
                onClick={() => setView('permissions')}
              />
            )}
            <SettingRow
              icon={<RowIcon bg="bg-emerald-500"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg></RowIcon>}
              label={t('Администраторы')}
              value={adminCount}
              onClick={() => setView('admins')}
            />
            {canManage && (
              <SettingRow
                icon={<RowIcon bg="bg-orange-400"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg></RowIcon>}
                label={t('Недавние действия')}
                onClick={() => setView('recent')}
              />
            )}
          </div>
        </div>

        {/* Удалить группу */}
        {canManage && (
          <div className="px-4">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 overflow-hidden">
              <SettingRow label={t('Удалить группу')} danger onClick={handleDelete} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Group sub-screens ───────── */

function ScreenShell({ title, onBack, action, children }: { title: string; onBack: () => void; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <SubScreenHeader title={title} onBack={onBack} action={action} />
      <div className="flex-1 overflow-y-auto py-4 space-y-4">{children}</div>
    </div>
  );
}

function RadioRow({ label, description, checked, onClick }: { label: string; description?: string; checked: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-100">{label}</p>
        {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>}
      </div>
      {checked && (
        <svg className="w-5 h-5 text-violet-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
      )}
    </button>
  );
}

function GroupTypeScreen({ channel, canManage, onBack }: { channel: ChatChannel; canManage: boolean; onBack: () => void }) {
  const t = useT();
  const updateChannel = useChatStore((s) => s.updateChannel);
  const set = (isPrivate: boolean) => canManage && updateChannel(channel.id, { isPrivate });
  return (
    <ScreenShell title={t('Тип группы')} onBack={onBack}>
      <div className="px-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
          <RadioRow label={t('Частная')} description={t('Вступить можно только по пригласительной ссылке.')} checked={!!channel.isPrivate} onClick={() => set(true)} />
          <RadioRow label={t('Публичная')} description={t('Группу можно найти в поиске, вступить может любой.')} checked={!channel.isPrivate} onClick={() => set(false)} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">{t('Тип группы определяет, кто может её видеть и в неё вступать.')}</p>
      </div>
    </ScreenShell>
  );
}

function ReactionsScreen({ channel, canManage, onBack }: { channel: ChatChannel; canManage: boolean; onBack: () => void }) {
  const t = useT();
  const updateChannel = useChatStore((s) => s.updateChannel);
  const mode = channel.reactionsMode ?? 'all';
  const allowed = channel.allowedReactions ?? [];
  const setMode = (reactionsMode: 'all' | 'selected' | 'none') => canManage && updateChannel(channel.id, { settings: { reactionsMode } });
  const toggleEmoji = (emoji: string) => {
    if (!canManage) return;
    const next = allowed.includes(emoji) ? allowed.filter((e) => e !== emoji) : [...allowed, emoji];
    updateChannel(channel.id, { settings: { reactionsMode: 'selected', allowedReactions: next } });
  };
  return (
    <ScreenShell title={t('Реакции')} onBack={onBack}>
      <div className="px-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
          <RadioRow label={t('Все реакции')} checked={mode === 'all'} onClick={() => setMode('all')} />
          <RadioRow label={t('Только выбранные')} checked={mode === 'selected'} onClick={() => setMode('selected')} />
          <RadioRow label={t('Без реакций')} checked={mode === 'none'} onClick={() => setMode('none')} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">{t('Участники группы смогут отправлять реакции на публикации.')}</p>
      </div>
      {mode === 'selected' && (
        <div className="px-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">{t('Доступные реакции')}</p>
          <div className="grid grid-cols-8 gap-1.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 p-3">
            {REACTION_EMOJIS.map((emoji) => {
              const on = allowed.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => toggleEmoji(emoji)}
                  className={`aspect-square rounded-lg text-lg flex items-center justify-center transition-all ${on ? 'bg-violet-500/20 ring-2 ring-violet-500' : 'hover:bg-gray-200 dark:hover:bg-gray-600 opacity-60'}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </ScreenShell>
  );
}

// Эмодзи для оформления группы (фоновый эмодзи + эмодзи-статус)
const GROUP_EMOJIS = ['⭐', '🔥', '💜', '🎉', '🌸', '🌟', '⚡', '🚀', '🏗️', '🛠️', '🧱', '📐', '💎', '🌊', '🍀', '🎯', '❤️', '🌈', '☀️', '🌙', '👑', '🏆', '📌', '🔔'];

function AppearanceScreen({ channel, canManage, onBack }: { channel: ChatChannel; canManage: boolean; onBack: () => void }) {
  const t = useT();
  const updateChannel = useChatStore((s) => s.updateChannel);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const [sub, setSub] = useState<null | 'wallpaper' | 'emoji' | 'status'>(null);

  const save = (patch: Record<string, unknown>) => {
    if (!canManage) return;
    updateChannel(channel.id, { settings: patch }).then((ok) => { if (ok) fetchChannels(1); });
  };
  const setColor = (profileColor: string) => save({ profileColor });

  if (sub === 'wallpaper') {
    return <GroupWallpaperScreen channel={channel} canManage={canManage} onSave={(wallpaper) => save({ wallpaper })} onBack={() => setSub(null)} />;
  }
  if (sub === 'emoji') {
    return <GroupEmojiPickScreen title={t('Фоновый эмодзи')} value={channel.backgroundEmoji} canManage={canManage} onSave={(v) => save({ backgroundEmoji: v })} onBack={() => setSub(null)} />;
  }
  if (sub === 'status') {
    return <GroupEmojiPickScreen title={t('Набор эмодзи группы')} value={channel.emojiStatus} canManage={canManage} onSave={(v) => save({ emojiStatus: v })} onBack={() => setSub(null)} />;
  }

  const wallpaperName = WALLPAPERS.find((w) => w.id === channel.wallpaper)?.name;

  return (
    <ScreenShell title={t('Оформление')} onBack={onBack}>
      <div className="flex flex-col items-center gap-2 px-4">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden relative ${profileColorBg(channel.profileColor)}`}>
          {channel.backgroundEmoji && (
            <span className="absolute inset-0 flex items-center justify-center text-6xl opacity-25 select-none pointer-events-none">{channel.backgroundEmoji}</span>
          )}
          <span className="relative z-[5]">{getInitials(channel.channelName)}</span>
          {channel.avatarUrl && <img src={channel.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        </div>
        <p className="font-semibold text-gray-800 dark:text-gray-100">
          {channel.channelName}
          {channel.emojiStatus && <span className="ml-1">{channel.emojiStatus}</span>}
        </p>
      </div>
      <div className="px-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">{t('Цвет профиля группы')}</p>
        <div className="flex flex-wrap gap-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 p-3">
          {PROFILE_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              disabled={!canManage}
              style={{ backgroundColor: c.swatch }}
              className={`w-9 h-9 rounded-full transition-transform ${channel.profileColor === c.key ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-violet-500 scale-105' : 'hover:scale-105'}`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">{t('Цвет применяется к аватару и профилю группы у всех участников.')}</p>
      </div>
      <div className="px-4 space-y-2">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
          <SettingRow label={t('Фоновый эмодзи')} value={channel.backgroundEmoji || t('Нет')} onClick={canManage ? () => setSub('emoji') : undefined} />
          <SettingRow label={t('Набор эмодзи группы')} value={channel.emojiStatus || t('Нет')} onClick={canManage ? () => setSub('status') : undefined} />
          <SettingRow label={t('Обои в группе')} value={wallpaperName ?? t('Стандартные')} onClick={canManage ? () => setSub('wallpaper') : undefined} />
        </div>
      </div>
    </ScreenShell>
  );
}

// Пикер одиночного эмодзи (фоновый эмодзи / эмодзи-статус группы) с опцией «Нет»
function GroupEmojiPickScreen({ title, value, canManage, onSave, onBack }: {
  title: string; value?: string | null; canManage: boolean; onSave: (v: string | null) => void; onBack: () => void;
}) {
  const t = useT();
  const pick = (v: string | null) => { if (canManage) onSave(v); };
  return (
    <ScreenShell title={title} onBack={onBack}>
      <div className="px-4">
        <div className="grid grid-cols-6 gap-1.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 p-3">
          <button
            onClick={() => pick(null)}
            className={`aspect-square rounded-lg text-xs flex items-center justify-center transition-all ${!value ? 'bg-violet-500/20 ring-2 ring-violet-500 text-violet-600 dark:text-violet-300' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            {t('Нет')}
          </button>
          {GROUP_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => pick(emoji)}
              className={`aspect-square rounded-lg text-xl flex items-center justify-center transition-all ${value === emoji ? 'bg-violet-500/20 ring-2 ring-violet-500' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">
          {title === t('Фоновый эмодзи')
            ? t('Эмодзи отображается фоном за аватаром группы.')
            : t('Эмодзи показывается рядом с названием группы у всех участников.')}
        </p>
      </div>
    </ScreenShell>
  );
}

// Выбор обоев группы (пресеты WALLPAPERS) — применяются к чату у всех участников
function GroupWallpaperScreen({ channel, canManage, onSave, onBack }: {
  channel: ChatChannel; canManage: boolean; onSave: (id: string | null) => void; onBack: () => void;
}) {
  const t = useT();
  const theme = useThemeStore((s) => s.theme);
  const pick = (id: string | null) => { if (canManage) onSave(id); };
  const current = channel.wallpaper ?? 'default';
  return (
    <ScreenShell title={t('Обои в группе')} onBack={onBack}>
      <div className="px-4">
        <div className="grid grid-cols-3 gap-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 p-3">
          {WALLPAPERS.map((w) => {
            const gradient = getWallpaperBackground(w.id, theme);
            const active = current === w.id;
            return (
              <button
                key={w.id}
                onClick={() => pick(w.id === 'default' ? null : w.id)}
                className={`flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all ${active ? 'ring-2 ring-violet-500' : 'hover:bg-gray-200/60 dark:hover:bg-gray-600/40'}`}
              >
                <div
                  className="w-full h-16 rounded-md border border-black/5 dark:border-white/10"
                  style={gradient ? { backgroundImage: gradient } : undefined}
                >
                  {!gradient && (
                    <div className="w-full h-full rounded-md bg-[#e9e9e9] dark:bg-gray-900 flex items-center justify-center text-[10px] text-gray-400">{t('Стандартные')}</div>
                  )}
                </div>
                <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-full">{w.name}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">{t('Обои применяются к чату группы у всех участников.')}</p>
      </div>
    </ScreenShell>
  );
}

function HistoryScreen({ channel, canManage, onBack }: { channel: ChatChannel; canManage: boolean; onBack: () => void }) {
  const t = useT();
  const updateChannel = useChatStore((s) => s.updateChannel);
  const visible = channel.historyVisibleToNewMembers !== false;
  const set = (v: boolean) => canManage && updateChannel(channel.id, { settings: { historyVisibleToNewMembers: v } });
  return (
    <ScreenShell title={t('История чата для новых участников')} onBack={onBack}>
      <div className="px-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
          <RadioRow label={t('Видна')} checked={visible} onClick={() => set(true)} />
          <RadioRow label={t('Скрыта')} checked={!visible} onClick={() => set(false)} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">
          {visible ? t('Новые участники будут видеть полную историю сообщений.') : t('Новые участники увидят сообщения только с момента вступления.')}
        </p>
      </div>
    </ScreenShell>
  );
}

function TopicsScreen({ channel, canManage, onBack }: { channel: ChatChannel; canManage: boolean; onBack: () => void }) {
  const t = useT();
  const setTopicsConfig = useChatStore((s) => s.setTopicsConfig);
  const updateChannel = useChatStore((s) => s.updateChannel);
  const enabled = !!channel.topicsEnabled;
  const layout = channel.topicsLayout ?? 'list';
  const setLayout = (topicsLayout: 'tabs' | 'list') => canManage && updateChannel(channel.id, { settings: { topicsLayout } });
  return (
    <ScreenShell title={t('Темы')} onBack={onBack}>
      <div className="flex justify-center px-4">
        <div className="text-5xl">💬</div>
      </div>
      <p className="text-sm text-center text-gray-500 dark:text-gray-400 px-6">{t('Чат группы будет разделён на темы, созданные администраторами и пользователями.')}</p>
      <div className="px-4">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
          <span className="text-sm text-gray-800 dark:text-gray-100">{t('Включить')}</span>
          <Toggle checked={enabled} disabled={!canManage} onChange={() => setTopicsConfig(channel.id, { topicsEnabled: !enabled })} />
        </div>
      </div>
      {enabled && (
        <>
          <div className="px-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">{t('Расположение тем')}</p>
            <div className="flex gap-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 p-4">
              <LayoutCard kind="tabs" active={layout === 'tabs'} label={t('Вкладки')} onClick={() => setLayout('tabs')} />
              <LayoutCard kind="list" active={layout === 'list'} label={t('Список')} onClick={() => setLayout('list')} />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">{t('Выберите расположение тем на экране у всех участников.')}</p>
          </div>
          <div className="px-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">{t('Кто может создавать темы')}</p>
            <div className="flex gap-2">
              {(['all', 'admins'] as const).map((perm) => (
                <button
                  key={perm}
                  disabled={!canManage}
                  onClick={() => setTopicsConfig(channel.id, { createTopicsPermission: perm })}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                    (channel.createTopicsPermission ?? 'all') === perm
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {perm === 'all' ? t('Все участники') : t('Только админы')}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </ScreenShell>
  );
}

/* Карточка-мокап выбора расположения тем (вкладки / список) */
function LayoutCard({ kind, active, label, onClick }: { kind: 'tabs' | 'list'; active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex-1 flex flex-col items-center gap-2">
      <div className={`w-full aspect-[4/3] rounded-lg border-2 p-2 flex ${active ? 'border-violet-500' : 'border-gray-300 dark:border-gray-600'}`}>
        {kind === 'tabs' ? (
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex gap-1 items-center">
              <div className="w-3 h-3 rounded bg-gray-400 dark:bg-gray-500" />
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" /><div className="h-1.5 w-4 rounded bg-gray-300 dark:bg-gray-600" />
              <div className="w-2 h-2 rounded bg-gray-400 dark:bg-gray-500" /><div className="h-1.5 w-3 rounded bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="flex-1 rounded bg-gray-200 dark:bg-gray-600 mt-1" />
            <div className="self-end h-3 w-8 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2 justify-center">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500" />
                <div className="h-1.5 flex-1 rounded bg-gray-300 dark:bg-gray-600" />
              </div>
            ))}
          </div>
        )}
      </div>
      <span className={`text-sm ${active ? 'text-violet-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{label}</span>
    </button>
  );
}

function MembersScreen({ channel, canManage, currentUserId, onBack }: { channel: ChatChannel; canManage: boolean; currentUserId?: number; onBack: () => void }) {
  const t = useT();
  const updateChannel = useChatStore((s) => s.updateChannel);
  const fetchChannels = useChatStore((s) => s.fetchChannels);
  const updateMemberRole = useChatStore((s) => s.updateMemberRole);
  const transferOwnership = useChatStore((s) => s.transferOwnership);
  const [members, setMembers] = useState(channel.members ?? []);
  const [mutingId, setMutingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [restrictFor, setRestrictFor] = useState<number | null>(null);
  useEffect(() => { setMembers(channel.members ?? []); }, [channel.members]);

  // Роль текущего пользователя в канале определяет доступные действия
  const iAmOwner = (members.find((m) => m.id === currentUserId)?.role ?? channel.myRole) === 'owner';

  // Скрытие участников: не-админ видит только владельца/администраторов (как в Telegram)
  const hiddenForMe = !!channel.hideMembers && !canManage;
  const isManagerRole = (r?: string) => r === 'admin' || r === 'owner';
  const visible = members
    .filter((m) => m.name && !/^deleted_\d+_\d+@crm\.deleted$/.test(m.email ?? ''))
    .filter((m) => !hiddenForMe || isManagerRole(m.role));

  const toggleMute = async (id: number, muted: boolean) => {
    setMenuFor(null);
    setMutingId(id);
    try {
      await api.patch(`/chat-channels/${channel.id}/members/${id}`, { isMuted: !muted });
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, isMuted: !muted } : m)));
      fetchChannels(1);
    } catch { useToastStore.getState().addToast('error', 'Не удалось изменить ограничение'); } finally { setMutingId(null); }
  };
  const remove = async (id: number) => {
    setMenuFor(null);
    if (!confirm(t('Удалить участника из группы?'))) return;
    try {
      await api.delete(`/chat-channels/${channel.id}/members/${id}`);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      fetchChannels(1);
    } catch { useToastStore.getState().addToast('error', 'Не удалось удалить участника'); }
  };
  const toggleAdmin = async (id: number, makeAdmin: boolean) => {
    setMenuFor(null);
    await updateMemberRole(channel.id, id, makeAdmin ? 'admin' : 'member');
  };
  const doTransfer = async (id: number, name: string) => {
    setMenuFor(null);
    if (!confirm(t('Передать владение группой участнику') + ` «${name}»? ` + t('Вы станете обычным администратором.'))) return;
    await transferOwnership(channel.id, id);
  };

  // Вложенный экран персональных ограничений участника
  if (restrictFor != null) {
    const target = members.find((m) => m.id === restrictFor);
    if (target) {
      return (
        <MemberRestrictionsScreen
          channel={channel}
          member={target}
          onBack={() => setRestrictFor(null)}
          onSaved={() => { fetchChannels(1); setRestrictFor(null); }}
        />
      );
    }
  }

  return (
    <ScreenShell title={t('Участники')} onBack={onBack}>
      {canManage && (
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
            <span className="text-sm text-gray-800 dark:text-gray-100">{t('Скрыть участников')}</span>
            <Toggle checked={!!channel.hideMembers} onChange={() => updateChannel(channel.id, { settings: { hideMembers: !channel.hideMembers } })} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 px-1 -mt-1">{t('Включите, чтобы скрыть список участников этой группы. Администраторы не будут скрыты.')}</p>
          <button onClick={() => setShowAdd(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <RowIcon bg="bg-sky-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></RowIcon>
            <span className="text-sm text-violet-500">{t('Добавить участников')}</span>
          </button>
        </div>
      )}
      <div className="px-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">{t('Участники')} ({visible.length})</p>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
          {visible.map((m) => {
            const self = m.id === currentUserId;
            const isOwnerRow = m.role === 'owner';
            const hasRestrictions = !!m.permissions && Object.values(m.permissions).some((v) => v === false);
            // Кого можно модерировать: не себя, не владельца; админ не может
            // трогать другого админа (только владелец).
            const canActOnTarget = !self && !isOwnerRow && (iAmOwner || !isManagerRole(m.role)) && canManage;
            return (
              <div key={m.id} className="flex items-center gap-2.5 px-3 py-2">
                <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden relative">
                  {getInitials(m.name)}
                  {m.avatarUrl && <img src={m.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-100">{m.name}</p>
                  {isOwnerRow && <p className="text-xs text-amber-500">{t('владелец')}</p>}
                  {m.role === 'admin' && <p className="text-xs text-violet-500">{t('администратор')}</p>}
                  {m.isMuted && <p className="text-xs text-red-400">{t('Ограничен')}</p>}
                  {!m.isMuted && hasRestrictions && <p className="text-xs text-orange-400">{t('Есть ограничения')}</p>}
                </div>
                {canActOnTarget && (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                      disabled={mutingId === m.id}
                      title={t('Действия')}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {mutingId === m.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                      )}
                    </button>
                    {menuFor === m.id && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                        <div className="absolute right-0 top-full mt-1 z-30 w-52 py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                          {iAmOwner && (
                            <button onClick={() => toggleAdmin(m.id, m.role !== 'admin')} className="w-full text-left px-3.5 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
                              {m.role === 'admin' ? t('Снять администратора') : t('Назначить администратором')}
                            </button>
                          )}
                          <button onClick={() => { setMenuFor(null); setRestrictFor(m.id); }} className="w-full text-left px-3.5 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
                            {t('Ограничения…')}
                          </button>
                          <button onClick={() => toggleMute(m.id, m.isMuted ?? false)} className="w-full text-left px-3.5 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
                            {m.isMuted ? t('Снять запрет на отправку') : t('Запретить отправку')}
                          </button>
                          {iAmOwner && (
                            <button onClick={() => doTransfer(m.id, m.name)} className="w-full text-left px-3.5 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                              {t('Передать владение')}
                            </button>
                          )}
                          <div className="my-1 mx-3 h-px bg-gray-200 dark:bg-gray-700" />
                          <button onClick={() => remove(m.id)} className="w-full text-left px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                            {t('Удалить из группы')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {showAdd && (
        <AddMemberModal
          channel={channel}
          existingMemberIds={members.map((m) => m.id)}
          onClose={() => setShowAdd(false)}
          onAdded={(nm) => { setMembers((prev) => [...prev, nm]); fetchChannels(1); }}
        />
      )}
    </ScreenShell>
  );
}

// Персональные ограничения участника: подмножество прав, которые можно
// запретить конкретному человеку сверх прав канала. Тумблер ВКЛ = разрешено.
function MemberRestrictionsScreen({
  channel,
  member,
  onBack,
  onSaved,
}: {
  channel: ChatChannel;
  member: NonNullable<ChatChannel['members']>[number];
  onBack: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const updateMemberRestrictions = useChatStore((s) => s.updateMemberRestrictions);
  const [saving, setSaving] = useState(false);
  // local[key] = разрешено (true). Ограничение = false.
  const [local, setLocal] = useState<Record<string, boolean>>(() => {
    const perms = (member.permissions as Record<string, boolean> | null) || {};
    const init: Record<string, boolean> = {};
    PERMISSION_ITEMS.forEach((p) => { init[p.key] = perms[p.key] !== false; });
    return init;
  });
  const restrictedCount = Object.values(local).filter((v) => !v).length;

  const save = async () => {
    setSaving(true);
    // В permissions пишем только запрещённые ключи (false); нет запретов → null
    const restricted: Record<string, boolean> = {};
    Object.entries(local).forEach(([k, allowed]) => { if (!allowed) restricted[k] = false; });
    const payload = Object.keys(restricted).length > 0 ? restricted : null;
    const ok = await updateMemberRestrictions(channel.id, member.id, payload);
    setSaving(false);
    if (ok) onSaved();
  };

  return (
    <ScreenShell title={t('Ограничения участника')} onBack={onBack}>
      <div className="px-5 pb-1">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{member.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {restrictedCount > 0 ? `${t('Запрещено')}: ${restrictedCount}` : t('Ограничений нет')}
        </p>
      </div>
      <div className="px-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
          {PERMISSION_ITEMS.map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm text-gray-800 dark:text-gray-100">{t(p.label)}</span>
              <Toggle checked={local[p.key]} onChange={() => setLocal((prev) => ({ ...prev, [p.key]: !prev[p.key] }))} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">{t('Выключите право, чтобы запретить его этому участнику. Действует поверх общих прав группы.')}</p>
        <button
          onClick={save}
          disabled={saving}
          className="w-full mt-4 px-3 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {saving ? t('Сохранение…') : t('Сохранить')}
        </button>
      </div>
    </ScreenShell>
  );
}

const PERMISSION_ITEMS: { key: string; label: string }[] = [
  { key: 'sendMessages', label: 'Отправка сообщений' },
  { key: 'sendMedia', label: 'Отправка фото и видео' },
  { key: 'sendFiles', label: 'Отправка файлов' },
  { key: 'sendVoice', label: 'Голосовые сообщения' },
  { key: 'addReactions', label: 'Добавление реакций' },
  { key: 'pinMessages', label: 'Закрепление сообщений' },
  { key: 'changeInfo', label: 'Изменение профиля группы' },
  { key: 'inviteUsers', label: 'Добавление участников' },
  { key: 'createTopics', label: 'Создание тем' },
];

function PermissionsScreen({ channel, canManage, onBack }: { channel: ChatChannel; canManage: boolean; onBack: () => void }) {
  const t = useT();
  const updateChannel = useChatStore((s) => s.updateChannel);
  const perms = channel.permissions ?? {};
  const [local, setLocal] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    PERMISSION_ITEMS.forEach((p) => { init[p.key] = perms[p.key] !== false; });
    return init;
  });
  const toggle = (key: string) => {
    if (!canManage) return;
    const next = { ...local, [key]: !local[key] };
    setLocal(next);
    updateChannel(channel.id, { settings: { permissions: next } });
  };
  const enabledCount = Object.values(local).filter(Boolean).length;
  return (
    <ScreenShell title={`${t('Разрешения')} ${enabledCount}/${PERMISSION_ITEMS.length}`} onBack={onBack}>
      <p className="text-xs text-gray-400 dark:text-gray-500 px-5">{t('Что разрешено делать участникам группы.')}</p>
      <div className="px-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
          {PERMISSION_ITEMS.map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm text-gray-800 dark:text-gray-100">{t(p.label)}</span>
              <Toggle checked={local[p.key]} disabled={!canManage} onChange={() => toggle(p.key)} />
            </div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

function AdminsScreen({ channel, currentUserId, onBack }: { channel: ChatChannel; currentUserId?: number; onBack: () => void }) {
  const t = useT();
  // Владелец сверху, затем администраторы
  const managers = (channel.members ?? [])
    .filter((m) => (m.role === 'owner' || m.role === 'admin') && m.name)
    .toSorted((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));
  return (
    <ScreenShell title={t('Администраторы')} onBack={onBack}>
      <div className="px-4">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
          {managers.length === 0 && <p className="px-3 py-4 text-sm text-gray-400">{t('Администраторов нет')}</p>}
          {managers.map((m) => {
            const isOwnerRow = m.role === 'owner';
            const self = m.id === currentUserId;
            return (
              <div key={m.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden relative ${isOwnerRow ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                  {getInitials(m.name)}
                  {m.avatarUrl && <img src={m.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                </div>
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-100 truncate">{m.name}{self ? ` (${t('вы')})` : ''}</span>
                <span className={`text-xs ${isOwnerRow ? 'text-amber-500' : 'text-violet-500'}`}>{isOwnerRow ? t('владелец') : t('администратор')}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">{t('Владелец и администраторы могут менять настройки группы и управлять участниками. Назначить администратора может только владелец — в разделе «Участники».')}</p>
      </div>
    </ScreenShell>
  );
}

interface RecentAction {
  id: number;
  action: string;
  actorUserId: number | null;
  actorName: string | null;
  meta: Record<string, any>;
  createdAt: string;
}

// Человекочитаемое описание действия (без имени актора — оно выводится отдельно)
function describeAction(a: RecentAction): string {
  const m = a.meta || {};
  const target = m.targetName || (m.targetUserId ? `#${m.targetUserId}` : 'участника');
  const topic = m.name ? `«${m.name}»` : 'тему';
  const FIELD_LABELS: Record<string, string> = {
    name: 'название',
    description: 'описание',
    type: 'тип группы',
    avatar: 'фото',
    profileColor: 'цвет профиля',
    wallpaper: 'обои',
    backgroundEmoji: 'фоновый эмодзи',
    emojiStatus: 'эмодзи-статус',
    reactionsMode: 'реакции',
    historyVisibleToNewMembers: 'видимость истории',
    hideMembers: 'список участников',
    permissions: 'права участников',
  };
  switch (a.action) {
    case 'channel.update': {
      const fields: string[] = Array.isArray(m.fields) ? m.fields : [];
      if (fields.includes('name') && m.name) return `изменил(а) название на «${m.name}»`;
      const labels = fields.map((f) => FIELD_LABELS[f] || f);
      return labels.length ? `изменил(а): ${labels.join(', ')}` : 'изменил(а) настройки группы';
    }
    case 'member.add': return `добавил(а) ${target}`;
    case 'member.remove': return `удалил(а) ${target}`;
    case 'member.mute': return m.isMuted ? `ограничил(а) ${target}` : `снял(а) ограничение с ${target}`;
    case 'topic.create': return `создал(а) ${topic}`;
    case 'topic.delete': return `удалил(а) ${topic}`;
    case 'topic.rename': return `переименовал(а) тему${m.oldName ? ` «${m.oldName}»` : ''} в ${topic}`;
    case 'topic.close': return `закрыл(а) ${topic}`;
    case 'topic.reopen': return `переоткрыл(а) ${topic}`;
    case 'topic.pin': return `закрепил(а) ${topic}`;
    case 'topic.unpin': return `открепил(а) ${topic}`;
    case 'topics.enable': return 'включил(а) темы';
    case 'topics.disable': return 'выключил(а) темы';
    default: return a.action;
  }
}

function RecentActionsScreen({ channel, onBack }: { channel: ChatChannel; onBack: () => void }) {
  const t = useT();
  const [actions, setActions] = useState<RecentAction[] | null>(null);

  useEffect(() => {
    let alive = true;
    api.get(`/chat-channels/${channel.id}/recent-actions`)
      .then(({ data }) => { if (alive) setActions(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setActions([]); });
    return () => { alive = false; };
  }, [channel.id]);

  return (
    <ScreenShell title={t('Недавние действия')} onBack={onBack}>
      <div className="px-4">
        {actions === null ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('Пока нет действий администраторов.')}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {actions.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <div className="w-7 h-7 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center text-xs font-semibold shrink-0">
                  {getInitials(a.actorName || '?')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-100">
                    <span className="font-medium">{a.actorName || t('Пользователь')}</span>{' '}
                    <span className="text-gray-500 dark:text-gray-400">{describeAction(a)}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{new Date(a.createdAt).toLocaleString('ru-RU')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScreenShell>
  );
}

/* ───────── Add Member Modal ───────── */

function AddMemberModal({
  channel,
  existingMemberIds,
  onClose,
  onAdded,
}: {
  channel: ChatChannel;
  existingMemberIds: number[];
  onClose: () => void;
  onAdded: (member: { id: number; name: string; avatarUrl?: string; email?: string; isMuted?: boolean; role?: string }) => void;
}) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [projectMemberIds, setProjectMemberIds] = useState<Set<number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [confirmNotInProject, setConfirmNotInProject] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: usersData } = await api.get('/users', { params: { limit: 200 } });
        const all: any[] = Array.isArray(usersData) ? usersData : (usersData.data ?? usersData.users ?? []);
        setUsers(all.filter((u: any) => !existingMemberIds.includes(u.id)));

        if (channel.projectId) {
          try {
            const [{ data: teams }, assignRes] = await Promise.all([
              api.get(`/projects/${channel.projectId}/team`),
              api.get(`/projects/${channel.projectId}/assignments`).catch(() => ({ data: {} })),
            ]);
            const teamList: any[] = Array.isArray(teams) ? teams : (teams.data ?? []);
            const memberSets = await Promise.all(
              teamList.map((t: any) =>
                api.get(`/teams/${t.teamId ?? t.team?.id}/members`).then(({ data }) =>
                  (Array.isArray(data) ? data : (data.data ?? [])).map((m: any) => m.userId ?? m.id),
                ).catch(() => [] as number[]),
              ),
            );
            // Помимо командных участников, учитываем напрямую назначенных
            // на проект сотрудников (вкладка «Сотрудники» = user-assignments),
            // иначе у проекта без команд все показываются как «не в проекте».
            const aData = (assignRes.data?.assignments || assignRes.data?.data || assignRes.data || []) as any[];
            const assignedIds = (Array.isArray(aData) ? aData : []).map((a: any) => a.userId ?? a.id);
            setProjectMemberIds(new Set([...memberSets.flat(), ...assignedIds]));
          } catch {
            setProjectMemberIds(new Set());
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = users.filter((u) => {
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim().toLowerCase();
    const email = (u.email ?? '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const handleSelect = (u: any) => {
    if (channel.projectId && projectMemberIds !== null && !projectMemberIds.has(u.id)) {
      setSelected(u);
      setConfirmNotInProject(true);
    } else {
      doAdd(u, false);
    }
  };

  const doAdd = async (u: any, addToProject: boolean) => {
    setAdding(true);
    try {
      if (addToProject && channel.projectId) {
        try {
          const { data: userDetail } = await api.get(`/users/${u.id}`);
          const teamId = userDetail?.team?.id;
          if (teamId) {
            await api.post(`/projects/${channel.projectId}/team`, { teamId }).catch(() => {});
          }
        } catch {}
      }
      await api.post(`/chat-channels/${channel.id}/members`, { userId: u.id });
      onAdded({
        id: u.id,
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        avatarUrl: u.avatarUrl,
        email: u.email,
        isMuted: false,
        role: 'member',
      });
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Не удалось добавить участника');
    } finally {
      setAdding(false);
    }
  };

  if (confirmNotInProject && selected) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Пользователь не в проекте</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span className="font-medium text-gray-700 dark:text-gray-200">{`${selected.firstName ?? ''} ${selected.lastName ?? ''}`.trim() || selected.email}</span> не входит в команду проекта. Добавить его/её в проект тоже?
          </p>
          <div className="flex flex-col gap-2">
            <button
              disabled={adding}
              onClick={() => doAdd(selected, true)}
              className="w-full py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {adding ? 'Добавляю…' : 'Добавить в проект и в чат'}
            </button>
            <button
              disabled={adding}
              onClick={() => doAdd(selected, false)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              Только в чат
            </button>
            <button
              disabled={adding}
              onClick={() => { setConfirmNotInProject(false); setSelected(null); }}
              className="w-full py-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Добавить участника</span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-3 py-2 shrink-0">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или email…"
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-6">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Нет сотрудников для добавления</p>
          ) : (
            filtered.map((u) => {
              const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;
              const notInProject = channel.projectId && projectMemberIds !== null && !projectMemberIds.has(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden relative">
                    {getInitials(name)}
                    {u.avatarUrl && (
                      <img src={u.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  {notInProject && (
                    <span className="text-xs text-amber-500 shrink-0">не в проекте</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Info Row ───────── */

const INFO_ICONS: Record<string, React.ReactNode> = {
  email: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  phone: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  role: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  position: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  team: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  const t = useT();
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <div className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0">
        {INFO_ICONS[icon]}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm text-gray-800 dark:text-gray-100 break-words">{value}</p>
      </div>
    </div>
  );
}

/* ───────── Helpers ───────── */

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function pluralize(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return '';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'а';
  return 'ов';
}
