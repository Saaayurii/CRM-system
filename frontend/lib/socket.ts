import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  // If env var is set and non-empty — use it directly (local dev).
  // Otherwise connect to current origin; Next.js rewrites /chat/* → localhost:3011/chat/*
  const envUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL;
  const baseUrl = (envUrl && envUrl.trim()) ? envUrl : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3011');

  // Токен больше не кладём в auth — он в httpOnly-cookie, которую socket.io
  // прикладывает к хендшейку при withCredentials. Сервер (chat.gateway/ws-jwt)
  // читает `crm_at` из cookie хендшейка.
  socket = io(`${baseUrl}/chat`, {
    withCredentials: true,
    transports: ['polling', 'websocket'],
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
