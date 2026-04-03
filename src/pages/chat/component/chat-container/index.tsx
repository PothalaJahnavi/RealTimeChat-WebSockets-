import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Paperclip,
  Smile,
  Send,
  ImageIcon,
  FileText,
  Mic,
  MicOff,
  Check,
  CheckCheck,
  Users,
  ShieldCheck,
  Eye,
  Download,
  FileAudio,
  Loader2,
  ArrowDown,
} from "lucide-react";
import { chatService, type Chat, type Message } from "@/services/chat.service";
import { toast } from "sonner";
import { useSocket } from "@/context/socket-context/use-socket";
import { useUser } from "@/context/user-context/use-user.context";
import { uploadFile } from "@/services/upload.service";

interface ChatContainerProps {
  chat: Chat;
}

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatLastSeen = (date: Date) => {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString();
};

const formatBytes = (b: number) =>
  b < 1024
    ? `${b}B`
    : b < 1048576
      ? `${(b / 1024).toFixed(1)}KB`
      : `${(b / 1048576).toFixed(1)}MB`;

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

/******************************* Role badge *************************/
const RoleBadge = ({ role }: { role?: string }) => {
  if (!role || role === "write") return null;
  const styles: Record<string, string> = {
    admin: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    read: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  const icons: Record<string, React.ReactNode> = {
    admin: <ShieldCheck className="h-3 w-3" />,
    read: <Eye className="h-3 w-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] border rounded-full px-1.5 py-0.5 ${styles[role] ?? ""}`}
    >
      {icons[role]} {role}
    </span>
  );
};

/******************************* Message bubble in chat *************************/
const MessageBubble = ({ msg, isMine }: { msg: Message; isMine: boolean }) => {
  const base = isMine
    ? `bg-purple-600 text-white rounded-br-sm ${msg.pending ? "opacity-60" : ""}`
    : "bg-[#2f303b] text-gray-100 rounded-bl-sm";

  if (msg.type === "Image") {
    return (
      <div className={`rounded-2xl overflow-hidden p-1 ${base}`}>
        <img
          src={msg.content}
          alt={msg.fileName ?? "image"}
          className="max-w-[260px] rounded-xl object-cover"
        />
      </div>
    );
  }
  if (msg.type === "Audio") {
    return (
      <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${base}`}>
        <FileAudio className="h-5 w-5 shrink-0" />
        <audio controls src={msg.content} className="h-8 max-w-[180px]" />
      </div>
    );
  }
  if (msg.type === "Document") {
    return (
      <a
        href={msg.content}
        target="_blank"
        rel="noopener noreferrer"
        download={msg.fileName}
        className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${base} hover:opacity-90 transition-opacity`}
      >
        <FileText className="h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm truncate max-w-[180px]">
            {msg.fileName ?? "Document"}
          </p>
          {msg.fileSize != null && (
            <p
              className={`text-xs ${isMine ? "text-purple-200" : "text-gray-500"}`}
            >
              {formatBytes(msg.fileSize)}
            </p>
          )}
        </div>
        <Download className="h-4 w-4 shrink-0 ml-auto" />
      </a>
    );
  }
  return (
    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${base}`}>
      {msg.content}
    </div>
  );
};

const ChatContainer = ({ chat }: ChatContainerProps) => {
  const { user } = useUser();
  const { socket, onlineUsers, lastSeen, markChatRead } = useSocket();
  const myId = user?.id ?? "";

  /******************************* Message state *************************/
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const [input, setInput] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null); // the scrollable viewport
  const bottomRef = useRef<HTMLDivElement>(null); // sentinel at list bottom
  const topSentinel = useRef<HTMLDivElement>(null); // sentinel at list top
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const isNearBottom = useRef(true);
  const prevScrollHeight = useRef(0);
  const prevScrollTop = useRef(0);

  const isGroup = chat.type === "Group";
  const myMember = chat.members.find((m) => m.user._id === myId);
  const myRole = isGroup ? myMember?.role : undefined;
  const isReadOnly = isGroup && myRole === "read";
  const recipientMember = !isGroup
    ? chat.members.find((m) => m.user._id !== myId)
    : null;
  const recipient = recipientMember?.user ?? null;
  const otherMemberIds = chat.members
    .filter((m) => m.user._id !== myId)
    .map((m) => m.user._id);
  const isRecipientOnline = recipient
    ? onlineUsers.includes(recipient._id)
    : false;
  const recipientLastSeen = recipient ? lastSeen[recipient._id] : undefined;
  const chatName = isGroup
    ? (chat.name ?? "Group")
    : (recipient?.name ?? "Unknown");
  const chatInitials = isGroup ? null : getInitials(chatName);

  const getViewport = () =>
    // shadcn ScrollArea renders a [data-radix-scroll-area-viewport] div
    scrollAreaRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    ) ?? null;

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Track if user is near bottom (within 120px)
  const handleScroll = useCallback(() => {
    const vp = getViewport();
    if (!vp) return;
    const distFromBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    isNearBottom.current = distFromBottom < 120;
    setShowScrollBtn(distFromBottom > 300);
  }, []);

  /******************************* Initial Load *************************/
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setInitialLoading(true);
      setMessages([]);
      setNextCursor(null);

      try {
        const { messages, nextCursor } = await chatService.getMessages(
          chat._id,
        );
        if (cancelled) return;

        setMessages(messages);
        setNextCursor(nextCursor);
        await chatService.markRead(chat._id);
        markChatRead(chat._id);
      } catch {
        toast.error("Failed to load messages");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [chat._id, markChatRead]);

  useEffect(() => {
    if (!initialLoading) {
      scrollToBottom("instant" as ScrollBehavior);
    }
  }, [initialLoading]);

  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;
    vp.addEventListener("scroll", handleScroll, { passive: true });
    return () => vp.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!topSentinel.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          loadOlderMessages();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(topSentinel.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore]);

  const loadOlderMessages = async () => {
    if (!nextCursor || loadingMore) return;

    const vp = getViewport();
    // Save position so we can restore it after prepend
    if (vp) {
      prevScrollHeight.current = vp.scrollHeight;
      prevScrollTop.current = vp.scrollTop;
    }

    setLoadingMore(true);
    try {
      const { messages: older, nextCursor: newCursor } =
        await chatService.getMessages(chat._id, { before: nextCursor });

      setMessages((prev) => [...older, ...prev]);
      setNextCursor(newCursor);
    } catch {
      toast.error("Failed to load older messages");
    } finally {
      setLoadingMore(false);
    }
  };

  // Restore scroll position after older messages are prepended
  useEffect(() => {
    if (loadingMore) return; // still loading — wait
    const vp = getViewport();
    if (!vp || prevScrollHeight.current === 0) return;

    // New height − old height = pixels added at top
    const added = vp.scrollHeight - prevScrollHeight.current;
    vp.scrollTop = prevScrollTop.current + added;
    prevScrollHeight.current = 0; // reset sentinel
  }, [messages, loadingMore]);

  // Auto-scroll to bottom when a NEW message arrives (only if near bottom)
  const prevMsgCount = useRef(0);
  useEffect(() => {
    const isNewMessage = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;

    if (isNewMessage && isNearBottom.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Also scroll on typing indicator
  useEffect(() => {
    if (isTyping && isNearBottom.current) scrollToBottom();
  }, [isTyping]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg: Message) => {
      if (msg.chat !== chat._id) return;
      setMessages((prev) => {
        if (msg.tempId) {
          const idx = prev.findIndex((m) => m.tempId === msg.tempId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { ...msg, pending: false };
            return updated;
          }
        }
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      socket.emit("mark-read", {
        chatId: chat._id,
        senderId: isGroup ? undefined : msg.sender._id,
      });
    };

    const handleTypingStart = (data: { chatId: string; userId: string }) => {
      if (data.chatId !== chat._id) return;
      const member = chat.members.find((m) => m.user._id === data.userId);
      setTypingUser(member?.user.name ?? "Someone");
      setIsTyping(true);
    };

    const handleTypingStop = (data: { chatId: string }) => {
      if (data.chatId === chat._id) {
        setIsTyping(false);
        setTypingUser("");
      }
    };

    const handleMessagesRead = (data: { chatId: string; readBy: string }) => {
      if (data.chatId !== chat._id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.sender._id === myId
            ? {
                ...m,
                readBy: m.readBy.some((r) => r.userId === data.readBy)
                  ? m.readBy
                  : [
                      ...m.readBy,
                      { userId: data.readBy, readAt: new Date().toISOString() },
                    ],
              }
            : m,
        ),
      );
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("typing-start", handleTypingStart);
    socket.on("typing-stop", handleTypingStop);
    socket.on("messages-read", handleMessagesRead);
    socket.emit("mark-read", { chatId: chat._id });

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("typing-start", handleTypingStart);
      socket.off("typing-stop", handleTypingStop);
      socket.off("messages-read", handleMessagesRead);
    };
  }, [socket, chat._id, myId, isGroup, chat.members]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !socket || isReadOnly) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      _id: tempId,
      tempId,
      chat: chat._id,
      sender: { _id: myId, name: user?.name ?? "Me" },
      content: input.trim(),
      type: "Text",
      deliveredTo: [],
      readBy: [],
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    isNearBottom.current = true; // sender always wants to see their message
    setInput("");
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socket.emit("typing-stop", {
      chatId: chat._id,
      recipientIds: otherMemberIds,
    });
    socket.emit("send-message", {
      chatId: chat._id,
      content: optimisticMsg.content,
      type: "Text",
      tempId,
    });
  }, [input, socket, chat._id, myId, user, isReadOnly, otherMemberIds]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!socket || isReadOnly) return;
    socket.emit("typing-start", {
      chatId: chat._id,
      recipientIds: otherMemberIds,
    });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing-stop", {
        chatId: chat._id,
        recipientIds: otherMemberIds,
      });
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  /******************************* File Upload *************************/
  const handleFileUpload = async (file: File) => {
    if (!socket || isReadOnly) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        _id: tempId,
        tempId,
        chat: chat._id,
        sender: { _id: myId, name: user?.name ?? "Me" },
        content: uploaded.url,
        type: uploaded.messageType,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
        deliveredTo: [],
        readBy: [],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      isNearBottom.current = true;
      socket.emit("send-message", {
        chatId: chat._id,
        content: uploaded.url,
        type: uploaded.messageType,
        tempId,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
      });
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setShowAttach(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorder.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });

        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type,
        });

        await handleFileUpload(file);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  /******************************* Tick Status *************************/
  const MessageStatus = ({ msg }: { msg: Message }) => {
    if (msg.sender._id !== myId) return null;
    if (msg.pending) return <Check className="h-3 w-3 text-gray-500" />;
    if (
      !isGroup &&
      recipient &&
      msg.readBy.some((r) => r.userId === recipient._id)
    )
      return <CheckCheck className="h-3 w-3 text-blue-400" />;
    if (!isGroup && recipient && msg.deliveredTo.includes(recipient._id))
      return <CheckCheck className="h-3 w-3 text-gray-400" />;
    return <Check className="h-3 w-3 text-gray-400" />;
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#1b1c24] min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f303b] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-semibold">
                {isGroup ? <Users className="h-4 w-4" /> : chatInitials}
              </AvatarFallback>
            </Avatar>
            {isRecipientOnline && !isGroup && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#1b1c24]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-white">{chatName}</p>
              {isGroup && <RoleBadge role={myRole} />}
            </div>
            {isTyping ? (
              <p className="text-xs text-purple-400 animate-pulse">
                {isGroup ? `${typingUser} is typing...` : "typing..."}
              </p>
            ) : isGroup ? (
              <p className="text-xs text-gray-500">
                {chat.members.length} members
              </p>
            ) : isRecipientOnline ? (
              <p className="text-xs text-green-400">Online</p>
            ) : recipientLastSeen ? (
              <p className="text-xs text-gray-500">
                Last seen {formatLastSeen(recipientLastSeen)}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Offline</p>
            )}
          </div>
        </div>
      </div>

      {/* Message list */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea ref={scrollAreaRef} className="h-full px-6 py-4">
          <div className="flex flex-col gap-4">
            {/* Top sentinel — IntersectionObserver triggers load more */}
            <div ref={topSentinel} className="h-1" />

            {/* Loading older spinner */}
            {loadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
              </div>
            )}

            {/* "No more messages" label */}
            {!nextCursor && !initialLoading && messages.length > 0 && (
              <p className="text-center text-[10px] text-gray-600">
                Beginning of conversation
              </p>
            )}

            {/* Date divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#2f303b]" />
              <span className="text-xs text-gray-500 shrink-0">Today</span>
              <div className="flex-1 h-px bg-[#2f303b]" />
            </div>

            {/* Initial loading skeleton */}
            {initialLoading ? (
              <div className="flex flex-col gap-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}
                  >
                    <div className="h-7 w-7 rounded-full bg-[#2f303b] animate-pulse shrink-0" />
                    <div
                      className={`h-10 rounded-2xl bg-[#2f303b] animate-pulse ${i % 2 === 0 ? "w-48" : "w-36"}`}
                    />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-xs text-gray-500 py-8">
                No messages yet. Say hi! 👋
              </p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender._id === myId;
                const senderMember = isGroup
                  ? chat.members.find((m) => m.user._id === msg.sender._id)
                  : null;

                return (
                  <div
                    key={msg._id}
                    className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {!isMine && (
                      <Avatar className="h-7 w-7 shrink-0 mb-1">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                          {getInitials(msg.sender.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[65%] flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}
                    >
                      {isGroup && !isMine && (
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-[10px] text-purple-300 font-medium">
                            {msg.sender.name}
                          </span>
                          <RoleBadge role={senderMember?.role} />
                        </div>
                      )}
                      <MessageBubble msg={msg} isMine={isMine} />
                      <div className="flex items-center gap-1 px-1">
                        <span className="text-[10px] text-gray-500">
                          {formatTime(msg.createdAt)}
                        </span>
                        <MessageStatus msg={msg} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                    {isGroup ? getInitials(typingUser) : (chatInitials ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-[#2f303b] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {/* Bottom anchor */}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Scroll-to-bottom FAB */}
        {showScrollBtn && (
          <button
            onClick={() => {
              isNearBottom.current = true;
              scrollToBottom();
            }}
            className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-500 transition-colors z-10"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Attachment popup */}
      {showAttach && (
        <div className="mx-6 mb-2 flex items-center gap-2 rounded-xl bg-[#2f303b] p-3 border border-[#3f4051] shrink-0">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-[#1b1c24] transition-colors text-purple-400"
          >
            <ImageIcon className="h-5 w-5" />
            <span className="text-[10px] text-gray-400">Photo</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-[#1b1c24] transition-colors text-blue-400"
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px] text-gray-400">File</span>
          </button>
          <button
            onClick={toggleRecording}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
              isRecording
                ? "bg-red-500/20 text-red-400"
                : "hover:bg-[#1b1c24] text-green-400"
            }`}
          >
            {isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            <span className="text-[10px] text-gray-400">
              {isRecording ? "Stop" : "Audio"}
            </span>
          </button>
          {uploading && (
            <span className="text-xs text-gray-500 ml-2 animate-pulse">
              Uploading…
            </span>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#2f303b] shrink-0">
        {isReadOnly ? (
          <div className="flex items-center justify-center gap-2 py-3 text-gray-500 text-sm">
            <Eye className="h-4 w-4" />
            <span>You are a read-only member of this group</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[#2f303b] rounded-2xl px-4 py-2 border border-[#3f4051] focus-within:border-purple-500/50 transition-colors">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowAttach((p) => !p)}
                    className={`p-1 rounded-lg transition-colors shrink-0 ${showAttach ? "text-purple-400" : "text-gray-400 hover:text-white"}`}
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Attach</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Input
              placeholder="Type a message..."
              className="flex-1 border-none bg-transparent text-gray-200 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-0 h-auto"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
            />

            <button className="p-1 text-gray-400 hover:text-yellow-400 transition-colors shrink-0">
              <Smile className="h-5 w-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;
