import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { previewFromMessage } from '@/lib/chat/messagePreview';

/* ───────── Types ───────── */

export interface UploadedAttachment {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  excludeFromMedia?: boolean;
}

export interface ChatAttachment {
  id: number;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: { id: number; name: string }[];
}

export interface ForwardMeta {
  fromChannelId: number;
  fromChannelName: string;
  originalSenderName: string;
  originalSenderId: number;
  originalSenderAvatarUrl?: string;
}

export interface ChatMessage {
  id: number;
  channelId: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl?: string;
  text: string;
  messageType: string;
  isEdited: boolean;
  forwardMeta?: ForwardMeta | null;
  replyToMessage?: {
    id: number;
    text: string;
    senderName: string;
  } | null;
  attachments: ChatAttachment[];
  reactions: ChatReaction[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatChannel {
  id: number;
  channelType: 'direct' | 'group';
  channelName: string;
  avatarUrl?: string;
  membersCount: number;
  projectId?: number;
  projectName?: string | null;
  lastMessage?: {
    text: string;
    senderName: string;
    createdAt: string;
  } | null;
  members?: { id: number; name: string; avatarUrl?: string; email?: string; isMuted?: boolean; role?: string }[];
  pinnedMessages?: { id: number; text: string; senderName: string; pinnedAt: string }[];
  // Per-current-user state
  isPinned?: boolean;
  pinnedAt?: string | null;
  mutedUntil?: string | null;
  isMutedForMe?: boolean;
  myRole?: string;
}

export interface CreateChannelDto {
  channelType: 'direct' | 'group';
  name?: string;
  memberIds?: number[];
  avatarUrl?: string;
  projectId?: number;
  settings?: Record<string, unknown>;
}

/* ───────── Raw→Typed Mappers ───────── */

function getFullName(user: any): string {
  if (!user) return '';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email || user.username || '';
}

function mapReactions(raw: any): ChatReaction[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw as Record<string, number[]>).map(([emoji, users]) => ({
    emoji,
    count: Array.isArray(users) ? users.length : 0,
    users: Array.isArray(users) ? (users as number[]).map((id) => ({ id, name: '' })) : [],
  }));
}

function normalizeFileUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) return url;
  return `/uploads/chat/${url}`;
}

function normalizeAttachments(attachments: any[]): ChatAttachment[] {
  return attachments.map((a) => ({ ...a, fileUrl: normalizeFileUrl(a.fileUrl ?? '') }));
}

export function mapRawMessage(raw: any): ChatMessage {
  const user = raw.user || {};
  const replyRaw = raw.replyToMessage;
  return {
    id: raw.id,
    channelId: raw.channelId,
    senderId: raw.senderId ?? raw.userId,
    senderName: raw.senderName ?? getFullName(user),
    senderAvatarUrl: raw.senderAvatarUrl ?? user.avatarUrl ?? undefined,
    text: raw.text ?? raw.messageText ?? '',
    messageType: raw.messageType ?? 'text',
    isEdited: raw.isEdited ?? false,
    replyToMessage: replyRaw
      ? {
          id: replyRaw.id,
          text: replyRaw.text ?? replyRaw.messageText ?? '',
          senderName: replyRaw.senderName ?? getFullName(replyRaw.user ?? {}),
        }
      : null,
    attachments: normalizeAttachments(raw.attachments ?? []),
    reactions: mapReactions(raw.reactions ?? {}),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    forwardMeta: (() => {
      const meta = (raw.attachments ?? []).find((a: any) => a.type === 'forward_meta');
      if (!meta) return null;
      return {
        fromChannelId: meta.fromChannelId,
        fromChannelName: meta.fromChannelName || '',
        originalSenderName: meta.originalSenderName || '',
        originalSenderId: meta.originalSenderId,
        originalSenderAvatarUrl: meta.originalSenderAvatarUrl,
      } as ForwardMeta;
    })(),
  };
}

