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
        const {id:userToChatId} = req.params
        const myId = req.user._id;

        const messages = await Message.find({
            $or:[
                {senderId:myId, receiverId:userToChatId},
                {senderId:userToChatId, receiverId:myId}
            ]
        });
        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, replyTo } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image,
      replyTo: replyTo || null,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate({
        path: "replyTo",
        select: "text image senderId", 
      });

 
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
