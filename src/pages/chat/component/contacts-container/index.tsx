import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  MessageSquare,
  LogOut,
  Plus,
  Users,
  Lock,
  UserRound,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { chatService, type Chat } from "@/services/chat.service";
import { type ContactUser, userService } from "@/services/user.service";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUser } from "@/context/user-context/use-user.context";
import { useSocket } from "@/context/socket-context/use-socket";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const UserPicker = ({
  allUsers,
  selected,
  onToggle,
  roleMap,
  setRoleMap,
}: {
  allUsers: ContactUser[];
  selected: ContactUser[];
  onToggle: (u: ContactUser) => void;
  roleMap: Record<string, string>;
  setRoleMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 bg-[#2f303b] border border-[#3f4050] rounded-lg px-3 py-2.5 text-sm text-left hover:border-purple-500/50 focus:outline-none transition-colors"
      >
        <span className="text-gray-400 truncate">
          {selected.length === 0
            ? "Select members..."
            : `${selected.length} member${selected.length > 1 ? "s" : ""} selected`}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((u) => (
            <span
              key={u._id}
              className="flex items-center gap-1 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs rounded-full px-2.5 py-1"
            >
              {u.name}
              <button
                type="button"
                onClick={() => onToggle(u)}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#23242f] border border-[#3f4050] rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-[#3f4050]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-[#2f303b] text-gray-300 text-sm pl-8 pr-3 py-1.5 rounded-md outline-none placeholder:text-gray-600"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-500 py-4">
                No users found
              </p>
            ) : (
              filtered.map((u) => {
                const isSelected = selected.some((s) => s._id === u._id);
                return (
                  <div
                    key={u._id}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${isSelected ? "bg-purple-600/10" : "hover:bg-[#2f303b]"}`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggle(u)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        {u.profilePicture && (
                          <AvatarImage src={u.profilePicture} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-semibold">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {u.email}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-purple-400 shrink-0" />
                      )}
                    </button>
                    {isSelected && (
                      <select
                        value={roleMap[u._id] ?? "write"}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setRoleMap((prev) => ({
                            ...prev,
                            [u._id]: e.target.value,
                          }))
                        }
                        className="bg-[#2f303b] border border-[#3f4050] text-xs text-gray-300 rounded-md px-2 py-1 focus:outline-none focus:border-purple-500"
                      >
                        <option value="write">Write</option>
                        <option value="read">Read</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ContactsContainer = ({
  onSelectChat,
  activeChatId,
}: {
  onSelectChat: (chat: Chat) => void;
  activeChatId?: string;
}) => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const { onlineUsers, chats, setChats, unreadMap } = useSocket();

  const [tab, setTab] = useState<"chats" | "people">("chats");
  const [search, setSearch] = useState("");

  const [allUsers, setAllUsers] = useState<ContactUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [startingDmId, setStartingDmId] = useState<string | null>(null);

  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<ContactUser[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!showGroupDialog && tab !== "people") return;
    if (usersLoaded || !user?.id) return;
    (async () => {
      try {
        const { users } = await userService.getAllUsers();
        setAllUsers(users.filter((u) => u._id !== user.id));
        setUsersLoaded(true);
      } catch {
        toast.error("Failed to load users");
      }
    })();
  }, [tab, showGroupDialog, usersLoaded, user?.id]);

  const handleStartDm = async (contactUser: ContactUser) => {
    setStartingDmId(contactUser._id);
    try {
      const { chat } = await chatService.startPrivateChat(contactUser._id);
      setChats((prev) =>
        prev.find((c) => c._id === chat._id) ? prev : [chat, ...prev],
      );
      setTab("chats");
      setSearch("");
      onSelectChat(chat);
    } catch {
      toast.error("Failed to open chat");
    } finally {
      setStartingDmId(null);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedMembers.length < 2) {
      toast.error("Select at least 2 members");
      return;
    }
    setCreatingGroup(true);
    try {
      const { chat } = await chatService.createGroup(
        groupName,
        selectedMembers.map((m) => ({
          userId: m._id,
          role: roleMap[m._id] ?? "write",
        })),
      );
      setChats((prev) => [chat, ...prev]);
      setShowGroupDialog(false);
      setGroupName("");
      setSelectedMembers([]);
      setRoleMap({});
      toast.success("Group created!");
      onSelectChat(chat);
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleMember = (u: ContactUser) =>
    setSelectedMembers((prev) =>
      prev.find((m) => m._id === u._id)
        ? prev.filter((m) => m._id !== u._id)
        : [...prev, u],
    );

  // All member helpers use .user._id and .user.name
  const getChatName = (chat: Chat) => {
    if (chat.type === "Group") return chat.name ?? "Group";
    const other = chat.members.find((m) => m.user._id !== user?.id);
    return other?.user.name ?? "Unknown";
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === "Group") return null;
    const other = chat.members.find((m) => m.user._id !== user?.id);
    return other ? getInitials(other.user.name) : "?";
  };

  const isChatOnline = (chat: Chat) => {
    if (chat.type === "Group") return false;
    const other = chat.members.find((m) => m.user._id !== user?.id);
    return other ? onlineUsers.includes(other.user._id) : false;
  };

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);
  const filteredChats = chats.filter((c) =>
    getChatName(c).toLowerCase().includes(search.toLowerCase()),
  );
  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative flex h-full w-[70px] sm:w-[200px] md:w-[305px] flex-col bg-[#1b1c24] border-r border-[#2f303b]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-purple-400" />
          <span className="text-lg font-semibold text-white tracking-tight">
            Messages
          </span>
        </div>

        <Dialog
          open={showGroupDialog}
          onOpenChange={(v) => {
            setShowGroupDialog(v);
            if (!v) {
              setGroupName("");
              setSelectedMembers([]);
              setRoleMap({});
            }
          }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f303b] text-gray-400 hover:bg-purple-500 hover:text-white transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>New Group</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DialogContent className="bg-[#1b1c24] border-[#2f303b] text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" /> Create Group Chat
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
              <Input
                placeholder="Group name"
                className="bg-[#2f303b] border-[#3f4050] text-white placeholder:text-gray-500 focus-visible:ring-purple-500"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Add members</p>
                <UserPicker
                  allUsers={allUsers}
                  selected={selectedMembers}
                  onToggle={toggleMember}
                  roleMap={roleMap}
                  setRoleMap={setRoleMap}
                />
                {selectedMembers.length < 2 && (
                  <p className="text-xs text-gray-600 mt-1.5">
                    Select at least 2 members.
                  </p>
                )}
              </div>
              <button
                onClick={handleCreateGroup}
                disabled={
                  !groupName.trim() ||
                  selectedMembers.length < 2 ||
                  creatingGroup
                }
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors text-sm font-medium mt-1"
              >
                {creatingGroup ? "Creating…" : "Create Group"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3">
        {(["chats", "people"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSearch("");
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300 hover:bg-[#2f303b]"
            }`}
          >
            {t === "chats" ? (
              <MessageSquare className="h-3.5 w-3.5" />
            ) : (
              <UserRound className="h-3.5 w-3.5" />
            )}
            {t === "chats" ? "Chats" : "People"}
            {t === "chats" && totalUnread > 0 && (
              <span className="bg-pink-500 text-white text-[10px] rounded-full px-1.5 leading-4">
                {totalUnread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder={tab === "chats" ? "Search chats…" : "Search people…"}
            className="pl-9 bg-[#2f303b] border-none text-gray-300 placeholder:text-gray-500 rounded-xl focus-visible:ring-1 focus-visible:ring-purple-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-1">
          {tab === "chats" &&
            (filteredChats.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <MessageSquare className="h-8 w-8 text-gray-700" />
                <p className="text-xs text-gray-500">
                  No chats yet.{" "}
                  <button
                    onClick={() => setTab("people")}
                    className="text-purple-400 hover:underline"
                  >
                    Find people
                  </button>{" "}
                  to start one!
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const chatName = getChatName(chat);
                const avatarInitials = getChatAvatar(chat);
                const online = isChatOnline(chat);
                const unread = unreadMap[chat._id] ?? 0;
                const isGroup = chat.type === "Group";

                // last message preview — content might be a URL for media messages
                const lastMsgPreview = chat.lastMessage
                  ? `${chat.lastMessage.sender.name === user?.name ? "You" : chat.lastMessage.sender.name}: ${
                      chat.lastMessage.content.startsWith("http")
                        ? "📎 Attachment"
                        : chat.lastMessage.content
                    }`
                  : "No messages yet";

                return (
                  <button
                    key={chat._id}
                    onClick={() => onSelectChat(chat)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                      activeChatId === chat._id
                        ? "bg-purple-600/20 border border-purple-500/30"
                        : "hover:bg-[#2f303b] border border-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-semibold">
                          {isGroup ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            avatarInitials
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-[#1b1c24]" />
                      )}
                      {isGroup && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-blue-400 border-2 border-[#1b1c24]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {isGroup && (
                            <Lock className="h-3 w-3 text-blue-400 shrink-0" />
                          )}
                          <span className="text-sm font-medium text-white truncate">
                            {chatName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0 ml-2">
                          {chat.lastMessage ? formatTime(chat.updatedAt) : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-gray-400 truncate">
                          {lastMsgPreview}
                        </span>
                        {unread > 0 && (
                          <Badge className="ml-2 h-5 min-w-5 shrink-0 bg-purple-500 hover:bg-purple-500 text-white text-xs px-1.5">
                            {unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ))}

          {tab === "people" &&
            (!usersLoaded ? (
              <p className="text-center text-xs text-gray-500 py-8">Loading…</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-xs text-gray-500 py-8">
                No users found
              </p>
            ) : (
              filteredUsers.map((u) => {
                const online = onlineUsers.includes(u._id);
                const isLoading = startingDmId === u._id;
                return (
                  <button
                    key={u._id}
                    onClick={() => handleStartDm(u)}
                    disabled={isLoading}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#2f303b] border border-transparent transition-all disabled:opacity-60"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11">
                        {u.profilePicture && (
                          <AvatarImage src={u.profilePicture} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-semibold">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      {online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-[#1b1c24]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {u.name}
                      </p>
                      <p className="text-xs truncate">
                        {online ? (
                          <span className="text-green-400">● Online</span>
                        ) : (
                          <span className="text-gray-500">{u.email}</span>
                        )}
                      </p>
                    </div>
                    {isLoading ? (
                      <span className="text-xs text-gray-500 shrink-0">
                        Opening…
                      </span>
                    ) : (
                      <MessageSquare className="h-4 w-4 text-gray-600 shrink-0" />
                    )}
                  </button>
                );
              })
            ))}
        </div>
      </ScrollArea>

      {/* Bottom nav */}
      <div className="border-t border-[#2f303b] px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-semibold">
                {user?.name ? getInitials(user.name) : "Me"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-400 truncate max-w-[100px]">
              {user?.name}
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    logout();
                    navigate("/auth");
                  }}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#2f303b] rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Logout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default ContactsContainer;
