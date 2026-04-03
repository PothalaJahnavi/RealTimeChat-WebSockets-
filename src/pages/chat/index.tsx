import { useState } from "react";
import ChatContainer from "./component/chat-container";
import EmptyChatContainer from "./component/empty-chat-container";
import ContactsContainer from "./component/contacts-container";
import type { Chat } from "@/services/chat.service";

const ChatPage = () => {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  return (
    <div className="flex h-[100vh] overflow-hidden bg-[#1b1c24]">
      <ContactsContainer
        onSelectChat={setActiveChat}
        activeChatId={activeChat?._id}
      />
      {activeChat ? (
        <ChatContainer chat={activeChat} />
      ) : (
        <EmptyChatContainer />
      )}
    </div>
  );
};

export default ChatPage;