function mapRawChannel(raw: any, currentUserId?: number): ChatChannel {
  const rawMembers = (raw.members || []) as any[];
  const members = rawMembers.map((m: any) => {
    const u = m.user || {};
    return {
      id: m.userId ?? u.id,
      name: getFullName(u) || u.email || u.username || 'Unknown',
      avatarUrl: u.avatarUrl ?? undefined,
      email: u.email ?? undefined,
      isMuted: m.isMuted ?? false,
      role: m.role ?? 'member',
    };
  });

  // Per-current-user metadata: pinned, muted-for-me, role
  let isPinned: boolean | undefined;
  let pinnedAt: string | null | undefined;
  let mutedUntil: string | null | undefined;
  let isMutedForMe: boolean | undefined;
  let myRole: string | undefined;
  if (currentUserId != null) {
    const me = rawMembers.find((m: any) => (m.userId ?? m.user?.id) === currentUserId);
    if (me) {
      isPinned = !!me.isPinned;
      pinnedAt = me.pinnedAt ?? null;
      mutedUntil = me.mutedUntil ?? null;
      isMutedForMe = !!me.isMuted;
      myRole = me.role ?? 'member';
    }
  }

  // Backend includes messages[0] as last message
  const rawLastMsg = raw.messages?.[0] ?? null;
  const lastMsgUser = rawLastMsg?.user;

  const settings = raw.settings || {};
  // Поддержка нового формата (массив) и старого (одно сообщение)
  let pinnedMessages: { id: number; text: string; senderName: string; pinnedAt: string }[] = [];
  if (Array.isArray(settings.pinnedMessages) && settings.pinnedMessages.length > 0) {
    pinnedMessages = settings.pinnedMessages;
  } else if (settings.pinnedMessageId) {
    pinnedMessages = [{
      id: settings.pinnedMessageId as number,
      text: (settings.pinnedMessageText as string) || '',
      senderName: (settings.pinnedBySenderName as string) || '',
      pinnedAt: new Date().toISOString(),
    }];
  }

  return {
    id: raw.id,
    channelType: raw.channelType,
    channelName: raw.channelName ?? raw.name ?? '',
    avatarUrl: raw.avatarUrl ?? raw.settings?.avatarUrl ?? undefined,
    membersCount: raw.membersCount ?? members.length,
    projectId: raw.projectId ?? undefined,
    projectName: raw.project?.name ?? raw.projectName ?? raw.settings?.projectName ?? null,
    lastMessage: rawLastMsg
      ? {
          text: previewFromMessage(
            rawLastMsg.text ?? rawLastMsg.messageText ?? '',
            rawLastMsg.messageType,
            rawLastMsg.attachments ?? [],
          ),
          senderName: rawLastMsg.senderName ?? getFullName(lastMsgUser ?? {}),
          createdAt: rawLastMsg.createdAt,
        }
      : raw.lastMessage ?? null,
    members,
    pinnedMessages,
    isPinned,
    pinnedAt,
    mutedUntil,
    isMutedForMe,
    myRole,
  };
}

/* ───────── Store ───────── */

interface ChatState {
  channels: ChatChannel[];
  archivedChannels: ChatChannel[];
  archivedCount: number;
  showArchive: boolean;
  activeChannelId: number | null;
  messages: ChatMessage[];
  typingUsers: Record<number, { userId: number; name: string }[]>;
  onlineUsers: Set<number>;
  // userId → ISO-время, когда пользователь был в сети последний раз
  lastSeenAt: Record<number, string>;
  unreadCounts: Record<number, number>;
  // channelId → userId → lastReadAt ISO string
  channelReadAts: Record<number, Record<number, string>>;
  isConnected: boolean;
  hasMoreMessages: boolean;
  isLoadingMessages: boolean;
  channelsPage: number;
  hasMoreChannels: boolean;
  isLoadingChannels: boolean;
  replyToMessage: ChatMessage | null;
  editingMessage: ChatMessage | null;
  chatWindowOpen: boolean;

