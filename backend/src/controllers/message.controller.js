import User from "../models/users.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinar.js";
import { getReceiverSocketId, io } from "../lib/socket.js";


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

