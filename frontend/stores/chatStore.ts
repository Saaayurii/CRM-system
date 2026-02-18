import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import api from '@/lib/api';

/* ───────── Types ───────── */

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
  members?: { id: number; name: string; avatarUrl?: string }[];
}

export interface CreateChannelDto {
  channelType: 'direct' | 'group';
  channelName?: string;
  memberIds: number[];
}

/* ───────── Store ───────── */

interface ChatState {
  channels: ChatChannel[];
  activeChannelId: number | null;
  messages: ChatMessage[];
  typingUsers: Record<number, string[]>;
  onlineUsers: Set<number>;
  unreadCounts: Record<number, number>;
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
  sendMessage: (channelId: number, text: string, attachments?: File[], replyToMessageId?: number) => void;
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
    socket.on('message:new', (message: ChatMessage) => {
      const { activeChannelId, channels, unreadCounts } = get();

      // Update channel last message
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

      // Sort: channel with new message goes to top
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
      } else {
        // Increment unread
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
    socket.on('message:edited', (updated: { id: number; text: string }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === updated.id ? { ...m, text: updated.text, isEdited: true } : m
        ),
      }));
    });

    // Message deleted
    socket.on('message:deleted', (data: { id: number }) => {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== data.id),
      }));
    });

    // Reaction updated
    socket.on('message:reaction:updated', (data: { messageId: number; reactions: ChatReaction[] }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m
        ),
      }));
    });

    // Typing
    socket.on('typing:start', (data: { channelId: number; userName: string }) => {
      set((state) => {
        const current = state.typingUsers[data.channelId] || [];
        if (current.includes(data.userName)) return state;
        return {
          typingUsers: {
            ...state.typingUsers,
            [data.channelId]: [...current, data.userName],
          },
        };
      });
    });

    socket.on('typing:stop', (data: { channelId: number; userName: string }) => {
      set((state) => {
        const current = state.typingUsers[data.channelId] || [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [data.channelId]: current.filter((n) => n !== data.userName),
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

    // Read receipts
    socket.on('message:read:updated', (data: { channelId: number; userId: number }) => {
      const { activeChannelId } = get();
      if (data.channelId === activeChannelId) {
        // Could update read status on messages if needed
      }
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

  sendMessage: (channelId, text, attachments, replyToMessageId) => {
    if (!socketRef?.connected) return;

    socketRef.emit('message:send', {
      channelId,
      text,
      attachments: attachments?.map((f) => ({ fileName: f.name, fileSize: f.size, mimeType: f.type })),
      replyToMessageId,
    });

    set({ replyToMessage: null });
  },

  editMessage: (messageId, text) => {
    if (!socketRef?.connected) return;
    socketRef.emit('message:edit', { messageId, text });
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
    set({ activeChannelId: channelId, messages: [], hasMoreMessages: true });

    // Join channel room
    if (socketRef?.connected) {
      const { activeChannelId: prevId } = get();
      if (prevId && prevId !== channelId) {
        socketRef.emit('channel:leave', { channelId: prevId });
      }
      socketRef.emit('channel:join', { channelId });
    }

    // Mark as read
    get().markAsRead(channelId);

    // Fetch initial messages
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

      const channelsList: ChatChannel[] = data.data || data;
      const total = data.total || 0;

      set((state) => ({
        channels: page === 1 ? channelsList : [...state.channels, ...channelsList],
        channelsPage: page,
        hasMoreChannels: page === 1 ? channelsList.length < total : state.channels.length + channelsList.length < total,
        isLoadingChannels: false,
      }));

      // Fetch unread summary
      try {
        const { data: unread } = await api.get('/chat-channels/unread-summary');
        const counts: Record<number, number> = {};
        if (Array.isArray(unread)) {
          unread.forEach((item: { channelId: number; count: number }) => {
            counts[item.channelId] = item.count;
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

      const messagesList: ChatMessage[] = data.data || data;

      set((state) => ({
        messages: cursor ? [...messagesList.reverse(), ...state.messages] : messagesList.reverse(),
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
      const channel: ChatChannel = data;

      set((state) => ({
        channels: [channel, ...state.channels],
      }));

      return channel;
    } catch {
      return null;
    }
  },

  setReplyToMessage: (message) => {
    set({ replyToMessage: message });
  },
}));
