import { createContext } from "react";
import type { Socket } from "socket.io-client";
import type { Chat } from "@/services/chat.service";

export type SocketContextType = {
  socket: Socket | null;
  onlineUsers: string[];
  lastSeen: Record<string, Date>;

  // ── Shared chat state (owned by context, consumed by sidebar) ─────────────
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  unreadMap: Record<string, number>;
  setUnreadMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  /**
   * Call when the user opens a chat.
   * Clears that chat's unread badge and tracks which chat is active
   * so incoming messages don't increment the count while it's open.
   */
  markChatRead: (chatId: string) => void;
};

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
  lastSeen: {},
  chats: [],
  setChats: () => {},
  unreadMap: {},
  setUnreadMap: () => {},
  markChatRead: () => {},
});