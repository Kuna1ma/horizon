import { useState, useRef, useEffect } from "react";
import { formatMessageTime } from "../lib/utils";
import { useChatStore } from "../store/useChatStore";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

const ChatBubble = ({ message, isOwn, profilePic, name }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const userList = useChatStore((state) => state.users);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  console.log("userList", userList);
  return (
    <>
      <div className={`flex items-start gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <img
          className="w-8 h-8 rounded-full"
          src={profilePic || "/avatar.png"}
          alt={`${name} avatar`}
        />

        {/* Message Content */}
        <div className="flex flex-col w-full max-w-[320px] leading-1.5 p-4 border border-base-300 bg-base-200 text-base-content rounded-e-xl rounded-es-xl transition-colors duration-300">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-sm font-semibold text-base-content">{name}</span>
            <span className="text-sm font-normal text-base-content/60">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
          <div className="py-2.5 text-sm font-normal text-base-content break-words">
            {message.replyTo && (
              <div className="mb-2 px-3 py-2 rounded bg-base-300 text-sm text-base-content/70 border-l-4 border-primary">
                <span className="block font-medium mb-1">Replying to:</span>
                {message.replyTo.text && (
                  <p className="italic text-base-content/70 break-words">
                    {message.replyTo.text}
                  </p>
                )}
                {message.replyTo.image && (
                  <img
                    src={message.replyTo.image}
                    alt="Replied image"
                    className="mt-1 w-24 h-24 object-cover rounded border"
                  />
                )}
              </div>
            )}
            {message.forwardedFrom && (
              <div className="flex items-center gap-2 text-xs text-primary mb-1">
                <img
                  src={message.forwardedFrom.profilePic || "/avatar.png"}
                  alt="Forwarded from"
                  className="w-4 h-4 rounded-full"
                />
                <span>Forwarded from: <strong>{message.forwardedFrom.fullName}</strong></span>
              </div>
            )}
            {message.image && (
              <img
                src={message.image}
                alt="Message attachment"
                className="mb-2 w-60 max-h-60 object-cover rounded"
              />
            )}
            {message.text}
          </div>

          <span className="text-sm font-normal text-base-content/60">Delivered</span>
        </div>

        {/* Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex self-center items-center p-2 text-sm font-medium text-base-content bg-base-100 rounded-lg hover:bg-base-300 focus:ring-4 focus:outline-none focus:ring-base-300 transition"
          >
            <svg className="w-4 h-4 text-base-content/70" fill="currentColor" viewBox="0 0 4 15">
              <path d="M3.5 1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 6.041a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 5.959a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute top-full right-0 mt-1 z-10 bg-base-100 divide-y divide-base-300 rounded-lg shadow-sm w-40">
              <ul className="py-2 text-sm text-base-content">
                {["Reply", "Forward", "Copy", "Report", "Delete"].map((action) => (
                  <li key={action}>
                    <button
                      onClick={async () => {
                        setShowDropdown(false);

                        if (action === "Reply") {
                          useChatStore.getState().setReplyToMessage(message);
                        } else if (action === "Delete") {
                          try {
                            const token = useAuthStore.getState().authUser.token;
                            await axios.delete(`/api/messages/${message._id}`, {
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            });
                            useChatStore.getState().removeMessage(message._id);
                            toast.success("Message deleted successfully");
                          } catch (err) {
                            console.error("Failed to delete:", err.response?.data || err.message);
                            toast.error("Failed to delete message");
                          }
                        } else if (action === "Forward") {
                          setMessageToForward(message);
                          setShowForwardModal(true);
                        }
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-base-300 rounded"
                    >
                      {action}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

            {/* Modal INSIDE the return block */}
      {showForwardModal && messageToForward && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 w-full max-w-md rounded-lg p-4 shadow-lg relative">
            <h2 className="text-lg font-semibold mb-4">Forward Message To</h2>
            <button
              onClick={() => setShowForwardModal(false)}
              className="absolute top-2 right-2 text-base-content/70 hover:text-base-content"
            >
              ✕
            </button>

            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {Array.isArray(userList) && userList.map((user) => (
                <li key={user._id}>
                  <button
                    onClick={async () => {
                      if (!messageToForward?._id) return;
                      try {
                        const token = useAuthStore.getState().authUser.token;
                        await axios.post(
                          `/api/messages/forward`,
                          {
                            recipientId: user._id,
                            originalMessageId: messageToForward._id,
                          },
                          {
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          }
                        );
                        toast.success(`Message forwarded to ${user.fullName || user.name}`);
                      } catch (error) {
                        console.error("Forward failed:", error);
                        toast.error("Failed to forward message.");
                      }
                      setShowForwardModal(false);
                    }}
                    className="w-full flex items-center gap-3 text-left px-4 py-2 rounded hover:bg-base-300"
                  >
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={`${user.fullName || user.name} avatar`}
                      className="w-8 h-8 rounded-full border"
                    />
                    <span>{user.fullName || user.name}</span>
                  </button>

                </li>
              ))}

            </ul>
          </div>
        </div>
      )}

    </>
  );
};

export default ChatBubble;
