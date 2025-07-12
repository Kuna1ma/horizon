import User from "../models/users.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinar.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import mongoose from "mongoose";



export const getUsersForSideBar = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get all users except the current one
    const users = await User.find({ _id: { $ne: currentUserId } });

    // Attach last message timestamp to each user
    const usersWithTimestamps = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: currentUserId, receiverId: user._id },
            { senderId: user._id, receiverId: currentUserId },
          ],
        }).sort({ createdAt: -1 });

        return {
          _id: user._id,
          fullName: user.fullName,
          profilePic: user.profilePic,
          lastMessageTimestamp: lastMessage?.createdAt || null,
        };
      })
    );

    res.json(usersWithTimestamps);
  } catch (err) {
    console.error("Error in getUsersForSideBar:", err);
    res.status(500).json({ message: "Failed to fetch users." });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
      .populate("forwardedFrom", "fullName profilePic") // ✅ ADD THIS LINE
      .sort({ createdAt: 1 }); // Optional: sort by time

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const sendMessage = async (req, res) => {
  try {
    const { text, image, replyTo } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    // Create the message
    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image,
      replyTo: replyTo || null,
    });

    // Populate replyTo if exists
    const populatedMessage = await Message.findById(newMessage._id)
      .populate({
        path: "replyTo",
        select: "text image senderId",
      })
      .lean(); // Make it a plain object for socket emit

    // Normalize IDs to strings (important for frontend comparisons)
    populatedMessage.senderId = populatedMessage.senderId?.toString?.();
    populatedMessage.receiverId = populatedMessage.receiverId?.toString?.();

    // Emit real-time update to both users (receiver and sender)
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }

    io.to(senderId.toString()).emit("newMessage", populatedMessage);

    // Respond to sender
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};



export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    console.log("Attempting to delete message with ID:", messageId); // ✅ Log raw ID

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    await message.deleteOne();

    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId });
    }

    io.to(userId.toString()).emit("messageDeleted", { messageId });
    
    res.status(200).json({ message: "Message deleted successfully", messageId });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

export const forwardMessage = async (req, res) => {
  const { recipientId, originalMessageId } = req.body;

  try {
    const original = await Message.findById(originalMessageId);
    if (!original) {
      return res.status(404).json({ error: "Original message not found" });
    }

    const newMessage = new Message({
      senderId: req.user._id,
      receiverId: recipientId,
      text: original.text || "",
      image: original.image || "",
      forwarded: true,
      forwardedFrom: original.senderId,
    });

    await newMessage.save();

    // ✅ Populate and lean for plain object
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("forwardedFrom", "fullName profilePic")
      .lean(); // 💡 Important: makes it a plain object

    // ✅ Normalize senderId and receiverId to strings
    populatedMessage.senderId = populatedMessage.senderId?.toString?.() || populatedMessage.senderId;
    populatedMessage.receiverId = populatedMessage.receiverId?.toString?.() || populatedMessage.receiverId;

    // ✅ Emit real-time message to both sender and recipient
    const receiverSocketId = getReceiverSocketId(recipientId);
    console.log("💡 Recipient socket ID:", receiverSocketId);
    console.log("📤 Sending to recipient ID:", recipientId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }

    io.to(req.user._id.toString()).emit("newMessage", populatedMessage);

    res.status(201).json({ message: "Message forwarded successfully", data: populatedMessage });
  } catch (err) {
    console.error("Forward failed:", err);
    res.status(500).json({ error: "Failed to forward message" });
  }
};
