import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import api from '@/lib/api';

/* ───────── Types ───────── */

export interface UploadedAttachment {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
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

export interface ChatMessage {
  id: number;
  channelId: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl?: string;
  text: string;
  messageType: string;
  isEdited: boolean;
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
  lastMessage?: {
    text: string;
    senderName: string;
    createdAt: string;
  } | null;
  members?: { id: number; name: string; avatarUrl?: string; email?: string }[];
}

export interface CreateChannelDto {
  channelType: 'direct' | 'group';
  name?: string;
  memberIds?: number[];
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
    attachments: raw.attachments ?? [],
    reactions: mapReactions(raw.reactions ?? {}),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function mapRawChannel(raw: any): ChatChannel {
  const members = ((raw.members || []) as any[]).map((m: any) => {
    const u = m.user || {};
    return {
      id: m.userId ?? u.id,
      name: getFullName(u) || u.email || u.username || 'Unknown',
      avatarUrl: u.avatarUrl ?? undefined,
      email: u.email ?? undefined,
    };
  });

  // Backend includes messages[0] as last message
  const rawLastMsg = raw.messages?.[0] ?? null;
  const lastMsgUser = rawLastMsg?.user;

  return {
    id: raw.id,
    channelType: raw.channelType,
    channelName: raw.channelName ?? raw.name ?? '',
    avatarUrl: raw.avatarUrl ?? undefined,
    membersCount: raw.membersCount ?? members.length,
    lastMessage: rawLastMsg
      ? {
          text: rawLastMsg.text ?? rawLastMsg.messageText ?? '',
          senderName: rawLastMsg.senderName ?? getFullName(lastMsgUser ?? {}),
          createdAt: rawLastMsg.createdAt,
        }
      : raw.lastMessage ?? null,
    members,
  };
}

/* ───────── Store ───────── */

interface ChatState {
  channels: ChatChannel[];
  activeChannelId: number | null;
  messages: ChatMessage[];
  typingUsers: Record<number, string[]>;
  onlineUsers: Set<number>;
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

  // Actions
  connect: () => void;
  disconnect: () => void;
  sendMessage: (channelId: number, text: string, attachments?: UploadedAttachment[], replyToMessageId?: number, messageType?: string) => void;
  editMessage: (messageId: number, text: string) => void;
  deleteMessage: (messageId: number) => void;
  reactToMessage: (messageId: number, reaction: string) => void;
  markAsRead: (channelId: number) => void;
  startTyping: (channelId: number) => void;
  stopTyping: (channelId: number) => void;
  setActiveChannel: (channelId: number) => Promise<void>;
  fetchChannels: (page?: number) => Promise<void>;
  fetchMessages: (channelId: number, cursor?: number) => Promise<void>;
  createChannel: (dto: CreateChannelDto) => Promise<ChatChannel | null>;
  setReplyToMessage: (message: ChatMessage | null) => void;
}

let socketRef: Socket | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  activeChannelId: null,
  messages: [],
  typingUsers: {},
  onlineUsers: new Set(),
  unreadCounts: {},
  channelReadAts: {},
  isConnected: false,
  hasMoreMessages: true,
  isLoadingMessages: false,
  channelsPage: 1,
  hasMoreChannels: true,
  isLoadingChannels: false,
  replyToMessage: null,

  connect: () => {
    if (socketRef?.connected) return;

    const socket = getSocket();
    socketRef = socket;

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    // New message
    socket.on('message:new', (raw: any) => {
      const message = mapRawMessage(raw);
      const { activeChannelId, channels, unreadCounts } = get();

      const updatedChannels = channels.map((ch) =>
        ch.id === message.channelId
          ? {
              ...ch,
              lastMessage: {
                text: message.text,
                senderName: message.senderName,
                createdAt: message.createdAt,
              },
            }
          : ch
      );

      updatedChannels.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || '';
        const bTime = b.lastMessage?.createdAt || '';
        return bTime.localeCompare(aTime);
      });

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

    // Message deleted
    socket.on('message:deleted', (data: { messageId: number }) => {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== data.messageId),
      }));
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
    socket.on('typing:start', (data: { channelId: number; name: string }) => {
      set((state) => {
        const current = state.typingUsers[data.channelId] || [];
        if (current.includes(data.name)) return state;
        return {
          typingUsers: {
            ...state.typingUsers,
            [data.channelId]: [...current, data.name],
          },
        };
      });
    });

    socket.on('typing:stop', (data: { channelId: number; userId: number; name?: string }) => {
      set((state) => {
        const current = state.typingUsers[data.channelId] || [];
        const updated = data.name
          ? current.filter((n) => n !== data.name)
          : current.filter((n) => !n.startsWith(`uid:${data.userId}`));
        return {
          typingUsers: {
            ...state.typingUsers,
            [data.channelId]: updated,
          },
        };
      });
    });

    // Presence
    socket.on('presence:online', (data: { userId: number }) => {
      set((state) => {
        const next = new Set(state.onlineUsers);
        next.add(data.userId);
        return { onlineUsers: next };
      });
    });

    socket.on('presence:offline', (data: { userId: number }) => {
      set((state) => {
        const next = new Set(state.onlineUsers);
        next.delete(data.userId);
        return { onlineUsers: next };
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
    if (!socketRef?.connected) return;
    socketRef.emit('message:read', { channelId });
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [channelId]: 0 },
    }));
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

    if (socketRef?.connected) {
      if (prevId && prevId !== channelId) {
        socketRef.emit('channel:leave', { channelId: prevId });
      }
      socketRef.emit('channel:join', { channelId });
    }

    get().markAsRead(channelId);
    await get().fetchMessages(channelId);
  },

  fetchChannels: async (page = 1) => {
    const { isLoadingChannels } = get();
    if (isLoadingChannels) return;

    set({ isLoadingChannels: true });

    try {
      const { data } = await api.get('/chat-channels', {
        params: { page, limit: 30 },
      });

      const raw = data.data || data;
      let channelsList: ChatChannel[] = Array.isArray(raw)
        ? raw.map((ch: any) => mapRawChannel(ch))
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
            const selfChannel = mapRawChannel(selfData);
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

      set((state) => ({
        channels: page === 1 ? channelsList : [...state.channels, ...channelsList],
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
    } catch {
      set({ isLoadingChannels: false });
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
      const { data } = await api.post('/chat-channels', dto);
      const channel: ChatChannel = mapRawChannel(data);

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

  setReplyToMessage: (message) => {
    set({ replyToMessage: message });
  },
}));