  // Actions
  setChatWindowOpen: (open: boolean) => void;
  setShowArchive: (show: boolean) => void;
  connect: () => void;
  disconnect: () => void;
  // Refcounted socket lifecycle: several consumers (страница чата + мини-чат)
  // могут одновременно держать соединение; сокет рвётся только когда все отпустили.
  acquireConnection: () => void;
  releaseConnection: () => void;
  sendMessage: (channelId: number, text: string, attachments?: UploadedAttachment[], replyToMessageId?: number, messageType?: string) => void;
  editMessage: (messageId: number, text: string) => void;
  deleteMessage: (messageId: number) => void;
  reactToMessage: (messageId: number, reaction: string) => void;
  markAsRead: (channelId: number) => void;
  startTyping: (channelId: number) => void;
  stopTyping: (channelId: number) => void;
  setActiveChannel: (channelId: number | null) => Promise<void>;
  fetchChannels: (page?: number) => Promise<void>;
  fetchUnreadSummary: () => Promise<void>;
  fetchArchivedChannels: () => Promise<void>;
  fetchArchivedCount: () => Promise<void>;
  archiveChannel: (channelId: number, isArchived: boolean) => Promise<void>;
  pinChannel: (channelId: number, isPinned: boolean) => Promise<void>;
  muteChannel: (channelId: number, mutedUntil: Date | null) => Promise<void>;
  markChannelUnread: (channelId: number) => Promise<void>;
  clearChannelHistory: (channelId: number) => Promise<void>;
  fetchLastSeen: (userIds: number[]) => Promise<void>;
  fetchProjectChannels: (projectId: number) => Promise<ChatChannel[]>;
  fetchMessages: (channelId: number, cursor?: number) => Promise<void>;
  createChannel: (dto: CreateChannelDto) => Promise<ChatChannel | null>;
  setReplyToMessage: (message: ChatMessage | null) => void;
  setEditingMessage: (message: ChatMessage | null) => void;
  pinMessage: (channelId: number, messageId: number, messageText: string, senderName: string) => void;
  unpinMessage: (channelId: number, messageId: number) => void;
}

