import api from "./api";

export interface ChatMember {
  user: {
    _id:       string;
    name:      string;
    email:     string;
    lastSeen?: string;
  };
  role: "admin" | "write" | "read";
}

export interface Chat {
  _id:      string;
  type:     "Private" | "Group";
  name?:    string;
  members:  ChatMember[];
  createdBy: string;
  lastMessage?: {
    _id:      string;
    content:  string;
    sender:   { _id: string; name: string };
    createdAt: string;
  };
  updatedAt: string;
}

export interface Message {
  _id:       string;
  tempId?:   string;
  chat:      string;
  sender:    { _id: string; name: string };
  content:   string;
  type:      "Text" | "Image" | "Audio" | "Document";
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  deliveredTo: string[];
  readBy:    { userId: string; readAt: string }[];
  createdAt: string;
  pending?:  boolean;
}

export interface MessagesPage {
  messages:   Message[];
  nextCursor: string | null;  // pass as `before` on next fetch; null = no more
}

export interface UploadResult {
  url:         string;
  fileName:    string;
  fileSize:    number;
  mimeType:    string;
  messageType: "Image" | "Audio" | "Document";
}

export const chatService = {
  getMyChats: async (): Promise<{ chats: Chat[] }> => {
    const res = await api.get("/chats");
    return res.data;
  },

  startPrivateChat: async (recipientId: string): Promise<{ chat: Chat }> => {
    const res = await api.post("/chats/private", { recipientId });
    return res.data;
  },

  createGroup: async (
    name:      string,
    memberIds: { userId: string; role: string }[]
  ): Promise<{ chat: Chat }> => {
    const res = await api.post("/chats/group", { name, memberIds });
    return res.data;
  },

  // ✅ Cursor-based — pass `before` (oldest message _id) to load older messages
  getMessages: async (
    chatId: string,
    { limit = 30, before }: { limit?: number; before?: string } = {}
  ): Promise<MessagesPage> => {
    const res = await api.get(`/chats/${chatId}/messages`, {
      params: { limit, ...(before ? { before } : {}) },
    });
    return res.data;
  },

  markRead: async (chatId: string): Promise<void> => {
    await api.patch(`/chats/${chatId}/read`);
  },

  getUnreadCount: async (chatId: string): Promise<{ count: number }> => {
    const res = await api.get(`/chats/${chatId}/unread`);
    return res.data;
  },

  deleteChat: async (chatId: string): Promise<void> => {
    await api.delete(`/chats/${chatId}`);
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await api.delete(`/chats/messages/${messageId}`);
  },
};