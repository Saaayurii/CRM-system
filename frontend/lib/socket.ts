import { io, Socket } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
// Derive the socket.io server URL from API base (strip /api/v1 path)
const WS_URL = API_BASE.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  socket = io(`${WS_URL}/chat`, {
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