let socketRef: Socket | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
let connectionRefs = 0;
// Reads requested before the socket finished connecting (e.g. opening a
// channel straight from a push notification). Flushed on 'connect'.
const pendingReads = new Set<number>();

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  archivedChannels: [],
  archivedCount: 0,
  showArchive: false,
  activeChannelId: null,
  messages: [],
  typingUsers: {},
  onlineUsers: new Set(),
  lastSeenAt: {},
  unreadCounts: {},
  channelReadAts: {},
  isConnected: false,
  hasMoreMessages: true,
  isLoadingMessages: false,
  channelsPage: 1,
  hasMoreChannels: true,
  isLoadingChannels: false,
  replyToMessage: null,
  editingMessage: null,
  chatWindowOpen: false,

  connect: () => {
    if (socketRef?.connected) return;

    const socket = getSocket();
    // Повторный connect() во время рукопожатия (страница чата + мини-чат) не
    // должен навешивать слушатели второй раз — иначе дубли сообщений/тостов
    socket.removeAllListeners();
    socketRef = socket;

    socket.on('connect', () => {
      set({ isConnected: true });
      // Re-join the open channel and flush any reads queued before connect
      // (e.g. when the channel was opened directly from a push notification).
      const { activeChannelId } = get();
      if (activeChannelId) {
        socket.emit('channel:join', { channelId: activeChannelId });
        pendingReads.add(activeChannelId);
      }
      pendingReads.forEach((channelId) => {
        socket.emit('message:read', { channelId });
      });
      pendingReads.clear();
    });

    socket.on('disconnect', () => {
      // Без соединения данные presence неактуальны — гасим все «в сети»,
      // свежий snapshot придёт при reconnect.
      set({ isConnected: false, onlineUsers: new Set() });
    });

    // New message
    socket.on('message:new', (raw: any) => {
      const message = mapRawMessage(raw);
      const { activeChannelId, channels, unreadCounts } = get();

      // Превью для списка чатов: сообщения без текста описываем по вложению
      // («📷 Фотография», «🎤 Голосовое сообщение» и т.д. — как в Telegram)
      const previewText = previewFromMessage(message.text, message.messageType, message.attachments as any[]);

      const updatedChannel = channels.find((ch) => ch.id === message.channelId);
      // Канала нет в списке (новый чат / за пределами пагинации) —
      // перезагружаем список, иначе сообщение не отобразится слева вовсе
      if (!updatedChannel) {
        get().fetchChannels(1);
      }
      const updatedChannels = updatedChannel
        ? [
            ...channels.filter((ch) => ch.id !== message.channelId),
          ]
        : [...channels];

      if (updatedChannel) {
        const withNewMsg = {
          ...updatedChannel,
          lastMessage: {
            text: previewText,
            senderName: message.senderName,
            createdAt: message.createdAt,
          },
        };
        // Bubble to front; ChatSidebar will keep selfChat pinned first
        updatedChannels.unshift(withNewMsg);
      }

      if (message.channelId === activeChannelId) {
        set((state) => ({
          messages: [...state.messages, message],
          channels: updatedChannels,
        }));
        // Auto-mark as read when viewing the channel
        get().markAsRead(activeChannelId);
      } else {
        set({
          channels: updatedChannels,
          unreadCounts: {
            ...unreadCounts,
            [message.channelId]: (unreadCounts[message.channelId] || 0) + 1,
          },
        });
        const preview = previewText ? previewText.slice(0, 60) : 'Новое сообщение';
        useToastStore.getState().addToast('info', `${message.senderName}: ${preview}`);
      }
    });

    // Message edited
    socket.on('message:edited', (raw: any) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === raw.id ? { ...m, text: raw.text ?? raw.messageText ?? m.text, isEdited: true } : m
        ),
      }));
    });

    // Message deleted — flag it so the bubble plays the delete animation
    // (same as a local delete), then remove it once the animation finishes.
    socket.on('message:deleted', (data: { messageId: number }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === data.messageId ? ({ ...m, isDeleting: true } as typeof m) : m
        ),
      }));
      setTimeout(() => {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== data.messageId),
        }));
      }, 850);
    });

    // Reaction updated
    socket.on('message:reaction:updated', (raw: any) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === raw.id ? { ...m, reactions: mapReactions(raw.reactions ?? {}) } : m
        ),
      }));
    });

    // Typing
    socket.on('typing:start', (data: { channelId: number; userId: number; name: string }) => {
      set((state) => {
        const current = state.typingUsers[data.channelId] || [];
        if (current.some((u) => u.userId === data.userId)) return state;
        return {
          typingUsers: {
            ...state.typingUsers,
            [data.channelId]: [...current, { userId: data.userId, name: data.name }],
          },
        };
      });
    });

    socket.on('typing:stop', (data: { channelId: number; userId: number }) => {
      set((state) => {
        const current = state.typingUsers[data.channelId] || [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [data.channelId]: current.filter((u) => u.userId !== data.userId),
          },
        };
      });
    });

    // Presence
    socket.on('presence:snapshot', (data: { userIds: number[] }) => {
      set({ onlineUsers: new Set(data.userIds) });
    });

    socket.on('presence:online', (data: { userId: number }) => {
      set((state) => {
        const next = new Set(state.onlineUsers);
        next.add(data.userId);
        return { onlineUsers: next };
      });
    });

    socket.on('presence:offline', (data: { userId: number; lastSeenAt?: string | null }) => {
      set((state) => {
        const next = new Set(state.onlineUsers);
        next.delete(data.userId);
        return {
          onlineUsers: next,
          lastSeenAt: data.lastSeenAt
            ? { ...state.lastSeenAt, [data.userId]: data.lastSeenAt }
            : state.lastSeenAt,
        };
      });
    });

    // Read receipts — track per-user per-channel readAt
    socket.on(
      'message:read:updated',
      (data: { channelId: number; userId: number; lastReadAt?: string }) => {
        const readAt = data.lastReadAt || new Date().toISOString();
        set((state) => ({
          channelReadAts: {
            ...state.channelReadAts,
            [data.channelId]: {
              ...(state.channelReadAts[data.channelId] || {}),
              [data.userId]: readAt,
            },
          },
        }));
      }
    );

    // Pinned messages
    socket.on('message:pinned', (data: { channelId: number; pinnedMessages: { id: number; text: string; senderName: string; pinnedAt: string }[] }) => {
      set((state) => ({
        channels: state.channels.map((ch) =>
          ch.id === data.channelId ? { ...ch, pinnedMessages: data.pinnedMessages } : ch
        ),
      }));
    });

    socket.on('message:unpinned', (data: { channelId: number; pinnedMessages: { id: number; text: string; senderName: string; pinnedAt: string }[] }) => {
      set((state) => ({
        channels: state.channels.map((ch) =>
          ch.id === data.channelId ? { ...ch, pinnedMessages: data.pinnedMessages } : ch
        ),
      }));
    });

    socket.connect();
  },

  disconnect: () => {
    if (socketRef) {
      socketRef.removeAllListeners();
    }
    disconnectSocket();
    socketRef = null;
    set({ isConnected: false });
  },

  acquireConnection: () => {
    connectionRefs++;
    get().connect();
  },

  releaseConnection: () => {
    connectionRefs = Math.max(0, connectionRefs - 1);
    if (connectionRefs === 0) get().disconnect();
  },

  sendMessage: (channelId, text, attachments, replyToMessageId, messageType) => {
    if (!socketRef?.connected) return;

    socketRef.emit('message:send', {
      channelId,
      messageText: text,
      attachments: attachments ?? [],
      replyToMessageId,
      messageType: messageType ?? 'text',
    });

    set({ replyToMessage: null });
  },

  editMessage: (messageId, text) => {
    if (!socketRef?.connected) return;
    socketRef.emit('message:edit', { messageId, messageText: text });
  },

  deleteMessage: (messageId) => {
    if (!socketRef?.connected) return;
    socketRef.emit('message:delete', { messageId });
  },

  reactToMessage: (messageId, reaction) => {
    if (!socketRef?.connected) return;
    socketRef.emit('message:reaction', { messageId, reaction });
  },

  markAsRead: (channelId) => {
    // Clear the local counter immediately so the UI updates even if the
    // socket isn't connected yet (e.g. opening from a push notification).
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [channelId]: 0 },
    }));
    if (socketRef?.connected) {
      socketRef.emit('message:read', { channelId });
    } else {
      // Flush once the socket connects.
      pendingReads.add(channelId);
    }
  },

  startTyping: (channelId) => {
    if (!socketRef?.connected) return;
    socketRef.emit('typing:start', { channelId });

    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      get().stopTyping(channelId);
    }, 3000);
  },

  stopTyping: (channelId) => {
    if (!socketRef?.connected) return;
    socketRef.emit('typing:stop', { channelId });
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
    }
  },

  setActiveChannel: async (channelId) => {
    const prevId = get().activeChannelId;
    set({ activeChannelId: channelId, messages: [], hasMoreMessages: true });

    // Remember the open channel so it can be restored after a reload
    try {
      if (channelId) localStorage.setItem('chat_last_channel', String(channelId));
      else localStorage.removeItem('chat_last_channel');
    } catch { /* ignore */ }

    if (channelId === null) return;

    if (socketRef?.connected) {
      if (prevId && prevId !== channelId) {
        socketRef.emit('channel:leave', { channelId: prevId });
      }
      socketRef.emit('channel:join', { channelId });
    }

    get().markAsRead(channelId);
    await get().fetchMessages(channelId);
  },

  fetchUnreadSummary: async () => {
    try {
      const { data: unread } = await api.get('/chat-channels/unread-summary');
      const counts: Record<number, number> = {};
      if (Array.isArray(unread)) {
        unread.forEach((item: { channelId: number; unreadCount?: number; count?: number }) => {
          counts[item.channelId] = item.unreadCount ?? item.count ?? 0;
        });
      }
      set({ unreadCounts: counts });
    } catch {
      // ignore — keep previous counts
    }
  },

  fetchChannels: async (page = 1) => {
    const { isLoadingChannels } = get();
    if (isLoadingChannels) return;

    set({ isLoadingChannels: true });

    try {
      const { data } = await api.get('/chat-channels', {
        params: { page, limit: 30 },
      });

      const currentUserId = useAuthStore.getState().user?.id;
      const raw = data.data || data;
      let channelsList: ChatChannel[] = Array.isArray(raw)
        ? raw.map((ch: any) => mapRawChannel(ch, currentUserId))
        : [];
      const total = data.total || 0;

      // Auto-create "Избранное" (self-chat) if not present on first page load
      if (page === 1) {
        const hasSelfChat = channelsList.some((ch) => {
          if (ch.channelType !== 'direct' || !ch.members) return false;
          return ch.members.length > 0 && ch.members.every((m) => m.id === ch.members![0]?.id);
        });

        if (!hasSelfChat) {
          try {
            const { data: selfData } = await api.post('/chat-channels', {
              channelType: 'direct',
              memberIds: [],
            });
            const selfChannel = mapRawChannel(selfData, currentUserId);
            channelsList = [selfChannel, ...channelsList];
          } catch {
            // ignore — self-chat creation failed
          }
        }
      }

      // Seed channelReadAts from raw member data
      const rawChannels: any[] = Array.isArray(raw) ? raw : [];
      const readAts: Record<number, Record<number, string>> = {};
      for (const ch of rawChannels) {
        if (!ch.members) continue;
        const memberReads: Record<number, string> = {};
        for (const m of ch.members) {
          const uid = m.userId ?? m.user?.id;
          const lastRead = m.lastReadAt || m.last_read_at;
          if (uid && lastRead) {
            memberReads[uid] = lastRead;
          }
        }
        if (Object.keys(memberReads).length > 0) {
          readAts[ch.id] = memberReads;
        }
      }

      const sortedChannels = channelsList.slice().sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || '';
        const bTime = b.lastMessage?.createdAt || '';
        return bTime.localeCompare(aTime);
      });

      set((state) => ({
        channels: page === 1 ? sortedChannels : [...state.channels, ...sortedChannels],
        channelsPage: page,
        hasMoreChannels:
          page === 1
            ? channelsList.length < total
            : state.channels.length + channelsList.length < total,
        isLoadingChannels: false,
        channelReadAts: { ...state.channelReadAts, ...readAts },
      }));

      // Unread summary
      try {
        const { data: unread } = await api.get('/chat-channels/unread-summary');
        const counts: Record<number, number> = {};
        if (Array.isArray(unread)) {
          unread.forEach((item: { channelId: number; unreadCount?: number; count?: number }) => {
            counts[item.channelId] = item.unreadCount ?? item.count ?? 0;
          });
        }
        set({ unreadCounts: counts });
      } catch {
        // ignore
      }

      // Archived count
      if (page === 1) {
        get().fetchArchivedCount();
      }
    } catch {
      set({ isLoadingChannels: false });
    }
  },

  fetchLastSeen: async (userIds) => {
    const ids = userIds.filter((id) => id > 0);
    if (ids.length === 0) return;
    try {
      const { data } = await api.get('/chat-channels/last-seen', {
        params: { userIds: ids.join(',') },
      });
      if (data && typeof data === 'object') {
        set((state) => {
          const merged = { ...state.lastSeenAt };
          for (const [uid, iso] of Object.entries(data as Record<string, string | null>)) {
            if (iso) merged[Number(uid)] = iso;
          }
          return { lastSeenAt: merged };
        });
      }
    } catch {
      // ignore — статус «не в сети» останется без времени
    }
  },

  fetchProjectChannels: async (projectId: number): Promise<ChatChannel[]> => {
    try {
      const currentUserId = useAuthStore.getState().user?.id;
      const { data } = await api.get('/chat-channels', { params: { projectId, limit: 100 } });
      const raw = data.data || data;
      return Array.isArray(raw) ? raw.map((ch: any) => mapRawChannel(ch, currentUserId)) : [];
    } catch {
      return [];
    }
  },

  fetchMessages: async (channelId, cursor) => {
    const { isLoadingMessages } = get();
    if (isLoadingMessages) return;

    set({ isLoadingMessages: true });

    try {
      const params: Record<string, unknown> = { limit: 50 };
      if (cursor) params.cursor = cursor;

      const { data } = await api.get(`/chat-channels/${channelId}/messages`, { params });

      const rawList: any[] = data.data || data;
      const messagesList = Array.isArray(rawList) ? rawList.map(mapRawMessage) : [];

      set((state) => ({
        messages: cursor
          ? [...messagesList.reverse(), ...state.messages]
          : messagesList.reverse(),
        hasMoreMessages: messagesList.length === 50,
        isLoadingMessages: false,
      }));
    } catch {
      set({ isLoadingMessages: false });
    }
  },

  createChannel: async (dto) => {
    try {
      const currentUserId = useAuthStore.getState().user?.id;
      const { data } = await api.post('/chat-channels', dto);
      const channel: ChatChannel = mapRawChannel(data, currentUserId);

      set((state) => {
        // Avoid duplicates — backend may return existing channel for direct chats
        const exists = state.channels.some((c) => c.id === channel.id);
        return {
          channels: exists ? state.channels : [channel, ...state.channels],
        };
      });

      return channel;
    } catch {
      return null;
    }
  },

  setChatWindowOpen: (open) => set({ chatWindowOpen: open }),
  setShowArchive: (show) => set({ showArchive: show }),

  fetchArchivedCount: async () => {
    try {
      const { data } = await api.get('/chat-channels/archived-count');
      set({ archivedCount: data.count ?? 0 });
    } catch {
      // ignore
    }
  },

  fetchArchivedChannels: async () => {
    try {
      const currentUserId = useAuthStore.getState().user?.id;
      const { data } = await api.get('/chat-channels', { params: { archived: true, limit: 100 } });
      const raw = data.data || data;
      const list: ChatChannel[] = Array.isArray(raw) ? raw.map((ch: any) => mapRawChannel(ch, currentUserId)) : [];
      set({ archivedChannels: list });
    } catch {
      // ignore
    }
  },

  pinChannel: async (channelId, isPinned) => {
    await api.patch(`/chat-channels/${channelId}/pin`, { isPinned });
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId
          ? { ...c, isPinned, pinnedAt: isPinned ? new Date().toISOString() : null }
          : c
      ),
    }));
  },

  muteChannel: async (channelId, mutedUntil) => {
    await api.patch(`/chat-channels/${channelId}/mute`, {
      mutedUntil: mutedUntil ? mutedUntil.toISOString() : null,
    });
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId
          ? {
              ...c,
              isMutedForMe: mutedUntil !== null,
              mutedUntil: mutedUntil ? mutedUntil.toISOString() : null,
            }
          : c
      ),
    }));
  },

  markChannelUnread: async (channelId) => {
    await api.patch(`/chat-channels/${channelId}/mark-unread`);
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [channelId]: Math.max(1, state.unreadCounts[channelId] || 0) },
    }));
    // Refresh authoritative counts from server
    get().fetchUnreadSummary();
  },

  clearChannelHistory: async (channelId) => {
    await api.delete(`/chat-channels/${channelId}/messages`);
    set((state) => ({
      messages: state.activeChannelId === channelId ? [] : state.messages,
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, lastMessage: null } : c
      ),
    }));
  },

  archiveChannel: async (channelId, isArchived) => {
    await api.patch(`/chat-channels/${channelId}/archive`, { isArchived });
    // Move channel between lists
    set((state) => {
      if (isArchived) {
        const ch = state.channels.find((c) => c.id === channelId);
        return {
          channels: state.channels.filter((c) => c.id !== channelId),
          archivedChannels: ch ? [ch, ...state.archivedChannels] : state.archivedChannels,
          archivedCount: state.archivedCount + 1,
        };
      } else {
        const ch = state.archivedChannels.find((c) => c.id === channelId);
        return {
          archivedChannels: state.archivedChannels.filter((c) => c.id !== channelId),
          channels: ch ? [ch, ...state.channels] : state.channels,
          archivedCount: Math.max(0, state.archivedCount - 1),
        };
      }
    });
  },

  setReplyToMessage: (message) => {
    set({ replyToMessage: message });
  },
  setEditingMessage: (message) => {
    set({ editingMessage: message });
  },

  pinMessage: (channelId, messageId, messageText, senderName) => {
    if (!socketRef?.connected) return;
    socketRef.emit('message:pin', { channelId, messageId, messageText, senderName });
  },

  unpinMessage: (channelId, messageId) => {
    if (!socketRef?.connected) return;
    socketRef.emit('message:unpin', { channelId, messageId });
  },
}));
