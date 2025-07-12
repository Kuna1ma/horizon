import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
const MessageInput = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null); // ✅ for typing debounce
  const { socket, authUser } = useAuthStore();
  const { sendMessage, selectedUser } = useChatStore();
  const { replyToMessage, clearReplyToMessage } = useChatStore();
  const [text, setText] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleTyping = (e) => {
    const value = e.target.value;
    setText(value);

    // Emit typing event
    socket.emit("typing", {
      to: selectedUser._id,
      from: authUser._id,
      fullName: authUser.fullName,
    });

    // Debounce clear
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { to: selectedUser._id });
    }, 2000);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        ...(replyToMessage && {
          replyTo: {
            _id: replyToMessage._id,
            text: replyToMessage.text || "",
            image: replyToMessage.image || "",
            senderId: replyToMessage.senderId,
          },
        }),
      });

      setText("");
      removeImage();
      clearReplyToMessage();
      
      // Immediately stop typing after sending
      if (socket && selectedUser) {
        socket.emit("stopTyping", { to: selectedUser._id });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}
      {replyToMessage && (
        <div className="mb-3 px-3 py-2 bg-base-300 rounded-lg text-sm text-base-content relative">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-base-content/80">Replying to:</span>
            <div className="italic text-base-content/70 break-words max-w-xs">
              {replyToMessage.text || "📎 Image"}
            </div>
          </div>
          <button
            type="button"
            onClick={clearReplyToMessage}
            className="absolute top-1.5 right-1.5 text-base-content/60 hover:text-error"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleTyping}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-ghost
              ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
