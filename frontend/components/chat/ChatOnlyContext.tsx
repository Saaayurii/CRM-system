'use client';

import { createContext, useContext } from 'react';

// Chat-only mode is active on the chat subdomain (chat.crm.3stroy15.pro), where
// the chat renders standalone without the dashboard chrome (no Sidebar/Header).
// Components use this to drop navigations that lead out of the chat — those
// dashboard pages don't exist on the subdomain.
export interface ChatOnlyValue {
  chatOnly: boolean;
  // Where the chat list lives, for in-chat self-navigation (e.g. "open in new
  // window", channelId deep-links). '/' on the subdomain, '/dashboard/chat'
  // inside the full app.
  basePath: string;
}

const ChatOnlyContext = createContext<ChatOnlyValue>({
  chatOnly: false,
  basePath: '/dashboard/chat',
});

export function ChatOnlyProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChatOnlyContext.Provider value={{ chatOnly: true, basePath: '/' }}>
      {children}
    </ChatOnlyContext.Provider>
  );
}

export function useChatOnly(): ChatOnlyValue {
  return useContext(ChatOnlyContext);
}
