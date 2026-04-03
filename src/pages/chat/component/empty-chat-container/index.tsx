import { MessageSquare } from "lucide-react";

const EmptyChatContainer = () => {
  return (
    <div className="hidden xl:flex flex-1 flex-col items-center justify-center h-full bg-[#1b1c24] gap-5">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-600/10 border border-purple-500/20">
        <MessageSquare className="h-9 w-9 text-purple-400" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Your messages</h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          Select a conversation from the left to start chatting, or start a new
          one.
        </p>
      </div>
    </div>
  );
};

export default EmptyChatContainer;
