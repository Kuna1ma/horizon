import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUser: null,
  isTyping: false, 
  typingTimeout: null, 
  replyToMessage: null,
  setReplyToMessage: (message) => set({ replyToMessage: message }),
  clearReplyToMessage: () => set({ replyToMessage:null }),
  setMessages: (newMessages) => set({ messages: newMessages }),
  fowardMessage: null, 
  setForwardMessage: (message) => set({ forwardMessage: message }),
  clearForwardMessage: () => set({ forwardMessage: null }),

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== messageId),
    }));
  },
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);

      const newMessage = res.data;

      // ✅ 1. Add to messages list
      set({ messages: [...messages, newMessage] });

      // ✅ 2. Update users' lastMessageTimestamp (for sender side)
      set((state) => {
        const updatedUsers = state.users.map((user) => {
          if (user._id === selectedUser._id) {
            return {
              ...user,
              lastMessageTimestamp: newMessage.createdAt,
            };
          }
          return user;
        });

        return { users: updatedUsers };
      });

    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    const myId = useAuthStore.getState().authUser?._id;

    if (!socket || !myId) {
      console.warn("🚫 Socket or auth user not available — skipping subscription");
      return;
    }


    const normalizeId = (id) => (id?._id?.toString?.() || id?.toString?.());

    const playSound = () => {
      const messageAudio = new Audio("/audio/receive.mp3");
      messageAudio.play().catch((err) => {
        console.warn("🔇 Auto-play failed:", err);
      });
    };

    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
    });

    socket.on("newMessage", (newMessage) => {
      const currentSelected = get().selectedUser;

      console.log("📦 NEW MESSAGE RECEIVED:", newMessage);

      const isRelevant =
        normalizeId(newMessage.senderId) === normalizeId(currentSelected?._id) &&
        normalizeId(newMessage.receiverId) === normalizeId(myId);

      if (isRelevant) {
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      }

      playSound();

      set((state) => {
        const updatedUsers = state.users.map((user) => {
          if (
            normalizeId(user._id) === normalizeId(newMessage.senderId) ||
            normalizeId(user._id) === normalizeId(newMessage.receiverId)
          ) {
            return {
              ...user,
              lastMessageTimestamp: newMessage.createdAt,
            };
          }
          return user;
        });

        return { users: updatedUsers };
      });
    });

    socket.on("typing", ({ from }) => {
      const currentSelected = get().selectedUser;

      if (normalizeId(currentSelected?._id) === normalizeId(from)) {
        set({ isTyping: true });
      }
    });

    socket.on("stopTyping", ({ from }) => {
      const currentSelected = get().selectedUser;

      if (normalizeId(currentSelected?._id) === normalizeId(from)) {
        set({ isTyping: false });
      }
    });

    socket.onAny((event, ...args) => {
      console.log(`📡 SOCKET EVENT: ${event}`, args);
    });
  },





  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
      socket.off("newMessage");
      socket.off("messageDeleted");
      socket.off("typing");
      socket.off("stopTyping");
  },

  setSelectedUser: (selectedUser) =>
  set({
    selectedUser,
    isTyping: false, // ✅ Reset typing state when changing conversation
    typingUser: null,
  }),
}));