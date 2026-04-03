import { useEffect, useState, useCallback, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { SocketContext } from "./context";
import { chatService, type Chat, type Message } from "@/services/chat.service";
import { useUser } from "../user-context/use-user.context";

const SOCKET_URL = "http://localhost:8000";

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [lastSeen, setLastSeen] = useState<Record<string, Date>>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  /*********************** LOAD INITIAL CHATS *************************/
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const { chats } = await chatService.getMyChats();
        setChats(chats);

        const counts: Record<string, number> = {};
        await Promise.all(
          chats.map(async (chat) => {
            const { count } = await chatService.getUnreadCount(chat._id);
            counts[chat._id] = count;
          })
        );

        setUnreadMap(counts);
      } catch (err) {
        console.error("Failed to load chats", err);
      }
    })();
  }, [user?.id]);

  /*********************** SOCKET CONNECTION *************************/
  useEffect(() => {
    if (!user?.id) return;

    const s = io(SOCKET_URL, {
      query: { userId: user.id }, // ✅ THIS IS ENOUGH
      withCredentials: true,
    });

    setSocket(s);

    /*************** CONNECTION EVENTS ***************/
    s.on("connect", () => {
      console.log("[socket] connected", s.id);
    });

    s.on("disconnect", () => {
      console.log("[socket] disconnected");
    });

    /*************** ONLINE USERS ***************/
    s.on("online-users", (users: string[]) => {
      setOnlineUsers(users);
    });

    /*************** LAST SEEN ***************/
    s.on("user-last-seen", ({ userId, lastSeen }) => {
      setLastSeen((prev) => ({
        ...prev,
        [userId]: new Date(lastSeen),
      }));
    });

    /*************** RECEIVE MESSAGE ***************/
    s.on("receive-message", (msg: Message) => {
      // 1. Move chat to top
      setChats((prev) => {
        const existing = prev.find((c) => c._id === msg.chat);
        if (!existing) return prev;

        const updated: Chat = {
          ...existing,
          lastMessage: {
            _id: msg._id,
            content: msg.content,
            sender: msg.sender,
            createdAt: msg.createdAt,
          },
          updatedAt: msg.createdAt,
        };

        return [updated, ...prev.filter((c) => c._id !== msg.chat)];
      });

      // 2. Update unread count (ONLY if not active chat)
      setUnreadMap((prev) => {
        if (msg.sender._id === user.id) return prev; // my message
        if (msg.chat === activeChatId) return prev; // already open

        return {
          ...prev,
          [msg.chat]: (prev[msg.chat] ?? 0) + 1,
        };
      });
    });

    return () => {
      s.disconnect();
    };
  }, [user?.id, activeChatId]);

  /*********************** MARK READ *************************/
  const markChatRead = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setUnreadMap((prev) => ({
      ...prev,
      [chatId]: 0,
    }));
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        lastSeen,
        chats,
        setChats,
        unreadMap,
        setUnreadMap,
        markChatRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};