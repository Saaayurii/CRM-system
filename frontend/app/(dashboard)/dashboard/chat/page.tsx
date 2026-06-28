'use client';

import ChatScreen from '@/components/chat/ChatScreen';

// Chat inside the full dashboard (with Sidebar/Header chrome). The standalone
// chat subdomain renders the same <ChatScreen/> via ChatOnlyProvider — see
// app/(chat)/chatroom.
export default function ChatPage() {
  return <ChatScreen />;
}
