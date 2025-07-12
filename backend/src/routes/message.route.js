import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForSideBar,
  getMessages,
  sendMessage,
  deleteMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

// Order matters — put more specific routes first
router.get("/users", protectRoute, getUsersForSideBar);
router.post("/send/:id", protectRoute, sendMessage);
router.delete("/:id", protectRoute, deleteMessage);
router.get("/:id", protectRoute, getMessages);

export default router;
