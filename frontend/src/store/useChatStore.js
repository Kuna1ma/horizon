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
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isFromSelectedUser = newMessage.senderId === selectedUser._id;

      // Always update messages if it’s from the currently open chat
      if (isFromSelectedUser) {
        set({ messages: [...get().messages, newMessage] });
      }

      // ✅ Update the sender's lastMessageTimestamp
      set((state) => {
        const updatedUsers = state.users.map((user) => {
          if (user._id === newMessage.senderId || user._id === newMessage.receiverId) {
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
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));