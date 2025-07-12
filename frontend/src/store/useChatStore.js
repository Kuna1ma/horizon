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
    const messageAudio = new Audio("/audio/receive.mp3");


    socket.on("newMessage", (newMessage) => {
      const currentSelected = get().selectedUser;
      const isFromSelectedUser = newMessage.senderId === currentSelected?._id;

      messageAudio.play().catch((err) => {
        console.warn("Auto-play failed:", err);
      });

      if (isFromSelectedUser) {
        set({ messages: [...get().messages, newMessage] });
      }

      set((state) => {
        const updatedUsers = state.users.map((user) => {
          if (
            user._id === newMessage.senderId ||
            user._id === newMessage.receiverId
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

    // ✅ Handle typing — use real-time selectedUser
    socket.on("typing", ({ from }) => {
      const currentSelected = get().selectedUser;
      if (currentSelected?._id === from) {
        set({ isTyping: true });

        const prevTimeout = get().typingTimeout;
        if (prevTimeout) clearTimeout(prevTimeout);

        const timeout = setTimeout(() => {
          set({ isTyping: false, typingTimeout: null });
        }, 2000);

        set({ typingTimeout: timeout });
      }
    });

    // ✅ Handle stopTyping — same fix
    socket.on("stopTyping", ({ from }) => {
      const currentSelected = get().selectedUser;
      if (currentSelected?._id === from) {
        set({ isTyping: false });
      }
    });
  },



  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) =>
  set({
    selectedUser,
    isTyping: false, // ✅ Reset typing state when changing conversation
    typingUser: null,
  }),
}));