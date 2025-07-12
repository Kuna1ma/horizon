import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import ChatBubble from "./ChatBubble";


const ChatContainer = () => {
  const {
    messages,
    getMessages,
    getUsers,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    isTyping,
    
  } = useChatStore();


  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

    // ✅ Fetch messages & subscribe on user change
  useEffect(() => {
    if (!selectedUser?._id) return;

    // ✅ Unsubscribe first to prevent duplicate socket listeners
    unsubscribeFromMessages();

    // ✅ Fetch messages
    getMessages(selectedUser._id);

    // ✅ Subscribe to real-time updates
    subscribeToMessages();

    // ✅ Clean up when component unmounts or selectedUser changes
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id]); // ⛔️ Do not include functions in dependencies


  // ✅ Scroll to bottom on new messages or typing
  useEffect(() => {
    const scrollToBottom = () => {
      const container = messageEndRef.current?.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    };

    // Wait for layout to finish rendering
    const timeout = setTimeout(() => {
      if (messages.length > 0) {
        scrollToBottom();
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [messages, isTyping]);



  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        {isTyping && (
          <div className="px-6 pb-2 text-sm text-zinc-400 flex items-center gap-2">
            <span>{selectedUser?.fullName || "User"} is typing</span>
            <span className="dots flex gap-[2px]">
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
            </span>
          </div>
        )}
        <MessageInput />
      </div>
    );
  }

  // 🟡 Add this check right after loading, before rendering the chat
  if (!selectedUser) {
    return <div className="p-4 text-zinc-400">Select a user to start chatting</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      
      <ChatHeader />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {messages.map((message) => (
            <ChatBubble
              key={message._id}
              message={message}
              isOwn={message.senderId === authUser._id}
              profilePic={
                message.senderId === authUser._id
                  ? authUser.profilePic
                  : selectedUser.profilePic
              }
            />
          ))}

          {/* ✅ Typing bubble here */}
          {isTyping && (
            <div className="chat chat-start">
              
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img src={selectedUser.profilePic || "/avatar.png"} alt="profile pic" />
                </div>
              </div>
              <div className="chat-bubble bg-base-300 text-base-content flex items-center gap-1">
                <div className="typing-dots flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>


      <MessageInput />
    </div>
  );
};
export default ChatContainer;