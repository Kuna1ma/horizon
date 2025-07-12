import { useState, useRef, useEffect } from "react";
import { formatMessageTime } from "../lib/utils";
import { useChatStore } from "../store/useChatStore";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { motion } from "framer-motion"; 

const ChatBubble = ({ message, isOwn, profilePic, name }) => {
  const [forwardingUserId, setForwardingUserId] = useState(null); 
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
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-base-100 w-full max-w-md rounded-2xl p-6 shadow-xl relative"
    >
      {/* Close Button */}
      <button
        onClick={() => setShowForwardModal(false)}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:text-base-content/60 dark:hover:text-base-content"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Title */}
      <h2 className="text-xl font-bold text-gray-800 dark:text-base-content">
        Forward Message To
      </h2>
      <hr className="my-4 border-base-300" />

      {/* User List or Empty State */}
      {Array.isArray(userList) && userList.length > 0 ? (
        <ul className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-base-300">
          {userList.map((user) => {
            const isLoading = forwardingUserId === user._id;

            return (
              <li key={user._id}>
                <button
                  disabled={isLoading}
                  onClick={async () => {
                    if (!messageToForward?._id) return;
                    setForwardingUserId(user._id);
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
                      toast.success(`📤 Message forwarded to ${user.fullName || user.name}`);
                    } catch (error) {
                      console.error("Forward failed:", error);
                      toast.error("❌ Failed to forward message.");
                    } finally {
                      setForwardingUserId(null);
                      setShowForwardModal(false);
                    }
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl shadow-sm transition-all ${
                    isLoading ? "bg-base-200 cursor-not-allowed" : "hover:bg-base-200"
                  }`}
                >
                  {/* Avatar */}
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={`${user.fullName || user.name} avatar`}
                    className="w-10 h-10 rounded-full border border-base-300"
                  />
                  <div className="flex-1 text-left flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-base-content">
                      {user.fullName || user.name}
                    </p>
                    {/* Spinner */}
                    {isLoading && (
                      <div className="ml-2">
                        <svg
                          className="animate-spin h-5 w-5 text-primary"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-sm text-base-content/60 text-center py-8">
          No users available to forward the message to.
        </div>
      )}
    </motion.div>
  </div>
)}


    </>
  );
};

export default ChatBubble;
