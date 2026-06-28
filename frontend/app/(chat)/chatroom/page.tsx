'use client';

import { Suspense } from 'react';
import ChatScreen from '@/components/chat/ChatScreen';

// Standalone chat page served on the chat subdomain. Middleware rewrites the
// subdomain root ('/') to '/chatroom', so the browser URL stays clean.
export default function ChatRoomPage() {
  return (
    <Suspense fallback={null}>
      <ChatScreen />
    </Suspense>
  );
}
