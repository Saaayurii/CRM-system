import { io, Socket } from 'socket.io-client';

// WebSocket connects directly to chat-service (not through API gateway)
const CHAT_WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'http://localhost:3011';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  socket = io(`${CHAT_WS_URL}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: false,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function reconnectSocket(): void {
  disconnectSocket();
  const s = getSocket();
  s.connect();
}
